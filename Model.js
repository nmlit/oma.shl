.pragma library

var MAX_HTML_BYTES = 800000
var MAX_LABEL = 40
var MAX_TOOLTIP = 240

var SHORT = {
  "Frölunda HC": "FHC",
  "Växjö Lakers HC": "VLH",
  "Växjö Lakers": "VLH",
  "HV 71": "HV71",
  "HV71": "HV71",
  "IF Malmö Redhawks": "MIF",
  "Malmö Redhawks": "MIF",
  "Linköping HC": "LHC",
  "Linköpings HC": "LHC",
  "Timrå IK": "TIK",
  "Skellefteå AIK": "SKE",
  "Brynäs IF": "BIF",
  "Luleå HF": "LHF",
  "Luleå Hockey": "LHF",
  "Rögle BK": "RBK",
  "Färjestad BK": "FBK",
  "Färjestads BK": "FBK",
  "Örebro HK": "ÖRE",
  "Örebro Hockey": "ÖRE",
  "Örebro HC": "ÖRE",
  "Djurgårdens IF": "DIF",
  "Djurgården": "DIF",
  "IF Björklöven": "BJK",
  "Björklöven": "BJK",
  "Leksands IF": "LIF"
}

function isTeam(s) {
  var n = trim(s)
  if (!n || n.length > 40) return false
  if (SHORT[n]) return true
  var keys = Object.keys(SHORT)
  for (var k = 0; k < keys.length; k++) {
    if (n === keys[k] || n.indexOf(keys[k]) === 0) return true
  }
  return /(HC|HK|IF|BK|IK|HF|Hockey|Lakers|Redhawks|AIK)$/i.test(n)
}

function shortName(name) {
  var n = trim(name)
  if (SHORT[n]) return SHORT[n]
  var keys = Object.keys(SHORT)
  for (var i = 0; i < keys.length; i++) {
    if (n.indexOf(keys[i]) !== -1 || keys[i].indexOf(n) !== -1)
      return SHORT[keys[i]]
  }
  return n.replace(/\s+(HC|HK|IF|BK|IK|HF)$/i, "").slice(0, 8)
}

function trim(v) {
  return String(v || "").replace(/^\s+|\s+$/g, "")
}

function asPlain(v, maxLen) {
  var s = String(v || "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .replace(/[<>&]/g, "")
    .replace(/\s+/g, " ")
  s = trim(s)
  var cap = parseInt(maxLen, 10)
  if (!isFinite(cap) || cap <= 0) cap = 80
  if (s.length > cap) s = s.slice(0, cap)
  return s
}

function pad2(n) {
  return (n < 10 ? "0" : "") + n
}

function parseIsoLocal(iso) {
  var m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/)
  if (!m) return null
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]), 0, 0)
}

function weekdaySv(d) {
  var names = ["sön", "mån", "tis", "ons", "tor", "fre", "lör"]
  return names[d.getDay()]
}

function dateKey(d) {
  return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate())
}

function mockGames() {
  return [
    g("2026-09-19T15:15", "Frölunda HC", "Växjö Lakers HC", "Scandinavium"),
    g("2026-09-19T15:15", "HV71", "Malmö Redhawks", "Husqvarna Garden"),
    g("2026-09-19T15:15", "Linköping HC", "Timrå IK", "Saab Arena"),
    g("2026-09-19T15:15", "Skellefteå AIK", "Brynäs IF", "Skellefteå Kraft Arena"),
    g("2026-09-19T18:00", "Luleå HF", "Rögle BK", "Coop Norrbotten Arena"),
    g("2026-09-19T18:00", "Färjestad BK", "Örebro HK", "Löfbergs Arena"),
    g("2026-09-19T18:00", "Djurgårdens IF", "IF Björklöven", "Avicii Arena"),
    g("2026-09-22T19:00", "Frölunda HC", "Färjestad BK", "Scandinavium"),
    g("2026-09-22T19:00", "Linköping HC", "Brynäs IF", "Saab Arena"),
    g("2026-09-22T19:00", "Rögle BK", "Djurgårdens IF", "Catena Arena"),
    g("2026-09-22T19:00", "Timrå IK", "Örebro HK", "SCA Arena"),
    g("2026-09-22T19:00", "Växjö Lakers HC", "Malmö Redhawks", "Vida Arena")
  ]
}

function g(iso, home, away, venue, homeScore, awayScore, status) {
  return {
    start: iso,
    home: home,
    away: away,
    venue: venue || "",
    homeScore: homeScore === undefined ? null : homeScore,
    awayScore: awayScore === undefined ? null : awayScore,
    status: status || "scheduled"
  }
}

function classify(game, now) {
  var start = parseIsoLocal(game.start)
  if (!start) return "scheduled"
  if (now < start) return "scheduled"
  var endGuess = new Date(start.getTime() + 3 * 60 * 60 * 1000)
  if (now > endGuess) return "final"
  if (game.status === "final") return "final"
  return "live"
}

function matchesFavorite(game, favorite) {
  var fav = trim(favorite).toLowerCase()
  if (!fav) return true
  var hay = (game.home + " " + game.away + " " + shortName(game.home) + " " + shortName(game.away)).toLowerCase()
  return hay.indexOf(fav) !== -1
}

function enrich(games, now, favorite) {
  var out = []
  for (var i = 0; i < games.length; i++) {
    var game = games[i]
    if (!matchesFavorite(game, favorite)) continue
    var status = classify(game, now)
    var start = parseIsoLocal(game.start)
    out.push({
      start: game.start,
      home: game.home,
      away: game.away,
      venue: game.venue || "",
      homeScore: status === "scheduled" ? null : game.homeScore,
      awayScore: status === "scheduled" ? null : game.awayScore,
      status: status,
      homeShort: shortName(game.home),
      awayShort: shortName(game.away),
      timeLabel: start ? pad2(start.getHours()) + ":" + pad2(start.getMinutes()) : "",
      dayLabel: start ? weekdaySv(start) + " " + pad2(start.getDate()) + "/" + pad2(start.getMonth() + 1) : "",
      dateKey: start ? dateKey(start) : "",
      sort: start ? start.getTime() : 0,
      channel: game.channel || "",
      channelShort: game.channelShort || ""
    })
  }
  out.sort(function (a, b) { return a.sort - b.sort })
  return out
}

function pickHeadline(games) {
  var live = firstStatus(games, "live")
  if (live) return live
  var next = firstStatus(games, "scheduled")
  if (next) return next
  if (games.length) return games[games.length - 1]
  return null
}

function firstStatus(games, status) {
  for (var i = 0; i < games.length; i++) {
    if (games[i].status === status) return games[i]
  }
  return null
}

function hasLive(games) {
  return !!firstStatus(games, "live")
}

function gameKey(game) {
  return String((game && game.start) || "") + "|" + String((game && game.homeShort) || game.home || "")
}

function minutesUntilStart(game, now) {
  if (!game || !game.sort) return null
  return (game.sort - now.getTime()) / 60000
}

function startingSoon(games, now, minutes) {
  var windowMin = Math.max(1, parseInt(minutes, 10) || 10)
  var hits = []
  for (var i = 0; i < games.length; i++) {
    var g0 = games[i]
    if (g0.status !== "scheduled") continue
    var left = minutesUntilStart(g0, now)
    if (left === null) continue
    if (left > 0 && left <= windowMin) hits.push(g0)
  }
  return hits
}

function playPingCommand(customPath, bundledPath) {
  var custom = String(customPath || "").replace(/'/g, "")
  var bundled = String(bundledPath || "").replace(/'/g, "")
  var pick = "f=''; " +
    (custom ? "if [ -f '" + custom + "' ]; then f='" + custom + "'; fi; " : "") +
    (bundled ? "if [ -z \"$f\" ] && [ -f '" + bundled + "' ]; then f='" + bundled + "'; fi; " : "") +
    "if [ -z \"$f\" ]; then " +
    "for c in /usr/share/sounds/freedesktop/stereo/complete.oga " +
    "/usr/share/sounds/freedesktop/stereo/message.oga " +
    "/usr/share/sounds/freedesktop/stereo/dialog-information.oga " +
    "/usr/share/sounds/freedesktop/stereo/message-new-instant.oga; do " +
    "[ -f \"$c\" ] && f=$c && break; done; fi; "
  return [
    "/bin/sh", "-c",
    pick +
    "notify-send -a oma.shl -u normal 'SHL' '10 minuter till nedsläpp' >/dev/null 2>&1 || true; " +
    "if [ -n \"$f\" ] && [ -x /usr/bin/pw-play ]; then /usr/bin/pw-play \"$f\" && exit 0; fi; " +
    "if [ -n \"$f\" ] && [ -x /usr/bin/paplay ]; then /usr/bin/paplay \"$f\" && exit 0; fi; " +
    "if [ -n \"$f\" ] && [ -x /usr/bin/ffplay ]; then /usr/bin/ffplay -nodisp -autoexit -loglevel quiet \"$f\" && exit 0; fi; " +
    "if [ -x /usr/bin/canberra-gtk-play ]; then /usr/bin/canberra-gtk-play -i message; fi"
  ]
}

function barLabel(game, compact) {
  if (!game) return "SHL"
  if (game.status === "live") {
    return game.homeShort + " " + scoreText(game) + " " + game.awayShort
  }
  if (game.status === "final") {
    return game.homeShort + " " + scoreText(game) + " " + game.awayShort
  }
  if (compact)
    return game.homeShort + "–" + game.awayShort
  return game.dayLabel + " " + game.timeLabel + " " + game.homeShort + "–" + game.awayShort
}

function scoreText(game) {
  if (game.homeScore === null || game.awayScore === null) return "–"
  return game.homeScore + "–" + game.awayScore
}

function tooltip(games, favorite) {
  if (!games.length) return "Inga matcher"
  var lines = []
  var n = Math.min(games.length, 8)
  for (var i = 0; i < n; i++) {
    var g0 = games[i]
    var mid = g0.status === "scheduled" ? g0.timeLabel : scoreText(g0)
    var extra = g0.channelShort ? " · " + g0.channelShort : ""
    lines.push(g0.dayLabel + " " + g0.homeShort + " " + mid + " " + g0.awayShort + extra)
  }
  if (favorite) lines.unshift("Favorit: " + favorite)
  return asPlain(lines.join("\n"), MAX_TOOLTIP)
}

function groupByDate(games) {
  var groups = []
  var map = {}
  for (var i = 0; i < games.length; i++) {
    var key = games[i].dateKey || "?"
    if (!map[key]) {
      map[key] = { key: key, label: games[i].dayLabel, games: [] }
      groups.push(map[key])
    }
    map[key].games.push(games[i])
  }
  return groups
}

function statusSv(status) {
  if (status === "live") return "LIVE"
  if (status === "final") return "SLUT"
  return ""
}

var TV_FALLBACK_URL = "https://www.tvmatchen.nu/ishockey/shl/"

var MONTHS_MAP = {
  "jan": 0, "feb": 1, "mar": 2, "apr": 3, "may": 4, "maj": 4, "jun": 5,
  "jul": 6, "aug": 7, "sep": 8, "oct": 9, "okt": 9, "nov": 10, "dec": 11
}

var TVMATCHEN_CHANNELS = {
  "816": "TV4 Hockey",
  "817": "TV4 Sport Live 1",
  "818": "TV4 Sport Live 2",
  "819": "TV4 Sport Live 3",
  "821": "TV4 Sport Live 4",
  "822": "TV4 Sportkanalen",
  "823": "TV4",
  "830": "TV12",
  "1133": "TV4 Tennis",
  "1134": "TV4 Motor",
  "2182": "Sjuan"
}

// Nätverket är ofta inte uppe när skalet startar (t.ex. direkt efter boot).
// curl försöker själv några gånger, och Panel.qml gör dessutom egna omförsök
// med backoff innan ett fel visas.
var CURL_RETRY_OPTS = "--connect-timeout 10 --retry 3 --retry-delay 2 --retry-connrefused --retry-all-errors --retry-max-time 40"

// Väntetid (ms) före omförsök nr `attempt` (0-baserat). -1 = ge upp och
// vänta på ordinarie uppdateringsintervall.
var RETRY_DELAYS_MS = [5000, 10000, 20000, 30000, 60000, 120000]

function retryDelayMs(attempt) {
  var n = Number(attempt)
  if (!(n >= 0) || n >= RETRY_DELAYS_MS.length) return -1
  return RETRY_DELAYS_MS[Math.floor(n)]
}

function fetchFailureKind(raw) {
  // "empty" = inget svar alls (nätverk/DNS ej uppe), "parse" = svar men gick inte att tolka
  var s = String(raw || "")
  return s.replace(/\s+/g, "").length < 80 ? "empty" : "parse"
}

function cappedCurl(url, timeoutSec, maxBytes) {
  return [
    "sh", "-c",
    "curl -fsSL -A 'oma.shl/0.1' " + CURL_RETRY_OPTS + " --max-time \"$2\" -o - -- \"$1\" | head -c \"$3\"",
    "oma.shl-fetch",
    String(url || ""),
    String(timeoutSec),
    String(maxBytes)
  ]
}

function tvCurl(url, timeoutSec, maxBytes) {
  var primary = String(url || "")
  var secondary = primary.indexOf("tvmatchen.nu") !== -1 ? "" : TV_FALLBACK_URL
  return [
    "sh", "-c",
    "curl -fsSL -A 'oma.shl/0.1' " + CURL_RETRY_OPTS + " --max-time \"$2\" -o - -- \"$1\" 2>/dev/null | head -c \"$3\" || true; " +
    "if [ -n \"$4\" ]; then printf '\\n'; curl -fsSL -A 'oma.shl/0.1' " + CURL_RETRY_OPTS + " --max-time \"$2\" -o - -- \"$4\" 2>/dev/null | head -c \"$3\" || true; fi",
    "oma.shl-tv-fetch",
    primary,
    String(timeoutSec),
    String(maxBytes),
    secondary
  ]
}

function stripTags(html) {
  return String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\u00a0/g, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#(\d+);/g, function (_, n) { return String.fromCharCode(Number(n)) })
    .replace(/<[^>]+>/g, "\n")
    .replace(/\r/g, "")
}

function parseScheduleHtml(raw) {
  if (!raw || String(raw).length < 80) return []
  var text = stripTags(raw)
  var lines = text.split("\n")
  var cleaned = []
  for (var i = 0; i < lines.length; i++) {
    var line = trim(lines[i].replace(/\s+/g, " "))
    if (line) cleaned.push(line)
  }

  var games = []
  var date = ""
  var time = ""
  var venue = ""
  var scoreHome = null
  var scoreAway = null
  var status = "scheduled"

  function resetExtras() {
    venue = ""
    scoreHome = null
    scoreAway = null
    status = "scheduled"
  }

  var dateRe = /^(\d{4}-\d{2}-\d{2})$/
  var timeRe = /^(\d{1,2}):(\d{2})$/
  var scoreRe = /^(\d+)\s*[-–]\s*(\d+)(?:\s*(OT|SO|e\.fl\.|e\.str\.))?$/i
  var pairRe = /^(.+?)\s+[-–]\s+(.+)$/

  function isVenue(s) {
    return /Arena|Garden|Scandinavium|Hovet|Avicii|Behrn|Monitor|Catena|Vida|Saab|SCA|Löfbergs|Kraft|Husqvarna|Norrbotten|Visionite/i.test(s)
  }

  var pendingHome = ""

  for (var j = 0; j < cleaned.length; j++) {
    var s = cleaned[j]
    if (dateRe.test(s)) {
      date = s
      pendingHome = ""
      continue
    }
    var tm = s.match(timeRe)
    if (tm && Number(tm[1]) < 24) {
      time = pad2(Number(tm[1])) + ":" + tm[2]
      continue
    }
    var sc = s.match(scoreRe)
    if (sc && games.length && !pendingHome) {
      games[games.length - 1].homeScore = Number(sc[1])
      games[games.length - 1].awayScore = Number(sc[2])
      games[games.length - 1].status = "final"
      continue
    }
    if (/^(Efter match|Slutresultat|Live|Pågår)$/i.test(s)) {
      if (/live|pågår/i.test(s)) status = "live"
      else if (scoreHome !== null) status = "final"
      continue
    }
    if (s === "-" || s === "–") continue
    if (isVenue(s)) {
      venue = s
      continue
    }
    var p = s.match(pairRe)
    if (p && isTeam(p[1]) && isTeam(p[2]) && date && time) {
      games.push(g(date + "T" + time, trim(p[1]), trim(p[2]), venue, scoreHome, scoreAway, status))
      resetExtras()
      pendingHome = ""
      continue
    }
    if (isTeam(s)) {
      if (!pendingHome) pendingHome = s
      else if (date && time) {
        games.push(g(date + "T" + time, pendingHome, s, venue, scoreHome, scoreAway, status))
        resetExtras()
        pendingHome = ""
      }
    }
  }
  return games
}

function teamNorm(name) {
  return trim(name)
    .toLowerCase()
    .replace(/[.]/g, "")
    .replace(/\s+/g, " ")
    .replace(/ if$| hc$| hk$| bk$| ik$| hf$| aik$| hockey$/g, "")
    .replace(/^if /, "")
    .replace("färjestads", "färjestad")
    .replace("färjestad", "färjestad")
    .replace("linköpings", "linköping")
    .replace("djurgårdens", "djurgården")
    .replace("malmö redhawks", "malmö")
    .replace("växjö lakers", "växjö")
    .replace("hv 71", "hv71")
}

function pairKey(home, away) {
  return teamNorm(home) + "|" + teamNorm(away)
}

function isLinearChannel(name) {
  var n = String(name || "")
  if (/play/i.test(n)) return false
  return /TV4/i.test(n)
}

function channelRank(name) {
  var n = String(name || "")
  if (/Hockey HD/i.test(n)) return 1
  if (/Hockey/i.test(n)) return 2
  if (/^TV4$/i.test(n) || /TV4 HD/i.test(n)) return 3
  if (/Sportkanalen/i.test(n)) return 4
  var live = n.match(/Sport Live\s*(\d)/i)
  if (live) return 10 + Number(live[1])
  if (/Motor/i.test(n)) return 20
  return 50
}

function shortChannel(name) {
  var n = trim(name)
  if (/Hockey HD/i.test(n)) return "TV4 Hockey HD"
  if (/Hockey/i.test(n)) return "TV4 Hockey"
  if (/Sportkanalen/i.test(n)) return "TV4 Sportkanalen"
  var live = n.match(/Sport Live\s*(\d)/i)
  if (live) return "TV4 Sport Live " + live[1]
  if (/^TV4$/i.test(n) || /TV4 HD/i.test(n)) return "TV4"
  if (/Motor/i.test(n)) return "TV4 Motor"
  return n
}

function pickLinearChannel(channels) {
  var best = ""
  var bestRank = 999
  for (var i = 0; i < channels.length; i++) {
    var c = channels[i]
    if (!isLinearChannel(c)) continue
    var r = channelRank(c)
    if (r < bestRank) {
      bestRank = r
      best = c
    }
  }
  return best ? shortChannel(best) : ""
}

function extractTvState(raw) {
  var html = String(raw || "")
  var m = html.match(/__INITIAL_STATE__\s*=\s*"((?:\\.|[^"\\])*)"/)
  if (!m) return null
  try {
    var text = JSON.parse("\"" + m[1] + "\"")
    var data = JSON.parse(text)
    return data && data.sportPageSchedule ? data : null
  } catch (e) {
    return null
  }
}

function isoFromMs(ms) {
  var d = new Date(Number(ms))
  if (!isFinite(d.getTime())) return ""
  return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()) +
    "T" + pad2(d.getHours()) + ":" + pad2(d.getMinutes())
}

function parseTvNuFull(raw) {
  var empty = { listings: [], games: [] }
  var data = extractTvState(raw)
  if (!data) return empty
  var sched = data.sportPageSchedule || []
  var listings = []
  var games = []
  for (var i = 0; i < sched.length; i++) {
    var it = sched[i]
    var home = ((it.team1 || {}).name) || ""
    var away = ((it.team2 || {}).name) || ""
    if (!home || !away) continue
    var chans = []
    var broadcasts = it.broadcasts || []
    for (var b = 0; b < broadcasts.length; b++) {
      var cn = ((broadcasts[b].channel || {}).name) || ""
      if (cn) chans.push(cn)
    }
    var channel = pickLinearChannel(chans)
    var start = isoFromMs(it.eventTime)
    if (!start && it.scheduleDate) start = String(it.scheduleDate) + "T00:00"
    var date = start ? start.slice(0, 10) : String(it.scheduleDate || "")
    listings.push({ date: date, home: home, away: away, channel: channel })
    var row = g(start, home, away, "", null, null, "scheduled")
    row.channel = channel
    row.channelShort = channel
    games.push(row)
  }
  return { listings: listings, games: games }
}

function parseTvMatchenFull(raw, nowRef) {
  var empty = { listings: [], games: [] }
  var html = String(raw || "")
  if (html.indexOf("event-rt-main-info") === -1) return empty
  var parts = html.split("<div class=\"event-rt-main-info\">")
  var now = nowRef || new Date()
  var baseYear = now.getFullYear()
  var baseMonth = now.getMonth()
  var listings = []
  var games = []
  for (var i = 1; i < parts.length; i++) {
    var chunk = parts[i].split("<div id=\"")[0]
    var dm = chunk.match(/match-info-rt-time"><b>(\d{1,2})<\/b>\s*<span>([A-Za-zäöåÄÖÅ]+)<\/span>/)
    var tm = chunk.match(/match-info-rt__sport-time"><time>(\d{1,2}):(\d{2})<\/time>/)
    var pm = chunk.match(/match-details-rt-participants"><a[^>]*><div>\s*(?:<!-- -->)?([^<]+?)(?:<!-- -->)?\s*-\s*(?:<!-- -->)?([^<]+?)(?:<!-- -->)?<\/div>/)
    if (!dm || !pm) continue
    var home = trim(pm[1])
    var away = trim(pm[2])
    if (!home || !away) continue
    var day = Number(dm[1])
    var monKey = dm[2].toLowerCase().slice(0, 3)
    var mon = MONTHS_MAP[monKey]
    if (mon === undefined) continue
    var year = mon < baseMonth - 1 ? baseYear + 1 : baseYear
    var hh = tm ? Number(tm[1]) : 0
    var mm = tm ? Number(tm[2]) : 0
    var utcMs = Date.UTC(year, mon, day, hh, mm)
    var start = isoFromMs(utcMs)
    var date = start ? start.slice(0, 10) : ""
    var chanBlockMatch = chunk.match(/match-details-channels-rt">([\s\S]*?)<\/div>\s*<\/div>/)
    var chanSearch = chanBlockMatch ? chanBlockMatch[1] : chunk
    var chans = []
    var iconRe = /icons-channels-rt-(\d+)/g
    var im
    while ((im = iconRe.exec(chanSearch)) !== null) {
      var cn = TVMATCHEN_CHANNELS[im[1]]
      if (cn) chans.push(cn)
    }
    var ariaRe = /aria-label="([^"]+)"/g
    var am
    while ((am = ariaRe.exec(chanSearch)) !== null) {
      if (am[1]) chans.push(am[1])
    }
    var channel = pickLinearChannel(chans)
    listings.push({ date: date, home: home, away: away, channel: channel })
    var row = g(start, home, away, "", null, null, "scheduled")
    row.channel = channel
    row.channelShort = channel
    games.push(row)
  }
  return { listings: listings, games: games }
}

function parseTvGuide(raw) {
  return parseTvGuideFull(raw).listings
}

function parseTvGuideFull(raw, nowRef) {
  var nu = parseTvNuFull(raw)
  var tm = parseTvMatchenFull(raw, nowRef)
  var listings = nu.listings.concat(tm.listings)
  var baseGames = nu.games.length ? nu.games : tm.games
  var games = applyChannels(baseGames, listings)
  return { listings: listings, games: games }
}

function applyChannels(games, listings) {
  if (!listings || !listings.length) return games
  var byDatePair = {}
  var undatedByPair = {}
  for (var i = 0; i < listings.length; i++) {
    var L = listings[i]
    if (!L || !L.channel) continue
    var pk1 = pairKey(L.home, L.away)
    var pk2 = pairKey(L.away, L.home)
    var d = L.date || (L.start ? String(L.start).slice(0, 10) : "")
    if (d) {
      if (!byDatePair[d + "|" + pk1]) byDatePair[d + "|" + pk1] = L.channel
      if (!byDatePair[d + "|" + pk2]) byDatePair[d + "|" + pk2] = L.channel
    } else {
      if (!undatedByPair[pk1]) undatedByPair[pk1] = L.channel
      if (!undatedByPair[pk2]) undatedByPair[pk2] = L.channel
    }
  }
  for (var g = 0; g < games.length; g++) {
    var game = games[g]
    var key = pairKey(game.home, game.away)
    var gd = game.dateKey || (game.start ? String(game.start).slice(0, 10) : "")
    var ch = (gd ? byDatePair[gd + "|" + key] : "") || undatedByPair[key] || ""
    game.channel = ch
    game.channelShort = ch
  }
  return games
}

function upcomingWindow(games, now, daysAhead) {
  var end = now.getTime() + (daysAhead || 10) * 24 * 60 * 60 * 1000
  var startCut = now.getTime() - 6 * 60 * 60 * 1000
  var out = []
  for (var i = 0; i < games.length; i++) {
    var t = games[i].sort || (parseIsoLocal(games[i].start) || { getTime: function () { return 0 } }).getTime()
    if (t >= startCut && t <= end) out.push(games[i])
  }
  return out
}
