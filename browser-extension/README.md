# Syncia Browser Extension

A Chrome / Edge extension that gives you instant access to the Syncia app from your browser toolbar — it opens in a **side panel** so you can see it alongside any webpage you're working on.

## Install (developer mode)

1. Open Chrome and go to `chrome://extensions`
2. Toggle **Developer mode** on (top-right corner)
3. Click **Load unpacked**
4. Select this `browser-extension/` folder
5. The Syncia icon will appear in your toolbar

For Edge: go to `edge://extensions` — the steps are identical.

## First use

1. Click the Syncia icon in your toolbar → the side panel opens
2. Enter the URL where your Syncia app is running:
   - Local dev: `http://localhost:3000`
   - Production: your Vercel/custom domain
3. Click **Connect** — the app loads inside the panel

The URL is remembered between sessions. Use the ⚙️ button to change it.

## Buttons

| Button | Action |
|--------|--------|
| ↻ | Reload the app inside the panel |
| ↗ | Open the app in a full browser tab |
| ⚙ | Change the Syncia URL |

## Notes

- Requires Chrome 114+ or Edge 114+ (Side Panel API)
- The Next.js app's `next.config.mjs` already includes the CSP header needed to allow embedding from `chrome-extension://` origins
- In production, replace `http://localhost:3000` with your deployed URL when connecting
