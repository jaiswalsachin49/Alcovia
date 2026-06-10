# Architecture & Decisions

## 1. Conflict Resolution (Lamport Clocks)
To ensure reliable sync without relying on device wall-clocks (which can drift), the app uses Lamport Logical Clocks at the row level for Tasks.
- Each `Task` row has a `lamportClock` integer.
- Whenever a device toggles a task, its local clock increments, and the task gets updated with `lamportClock = max(localClock) + 1` and `deviceId = local_device_id`.
- On the server, when receiving a sync payload, the server compares the incoming task's `lamportClock` with its database record.
- **Rule:** The higher `lamportClock` wins. If clocks are exactly equal, we break the tie using `deviceId` alphabetically to guarantee deterministic convergence.

## 2. Idempotency & Reward Safety
- The backend is the source of truth for "has this focus session been rewarded?".
- Clients generate a unique `sessionId` (UUID v4) upon completing a focus session.
- When the client syncs, the server checks if `sessionId` exists in the `processed_sessions` table.
- If it does **NOT** exist, the server applies the reward logic (checking streak daily limit, granting 50 coins, firing the n8n webhook) and inserts the `sessionId`.
- If it **DOES** exist, the server skips all reward logic. This allows clients to safely retry syncs after a network timeout without double-rewarding.

## 3. Expo & Local Storage
- Zustand is used for client-side state management.
- `localStorage` (namespaced per device via `alcovia_<deviceId>_`) is used to persist all state across reloads.
- A Dev Panel is included in the UI to manually toggle offline/online mode for testing without disconnecting real wifi.
- A 5-second demo session timer is included for easy video recording.

## 4. n8n Webhook Integration
- When a focus session is successfully processed on the server, it fires a `POST` to the n8n cloud webhook URL (`N8N_WEBHOOK_URL` env variable).
- The `/mock-notify` endpoint on the local server acts as a local sink for verifying callbacks without needing n8n running.
- The webhook fires **asynchronously** — sync response is never delayed by webhook latency.

## Trade-offs and Simplifications
- Authentication is mocked as `student-1`. A real app would use JWTs and per-user isolation.
- CRDTs were considered but Lamport Clocks paired with Last-Write-Wins is sufficient and much simpler for this use case (toggling enum statuses). CRDTs would be necessary for collaborative text editing.
- Focus Sessions are immutable once finished. They are appended to a log queue and are never edited, only processed once on the server (idempotency guaranteed by `processed_sessions` table).
- The Lamport clock is device-local and persists in `localStorage`. If a user clears browser storage, the clock resets to 0. This means a cleared device could temporarily have a lower clock than the server. This is an accepted limitation for this assignment scope.

## Why Two Devices Always Converge
Every task mutation is tagged with a Lamport clock that increments monotonically on each device. On sync, the server applies a deterministic rule (higher clock wins, `deviceId` as tiebreak on equality) to every incoming change. Since both devices receive the server's resolved state after sync, they are guaranteed to converge to the same value regardless of the order edits arrived.

## Where It Could Still Break
- If a device never comes back online, its changes are lost permanently — there is no conflict surfaced to the user.
- Lamport clocks only track causality within a single device's edit history. Two edits made simultaneously on different devices at the same logical clock value are resolved by `deviceId` tiebreak, which is arbitrary, not meaningful.
- The streak logic assumes the server's date is authoritative. A device in a different timezone could miscalculate streak boundaries.
- If a user clears `localStorage`, their Lamport clock resets to 0. Any pending offline changes would lose a conflict race against server state on next sync.
