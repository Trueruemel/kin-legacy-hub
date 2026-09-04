# Accessibility review: Eternal — Memories

Full read-through of pages and shared parts. Overall the app is in good shape: every photo has a description, dialogs and menus come from accessible building blocks, buttons have visible keyboard focus rings, the photo viewer closes with Escape and moves with arrow keys, and the page language is set. Below are the real gaps found, worst first, plus the small inconsistencies you asked to hear about.

## Critical (blocks some people)

1. **Setup wizard fields have no labels.** In the family setup wizard, the invite email box, first name, last name and birth date rely on grey hint text only. A screen reader announces "edit text, blank". Fix: proper labels for each.
2. **Two send buttons have no name.** The arrow-only send buttons under a post's comment box and in Messages are announced as just "button". Fix: add "Send comment" / "Send message" names.
3. **Messages icon in the top bar is a button inside a link.** The header wraps a clickable button inside a clickable link, which confuses screen readers and keyboards. Fix: make it a single link styled as an icon button, keeping the "Messages" name and the unread badge (badge count also gets a spoken meaning: "3 unread messages").

## Warnings (usable, but harder)

4. **No "skip to content" link.** Keyboard users must tab through search, theme, messages, notifications and account before reaching the page. Fix: add a skip link that jumps to the main area.
5. **Bottom navigation on phones is too small to hit.** The five tabs are roughly 40px tall with 10px labels, under the 44px recommendation. Fix: raise the tab height and label size slightly.
6. **Full-height screens use the old viewport unit.** Six places (landing page, sign-in, setup, error screens, app shell) use `h-screen`, which is cut off by mobile browser bars. Fix: switch to `h-dvh`.
7. **Search suggestions are not announced.** The header search shows a result list, but it isn't announced when results appear and arrow keys don't move through it. Fix: announce the result count and support arrow-key selection.
8. **Photo viewer doesn't move focus.** Opening it leaves focus on the page behind, so a keyboard user must tab into it; Tab can also wander back to the hidden page. Fix: move focus to the close button on open, keep focus inside, and return focus to the thumbnail on close.
9. **Heading order skips a level.** On Forums and Calendar the page title is followed directly by third-level headings. Fix: use second-level headings for those cards.
10. **Saving/loading states are silent.** Lists that reload after creating an event, recipe or post don't announce anything. Fix: add a polite live region for "Saving…" / "Saved" states.

## Small inconsistencies / potential conflicts

11. **Footer links aren't links.** About, Privacy, Terms, Help, Contact are plain text with hover styling and a default cursor — they look clickable but do nothing. Either make them real links or drop the hover styling.
12. **Two "Messages" page titles exist** (demo version and live version). Only one renders at a time, but keep exactly one main title per page as the live one takes over, otherwise a page ends up with two top-level titles.
13. **Notification count** is a bare number inside the bell; the bell's spoken name already includes the count, so keep them in sync when the badge changes.

## Technical notes

- Files touched by fixes: `src/routes/_authenticated/setup.tsx`, `src/components/feed-real.tsx`, `src/components/messages-real.tsx`, `src/components/app-layout.tsx` (header link, skip link, mobile tabs, footer, search combobox), `src/components/lightbox.tsx`, `src/components/forums-real.tsx`, `src/components/calendar-real.tsx`, `src/routes/index.tsx`, `src/routes/auth.tsx`, `src/routes/__root.tsx`, `src/routes/_authenticated/onboarding.tsx`.
- All fixes are presentation/markup level: labels, `aria-label`, `aria-live`, roles, heading levels, `h-dvh`, focus management. No data or backend changes.
- Radix/shadcn primitives keep their own focus handling; nothing there gets rebuilt by hand.

## Suggested order

1. Critical items 1–3.
2. Warnings 4–6 (quick, high impact on phones and keyboards).
3. Warnings 7–10.
4. Small items 11–13.
