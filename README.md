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
| Stack | TanStack Start v1 (React 19, SSR), Vite 7, Tailwind v4, shadcn/ui |
| Backend | Cloud-PostgreSQL mit RLS (26 Tabellen), privater Storage-Bucket `memories` |
| Auth | E-Mail + Passwort, Google OAuth, HIBP-Check, geschützter Bereich `_authenticated/` |
| E-Mail | 8 gebrandete Templates, Absenderdomain `notify.eternalmemorys.com` |
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
npm i
npm run dev      # Entwicklung
npm run build    # Produktionsbuild
npm run lint
```

## Weiterlesen

- Vollständige Systemdokumentation: [DOCUMENTATION.md](./DOCUMENTATION.md)
- Stand und nächste Schritte: [roadmap.md](./roadmap.md)
