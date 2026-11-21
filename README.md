# Content Creator – frontend

Next.js chat app for the Module 3 content-creator prototype. Users sign in, describe the
content they need, and get one result card per piece: the composed ad preview, copy with
cited fact ids, checks, and a run log.

It talks only to the backend (FastAPI on Render): `/api/auth/login`, the OpenAI-compatible
`/v1/chat/completions` stream, and `/api/items/{id}`. The browser holds no API keys, only the
login session token.

## Run locally

```bash
cp .env.example .env.local   # NEXT_PUBLIC_API_BASE=http://localhost:8000
npm install
npm run dev                  # http://localhost:3000
```

The backend must be running (see the backend README).

## Deploy on Vercel

1. Import this repo; the framework preset is Next.js.
2. Set the environment variable `NEXT_PUBLIC_API_BASE=https://<backend>.onrender.com`.
3. Deploy. The value is built into the page, so redeploy after changing it.

Add the Vercel URL to the backend's `CORS_ORIGINS` and to the R2 bucket's CORS policy.

## Code map

| Path | What |
|---|---|
| `app/login/page.tsx` | Sign-in page |
| `components/ContentCreator.tsx` | Page state: conversation, stream events, piece cards |
| `components/ChatPanel.tsx` | Chat on the left |
| `components/PieceCard.tsx`, `AdPreview.tsx` | Result card and the composed ad |
| `components/ItemDrawer.tsx` | Run log and details |
| `lib/api.ts`, `lib/auth.ts` | Backend client and login session |
| `lib/export.ts` | Copy image + brief, download the composed ad |
