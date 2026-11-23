<!-- BEGIN:nextjs-agent-rules -->
# Next.js version note

Pinned to Next.js 15.5.20 (stable), not the latest 16.x line. This project was briefly on Next 16.2.9 but that version's build output wasn't served correctly by Vercel (every route 404'd despite a "Ready" build status), so it was downgraded. Don't upgrade to Next 16 without first confirming Vercel deploys it correctly.
<!-- END:nextjs-agent-rules -->

# Typography rules (from Nicole)

- Every button uses **Zichtbaar** (Regular and Demibold, self-hosted in `public/fonts`). This includes new buttons: don't give a button its own font-family.
- All serif text uses **Kleisch LL** (Light and Light Italic, self-hosted). Don't bring back Frank Ruhl Libre or other serifs.
- Headers and subtitles stay in Manrope, all caps.

# Data owned by Nicole

- `discussion_points` ("To cover with Adam" on client pages and Adam's page) is Nicole's own list. The sync routine must never write to or delete from it.
