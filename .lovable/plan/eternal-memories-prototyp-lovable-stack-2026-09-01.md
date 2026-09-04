# Eternal Memories — Prototyp (Lovable-Stack)

Ein lauffähiger Prototyp der Heritage-Plattform, zweisprachig (DE/EN), auf dem hier verfügbaren Stack. FastAPI, Docker, MinIO, Meilisearch, Qdrant und Ollama lassen sich in Lovable nicht betreiben — die Architektur wird funktional gleichwertig abgebildet (siehe „Stack-Mapping"), damit der Prototyp echte Daten, Uploads, Auth und Suche hat statt Mock-Zustand.

## Was gebaut wird

**Öffentlich**
- `/` — Landing: Positionierung „private family legacy platform", Feature-Sektionen (Family Tree, Timeline, Vault, Storytelling), Sprachumschalter, CTA zur Anmeldung
- `/auth` — Anmeldung/Registrierung (E-Mail + Passwort, Google)

**Nach Login (geschützt)**
- `/app` — Dashboard: eigene Familie, letzte Erinnerungen, Kennzahlen
- `/app/tree` — Family Tree: Personen anlegen/bearbeiten, Eltern-/Partner-Beziehungen, grafische Darstellung der Generationen
- `/app/timeline` — Chronologie aller Ereignisse und Erinnerungen, filterbar nach Jahr/Person/Ort
- `/app/memories` — Medienarchiv: Upload von Fotos/Dokumenten/Audio in privaten Storage, Titel, Datum, Ort, verknüpfte Personen, Detailansicht
- `/app/vault` — Legacy Vault: Einträge mit Freigaberegel (sofort / an Datum / nach Bestätigung), sichtbar nur für berechtigte Mitglieder
- `/app/search` — Volltextsuche über Personen, Erinnerungen, Geschichten, typo-tolerant
- `/app/family` — Governance: Mitglieder einladen, Rollen (owner / steward / member / viewer)

**Zweisprachigkeit**
Alle UI-Texte über eine Übersetzungsdatei (de/en), Umschalter im Header, Auswahl wird gespeichert. Nutzer-Inhalte bleiben in der eingegebenen Sprache.

## Stack-Mapping (deine Empfehlung → hier umgesetzt)

| Empfehlung | Umsetzung im Prototyp |
| --- | --- |
| FastAPI + Pydantic | TanStack Start Server Functions + Zod-Validierung (typsicher, serverseitig) |
| PostgreSQL 16 + SQLAlchemy/Alembic | PostgreSQL über Lovable Cloud, versionierte SQL-Migrationen |
| MinIO / Hetzner S3 | Privater Storage-Bucket, Zugriff über signierte URLs; Medien liegen nie in der DB |
| Meilisearch | Postgres Full-Text Search (`tsvector`, GIN-Index) inkl. Trigram-Fuzzy für „Wilhelm/William" |
| Better-Auth / Passkeys | Managed Auth (kein selbstgebautes JWT), Sessions und MFA-Fähigkeit vorhanden |
| Rollen/Governance | Separate `user_roles`-Tabelle + `has_role()`-Funktion, RLS auf allen Tabellen |
| Ollama / lokale Modelle | Im Prototyp nicht enthalten; AI-Storytelling bleibt als klar markierter Platzhalter |
| Docker/Caddy/GH Actions | Entfällt (managed Hosting) |

Der Prototyp ist damit ein funktionaler Produkt-Beweis, kein Ersatz für die selbst-gehostete EU-Zielarchitektur. Datenmodell und API-Grenzen werden so geschnitten, dass eine spätere Portierung nach FastAPI/SQLAlchemy 1:1 möglich ist.

## Technische Details

Datenmodell (alle Tabellen mit RLS, Zugriff strikt auf die eigene Familie begrenzt):
- `families`, `family_members` (Nutzer ↔ Familie, Rolle)
- `persons` (Name, Geburts-/Sterbedatum, Ort, Biografie, Foto)
- `relationships` (parent/partner, self-referenziell)
- `memories` (Titel, Beschreibung, Datum, Ort, Medienpfad, Typ) + `memory_persons` (Verknüpfung)
- `vault_entries` (Inhalt, Freigaberegel, Freigabedatum, Empfänger)
- `user_roles` + `app_role`-Enum, `has_role()` als security-definer-Funktion
- Suchspalte `search_vector` auf `persons` und `memories`, per Trigger gepflegt

Storage: privater Bucket `memories`, Pfad `<family_id>/<memory_id>/<datei>`, Policies prüfen die Familienzugehörigkeit.

Frontend: TanStack Router + TanStack Query, shadcn/ui, Tailwind v4, Zod. Eigenes Farb-/Typografie-System im Heritage-Look (warme Archivtöne, Serifen-Headlines) statt Default-Theme. Jede Route mit eigener `head()`-Metadata.

## Reihenfolge

1. Lovable Cloud aktivieren, Schema + RLS + Storage-Bucket
2. Auth + geschützter Bereich + i18n-Grundgerüst
3. Design-System und Landing Page
4. Family Tree, Timeline, Memories inkl. Upload
5. Vault, Governance, Suche
6. Demo-Daten für eine Beispielfamilie, damit der Prototyp direkt vorführbar ist
