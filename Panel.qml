import QtQuick
import Quickshell
import Quickshell.Io
import qs.Commons
import qs.Ui
import "Model.js" as Model

Panel {
  id: root
  moduleName: "oma.shl"
  ipcTarget: "oma.shl"
  manageIpc: false

  property var anchorItem: null
  property bool openedFromHotkey: false
  property var hostWidget: null
  readonly property var barIdentity: hostWidget || root

  readonly property string favoriteTeam: String(setting("favoriteTeam", "") || "")
  readonly property bool useMock: setting("useMock", false) === true || setting("useMock", false) === "true"
  readonly property string scheduleUrl: String(setting("scheduleUrl", "https://stats.swehockey.se/ScheduleAndResults/Schedule/20961") || "")
  readonly property string tvGuideUrl: String(setting("tvGuideUrl", "https://www.tv.nu/sport/ishockey/liga/shl") || "")
  readonly property int refreshMinutesIdle: Math.max(5, parseInt(setting("refreshMinutesIdle", 20), 10) || 20)
  readonly property int refreshSecondsLive: Math.max(20, parseInt(setting("refreshSecondsLive", 45), 10) || 45)
  readonly property int alertMinutes: Math.max(1, parseInt(setting("alertMinutes", 10), 10) || 10)
  readonly property bool alertSound: setting("alertSound", true) !== false && setting("alertSound", true) !== "false"
  readonly property string alertSoundFile: String(setting("alertSoundFile", "") || "")
  readonly property string bundledHorn: {
    var u = String(Qt.resolvedUrl("goalhorn.ogg") || "")
    if (u.indexOf("file://") === 0) u = u.slice(7)
    return u
  }
  readonly property bool alertBlink: setting("alertBlink", true) !== false && setting("alertBlink", true) !== "false"

  readonly property color contentForeground: bar ? bar.foreground : Color.foreground
  readonly property color mutedForeground: Qt.rgba(contentForeground.r, contentForeground.g, contentForeground.b, 0.62)
  readonly property string contentFontFamily: bar ? bar.fontFamily : Style.font.family

  property var rawGames: []
  property var tvListings: []
  property var games: []
  property string lastError: ""
  property string sourceLabel: "mock"
  property int fetchAttempt: 0
  property int tvAttempt: 0

  readonly property var headline: Model.pickHeadline(games)
  readonly property string label: Model.barLabel(headline, !!(bar && bar.vertical))
  readonly property string tooltipText: Model.tooltip(games, favoriteTeam)
  readonly property var groups: Model.groupByDate(games)
  readonly property bool liveNow: Model.hasLive(games)
  property var pingedKeys: ({})
  property var soonGames: []
  property double blinkUntil: 0
  readonly property bool alertActive: alertBlink && Date.now() < blinkUntil

  function setting(key, fallback) {
    if (!settings) return fallback
    if (settings[key] === undefined || settings[key] === null || settings[key] === "")
      return fallback
    return settings[key]
  }

  function open() {
    openedFromHotkey = false
    root.controller.show()
  }

  function openFromHotkey() {
    openedFromHotkey = true
    root.controller.show()
  }

  function close() {
    root.controller.hide()
  }

  function toggle() {
    if (root.opened) root.close()
    else root.openFromHotkey()
  }

  function closeForPopoutSwitch() {
    root.close()
  }

  function switchPanel(direction) {
    if (root.bar && typeof root.bar.switchPanelFrom === "function")
      return root.bar.switchPanelFrom(root.barIdentity, direction)
    return false
  }

  function applyGames(list, src) {
    rawGames = list || []
    sourceLabel = src
    rebuild()
  }

  function rebuild() {
    var now = new Date()
    var enriched = Model.enrich(rawGames, now, favoriteTeam)
    enriched = Model.applyChannels(enriched, tvListings)
    games = Model.upcomingWindow(enriched, now, 21)
    lastError = games.length ? "" : (rawGames.length ? "Inga matcher i fönstret" : lastError)
    checkAlerts(now)
  }

  function checkAlerts(now) {
    var soon = Model.startingSoon(games, now || new Date(), alertMinutes)
    soonGames = soon
    if (!soon.length) return
    var nextPinged = pingedKeys
    var changed = false
    for (var i = 0; i < soon.length; i++) {
      var key = Model.gameKey(soon[i])
      if (nextPinged[key]) continue
      if (!changed) {
        nextPinged = {}
        for (var k in pingedKeys) nextPinged[k] = true
        changed = true
      }
      nextPinged[key] = true
      if (alertSound) playPing()
      blinkUntil = Date.now() + 10000
      blinkStopTimer.restart()
    }
    if (changed) pingedKeys = nextPinged
  }

  function playPing() {
    if (pingProc.running) {
      pingProc.running = false
      Qt.callLater(function() {
        pingProc.command = Model.playPingCommand(alertSoundFile, bundledHorn)
        pingProc.running = true
      })
      return
    }
    pingProc.command = Model.playPingCommand(alertSoundFile, bundledHorn)
    pingProc.running = true
  }

  function loadMock() {
    applyGames(Model.mockGames(), "mock")
    lastError = ""
  }

  function refresh() {
    fetchAttempt = 0
    tvAttempt = 0
    fetchRetryTimer.stop()
    tvRetryTimer.stop()
    startTvFetch()
    if (useMock) {
      loadMock()
      return
    }
    startFetch()
  }

  function startTvFetch() {
    if (!tvGuideUrl) return
    tvProc.command = Model.tvCurl(tvGuideUrl, 20, Model.MAX_HTML_BYTES)
    if (tvProc.running) {
      tvProc.running = false
      Qt.callLater(function() { tvProc.running = true })
      return
    }
    tvProc.running = true
  }

  function startFetch() {
    fetchProc.command = Model.cappedCurl(scheduleUrl, 20, Model.MAX_HTML_BYTES)
    if (fetchProc.running) {
      fetchProc.running = false
      Qt.callLater(function() { fetchProc.running = true })
      return
    }
    fetchProc.running = true
  }

  // Vid boot är nätverket ofta inte uppe än när skalet startar. Då får curl
  // inget svar alls. I stället för att direkt visa ett fel försöker vi igen
  // med backoff (5 s, 10 s, 20 s, 30 s, 1 min, 2 min) och behåller senaste
  // lyckade data under tiden.
  function handleFetchFailure(kind) {
    var delay = Model.retryDelayMs(fetchAttempt)
    fetchAttempt = fetchAttempt + 1
    var haveData = rawGames.length > 0
    if (delay >= 0) {
      if (!haveData) {
        sourceLabel = "hämtar"
        lastError = kind === "empty"
          ? "Väntar på nätverk… nytt försök om " + Math.round(delay / 1000) + " s"
          : "Hämtar matcher… nytt försök om " + Math.round(delay / 1000) + " s"
      }
      fetchRetryTimer.interval = delay
      fetchRetryTimer.restart()
      return
    }
    if (haveData) return
    if (kind === "empty") {
      lastError = "Kunde inte hämta swehockey (inget svar)"
      sourceLabel = "fetch-fail"
    } else {
      lastError = "Kunde inte parsa swehockey"
      sourceLabel = "parse-fail"
    }
  }

  function handleTvFailure() {
    var delay = Model.retryDelayMs(tvAttempt)
    tvAttempt = tvAttempt + 1
    if (delay < 0) return
    tvRetryTimer.interval = delay
    tvRetryTimer.restart()
  }

  function openSite() {
    Qt.openUrlExternally("https://www.shl.se/game-schedule")
  }

  Component.onCompleted: refresh()

  onFavoriteTeamChanged: rebuild()
  onUseMockChanged: refresh()
  onScheduleUrlChanged: { if (!useMock) refresh() }
  onTvGuideUrlChanged: startTvFetch()

  Timer {
    id: pollTimer
    interval: liveNow ? refreshSecondsLive * 1000 : refreshMinutesIdle * 60 * 1000
    running: true
    repeat: true
    onTriggered: refresh()
  }

  Timer {
    id: fetchRetryTimer
    interval: 5000
    repeat: false
    onTriggered: { if (!useMock) startFetch() }
  }

  Timer {
    id: tvRetryTimer
    interval: 5000
    repeat: false
    onTriggered: startTvFetch()
  }

  Timer {
    id: alertTimer
    interval: 15000
    running: true
    repeat: true
    onTriggered: {
      if (!rawGames.length) return
      rebuild()
    }
  }

  Timer {
    id: blinkStopTimer
    interval: 10000
    repeat: false
    onTriggered: blinkUntil = 0
  }

  Process {
    id: pingProc
    command: Model.playPingCommand()
  }

  Process {
    id: tvProc
    stdout: StdioCollector {
      onStreamFinished: {
        var parsed = { listings: [], games: [] }
        try {
          parsed = Model.parseTvGuideFull(this.text)
        } catch (e) {
          parsed = { listings: [], games: [] }
        }
        if (parsed.listings && parsed.listings.length) {
          tvAttempt = 0
          tvRetryTimer.stop()
          tvListings = parsed.listings
        } else {
          // Behåll senaste kända kanaler och försök igen senare.
          handleTvFailure()
        }
        if (parsed.games && parsed.games.length) {
          if (useMock || !rawGames.length || sourceLabel === "parse-fail" || sourceLabel === "fetch-fail" || sourceLabel === "hämtar") {
            applyGames(parsed.games, "tv.nu")
            return
          }
        }
        rebuild()
      }
    }
    stderr: StdioCollector {}
  }

  Process {
    id: fetchProc
    stdout: StdioCollector {
      onStreamFinished: {
        var raw = this.text
        var parsed = []
        try {
          parsed = Model.parseScheduleHtml(raw)
        } catch (e) {
          parsed = []
        }
        if (!parsed.length) {
          handleFetchFailure(Model.fetchFailureKind(raw))
          return
        }
        fetchAttempt = 0
        fetchRetryTimer.stop()
        applyGames(parsed, "swehockey")
        lastError = ""
      }
    }
    // Felhantering sker i onStreamFinished ovan (exit-koden är från `head`
    // i pipen och säger inget om curl lyckades).
    stderr: StdioCollector {}
  }

  KeyboardPanel {
    id: panel
    anchorItem: root.anchorItem
    owner: root.hostWidget || root
    bar: root.bar
    open: root.opened
    focusTarget: keyCatcher
    contentWidth: panel.fittedContentWidth(Style.space(320))
    contentHeight: panel.fittedContentHeight(content.implicitHeight)

    PanelKeyCatcher {
      id: keyCatcher
      anchors.fill: parent
      onCloseRequested: root.close()
      onTabRequested: function(direction) { root.switchPanel(direction) }

      Column {
        id: content
        width: parent.width
        spacing: Style.space(8)

        Row {
          width: parent.width
          spacing: Style.space(8)

          Text {
            text: "SHL"
            color: contentForeground
            font.family: contentFontFamily
            font.pixelSize: Style.font.subtitle
            font.bold: true
          }

          Text {
            text: liveNow ? "LIVE" : sourceLabel
            color: liveNow ? contentForeground : mutedForeground
            font.family: contentFontFamily
            font.pixelSize: Style.font.bodySmall
            anchors.verticalCenter: parent.verticalCenter
          }
        }

        Text {
          width: parent.width
          visible: !!lastError
          text: lastError
          color: mutedForeground
          wrapMode: Text.WordWrap
          font.family: contentFontFamily
          font.pixelSize: Style.font.caption
        }

        Repeater {
          model: groups

          Column {
            width: content.width
            spacing: Style.space(4)

            Text {
              text: modelData.label
              color: mutedForeground
              font.family: contentFontFamily
              font.pixelSize: Style.font.bodySmall
            }

            Repeater {
              model: modelData.games

              Rectangle {
                width: content.width
                implicitHeight: row.implicitHeight + Style.space(6)
                color: "transparent"

                Row {
                  id: row
                  anchors.left: parent.left
                  anchors.right: parent.right
                  anchors.verticalCenter: parent.verticalCenter
                  spacing: Style.space(8)

                  Text {
                    width: 42
                    text: modelData.status === "scheduled" ? modelData.timeLabel : Model.statusSv(modelData.status)
                    color: modelData.status === "live" ? contentForeground : mutedForeground
                    font.family: contentFontFamily
                    font.pixelSize: Style.font.bodySmall
                    font.bold: modelData.status === "live"
                  }

                  Text {
                    text: modelData.homeShort + "–" + modelData.awayShort
                    color: contentForeground
                    font.family: contentFontFamily
                    font.pixelSize: Style.font.bodySmall
                    font.bold: modelData.status === "live"
                  }

                  Text {
                    visible: modelData.status !== "scheduled"
                    text: Model.scoreText(modelData)
                    color: contentForeground
                    font.family: contentFontFamily
                    font.pixelSize: Style.font.bodySmall
                  }

                  Text {
                    visible: !!modelData.channelShort
                    text: modelData.channelShort
                    color: mutedForeground
                    font.family: contentFontFamily
                    font.pixelSize: Style.font.bodySmall
                    elide: Text.ElideRight
                  }
                }
              }
            }
          }
        }

        Text {
          width: parent.width
          text: "Mellanklick uppdaterar. Klicka SHL.se nedan."
          color: mutedForeground
          wrapMode: Text.WordWrap
          font.family: contentFontFamily
          font.pixelSize: Style.font.caption
        }

        WidgetButton {
          bar: root.bar
          text: "Öppna shl.se"
          onPressed: function() { root.openSite() }
        }
      }
    }
  }
}
