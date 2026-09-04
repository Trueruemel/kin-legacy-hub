# Eternal Memories — vom Demo-Prototyp zum Beta-Produkt (100 Familien)

Zwei Dinge in einem Plan: (1) der echte Backend-Stack, der die Mock-Daten ersetzt, und (2) die Roadmap Stück für Stück bis zum Beta-Go-Live mit 100 echten Familien.

## Ausgangslage

Alle Seiten (Feed, Tree, Gallery, Vault, Kalender, Messages, Forum, Recipes, Members, Profile, Settings) laufen aktuell komplett im Browser auf `src/lib/mock-data.ts` + Zustand. In der Cloud-Datenbank existiert bereits ein tragfähiges Schema mit RLS: `families`, `family_members`, `family_invitations`, `persons`, `relationships`, `memories`, `memory_persons`, `albums`, `media_items`, `vault_entries`, `profiles`, `user_roles` — plus privater Storage-Bucket `memories`. Das ist das Fundament; es fehlen Auth-Anbindung, Datenzugriff im Frontend und die Tabellen für Feed/Chat/Kalender/Forum/Rezepte.

## Teil 1 — Der echte Stack

| Baustein | Umsetzung |
| --- | --- |
| Datenbank | Cloud-PostgreSQL, RLS auf jeder Tabelle, Zugriff strikt auf die eigene Familie |
| Object Storage | Privater Bucket, Zugriff nur über signierte URLs, Pfad `<family_id>/<entity>/<id>/<datei>` |
| Auth | Managed Auth: E-Mail/Passwort + Google, Sessions, geschützter Bereich `_authenticated` |
| Serverlogik | Server Functions mit Zod-Validierung und Auth-Middleware — keine unauthentifizierten Endpunkte |
| Rollen | `user_roles` + `has_role()`, Familienrollen owner/steward/member/viewer |
| Suche | Postgres Volltext (`tsvector`) + Trigram-Fuzzy |
| AI (optional, Phase 5) | Foto-Tagging, Transkription, Storytelling — mit Rate-Limit und Kostendeckel pro Familie |

Grundregel: kein Schreibzugriff ohne eingeloggten Nutzer, kein Lesezugriff über Familiengrenzen, keine Medien-URLs ohne Signatur.

## Teil 2 — Roadmap in 8 Schritten

**Phase 0 — Fundament (Auth + Familienkontext)**
Anmeldung/Registrierung, `profiles`-Anlage beim ersten Login, Familie anlegen/beitreten, aktive Familie im App-Kontext statt hartkodiertem `activeFamilyId`. Alle App-Seiten unter den geschützten Bereich verschieben. Danach ist die App zwar noch mock-gefüllt, aber echt eingeloggt.

**Phase 1 — Schema vervollständigen**
Fehlende Tabellen ergänzen: `posts` + `post_reactions` + `post_comments` (Feed), `events` + `event_rsvps` (Kalender), `chats` + `chat_members` + `chat_messages`, `forum_threads` + `forum_posts`, `recipes`, `notifications`. Jeweils mit GRANTs, RLS und `updated_at`-Trigger.

**Phase 2 — Datenschicht statt Zustand**
Pro Bereich eine `*.functions.ts` mit authentifizierten Server Functions, im Frontend über TanStack Query. Reihenfolge: Gallery & Vault (Schema existiert schon) → Feed → Family Tree → Kalender → Messages → Forum → Recipes → Members/Settings. Zustand behält nur UI-State (Theme, offene Dialoge).

**Phase 3 — Medien & Uploads**
Uploads direkt in den privaten Bucket, Größen-/MIME-Limits, signierte URLs mit kurzer Laufzeit, Thumbnails, Vault-Anhänge inklusive Freigabelogik (`immediate` / `on_date` / `on_confirmation`).

**Phase 4 — Familien-Governance**
Einladungen per E-Mail mit Token, Rollenverwaltung, Mitglied entfernen, Familie übertragen, Aktivitätsprotokoll.

**Phase 5 — Vertrauen & Betrieb**
DSGVO-Basics: Datenexport (Familienarchiv als ZIP), Konto- und Familienlöschung, Datenschutzerklärung/AGB, Aufbewahrungsregeln. Dazu Backups, Fehler-Monitoring, Rate-Limits.

**Phase 6 — Beta-Infrastruktur für 100 Familien**
Warteliste/Einladungscodes, Onboarding-Flow (Familie anlegen → erste Personen → erstes Foto → erste Einladung), Feedback-Widget in der App, Nutzungs-Metriken (aktive Familien, hochgeladene Medien, versiegelte Vault-Einträge, Einladungen angenommen), E-Mail-Benachrichtigungen.

**Phase 7 — Beta-Go-Live in Wellen**
Welle 1: 5 Familien (engster Kreis, tägliches Feedback). Welle 2: 25 Familien. Welle 3: 100 Familien. Zwischen den Wellen jeweils ein Fix-Fenster. Abbruchkriterien und Erfolgskriterien pro Welle vorher festlegen (z. B. ≥60 % der Familien mit mindestens 10 hochgeladenen Medien nach 14 Tagen, ≥2 aktive Mitglieder pro Familie, keine offenen Sicherheitsfunde).

## Umgang mit den Demo-Daten

Johnson- und Chen-Familie bleiben als Demo-Familie erhalten (read-only, klar als Demo markiert), damit Investoren-Demos weiter funktionieren. Echte Beta-Familien starten leer mit geführtem Onboarding. Die Mock-Dateien werden erst entfernt, wenn der letzte Bereich auf echte Daten umgestellt ist.

## Technische Details

- Server Functions in `src/lib/<bereich>.functions.ts`, jeweils mit `requireSupabaseAuth`; privilegierte Operationen nur nach Rollenprüfung.
- Geschützte Seiten unter `src/routes/_authenticated/`, öffentlich bleiben Landing, Auth und rechtliche Seiten.
- Jede neue Tabelle: `CREATE TABLE` → `GRANT` → `ENABLE ROW LEVEL SECURITY` → Policies, Zugriff über `is_family_member()` / `can_edit_family()` / `can_admin_family()`.
- Reads über `queryClient.ensureQueryData` im Loader + `useSuspenseQuery` in der Komponente; Writes über `useServerFn` + Mutation mit Invalidierung.
- Design-System, Copy, Animationen und Layout bleiben unverändert — es ändert sich nur die Datenschicht.

## Vorschlag für den Start

Phase 0 und Phase 1 zusammen umsetzen: echtes Login, Familienkontext, geschützter Bereich und das vollständige Schema. Danach wandert Bereich für Bereich auf echte Daten — jeder Schritt ist einzeln lauffähig und vorführbar.
