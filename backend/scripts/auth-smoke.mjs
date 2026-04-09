import crypto from "node:crypto";

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
  const dataCheck = Object.keys(payload)
    .sort()
    .map((k) => `${k}=${payload[k]}`)
    .join("\n");
  const secret = crypto.createHash("sha256").update(botToken).digest();
  payload.hash = crypto.createHmac("sha256", secret).update(dataCheck).digest("hex");

  const r = await fetch(`${baseUrl}/api/auth/telegram`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await r.text();
  if (!r.ok) throw new Error(`telegram login failed: ${r.status} ${body}`);
  const token = JSON.parse(body).accessToken;
  return { token, userId: decodeSub(token) };
}

const one = await telegramLogin();
const two = await telegramLogin();
console.log(JSON.stringify({ firstUserId: one.userId, secondUserId: two.userId, sameUser: one.userId === two.userId }));
