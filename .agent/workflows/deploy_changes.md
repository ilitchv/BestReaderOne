---
description: How to apply and verify Frontend/Backend changes
---

# Deploying Changes

In this project, the backend (`server.js`) serves the **compiled** frontend static files from the `dist/` directory.

## 1. Frontend Changes (`.tsx`, `.css`)
If you modify any file in `client/`, `components/`, or `pages/`, you **MUST** rebuild the production assets for the backend to serve the updated version.

```powershell
# 1. Stop the running server (Ctrl+C or Stop-Process)
# 2. Rebuild the frontend
npm run build
# 3. Start the server
node server.js
```

> **Note**: Just refreshing the browser is NOT enough if you are running `node server.js`. The HMR (Hot Module Replacement) only works if you are running `npm run dev` (Vite dev server).

## 2. Backend Changes (`server.js`, `services/`)
If you modify backend logic:

```powershell
# 1. Stop the running server
# 2. Start the server (No build required for backend)
node server.js
```

## Troubleshooting
If a change "doesn't show up":
1.  Did you run `npm run build`?
2.  Did you clear the browser cache (Ctrl + F5)?
