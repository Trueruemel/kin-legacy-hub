# Eternal — Memories — Roadmap zum Beta (100 Familien)

## Phase 0 — Fundament (in Arbeit)
- [x] Schema für Feed, Events, Chats, Forum, Rezepte, Benachrichtigungen inkl. RLS + Grants
- [x] Echte Anmeldung (`/auth`, E-Mail + Passwort), Signup aktiv, HIBP-Check an
- [x] Geschützter Bereich `_authenticated/` — alle App-Seiten liegen dahinter
- [x] Bearer-Token-Middleware für Server-Functions (`src/lib/auth-attach.ts`)
- [x] Familien-Serverfunktionen: Profil anlegen, eigene Familien, Familie gründen
- [x] Onboarding `/onboarding` — erste Familie anlegen
- [ ] Google-Login (Provider konfigurieren)
- [x] Einladungen: Token-Link, Ablauf, E-Mail-Bindung, Annahme über `/invite/$token`
- [x] Einladung per E-Mail verschicken (Mail-App mit fertigem Text)
- [ ] Automatischer Serverversand der Einladungen (braucht eigene Absender-Domain)
- [x] Aktive Familie aus echten Daten (Header, Familienwechsler, Nutzername)

## Phase 1 — Daten echt machen (Reihenfolge)
- [x] Vault: Unlock-Countdown, manuelle Freigabe, automatische Freigabe am Stichtag
- [x] Gallery + Vault (privater Storage, signierte URLs, Object-Lock)
- [x] Feed (posts, reactions, comments, Foto-Upload)
- [x] Family Tree (persons, relationships)
- [x] Calendar (events, RSVPs, Bearbeiten, Einladungen & Erinnerungen per E-Mail)
- [x] Messages (chats, chat_messages, Polling)
- [x] Forum, Rezepte
- [x] Members (echte Mitglieder + Rollen)
- [x] Settings (Profil bearbeiten)
- [x] Family Dashboard (Baum, Fotos, nächste Termine auf einer Seite)
- [x] Family-Setup-Wizard (Familie anlegen, einladen, Personen & Fotos)
- [x] Freigaben: Assistenten-Zustimmung mit Bereichs-Schaltern (Baum, Fotos, Termine)
- [x] Freigaben: pro Angehörigem Baum/Fotos/Termine ein-/ausschalten (Mitglieder-Seite)
- [ ] Volltextsuche (tsvector + Trigram)

- [x] Vault-UI als Karteikarten-Layout, Transkript direkt im Textfeld
- [x] Installierbare App (Manifest + Install-Button, kein ZIP nötig)
- [x] Vault-Öffnen: Datei-Download, Audio-/Video-Player, AI-Story (nur nach Freigabe)

## Phase 2 — Beta-Betrieb
- [ ] Demo-Familien Johnson/Chen nur lesend, echte Familien starten leer
- [ ] Welle 1: 5 Familien, Fix-Fenster
- [ ] Welle 2: 25 Familien
- [ ] Welle 3: 100 Familien
- [ ] Metriken, Rate-Limits, Rollback-Kriterien
