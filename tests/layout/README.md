# Layout- und Visuelle Regressionstests

Prüft die überarbeiteten Bereiche automatisch auf Desktop (1280 px) und Mobil (390 px):

- Startseite (`/`)
- Demo-Feed / Memory-Cards (`/demo`)
- Feed (`/feed`)
- Galerie (`/gallery`)
- Stammbaum (`/tree`)
- Vault (`/vault`)

Geprüft wird je Seite und Breakpoint:

1. kein horizontales Scrollen der Seite
2. kein Element, das über den rechten Rand hinausragt
3. kein abgeschnittener Text (ohne bewusstes `truncate`/`overflow-hidden`)
4. keine Fehler in der Browser-Konsole
5. Pixel-Vergleich gegen die Referenzbilder in `baseline/` (Toleranz 1 %)

Zusätzlich werden zu kleine Tippflächen (< 40 px) auf Mobil als Hinweis gemeldet –
sie lassen den Test nicht fehlschlagen.

## Ausführen

```bash
bun run test:layout                     # alle Prüfungen
UPDATE_BASELINE=1 bun run test:layout   # aktuelle Darstellung als neue Referenz übernehmen
```

Nach einer beabsichtigten Designänderung: `UPDATE_BASELINE=1` ausführen und die
neuen Bilder in `baseline/` mit einchecken.

## Optionen (Umgebungsvariablen)

| Variable | Standard | Bedeutung |
| --- | --- | --- |
| `BASE_URL` | `http://localhost:8080` | zu prüfende Instanz |
| `TEST_EMAIL` / `TEST_PASSWORD` | dev1-Konto | Anmeldung für die geschützten Bereiche |
| `PIXEL_TOLERANCE` | `0.01` | erlaubter Anteil abweichender Pixel |
| `UPDATE_BASELINE` | – | `1` schreibt neue Referenzbilder |

Voraussetzung: Python 3 mit `playwright` und `pillow`. Der Test liest nur Seiten,
er verändert keine Daten. Ergebnisse landen in `current/` und `last-run.json`
(beide nicht eingecheckt).
