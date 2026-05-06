# ELK Lark — performance monitor PoC

Standalone demo for **ELK Lark** + the **Sycle performance monitor** (vendored under `src/performance-monitor/`). This folder is **not** wired into the ELK Garden `frontend/` app — delete `elk-lark-poc/` whenever you like.

## Run

```bash
cd elk-lark-poc
npm install
npm run dev
```

Open **http://localhost:5175** (port chosen to avoid clashing with the main app on `5173`).

## What it does

- **ELK Lark** page: short narrative + buttons that fire real `fetch` calls (JSONPlaceholder / httpbin).
- **Performance Lab** overlay: instruments `window.fetch` while enabled; Web Vitals + tabs from the original monitor.
- **Chrome extension later**: same overlay + service code can move into an extension entrypoint; this PoC proves the UX in a browser.

## Source

Monitor logic was copied from `../sycle-performance-monitor` and adjusted (relative imports, `fetch` instrumentation, ELK-specific storage key). Upstream README: `../sycle-performance-monitor/README.md`.
