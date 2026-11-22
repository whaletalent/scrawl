# Landing page design kit (vendored)

Plain CSS and ES modules used only by the guest landing page
(`src/components/landing/`). They are copied, unmodified, from the
"design-taste-frontend" skill (tasteskill 2.5) and loaded by
`src/components/landing/kit.tsx` — never imported by the bundler, never
loaded on a game screen. Don't edit them: page-specific CSS lives in
`landing.tsx`.
