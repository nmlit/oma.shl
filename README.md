# SHL för Omarchy

Bar-widget som visar nästa SHL-match. Klick öppnar en panel med kommande matcher och ställning.

Plugin-id: `oma.shl`

## Installera

### Installera från GitHub

```bash
omarchy plugin add https://github.com/nmlit/oma.shl.git --enable
```

Kopiera mappen till plugin-katalogen (inga symlinks — Omarchy vägrar dem):

```bash
cp -a oma.shl ~/.config/omarchy/plugins/oma.shl
omarchy plugin validate ~/.config/omarchy/plugins/oma.shl
omarchy plugin enable oma.shl --section right
```

Eller, när du lagt upp den på GitHub:

```bash
omarchy plugin add https://github.com/nmlit/oma.shl.git --enable
```

Flytta i baren:

```bash
omarchy bar move oma.shl --section right
```

## Användning

| Input | Effekt |
|---|---|
| Vänsterklick | Öppna/stäng panel |
| Mellanklick | Hämta om |

Baren visar t.ex. `lör 15:15 FHC–VLH` eller `FHC 2–1 VLH` när en match klassas som live.

## Inställningar

```bash
omarchy bar set oma.shl favoriteTeam "DIF"
omarchy bar set oma.shl useMock false
omarchy bar set oma.shl scheduleUrl "https://stats.swehockey.se/ScheduleAndResults/Schedule/20961"
omarchy bar set oma.shl refreshMinutesIdle 20
omarchy bar set oma.shl refreshSecondsLive 45
omarchy bar set oma.shl alertMinutes 10
omarchy bar set oma.shl alertSound true
omarchy bar set oma.shl alertBlink true
```

10 min före avspark blinkar baren i 10 sekunder. Standardljud är `goalhorn.ogg` i plugin-mappen. Eget ljud via `alertSoundFile`.

`useMock` är av som default. Slå på bara om du vill testa den inbyggda premiäromgången.

Säsongs-id i URL:en byts varje år. 2026/27 = `20961`.

## Data

- Mock: inbyggt schema.
- Live-källa: HTML från stats.swehockey.se via `curl`. Parsern är medvetet enkel och går sönder om sidans markup ändras. Då faller pluginet tillbaka till senast lyckad lista / mock.
- Det finns ingen officiell publik live-feed. “LIVE” sätts om klockan ligger inom tre timmar efter avspark och resultatet inte är markerat som slut. Ställning kräver att swehockey-sidan redan har siffror.

## Filstruktur

```
manifest.json
BarWidget.qml
Panel.qml
Model.js
README.md
LICENSE
```

`Model.js` äger parse, kortnamn och mock. Byt datakälla där, inte i QML.
