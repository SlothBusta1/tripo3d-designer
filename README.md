# Tripo3D Designer

AI-powered 3D model generation from text prompts or reference images, built with React + Vite (client) and Express (server proxy).

---

## Features

- **Text to 3D** — describe a model in plain English, get a downloadable GLB/FBX/OBJ/STL
- **Image to 3D** — upload a PNG/JPG/WEBP reference image and reconstruct it as a 3D model
- **Interactive 3D viewer** — powered by Google `<model-viewer>` with camera controls, auto-rotate, and AR support on compatible devices
- **Generation history** — last 10 results saved to localStorage with thumbnails; click any to reload it into the viewer
- **Download all formats** — GLB, PBR GLB, and rendered PNG available per generation

---

## Getting a Tripo3D API Key

1. Sign up at [platform.tripo3d.ai](https://platform.tripo3d.ai)
2. Navigate to **API Keys** in your dashboard
3. Create a new key — it starts with `tsk_`

---

## Running Locally

### Prerequisites

- Node.js 18 or later
- npm 9 or later

### Setup

```bash
# 1. Clone the repo
git clone <your-repo-url>
cd tripo3d-designer

# 2. Add your API key
cp .env.example .env
# Open .env and set TRIPO_API_KEY=tsk_your_key_here

# 3. Install all dependencies (root + server + client)
npm run install:all

# 4. Start both servers
npm run dev
```

- **Client** → http://localhost:5173
- **Server** → http://localhost:3001

The Vite dev server proxies all `/api` requests to the Express server, so the API key never touches the browser.

### Test the proxy directly

```bash
curl -s -X POST http://localhost:3001/api/tripo/task \
  -H "Content-Type: application/json" \
  -d '{"type":"text_to_model","prompt":"a red apple","model_version":"v2.5-20250123","texture":true,"pbr":true,"file_format":"glb"}'
```

---

## Project Structure

```
tripo3d-designer/
├── .env.example          ← copy to .env and fill in your key
├── package.json          ← root: runs both servers via concurrently
│
├── server/
│   ├── index.js          ← Express proxy on :3001
│   └── package.json
│
└── client/
    ├── vite.config.js    ← /api proxied to :3001
    ├── index.html        ← model-viewer CDN script lives here
    └── src/
        ├── hooks/
        │   ├── useTripoTask.js   ← polling hook
        │   ├── useToast.js       ← toast notifications
        │   └── useHistory.js     ← localStorage history
        └── components/
            ├── Designer.jsx      ← main UI (form + viewer + history)
            ├── ModelViewer.jsx   ← <model-viewer> wrapper
            ├── HistoryPanel.jsx  ← scrollable history list
            └── Toast.jsx         ← toast container
```

---

## Deploying

### Client → Vercel

1. Push your repo to GitHub
2. Import the project in [vercel.com](https://vercel.com) — select the `client/` subdirectory as the root
3. Build command: `npm run build`
4. Output directory: `dist`
5. **No env vars needed on Vercel** — the client never touches the API key

Update `vite.config.js` to proxy to your deployed server URL for production builds, or use Vercel's rewrite rules to forward `/api/*` to the server.

### Server → Railway

1. Create a new project at [railway.app](https://railway.app)
2. Connect your GitHub repo — set the root to `server/`
3. Start command: `npm start`
4. Add environment variable: `TRIPO_API_KEY=tsk_your_key_here`
5. Update the CORS origin in `server/index.js` to your Vercel client URL:
   ```js
   app.use(cors({ origin: "https://your-app.vercel.app" }));
   ```

### Server → Render

Same as Railway — set root to `server/`, start command to `npm start`, and add the `TRIPO_API_KEY` env var in the Render dashboard.

---

## Environment Variables

| Variable | Where | Description |
|---|---|---|
| `TRIPO_API_KEY` | `.env` / server host | Your Tripo3D API key (`tsk_...`) |

The key is only read server-side — it never appears in client bundles.
