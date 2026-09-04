# Accessibility Review: Eternal — Memories

I went through every page and shared component. The good news: most of the app is already solid — photos have descriptions, dialogs and menus use accessible building blocks, the photo viewer can be closed and navigated with the keyboard, and the main navigation and search box are properly labelled. No blocking problems that would lock someone out.

Below are the smaller issues and potential conflicts worth cleaning up.

## Critical (a screen reader user hits a wall)

1. **Send buttons have no name.** The round send buttons under a comment (feed) and under a message (chat) show only an arrow icon with no spoken label — a screen reader just says "button".
2. **Three fields in the setup wizard have no label.** On `/setup`, the invitation email field and the "First name" / "Last name" / date-of-birth fields rely on grey placeholder text only. Placeholder text disappears while typing and is not reliably read aloud.

## Warning (works, but degrades the experience)

3. **No page landmark on the entry and sign-in pages.** The landing page and the sign-in page wrap their content in plain sections, so "jump to main content" tools have nothing to jump to. Only the logged-in area has one.
4. **No "skip to content" link.** Keyboard users must tab through the full sidebar on every page before reaching the content.
5. **Unread counters are read as bare numbers.** The "3" on the messages icon and the notification count are spoken as a lone digit with no meaning.
6. **Full-height pages use the older screen-height measure.** On phones the browser bar can cut off the bottom of the sign-in and setup screens.
7. **Setup wizard step changes are silent.** Moving between the three steps does not announce the new step, so screen-reader users lose their place.
8. **Small tap targets.** Some icon-only buttons in the header and calendar are 36×36 px, under the recommended 44×44 px for phones.

## Info (best practice polish)

9. **A few decorative photos carry no description on purpose** (family covers, avatars) — correct, no change needed.
10. **The landing page still shows demo copy** ("Investor demo dataset", a made-up memory count). Not an accessibility issue, but it will confuse real beta families. I did not invent replacement text — tell me what it should say.

## What I would change

- Add spoken names to the two send buttons and to the unread counters.
- Add real labels to the four unlabelled setup fields (visible labels, matching the rest of the app).
- Wrap the landing and sign-in page content in a proper main region, and add a skip-to-content link in the logged-in layout.
- Switch full-height screens to the mobile-safe height measure.
- Announce step changes in the setup wizard politely.
- Bump the small icon buttons to a comfortable phone tap size.

## Technical notes

- `aria-label` on the submit `Button`s in `src/components/feed-real.tsx` and `src/components/messages-real.tsx`.
- `Label htmlFor` + matching `id` for the invite email and person fields in `src/routes/_authenticated/setup.tsx`; add `aria-live="polite"` to the step indicator.
- Wrap content in `<main>` in `src/routes/index.tsx` and `src/routes/auth.tsx`; add a visually-hidden skip link targeting `#main-content` in `src/components/app-layout.tsx` and give the existing `<main>` that id.
- Replace `min-h-screen` with `min-h-dvh` in `src/routes/index.tsx`, `src/routes/auth.tsx`, `src/routes/__root.tsx`, `src/routes/_authenticated/onboarding.tsx`, `src/components/app-layout.tsx`.
- Unread badges: mark the digit `aria-hidden` and add a screen-reader-only description, or fold the count into the existing `aria-label`.
- Add `min-h-11 min-w-11` to `size="icon"` buttons in the header and calendar controls.
- Verify with `bunx tsgo --noEmit`, `bun run build:dev`, and a Playwright pass over `/`, `/auth`, `/setup`, `/dashboard`, `/feed`.
