import QtQuick
import qs.Commons
import qs.Ui
import "Model.js" as Model

BarWidget {
  id: root
  moduleName: "oma.shl"

  function injectPanel() {
    var target = panelLoader.item
    if (!target) return
    if ("bar" in target) target.bar = root.bar
    if ("settings" in target) target.settings = root.settings
    if ("anchorItem" in target) target.anchorItem = button
    if ("hostWidget" in target) target.hostWidget = root
  }

  function refresh() {
    if (panelLoader.item && panelLoader.item.refresh) panelLoader.item.refresh()
  }

  function togglePanel() {
    if (panelLoader.item && panelLoader.item.toggle) panelLoader.item.toggle()
  }

  readonly property bool opened: panelLoader.item ? panelLoader.item.opened === true : false
  readonly property bool popoutSwitchClosing: panelLoader.item ? panelLoader.item.popoutSwitchClosing === true : false
  readonly property string label: panelLoader.item ? panelLoader.item.label : "SHL"
  readonly property string tooltip: panelLoader.item ? panelLoader.item.tooltipText : "SHL"
  readonly property bool alertActive: panelLoader.item ? panelLoader.item.alertActive === true : false

  function open() {
    if (panelLoader.item && panelLoader.item.openFromHotkey) panelLoader.item.openFromHotkey()
  }

  function close() {
    if (panelLoader.item && panelLoader.item.close) panelLoader.item.close()
  }

  function closeForPopoutSwitch() {
    if (panelLoader.item) panelLoader.item.closeForPopoutSwitch()
  }

  implicitWidth: button.implicitWidth
  implicitHeight: button.implicitHeight

  onBarChanged: injectPanel()
  onSettingsChanged: injectPanel()

  Loader {
    id: panelLoader
    active: true
    source: Qt.resolvedUrl("Panel.qml")
    visible: false
    onLoaded: {
      root.injectPanel()
      Qt.callLater(root.injectPanel)
    }
  }

  WidgetButton {
    id: button
    anchors.fill: parent
    bar: root.bar
    text: Model.asPlain(root.label, Model.MAX_LABEL)
    tooltipText: Model.asPlain(root.tooltip, Model.MAX_TOOLTIP)
    fontSize: 13
    horizontalMargin: 10
    verticalPadding: 8
    opacity: blinkAnim.running && blinkAnim.dimmed ? 0.25 : 1

    onPressed: function(b) {
      if (b === Qt.MiddleButton) root.refresh()
      else root.togglePanel()
    }

    Behavior on opacity { NumberAnimation { duration: 180 } }
  }

  Timer {
    id: blinkAnim
    property bool dimmed: false
    interval: 500
    running: root.alertActive
    repeat: true
    onTriggered: dimmed = !dimmed
    onRunningChanged: if (!running) dimmed = false
  }
}
