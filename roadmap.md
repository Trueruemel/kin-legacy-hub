# Eternal — Memories — Roadmap mit Prioritäten und Wochen-Meilensteinen

Stand: 4. September 2026 · Grundlage: `DOCUMENTATION.md` + Master Feature Catalogue V1.1 (Kunde)

Legende: `[x]` fertig · `[~]` teilweise · `[ ]` offen
Jede Woche endet mit einem **sichtbaren Meilenstein** — etwas, das man im Browser vorführen kann.

---

## Prioritätenlogik

| Priorität | Bedeutung |
| --- | --- |
| **P0** | Blockiert den Beta-Start. Ohne das kann keine echte Familie die App nutzen. |
| **P1** | Nötig, damit die Beta sich vollständig anfühlt und nicht nach Prototyp aussieht. |
| **P2** | Katalog-Features mit hohem Kundenwert, direkt nach der Beta. |
| **P3** | Großbaustellen aus dem Katalog (Story-Runtime, Store, KI-Medien) — eigene Projektphasen. |

---

## Phase A — Beta-Start (P0) · Woche 1–2

### Woche 1 — „Die App ist live, mit Familienprofil und eigener Familien-URL"
- [x] Familienprofil in der Seitenleiste (Name, Rolle, Familien-ID, Direktlink)
- [x] Familien-ID in der URL: `/family/<familien-id>` als teilbare Adresse
- [x] Eigenständige Familienprofil-Seite mit Mitgliedern, Fotos und Terminen
- [x] Geschlossene Vorschau: nur die vorbereiteten Entwickler-/Demo-Konten kommen hinein
- [x] App veröffentlicht, eigene Adresse `eternalmemorys.enterprises` live (04.09.)
- [x] Mailversand auf `notify.eternalmemorys.enterprises` umgestellt, Zone verifiziert (04.09.)
- [ ] Zustellung aller 8 Templates an echte Postfächer prüfen (Signup, Invite, Welcome, Termin …)
- [ ] 13 Security-Linter-Warnungen bewerten und auflösen (1× extension in public, 12× SECURITY DEFINER)
- **Meilenstein:** ✅ erreicht — Kunde öffnet die öffentliche URL, meldet sich mit dev1 an und sieht das Familienprofil.



### Woche 2 — „Eine echte Familie kann komplett starten"
- [ ] Demo-Familien Johnson/Chen strikt nur lesend; echte Familien starten leer
- [ ] Automatischer Serverversand der Einladungen (ohne Umweg über das Mailprogramm)
- [ ] Speicherkontingente pro Familie durchsetzen (Felder existieren, Enforcement fehlt)
- [ ] Benachrichtigungen (`notifications`) in der UI sichtbar machen (Glocke, gelesen/ungelesen)
- [ ] Fehler-/Metrik-Dashboard, Rate-Limits, Backup- und Rollback-Kriterien
- **Meilenstein:** Welle 1 (5 Familien) startet mit einem sauberen, leeren Familienkonto.

---

## Phase B — Beta rund machen (P1) · Woche 3–6

### Woche 3 — Suche & Wiederfinden
- [ ] Volltextsuche über Personen, Erinnerungen, Beiträge, Rezepte (tsvector + Trigram) inkl. UI
- [ ] Feed-Filter (Typ, Person, Zeitraum)
- **Meilenstein:** Ein Name eingeben → Person, Fotos und Beiträge erscheinen sofort.

### Woche 4 — Kalender-Automatik & Adressbuch
- [ ] Automatische Termin-Erinnerungen per Cron (`/api/public/…`) statt manuell
- [ ] Einladungen an alle Teilnehmer statt einzelne Adresse (mit Einwilligung pro Mitglied)
- [ ] Familien-Adressbuch (Katalog 8): Geburtstage, Kontaktweg, Notfallkontakt, privat steuerbar
- **Meilenstein:** Geburtstage und Termine erinnern von selbst.

### Woche 5 — Zeitleiste & „On This Day"
- [ ] Familien-Zeitleiste (Katalog 20): Geburten, Hochzeiten, Umzüge, Erinnerungen, Medien
- [ ] „On This Day" (Katalog 21) auf dem Dashboard
- **Meilenstein:** Dashboard zeigt „Heute vor 40 Jahren …".

### Woche 6 — Konto-Sicherheit & Verwaltung
- [ ] Aktive Sitzungen anzeigen und widerrufen, Login-Historie, Sicherheits-Mails (Katalog 1)
- [ ] Konto löschen / Familie verlassen / Eigentum übertragen (Katalog 4 + 6)
- [ ] 2FA (TOTP)
- **Meilenstein:** Nutzer kann sein Konto vollständig selbst verwalten — DSGVO-tauglich.

---

## Phase C — Kernkatalog ausbauen (P2) · Woche 7–16

| Woche | Paket | Katalog-Nr. | Meilenstein |
| --- | --- | --- | --- |
| 7–8 | Reiche Personenprofile: Beruf, Ausbildung, Militär, Auswanderung, Auszeichnungen, Medien | 13 | Personenseite wie ein Archiv-Steckbrief |
| 9 | Verwandtschaftsrechner („zweiter Cousin, einmal entfernt") | 14 | Zwei Personen wählen → Beziehung wird benannt |
| 10 | Erinnerungs-Prompts + Familien-Challenges | 23, 25 | Wöchentliche Frage per Mail, Antwort wird Erinnerung |
| 11 | Umfragen & geteilte Listen (Einkauf, Reunion, Projekte) | 9, 10 | Familie stimmt über ein Reiseziel ab |
| 12 | Wunschlisten & Geschenkregister | 11 | Geburtstagsliste mit Reservierung |
| 13–14 | Medien-Pipeline: Massen-Upload, Metadaten, Personen-Tagging, Duplikate, Video/Audio-Player | 28–34 | 500 Fotos auf einmal hochladen, Gesichter benennen |
| 15 | Familien-Atlas & Migrationskarten | 18, 66 | Interaktive Karte der Herkunftsorte |
| 16 | Wiki, Traditionen, Journal | 48, 50, 52 | Familienwissen an einem Ort |

**Sichtbarer Zwischenstand Woche 16:** Alle Abschnitte A–C und I–J des Katalogs sind nutzbar.

---

## Phase D — Vermächtnis & Gedenken (P2) · Woche 17–22

- [ ] Farewell Vault: Video- und Sprachnachrichten mit Empfänger und Termin (55)
- [ ] Zeitkapsel: jährliche Beiträge, Öffnung nach Jahren (57)
- [ ] Legacy Steward / Nachlass-Anweisungen (59, 60)
- [ ] Gedenkseiten, QR/NFC, Friedhofs- und Gedenkkarte (61, 62)
- [ ] Erbstücke, Häuser, Haustiere (63, 64, 65)
- **Meilenstein Woche 22:** Ein Gedenk-Profil ist per QR-Code am Grabstein aufrufbar.

---

## Phase E — Großbaustellen (P3) · Woche 23+ , eigene Beauftragung

Diese Bereiche sind je für sich ein Projekt und werden **nicht** in der Beta zugesagt:

| Bereich | Katalog | Aufwand grob |
| --- | --- | --- |
| KI-Medien: Foto-Restaurierung, Gesichtserkennung, Transkription, OCR, Szenenerkennung | 35–40 | 8–12 Wochen |
| Story/Heritage Runtime: Editor, Keyframes, Playback-Engine, Rendering | 42–47 | 12–20 Wochen |
| Buch-Studio & Store (Druckprodukte, Bezahlung, Fulfillment) | 53, 68 | 8–12 Wochen |
| Genealogie-Forschung: Quellen, Belege, Beweisgrade, Zusammenarbeit | 15–17 | 6–8 Wochen |
| Reisen: Trips, Itinerar, Flüge, Hotels, Fahrzeuge | 77–82 | 8–10 Wochen |
| Plattform-Admin, Rollenhierarchie (Founder/Platform Admin), Moderation | 5, 6 | 4–6 Wochen |

---

## Abgleich mit dem Master Feature Catalogue

Der Katalog listet **82+ Funktionsgruppen** (die Vorlage bricht bei Seite 50 / Punkt 82 ab —
Abschnitte hinter „Reisen" sind noch nicht erfasst und müssen nachgeliefert werden).

| Katalog-Abschnitt | Stand heute |
| --- | --- |
| A. Identität, Familien, Social (1–11) | `[~]` Konten, Profile, Familien, Rollen, Feed vorhanden. Offen: 2FA, Sessions, Kontolöschung, Adressbuch, Umfragen, Listen, Wunschlisten |
| B. Stammbaum & Genealogie (12–18) | `[~]` Baum, Personen, Beziehungen vorhanden. Offen: reiche Profile, Verwandtschaftsrechner, Forschung, Quellen, Karten |
| C. Erinnerungen & Historie (19–27) | `[~]` Erinnerungen vorhanden. Offen: Zeitleiste, On This Day, Then & Now, Prompts, Challenges |
| D. Medien & Archiv (28–40) | `[~]` Fotos, Alben, signierte URLs, Vault-Anhänge. Offen: Massen-Upload, Tagging, Duplikate, komplette KI-Schicht |
| E. Storytelling & Heritage (41–47) | `[ ]` nur AI-Story im Vault als Vorgeschmack |
| F. Journale, Interviews, Wiki (48–53) | `[~]` Rezepte vorhanden. Offen: Journal, Interviews, Wiki, Traditionen, Kochbuch |
| G. Legacy & Gedenken (54–68) | `[~]` Legacy Vault fertig inkl. Object Lock. Offen: Farewell, Zeitkapsel, Steward, Gedenkseiten, Erbstücke |
| H./I. Kommunikation (69–74) | `[~]` Chats, Forum, Benachrichtigungen im Datenmodell. Offen: Anhänge, Mentions, Pinnen, Zeitzonen |
| J. Kalender & Organisation (75–82) | `[~]` Kalender + RSVP + Mails fertig. Offen: Aufgaben, Reunion-Planung, Reisen |

**Grobe Erfüllung:** rund **20 %** des Katalogs steht produktionsnah, weitere **15 %** als Fundament
(Datenmodell, Rechte, Storage, Mails), auf dem der Rest deutlich schneller entsteht.

---

## Zeitrahmen (Schätzung, 1 Entwicklerteam Vollzeit)

| Umfang | Dauer | Ergebnis |
| --- | --- | --- |
| Beta-Start (Phase A) | **2 Wochen** | Öffentliche App, echte Mails, 5 Familien |
| Runde Beta (A+B) | **6 Wochen** | 25–100 Familien tragfähig |
| Produkt V1 (A–C) | **4 Monate** | Alle Alltagsfunktionen des Katalogs |
| Produkt V2 (A–D) | **5,5 Monate** | Inklusive Gedenken & Nachlass |
| Vollständiger Katalog (A–E) | **14–20 Monate** | Story-Runtime, KI-Medien, Store, Reisen |

Puffer: die Phasen enthalten je 15 % Reserve. Externe Abhängigkeiten (DNS, App-Store,
Druck-Dienstleister, Zahlungsanbieter) sind darin **nicht** enthalten.

---

## Wochen-Nachverfolgung

Jede Woche wird in dieser Datei abgehakt und mit einem Datum ergänzt:

```text
Woche 1  | 08.–12.09. | Ziel: live + Mailversand      | Status: offen
Woche 2  | 15.–19.09. | Ziel: erste 5 Familien        | Status: offen
```

Regel: Ein Häkchen gibt es nur, wenn der Meilenstein im Browser vorführbar ist.
