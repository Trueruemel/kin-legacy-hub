# Eternal — Memories

Private Familien- und Nachlass-Plattform: Stammbaum, Erinnerungs-Feed, Fotoarchiv, Kalender,
Chats, Forum, Rezepte und ein zeitversiegelter Legacy Vault — plus ein OAuth-geschützter
Assistenten-Zugang (MCP) für KI-Assistenten.

Registrierte Familien arbeiten auf echter Datenbank, privatem Object Storage und
authentifizierten Server-Funktionen. Ohne eigene Familie zeigt die App die Investor-Demo mit
Seed-Daten.

## Auf einen Blick

| | |
| --- | --- |
| Stack | TanStack Start v1 (React 19, SSR), Vite 8, Tailwind v4, shadcn/ui |
| Backend | Cloud-PostgreSQL mit RLS (26 Tabellen), privater Storage-Bucket `memories` |
| Auth | E-Mail + Passwort, Google OAuth, HIBP-Check, geschützter Bereich `_authenticated/` |
| E-Mail | 8 gebrandete Templates, Absenderdomain `notify.eternalmemorys.enterprises` |
| Assistenten | `/mcp` mit OAuth 2.1 und 4 Tools, Freigabe pro Bereich |
| Domain | `eternalmemorys.enterprises` |

## Kernbereiche

- **Dashboard** — Mitglieder, Personen, Fotos und nächste Termine auf einer Seite
- **Setup-Wizard** — Familie gründen, einladen, Personen und Fotos hinzufügen
- **Feed / Stammbaum / Galerie** — Beiträge, Personen und Medien mit Foto-Upload und Zuschnitt
- **Kalender** — Termine anlegen, bearbeiten, teilen, Einladungen und Erinnerungen per E-Mail
- **Legacy Vault** — zeitversiegelte Nachrichten mit Countdown, Object Lock und AI-Story
- **Messages / Forum / Rezepte** — Austausch innerhalb der Familie
- **Freigaben** — Sichtbarkeit von Baum, Fotos und Terminen pro Angehörigem und pro Assistent

## Entwicklung

```sh
bun install --frozen-lockfile   # Paketmanager ist Bun (bun.lock + bunfig.toml)
bun run dev      # Entwicklung
bun run build    # Produktionsbuild
bun run lint
bun run test
```

Hinweis zu Umgebungsdateien: `.env` enthält ausschließlich Supabase-Publishable-Werte (Projekt-ID, URL,
Publishable Key), die ohnehin im Browser landen, und wird von Lovable verwaltet. Serverseitige
Geheimnisse (`LOVABLE_API_KEY`, Service-Role-Key, Cron-Secret) gehören niemals in eine versionierte Datei.

## Weiterlesen

- Vollständige Systemdokumentation: [DOCUMENTATION.md](./DOCUMENTATION.md)
- Stand und nächste Schritte: [roadmap.md](./roadmap.md)
