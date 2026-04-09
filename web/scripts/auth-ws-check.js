import crypto from "node:crypto";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";

const baseUrl = process.argv[2] || "http://localhost:8092";
const botToken = process.argv[3] || "dev_bot_token_123";

function decodeSub(jwt) {
  const payload = JSON.parse(Buffer.from(jwt.split(".")[1], "base64url").toString("utf8"));
  return payload.sub;
}

async function telegramLogin() {
  const authDate = Math.floor(Date.now() / 1000).toString();
  const payload = {
    id: "77777777",
    first_name: "Tele",
    last_name: "Gram",
    username: "tele_dev",
    photo_url: "https://example.com/a.png",
    auth_date: authDate,
  };
  const dataCheck = Object.keys(payload).sort().map((k) => `${k}=${payload[k]}`).join("\n");
  const secret = crypto.createHash("sha256").update(botToken).digest();
  payload.hash = crypto.createHmac("sha256", secret).update(dataCheck).digest("hex");

  const r = await fetch(`${baseUrl}/api/auth/telegram`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error(`telegram login failed: ${r.status}`);
  const token = (await r.json()).accessToken;
  return { token, userId: decodeSub(token) };
}

const { token, userId } = await telegramLogin();

const room = await fetch(`${baseUrl}/api/chat/v1/rooms`, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
  body: JSON.stringify({
    type: "GROUP",
    title: "Auth WS Check",
    participantIds: [userId, "22222222-2222-2222-2222-222222222222"],
  }),
}).then((r) => r.json());

let messageReceived = false;
let roomUpdated = false;

const client = new Client({
  webSocketFactory: () => new SockJS(`${baseUrl}/ws`),
  connectHeaders: { Authorization: `Bearer ${token}` },
});

client.onConnect = () => {
  client.subscribe(`/topic/rooms.${room.id}.messages.created`, () => {
    messageReceived = true;
  });
  client.subscribe(`/topic/user.${userId}.rooms.updated`, () => {
    roomUpdated = true;
  });
  client.publish({
    destination: "/app/chat.send",
    body: JSON.stringify({
      roomId: room.id,
      type: "TEXT",
      bodyJson: JSON.stringify({ text: "auth ws send" }),
    }),
    headers: { Authorization: `Bearer ${token}` },
  });
};

client.activate();
setTimeout(() => {
  const result = { userId, messageReceived, roomUpdated };
  console.log(JSON.stringify(result));
  client.deactivate();
  process.exit(messageReceived && roomUpdated ? 0 : 1);
}, 3500);
