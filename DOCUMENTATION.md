# Eternal — Memories — Systemdokumentation

Stand: 4. September 2026 · Beta-Vorbereitung (echte Familien + Investor-Demo parallel)

Dieses Dokument beschreibt vollständig, was gebaut wurde, wie die Infrastruktur aufgebaut ist,
welche Regeln und Sicherheitsmechanismen gelten und was noch offen ist. Es dient als Grundlage
für die anschließende Roadmap mit Implementationsplan.

---

## 1. Produkt in einem Satz

Eternal — Memories ist eine private Familien- und Nachlass-Plattform: Familienstammbaum,
Erinnerungs-Feed, Fotoarchiv, Kalender, Chats, Forum, Rezepte und ein zeitversiegelter
„Legacy Vault" — plus ein Assistenten-Zugang (MCP), über den KI-Assistenten mit ausdrücklicher
Zustimmung auf ausgewählte Bereiche zugreifen dürfen.

Die App läuft in **zwei Modi**:

1. **Investor-Demo** — ohne eigene Familie werden die ausgestalteten Seed-Familien (Johnson / Chen)
   aus dem Browser-Store gezeigt. Nichts wird gespeichert.
2. **Echter Beta-Betrieb** — mit Registrierung und eigener Familie läuft alles auf echter
   Datenbank, privatem Object Storage und authentifizierten Server-Funktionen.

Umgeschaltet wird automatisch: sobald `useActiveFamily()` eine echte Mitgliedschaft findet,
rendern alle Seiten die realen Komponenten (`*-real.tsx`).

---

## 2. Technischer Stack

| Bereich        | Umsetzung                                                               |
| -------------- | ----------------------------------------------------------------------- |
| Framework      | TanStack Start v1 (React 19, SSR, Edge/Worker-Runtime)                  |
| Routing        | TanStack Router, dateibasiert unter `src/routes`                        |
| Build          | Vite 8                                                                  |
| Styling        | Tailwind CSS v4 (`src/styles.css`, semantische oklch-Tokens)            |
| UI             | shadcn/ui + Radix, `lucide-react`                                       |
| Server-Logik   | `createServerFn` (typisierte RPCs, Zod-validiert)                       |
| Datenbank      | Cloud-PostgreSQL, 26 Tabellen, durchgängig Row Level Security           |
| Object Storage | privater Bucket `memories`, kurzlebige signierte URLs                   |
| Auth           | E-Mail + Passwort, Google OAuth, HIBP-Check, Bereich `_authenticated/`  |
| E-Mail         | React-Email-Templates, Versand über `notify.eternalmemorys.enterprises` |
| Client-State   | TanStack Query (echt) + Zustand (Demo)                                  |
| AI             | Lovable AI Gateway (`google/gemini-2.5-flash`) für Vault-Stories        |
| Assistenten    | `@lovable.dev/mcp-js` v2, OAuth 2.1 Resource Server unter `/mcp`        |
| Desktop        | optionaler Electron-Wrapper (`electron/`), PWA-Manifest                 |
| Sprache        | TypeScript, Zod                                                         |

---

## 3. Infrastruktur & Laufzeit

```
Browser / PWA / Electron
        │
        ├── SSR-Seiten (TanStack Start, Worker-Runtime)
        ├── Server-Functions  /_serverFn/…      (Bearer-Token, requireSupabaseAuth)
        ├── Public API-Routen /api/public/…     (Webhooks, extern erreichbar)
        ├── MCP-Endpoint      /mcp              (OAuth-2.1-geschützt)
        └── /sitemap.xml, /robots.txt, /manifest.webmanifest
        │
Backend (Lovable Cloud)
        ├── PostgreSQL + RLS + SECURITY-DEFINER-Helper
        ├── Auth (E-Mail/Passwort, Google, OAuth-2.1-Server für MCP)
        ├── Object Storage: privater Bucket `memories`
        └── E-Mail-Versand über Absenderdomain notify.eternalmemorys.enterprises
```

Wesentliche Grenzen der Laufzeit: kein Node-Host, keine Kindprozesse, kein echtes Dateisystem —
alle Serverlogik ist reines JavaScript/Fetch. Secrets werden ausschließlich innerhalb der
Handler gelesen, niemals auf Modulebene.

### Domains

- App / Custom Domain: `eternalmemorys.enterprises`, `www.eternalmemorys.enterprises`
- E-Mail-Absender: `notify.eternalmemorys.enterprises` (eigene Subdomain, DNS-Verifikation offen)

### Ausstehende DNS-Einträge für den Mailversand (Zone `eternalmemorys.enterprises`)

Die Einträge gehören in die Zone der im Code konfigurierten Absenderdomain (`SENDER_DOMAIN` in
`send-email.ts` und `webhook.ts`). Der `lovable_email_verify`-Wert unten stammt aus einer früheren
Einrichtung; vor dem Setzen den aktuellen Wert aus der Lovable-E-Mail-Konfiguration übernehmen.

| Typ | Name             | Wert                                                                                    |
| --- | ---------------- | --------------------------------------------------------------------------------------- |
| TXT | `_lovable-email` | `lovable_email_verify=75bd3763f2bd889ab60a9102afece4794af801bb5661f0686703754f28aabff1` |
| NS  | `notify`         | `ns3.lovable.cloud`                                                                     |
| NS  | `notify`         | `ns4.lovable.cloud`                                                                     |

Solange diese Einträge fehlen, wird jede Mail (Einladung, Willkommen, Termin) korrekt erzeugt und
protokolliert, aber nicht ausgeliefert.

---

## 4. Authentifizierung & Onboarding

- `/auth` — Registrierung und Anmeldung per E-Mail + Passwort **oder** Google. Anonyme Anmeldung
  ist deaktiviert, Passwörter werden gegen bekannte Leaks geprüft (HIBP).
- `?next=`-Parameter wird als reiner Same-Origin-Pfad validiert, damit Rücksprünge
  (z. B. aus dem Assistenten-Consent) nicht als Redirect-Lücke missbraucht werden können.
- `/setup` — dreistufiger Familien-Wizard: Familie anlegen → Angehörige einladen →
  Personen und Fotos hinzufügen. `/onboarding` leitet dorthin weiter.
- Alle App-Seiten liegen unter `src/routes/_authenticated/`; der Layout-Guard leitet ohne Session
  nach `/auth`.
- Jeder Server-Function-Aufruf trägt den Bearer-Token (`src/lib/auth-attach.ts`), serverseitig
  validiert `requireSupabaseAuth`.
- `src/lib/auth-log.ts` klassifiziert fehlende/ungültige Authorization-Header (fehlt, leer,
  falsches Schema, kein JWT) und protokolliert nur unkritische Metadaten — keine Tokens.
- Beim ersten Laden wird das Profil sichergestellt und ein fehlender Anzeigename nachgetragen.

---

## 5. Rollen, Rechte und Sichtbarkeit

Drei voneinander unabhängige Schichten:

**1. Familienrolle** — `family_members.role`: `owner`, `steward`, `member`, `viewer`

- Lesen: alle Mitglieder (`is_family_member`)
- Schreiben: `can_edit_family` (owner/steward/member)
- Verwalten (Einladungen, Freigaben): `can_admin_family` (owner/steward)

**2. Sichtbarkeit pro Angehörigem** — `member_visibility`

Pro Mitglied lassen sich die Bereiche **Baum**, **Fotos** und **Termine** einzeln ein- oder
ausschalten. Die Datenbankfunktion `member_can_see(family_id, area)` wird direkt in den
Lese-Policies von `persons`, `media_items` und `events` erzwungen — die Beschränkung wirkt also
auch dann, wenn ein Client die UI umgeht. Verwaltung über `/members`
(`src/components/member-visibility.tsx`).

**3. Assistenten-Freigabe** — `assistant_scopes`

Beim OAuth-Consent entscheidet die Nutzerin, welche Bereiche ein KI-Assistent sehen darf
(Standard: Baum + Termine erlaubt, Fotos gesperrt). Mindestens ein Bereich muss aktiv sein.
Die MCP-Tools prüfen die Freigabe über `src/lib/mcp/scopes.ts`.

Alle Tabellen sind familienbezogen per RLS abgeriegelt; ohne Mitgliedschaft ist eine Familie
unsichtbar. Interne SECURITY-DEFINER-Helper sind für `anon`/`public` nicht ausführbar, nur die
bewusst öffentlichen RPCs für `authenticated`.

---

## 6. Datenmodell (26 Tabellen, `public`)

| Bereich       | Tabellen                                                                 |
| ------------- | ------------------------------------------------------------------------ |
| Identität     | `profiles`, `user_roles`                                                 |
| Familie       | `families`, `family_members`, `family_invitations`                       |
| Stammbaum     | `persons`, `relationships`                                               |
| Feed          | `posts`, `post_comments`, `post_reactions`, `memories`, `memory_persons` |
| Medien        | `albums`, `media_items`                                                  |
| Kalender      | `events`, `event_rsvps`                                                  |
| Kommunikation | `chats`, `chat_members`, `chat_messages`, `notifications`                |
| Community     | `forum_threads`, `forum_posts`, `recipes`                                |
| Nachlass      | `vault_entries`                                                          |
| Freigaben     | `member_visibility`, `assistant_scopes`                                  |

Für jede Tabelle gilt: `GRANT` in derselben Migration, RLS aktiviert, Policies rollen- und
familienbezogen. Zeitabhängige Regeln (z. B. Vault-Freigabedatum) laufen über Trigger, nicht über
CHECK-Constraints.

---

## 7. Funktionsumfang (echte Familien)

| Route                      | Kernmodule                                                     | Funktion                                                                                                   |
| -------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `/dashboard`               | `lib/dashboard.functions.ts`                                   | Übersicht: Mitglieder, Personen im Baum, Fotos, nächste Termine, letzte Beiträge, signierte Vorschaubilder |
| `/setup`                   | `routes/_authenticated/setup.tsx`                              | Familien-Wizard: gründen, einladen, Personen + Fotos                                                       |
| `/feed`                    | `components/feed-real.tsx`, `lib/feed.functions.ts`            | Beiträge, Foto-Upload (privat, 15 MB), Reaktionen, Kommentare                                              |
| `/tree`                    | `components/tree-real.tsx`, `lib/tree.functions.ts`            | Personen anlegen, Eltern-/Partner-Beziehungen, Porträt-Upload mit Zuschnitt                                |
| `/gallery`                 | `components/gallery-real.tsx`, `lib/gallery.functions.ts`      | Alben, Uploads bis 25 MB, Anzeige über signierte URLs, Lightbox                                            |
| `/calendar`, `/events/$id` | `components/calendar-real.tsx`, `lib/events.functions.ts`      | Termine anlegen, bearbeiten, löschen, RSVP, „Teilen & erinnern" mit E-Mail                                 |
| `/vault`                   | `components/vault-real.tsx`, `lib/vault.functions.ts`          | Zeitversiegelte Nachrichten mit Anhang, Countdown, Freigabe, AI-Story                                      |
| `/messages`                | `components/messages-real.tsx`, `lib/messages.functions.ts`    | Gruppen-/Direktchats, Polling (8 s), Mitgliedschaftsprüfung serverseitig                                   |
| `/forums`, `/forums/$id`   | `components/forums-real.tsx`, `forum-thread-real.tsx`          | Kategorien, Threads, Beiträge                                                                              |
| `/recipes`                 | `components/recipes-real.tsx`, `lib/recipes.functions.ts`      | Familienrezepte mit Herkunftsgeschichte und Foto                                                           |
| `/members`                 | `lib/members.functions.ts`, `components/member-visibility.tsx` | Mitglieder, Rollen, Einladungen, Sichtbarkeit pro Angehörigem                                              |
| `/settings`                | `components/settings-real.tsx`, `lib/profile.functions.ts`     | Profil, Anzeigename, Foto, Familienangaben                                                                 |
| `/profile/$userId`         | `routes/_authenticated/profile.$userId.tsx`                    | Profilseite mit Lebenszeitleiste                                                                           |
| `/invite/$token`           | `lib/invites.functions.ts`                                     | Einladung ansehen und annehmen, Willkommensmail                                                            |

Gemeinsame Hilfsmittel: `components/photo-cropper.tsx` (Zuschnitt vor dem Upload),
`lib/file-upload.ts`, `components/lightbox.tsx`, `components/install-app.tsx` (PWA-Installation).

---

## 8. Legacy Vault im Detail

- **Versiegeln**: Titel, Text, Empfänger, Freigabedatum, optional eine Datei (Bild, PDF, Text,
  Audio, Video, 25 MB) unter `memories/<familyId>/vault/<entryId>/<datei>`.
- **Geheimhaltung**: Die Liste kommt aus `vault_list`. Inhalt, Transkript und Dateipfad werden
  erst nach Freigabe ausgeliefert — gesperrte Inhalte verlassen den Server nie.
- **Object Lock**: Ein Trigger verhindert Änderungen an versiegelten Inhalten, Dateien, Art oder
  Freigaberegel. Ein Freigabedatum lässt sich nur nach hinten schieben. Löschen ist vor der
  Freigabe gesperrt.
- **Unlock-UI**: Live-Countdown (Tage + hh:mm:ss), automatische Aktualisierung, „Release now"
  für Autor:in bzw. owner/steward.
- **Öffnen**: Text, Transkript, Bild-/Audio-/Video-Player, Download über signierte URLs (5 Min.).
- **AI-Story**: `vaultStory` erzählt einen freigegebenen Eintrag in 3–5 warmen Sätzen nach.
  Versiegelte Einträge werden abgewiesen, die Story wird nicht gespeichert.

---

## 9. Einladungen & E-Mail

Acht gebrandete Templates unter `src/lib/email-templates/`. Die sechs Auth-Templates (`signup`, `magic-link`,
`recovery`, `email-change`, `reauthentication`, `invite`) werden über den SDK-Webhook
`src/routes/lovable/email/auth/webhook.ts` gerendert; die zwei transaktionalen Templates (`family-welcome`,
`event-invite`) sind in `registry.ts` registriert und werden über `send-email.ts` versendet:

| Template           | Auslöser                                                    |
| ------------------ | ----------------------------------------------------------- |
| `signup`           | Registrierung bestätigen                                    |
| `magic-link`       | Anmeldelink                                                 |
| `recovery`         | Passwort zurücksetzen                                       |
| `email-change`     | E-Mail-Adresse ändern                                       |
| `reauthentication` | erneute Bestätigung                                         |
| `invite`           | Familieneinladung                                           |
| `family-welcome`   | neues Mitglied ist beigetreten (Links zu Baum und Kalender) |
| `event-invite`     | Termin-Einladung und Erinnerung                             |

Ablauf einer Einladung: Erstellung auf `/members` mit Adresse und Rolle → persönlicher Token-Link,
30 Tage gültig, fest an die Adresse gebunden → „Copy link" oder Versand per Mail → Annahme über
`/invite/<token>`; `accept_family_invitation` prüft Token, Ablauf und Adressgleichheit, trägt die
Mitgliedschaft ein, markiert die Einladung als verwendet und stößt idempotent die Willkommensmail
an. Mailfehler werden geschluckt, damit der Beitritt trotzdem gelingt.

Termin-Mails laufen über `sendEventEmail` mit UTC-Zeitangaben und Idempotenz-Schlüsseln und gehen
bewusst an **eine ausdrücklich angegebene Adresse** pro Aktion — es gibt keine
Massen-Adressauflösung über Profile, weil Mitglieder untereinander keine E-Mail-Adressen sehen.

---

## 10. Assistenten-Zugang (MCP)

- Endpoint `/mcp`, definiert in `src/lib/mcp/index.ts` (`defineMcp`), Routen vom Vite-Plugin
  generiert. Manifest: `.lovable/mcp/manifest.json`.
- Auth: OAuth 2.1 Resource Server; Autorisierungsserver ist die Cloud-Auth mit dynamischer
  Client-Registrierung. Consent-Seite: `src/routes/[.]lovable.oauth.consent.tsx` mit
  barrierefreien Schaltern für Baum / Fotos / Termine.
- Datenzugriff nur mit dem verifizierten Caller-Token (`src/lib/mcp/supabase.ts`) — RLS gilt also
  als angemeldete Person. Kein Service-Role-Key im MCP-Pfad.
- Tools:

| Tool                   | Zweck                                           |
| ---------------------- | ----------------------------------------------- |
| `list_families`        | Familien der angemeldeten Person                |
| `list_tree_people`     | Personen im Stammbaum (Freigabe „Baum" nötig)   |
| `list_upcoming_events` | kommende Termine (Freigabe „Termine" nötig)     |
| `create_event`         | neuen Termin anlegen (Freigabe „Termine" nötig) |

Verifiziert: `/mcp` ohne Token → 401, Consent- und Discovery-Route → 200. Nutzbar für Claude,
ChatGPT & Co., sobald die App veröffentlicht ist.

---

## 11. Design-System & Marke

- Marke: **Eternal — Memories** (Gedankenstrich), Wortmarke, App-Icon, Favicon.
- Navy `#1e3a5f` als Basis, Gold `#d4a24a` als Akzent — als semantische oklch-Tokens in
  `src/styles.css`, nie hart in Komponenten.
- Playfair Display für Headlines, Sans für Fließtext.
- „Paper-Edge"-Effekte, archivarische Texturen, Hell- und Dunkelmodus.

---

## 12. Barrierefreiheit (Audit umgesetzt)

Projektweites Audit inkl. Playwright-Prüfung; umgesetzt:

- Skip-Link und `main`-Landmark, korrigierte Überschriftenhierarchie
- Beschriftungen für alle Wizard- und Versand-Felder, Namen für Icon-Buttons
- Messages-Navigation ohne verschachtelte Link/Button-Kombination, Ansagen für Ungelesene
- Mindestgrößen für mobile Touch-Ziele, `min-h-dvh` statt `h-screen`
- Such-Combobox mit korrekter Semantik und Tastaturbedienung
- Lightbox: Fokus setzen, Fokusfalle, Escape, Rückgabe des Fokus
- Live-Regionen für Speichern/Löschen/Senden, keine irreführenden Footer-Links

---

## 13. Sicherheitsstand

- RLS auf allen Tabellen, Grants pro Rolle, keine offenen Schreibpfade.
- `chat_members`-Insert abgesichert, Familienmitgliedschaft serverseitig geprüft.
- SECURITY-DEFINER-Helper für `anon`/`public` nicht ausführbar.
- Signierte, kurzlebige URLs statt öffentlicher Storage-Pfade.
- Auth-Logging ohne Tokens oder Adressen.
- Alle Passwörter/Sessions wurden zurückgesetzt; vier bestätigte Entwicklerzugänge existieren.
- **Offen aus dem letzten Linter-Lauf**: 1 Warnung „extension in public" und 12 Warnungen
  „authenticated SECURITY DEFINER function executable" — muss vor weiteren DB-Änderungen
  bewertet werden (pro Funktion: absichtlich öffentlich für Angemeldete oder Fehler?).

---

## 14. Verifizierte End-to-End-Tests

- dev1 legt Familie an → lädt dev2 ein → dev2 nimmt an und landet in der Familie (Playwright).
- Sichtbarkeit: „Fotos aus" → `member_can_see` liefert `photos=false`, Baum/Termine bleiben `true`.
- Testdaten (Familie, Einladung, Sichtbarkeit, Mitgliedschaft) wurden anschließend gelöscht.
- Willkommensmail wurde erzeugt, aber nicht ausgeliefert — DNS-Verifikation fehlt.
- `/dashboard`, `/setup`, `/sitemap.xml` liefern lokal HTTP 200; Typecheck und Build laufen grün.

---

## 15. Entwicklung

```sh
npm i
npm run dev        # Entwicklung
npm run build      # Produktionsbuild
npm run build:dev  # Prerender-/Dev-Build (Auth-Fallen sichtbar)
npm run lint
```

Konventionen: Datenzugriff nur über `createServerFn` mit `requireSupabaseAuth`; Schema-Änderungen
nur über Migrationen inkl. `GRANT` + RLS; Farben nur über Tokens; Server-Only-Module niemals in
Client-Bundles importieren.

---

## 16. Offene Punkte (Input für die Roadmap)

**Blocker Beta-Start**

1. Veröffentlichung der App (Freigabe war zuletzt deaktiviert) → echte URL, echter Mailversand.
2. DNS-Einträge für `notify.eternalmemorys.enterprises` setzen und verifizieren.
3. 13 Security-Linter-Warnungen bewerten und auflösen.

**Funktional**

4. Demo-Familien Johnson/Chen nur lesend; echte Familien starten leer.
5. Automatischer Serverversand der Einladungen ohne Umweg über das Mailprogramm.
6. Volltextsuche über Personen und Erinnerungen (tsvector + Trigram) inkl. UI.
7. Benachrichtigungen (`notifications`) in der UI nutzbar machen.
8. Kalender-Erinnerungen automatisiert (Cron über `/api/public/…`) statt manuell.

**Betrieb**

9. Beta-Wellen: 5 → 25 → 100 Familien mit Fix-Fenstern.
10. Metriken, Rate-Limits, Backup- und Rollback-Kriterien.
11. Speicherkontingente pro Familie durchsetzen (Felder sind modelliert, Enforcement fehlt).
