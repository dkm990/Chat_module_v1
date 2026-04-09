import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";

const [roomId, token1, token2, baseUrlArg] = process.argv.slice(2);
const baseUrl = baseUrlArg || "http://localhost:8092";
if (!roomId || !token1 || !token2) {
  console.error("Usage: node scripts/smoke-ws.js <roomId> <token1> <token2>");
  process.exit(2);
}

let msgReceived = false;
let roomsUpdated = false;
let readEvent = false;

const c1 = new Client({
  webSocketFactory: () => new SockJS(`${baseUrl}/ws`),
  connectHeaders: { Authorization: `Bearer ${token1}` },
});
const c2 = new Client({
  webSocketFactory: () => new SockJS(`${baseUrl}/ws`),
  connectHeaders: { Authorization: `Bearer ${token2}` },
});

c2.onConnect = () => {
  c2.subscribe(`/topic/rooms.${roomId}.messages.created`, (frame) => {
    msgReceived = true;
    console.log("MSG_EVENT", frame.body);
  });
};

c1.onConnect = () => {
  c1.subscribe("/topic/user.11111111-1111-1111-1111-111111111111.rooms.updated", (frame) => {
    roomsUpdated = true;
    console.log("ROOMS_UPDATED", frame.body);
  });
  c1.subscribe(`/topic/rooms.${roomId}.messages.read`, (frame) => {
    readEvent = true;
    console.log("READ_EVENT", frame.body);
  });
};

c1.activate();
c2.activate();

setTimeout(async () => {
  try {
    const sendRes = await fetch(`${baseUrl}/api/chat/v1/rooms/${roomId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token1}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ type: "TEXT", bodyJson: JSON.stringify({ text: "ws smoke" }) }),
    });
    const sendText = await sendRes.text();
    const message = JSON.parse(sendText);

    await fetch(`${baseUrl}/api/chat/v1/rooms/${roomId}/read`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token1}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ lastReadMessageId: message.id }),
    });
  } catch (e) {
    console.error("SMOKE_TRIGGER_ERROR", e);
  }
}, 1200);

setTimeout(() => {
  const result = { msgReceived, roomsUpdated, readEvent };
  console.log("RESULT", JSON.stringify(result));
  c1.deactivate();
  c2.deactivate();
  process.exit(msgReceived && roomsUpdated && readEvent ? 0 : 1);
}, 5000);
