# Eternal — Memories — Projektdokumentation

Stand: aktueller Beta-Stand (echte Familien + Investor-Demo parallel)

Eternal — Memories ist eine private Familien- und Nachlass-Plattform. Die App läuft in **zwei Modi**:

1. **Investor-Demo** — wer keine echte Familie hat, sieht die vollständig ausgestalteten Seed-Familien (Johnson / Chen) aus dem Browser-Store. Nichts wird gespeichert.
2. **Echter Beta-Betrieb** — wer sich registriert und eine Familie anlegt, arbeitet auf echter Datenbank, echtem privaten Object Storage und echten, authentifizierten Server-Funktionen.

Die Umschaltung passiert automatisch: sobald `useActiveFamily()` eine echte Familienmitgliedschaft findet, rendern Feed, Family Tree, Gallery, Messages, Members und Vault die realen Komponenten.

## 1. Technischer Stack

| Bereich | Umsetzung |
| --- | --- |
| Framework | TanStack Start v1 (React 19, SSR) |
| Routing | TanStack Router, dateibasiert unter `src/routes` |
| Build | Vite 7 |
| Styling | Tailwind CSS v4 (`src/styles.css`, oklch-Tokens) |
| UI | shadcn/ui + Radix, `lucide-react` |
| Server-Logik | `createServerFn` (typisierte RPCs, Zod-validiert) |
| Datenbank | Cloud-PostgreSQL mit Row Level Security |
| Object Storage | privater Bucket `memories`, kurzlebige signierte URLs |
| Auth | E-Mail + Passwort, HIBP-Check, geschützter Bereich `_authenticated/` |
| Client-State | TanStack Query (echt) + Zustand (Demo) |
| AI | Lovable AI Gateway (`google/gemini-2.5-flash`) für Vault-Stories |
| Sprache | TypeScript, Zod |

## 2. Authentifizierung & Onboarding

- `/auth` — Registrierung und Anmeldung (E-Mail + Passwort). Anonyme Anmeldung ist deaktiviert, Passwörter werden gegen bekannte Leaks geprüft.
- `/onboarding` — erste eigene Familie anlegen; die Gründerin wird automatisch `owner`.
- Alle App-Seiten liegen unter `src/routes/_authenticated/`. Der Layout-Guard leitet ohne Session nach `/auth`.
- Jeder Server-Function-Aufruf trägt den Bearer-Token (`src/lib/auth-attach.ts`), serverseitig validiert `requireSupabaseAuth`.
- Beim ersten Laden wird das Profil sichergestellt und ein fehlender Anzeigename nachgetragen.

## 3. Rollen & Rechte

`family_members.role`: `owner`, `steward`, `member`, `viewer`.

- Lesen: alle Mitglieder der Familie (`is_family_member`)
- Schreiben: `can_edit_family` (owner/steward/member)
- Verwalten (Einladungen, Freigaben): `can_admin_family` (owner/steward)

Alle Tabellen sind familienbezogen per RLS abgeriegelt; ohne Mitgliedschaft ist eine Familie unsichtbar.

## 4. Funktionen (echte Familien)

| Route | Datei | Funktion |
| --- | --- | --- |
| `/feed` | `components/feed-real.tsx`, `lib/feed.functions.ts` | Beiträge schreiben, Fotos hochladen (privat, 15 MB), Reaktionen, Kommentare |
| `/tree` | `components/tree-real.tsx`, `lib/tree.functions.ts` | Personen anlegen, Eltern-/Partner-Beziehungen verknüpfen |
| `/gallery` | `components/gallery-real.tsx`, `lib/gallery.functions.ts` | Alben, Uploads bis 25 MB in privaten Storage, Anzeige über signierte URLs |
| `/vault` | `components/vault-real.tsx`, `lib/vault.functions.ts` | Zeitversiegelte Nachrichten mit Anhang, Countdown, Freigabe, AI-Story |
| `/messages` | `components/messages-real.tsx`, `lib/messages.functions.ts` | Gruppen-/Direktchats, Nachrichten, 8-Sekunden-Refresh |
| `/members` | `routes/_authenticated/members.tsx`, `lib/members.functions.ts` | echte Mitglieder mit Rollen + Einladungsverwaltung |
| `/invite/$token` | `routes/_authenticated/invite.$token.tsx` | Einladung ansehen und annehmen |

Noch im Demo-Modus (Seed-Daten): Kalender, Events, Forum, Rezepte, Profile, Settings.

## 5. Legacy Vault im Detail

- **Versiegeln**: Titel, Text, Empfänger, Freigabedatum, optional eine Datei (Bild, PDF, Text, Audio, Video, 25 MB) unter `memories/<familyId>/vault/<entryId>/<datei>`.
- **Geheimhaltung**: Die Liste kommt aus der Datenbankfunktion `vault_list`. Inhalt, Transkript und Dateipfad werden erst nach Freigabe ausgeliefert — gesperrte Inhalte verlassen den Server nie.
- **Object Lock**: Ein Trigger verhindert, dass versiegelte Inhalte, Dateien, Art oder Freigaberegel geändert werden. Ein Freigabedatum lässt sich nur nach hinten schieben. Löschen ist vor der Freigabe gesperrt.
- **Unlock-UI**: Live-Countdown (Tage + hh:mm:ss) auf Karte und im Detail, automatische Aktualisierung nach Ablauf, „Release now" für Autor:in bzw. owner/steward.
- **Öffnen**: Text, Transkript, Bild-/Audio-/Video-Player und Datei-Download über kurzlebige signierte URLs (5 Minuten).
- **AI-Story**: `vaultStory` erzählt einen bereits freigegebenen Eintrag in 3–5 warmen Sätzen nach. Versiegelte Einträge werden abgewiesen, die Story wird nicht gespeichert.

## 6. Einladungen

- Einladung auf `/members` mit E-Mail-Adresse und Rolle.
- Es entsteht ein persönlicher Token-Link, 30 Tage gültig, fest an diese Adresse gebunden.
- „Copy link" legt ihn in die Zwischenablage, „Send by email" öffnet das Mailprogramm mit fertigem Text.
- Annahme über `/invite/<token>`: `accept_family_invitation` prüft Token, Ablauf und E-Mail-Übereinstimmung, trägt die Mitgliedschaft ein und markiert die Einladung als verwendet.
- Automatischer Serverversand steht noch aus — dafür wird eine eigene Absender-Domain benötigt.

## 7. Speicher & Dateien

Alles liegt im privaten Bucket `memories`, nichts ist öffentlich abrufbar:

```
<familyId>/feed/...       Feed-Fotos
<familyId>/gallery/...    Galerie-Medien
<familyId>/vault/...      Vault-Anhänge (zusätzlich release-gesichert)
```

Der Zugriff erfolgt ausschließlich über serverseitig erzeugte, kurzlebige signierte URLs.

## 8. Design-System

- Navy `#1e3a5f` als Basis, Gold `#d4a24a` als Akzent, als semantische oklch-Tokens in `src/styles.css`
- Playfair Display für Headlines, Sans für Fließtext
- „Paper-Edge"-Effekte, archivarische Texturen, Hell-/Dunkelmodus

## 9. Entwicklung

```sh
npm i
npm run dev      # Entwicklung
npm run build    # Produktionsbuild
npm run lint
```

## 10. Offene Punkte

- Google-Login noch nicht konfiguriert
- Automatischer E-Mail-Versand der Einladungen (Absender-Domain nötig)
- Kalender, Events, Forum, Rezepte, Profile und Settings weiterhin Demo-Daten
- Volltextsuche über Personen und Erinnerungen noch nicht in der UI
