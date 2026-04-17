## AI ToS Analyzer (Cloud)

This folder is a separate Chrome extension build for hosted environments.

It does not modify the localhost extension in `extension/`.

### 1) Configure hosted URLs

Edit `extension-cloud/service-worker.js`:

- `API_BASE`: your Render backend URL (for example `https://your-api.onrender.com`)
- `DASHBOARD_URL`: your Vercel frontend URL (for example `https://your-app.vercel.app`)

### 2) Load this cloud extension

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click Load unpacked.
4. Select the `extension-cloud/` folder.

You can keep this and `extension/` installed together for local vs cloud testing.

### 3) Expected behavior

- On supported web pages, clicking the extension icon triggers a manual scan.
- On unsupported pages (for example `chrome://`), icon click opens the Vercel dashboard.
- If cloud URLs are still placeholders, icon click opens dashboard and backend calls show config guidance.
