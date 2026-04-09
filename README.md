# Fest&Rest Chat + Auth MVP

MVP module includes:
- Spring Boot backend (`backend`)
- React web MVP (`web`)
- Flyway migration with chat + auth bounded context schema

## Run backend
1. Start PostgreSQL:
   - DB: `festrest_chat`
   - user: `postgres`
   - password: `postgres`
2. Run:
   - `cd backend`
   - `APP_JWT_SECRET=<YOUR_LOCAL_SECRET> ./gradlew bootRun` (or set `APP_JWT_SECRET` in PowerShell/cmd before `gradlew.bat bootRun` on Windows)

## Run web MVP
1. `cd web`
2. `npm install`
3. `npm run dev`
4. Open displayed Vite URL.

## Quick check flow
1. Authenticate with:
   - `POST /api/auth/google` with `{ "idToken": "..." }`, or
   - `POST /api/auth/telegram/login` with Telegram widget payload.
2. Paste returned JWT into web app.
3. Create a room, send text message.
4. Open second browser tab with another token and verify realtime delivery.

## Auth E2E (Google + Telegram)
### Google login (dev)
1. Create Google OAuth Client ID:
   - Google Cloud Console -> APIs & Services -> Credentials -> Create Credentials -> OAuth client ID.
   - Application type: `Web application`.
   - Authorized JavaScript origins:
     - `http://localhost:5174`
     - `http://localhost:8092`
2. Configure client id:
   - backend: set `app.auth.google.client-id=<YOUR_CLIENT_ID>`
   - web: set `VITE_GOOGLE_CLIENT_ID=<YOUR_CLIENT_ID>`
3. Get `idToken` in browser via Google Identity Services popup:
   - include GIS script and call `google.accounts.id.initialize({ client_id, callback })`
   - in callback read `response.credential` (`idToken`).
4. Exchange token:
   - `POST /api/auth/google` with `{ "idToken": "<credential>" }`.
5. Use returned `accessToken` as Bearer token:
   - REST: `Authorization: Bearer <accessToken>`
   - WS/STOMP: pass Bearer token in handshake/connect `Authorization` header.

### Telegram login (dev)
1. Set bot token:
   - run backend with `--app.auth.telegram.bot-token=<BOT_TOKEN>`.
2. Set web env:
   - `VITE_TELEGRAM_BOT_USERNAME=<YOUR_BOT_USERNAME>`
3. Send Telegram Login Widget payload to:
   - `POST /api/auth/telegram/login`
4. Minimal payload example:
   - `id`, `first_name`, `last_name` (optional), `username` (optional), `photo_url` (optional), `auth_date`, `hash`.
5. Server validates signature via `SHA256(bot_token)` and payload freshness (`auth_date`), then returns `accessToken`.
6. Reuse `accessToken` for REST and WS the same way as Google.

## Notes
- WebSocket endpoint supports SockJS fallback: `/ws`.
- Upload endpoint stores files locally under `uploads/chat`.
- Presence topic is reserved: `/topic/user.{userId}.presence.changed`.

## Git-ready repo notes
- Commit only source code and config templates.
- Do not commit runtime artifacts: `web/node_modules`, `web/dist`, `backend/build`, `backend/uploads`, temp files, or VPS-only config files.
- Backend config is env-first now: production values should be injected through environment variables or a systemd `EnvironmentFile`, not hardcoded in the repository.
- `web/.env.production` is safe to keep in Git as long as it contains only public frontend values such as `VITE_API_BASE_URL`, `VITE_INVITE_BASE_URL`, `VITE_GOOGLE_CLIENT_ID`, and `VITE_TELEGRAM_BOT_USERNAME`.

## VPS deploy flow (recommended)
Target approach:
- Keep this project in Git.
- On VPS, keep chat in its own directory and its own systemd unit.
- Update chat only with `git pull`, rebuild, and restart only the chat service.
- Do not touch unrelated services such as VPN.

Suggested backend environment variables on VPS:
```bash
SERVER_PORT=8092
SPRING_DATASOURCE_URL=jdbc:postgresql://127.0.0.1:5432/festrest_chat
SPRING_DATASOURCE_USERNAME=festrest_chat
SPRING_DATASOURCE_PASSWORD=change-me
APP_JWT_SECRET=change-me-to-a-long-random-secret
APP_CORS_ALLOWED_ORIGINS=https://chatplan.duckdns.org
APP_WEBSOCKET_ALLOWED_ORIGINS=https://chatplan.duckdns.org
APP_AUTH_GOOGLE_CLIENT_ID=585676143428-to455n7ud3kql93t07qtod9gtgs1m2a8.apps.googleusercontent.com
APP_AUTH_TELEGRAM_BOT_TOKEN=change-me
APP_STORAGE_ROOT_PATH=/var/lib/chat2/uploads
```

Example backend systemd unit:
```ini
[Unit]
Description=FestRest Chat Backend
After=network.target postgresql.service

[Service]
User=chat2
WorkingDirectory=/opt/chat2/backend
EnvironmentFile=/etc/chat2/chat2-backend.env
ExecStart=/usr/bin/java -jar /opt/chat2/backend/build/libs/festrest-chat-backend-0.0.1-SNAPSHOT.jar
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Recommended update sequence on VPS:
```bash
cd /opt/chat2
git pull --ff-only

cd /opt/chat2/web
npm ci
npm run build
sudo rsync -a --delete dist/ /var/www/chat2-web/

cd /opt/chat2/backend
./gradlew bootJar
sudo systemctl restart chat2-backend
sudo systemctl status chat2-backend --no-pager
```

Optional helper script:
```bash
#!/usr/bin/env bash
set -euo pipefail

cd /opt/chat2
git pull --ff-only

cd /opt/chat2/web
npm ci
npm run build
rsync -a --delete dist/ /var/www/chat2-web/

cd /opt/chat2/backend
./gradlew bootJar
systemctl restart chat2-backend
systemctl status chat2-backend --no-pager
```

## Iteration 3 Smoke Test (Windows/PowerShell)
### 1) Run backend
```powershell
cd E:\Plans\Chat2\backend
$env:JAVA_HOME="C:\Program Files\Eclipse Adoptium\jdk-17.0.18.8-hotspot"
$env:Path="$env:JAVA_HOME\bin;$env:Path"
.\gradlew.bat bootRun --args="--server.port=8092 --app.auth.telegram.bot-token=<BOT_TOKEN>"
```

### 2) Run web
```powershell
cd E:\Plans\Chat2\web
npm install
npm run dev
```
Open `http://localhost:5174`.

### 3) Prepare JWT and create room
Use JWT from auth flow and set variables:
```powershell
$TOKEN1="<JWT_USER_1>"
$TOKEN2="<JWT_USER_2>"
```

Create room:
```powershell
$room = Invoke-RestMethod -Method Post -Uri "http://localhost:8092/api/chat/v1/rooms" `
  -Headers @{Authorization="Bearer $TOKEN1";"Content-Type"="application/json"} `
  -Body '{"type":"GROUP","title":"Iter3 Smoke","participantIds":["11111111-1111-1111-1111-111111111111","22222222-2222-2222-2222-222222222222"]}'
$ROOM_ID = $room.id
```

### 4) TEXT message
```powershell
Invoke-RestMethod -Method Post -Uri "http://localhost:8092/api/chat/v1/rooms/$ROOM_ID/messages" `
  -Headers @{Authorization="Bearer $TOKEN1";"Content-Type"="application/json"} `
  -Body '{"type":"TEXT","text":"hello text"}'
```

### 5) IMAGE upload + IMAGE message
Upload:
```powershell
$img = curl.exe -s -X POST "http://localhost:8092/api/chat/v1/attachments" `
  -H "Authorization: Bearer $TOKEN1" `
  -F "file=@E:/Plans/Chat2/web/scripts/sample.png;type=image/png" | ConvertFrom-Json
```
Send message:
```powershell
Invoke-RestMethod -Method Post -Uri "http://localhost:8092/api/chat/v1/rooms/$ROOM_ID/messages" `
  -Headers @{Authorization="Bearer $TOKEN1";"Content-Type"="application/json"} `
  -Body ("{`"type`":`"IMAGE`",`"attachments`":[{`"kind`":`"IMAGE`",`"storageKey`":`"$($img.storageKey)`",`"publicUrl`":`"$($img.publicUrl)`",`"mimeType`":`"$($img.mimeType)`",`"sizeBytes`":$($img.sizeBytes),`"width`":$($img.width),`"height`":$($img.height)}]}")
```

### 6) VIDEO upload + VIDEO message
Upload:
```powershell
$vid = curl.exe -s -X POST "http://localhost:8092/api/chat/v1/attachments" `
  -H "Authorization: Bearer $TOKEN1" `
  -F "file=@E:/Plans/Chat2/web/scripts/sample.mp4;type=video/mp4" | ConvertFrom-Json
```
Send message:
```powershell
Invoke-RestMethod -Method Post -Uri "http://localhost:8092/api/chat/v1/rooms/$ROOM_ID/messages" `
  -Headers @{Authorization="Bearer $TOKEN1";"Content-Type"="application/json"} `
  -Body ("{`"type`":`"VIDEO`",`"attachments`":[{`"kind`":`"VIDEO`",`"storageKey`":`"$($vid.storageKey)`",`"publicUrl`":`"$($vid.publicUrl)`",`"mimeType`":`"$($vid.mimeType)`",`"sizeBytes`":$($vid.sizeBytes),`"durationSec`":null}]}")
```

### 7) LOCATION message
```powershell
Invoke-RestMethod -Method Post -Uri "http://localhost:8092/api/chat/v1/rooms/$ROOM_ID/messages" `
  -Headers @{Authorization="Bearer $TOKEN1";"Content-Type"="application/json"} `
  -Body '{"type":"LOCATION","location":{"lat":55.751,"lng":37.618,"label":"Moscow center"}}'
```

### 8) Realtime receive in second client
- Open second browser tab/window.
- Sign in as second user (`$TOKEN2` or popup login).
- Open the same room.
- Send from first client and verify second client receives `messages.created` events immediately.

### 9) History check
```powershell
Invoke-RestMethod -Method Get -Uri "http://localhost:8092/api/chat/v1/rooms/$ROOM_ID/messages?limit=20" `
  -Headers @{Authorization="Bearer $TOKEN1"} | ConvertTo-Json -Depth 6
```
Expected: history contains message types `TEXT`, `IMAGE`, `VIDEO`, `LOCATION` with attachment metadata for media messages.
