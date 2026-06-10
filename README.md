# Alcovia Assignment

Offline-first study app with focus sessions, syllabus tracking, and two-device sync via Lamport Clocks.

## Project Structure
```
Alcovia_Assignment/
├── client/                    # Expo React Native app (web target)
│   └── src/
│       ├── app/
│       │   ├── _layout.tsx    # Root layout (headerless Stack navigator)
│       │   └── index.tsx      # Main screen (FocusTimer + SyllabusTree)
│       ├── components/
│       │   ├── FocusTimer.tsx # Focus session UI + AppState/visibility fail detection
│       │   ├── SyllabusTree.tsx  # Subject/chapter/task tree with progress bars
│       │   └── DevPanel.tsx   # Offline toggle, force sync, live stats overlay
│       └── lib/
│           ├── store.ts       # Zustand state + Lamport sync engine
│           ├── storage.ts     # localStorage wrapper + device identity + Lamport clock
│           └── types.ts       # Shared TypeScript interfaces
├── server/
│   └── src/
│       ├── index.ts           # Express REST API (/sync, /state, /mock-notify)
│       └── db.ts              # SQLite schema + seed data via better-sqlite3
├── n8n-workflow.json          # Exported n8n webhook workflow structure
├── DECISIONS.md               # Architecture decisions, trade-offs, convergence proof
└── README.md                  # This file
```

## How to Run

### Prerequisites
- Node.js 18+
- npm

### 1. Start the server
```bash
cd server
npm install
npm run dev
```
Server runs on `http://localhost:3000`.

### 2. Start the client
```bash
cd client
npm install
npx expo start -w
```
Client runs on `http://localhost:8081`.

### 3. (Optional) Expose server via tunnel for n8n callback
```bash
cloudflared tunnel --protocol http2 --url http://localhost:3000
```
Copy the `*.trycloudflare.com` URL and set it as the callback in your n8n HTTP Request node.

---

## How to Test the 3 Core Scenarios

Open **two browser tabs** to simulate two devices:
- **Device A:** `http://localhost:8081/?deviceId=device-A`
- **Device B:** `http://localhost:8081/?deviceId=device-B`

### Scenario 1: Two Devices, Offline Conflict (Lamport Clock LWW)
1. On **both** devices, open the DEV PANEL and click **"Go Offline"**.
2. On **Device A**, click a syllabus task once → marks it `in_progress` (Lamport clock = 1).
3. On **Device B**, click the **same** task twice → marks it `done` (Lamport clock = 2).
4. Click **"Go Online"** on Device B first, then Device A.
5. **Device B's state (`done`) wins** on both devices because its Lamport clock (2) is higher than Device A's (1).

### Scenario 2: Focus Session Offline → Reconnect → n8n Fires
1. Go **Offline** on Device A.
2. Click **"Start 5s Demo Session"** and wait for it to complete.
3. You'll see coins and focus minutes update **immediately** (optimistic local update).
4. Go **Online**.
5. The session syncs to the server → server processes the reward → fires the n8n webhook.
6. Check your server terminal for: `n8n webhook fired for session <id>, status: 200`.

### Scenario 3: Idempotency — No Double Rewards
1. Complete a 5s Demo Session while online.
2. Click **"Force Sync"** in the Dev Panel — rewards are applied.
3. In your server terminal, run `Ctrl+C` to kill the server, then `npm run dev` again.
4. Click **"Force Sync"** again.
5. **Coins do not increase** — the server recognises the `sessionId` in `processed_sessions` and skips re-processing.

---

## Environment Variables (server/.env)
```
N8N_WEBHOOK_URL=https://your-n8n-instance.app.n8n.cloud/webhook-test/session-complete
```
If not set, defaults to the hardcoded n8n cloud URL in `index.ts`.

## Dev Panel
The floating Dev Panel (bottom-right) lets you:
- Toggle **offline mode** (simulates no network without disconnecting your wifi)
- See your **device ID** (set via `?deviceId=` URL param)
- Check **unsynced session count**
- **Force Sync** manually
- View live **coins, streak, and focus minutes**
