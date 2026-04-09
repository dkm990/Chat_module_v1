import http from "node:http";
import crypto from "node:crypto";

const baseUrl = process.argv[2] || "http://localhost:8092";
const clientId = process.argv[3] || "dummy-google-client-id.apps.googleusercontent.com";
const jwkPort = Number(process.argv[4] || 9011);
const kid = "dev-kid-1";

const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
const jwk = publicKey.export({ format: "jwk" });
jwk.kid = kid;
jwk.use = "sig";
jwk.alg = "RS256";

const server = http.createServer((req, res) => {
  if (req.url === "/certs") {
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ keys: [jwk] }));
    return;
  }
  res.statusCode = 404;
  res.end();
});

const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64url");
function makeToken(aud, sub) {
  const header = { alg: "RS256", typ: "JWT", kid };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: "https://accounts.google.com",
    aud,
    exp: now + 3600,
    iat: now,
    sub,
    email: "dev@example.com",
    name: "Dev Google",
    picture: "https://example.com/avatar.png",
  };
  const encoded = `${b64(header)}.${b64(payload)}`;
  const sign = crypto.createSign("RSA-SHA256");
  sign.update(encoded);
  sign.end();
  const sig = sign.sign(privateKey).toString("base64url");
  return `${encoded}.${sig}`;
}

const postGoogle = async (idToken) => {
  const r = await fetch(`${baseUrl}/api/auth/google`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  return { status: r.status, body: await r.text() };
};

await new Promise((resolve) => server.listen(jwkPort, resolve));

try {
  const sub = "google-sub-123";
  const ok1 = await postGoogle(makeToken(clientId, sub));
  const badAud = await postGoogle(makeToken("wrong-aud.apps.googleusercontent.com", sub));
  const ok2 = await postGoogle(makeToken(clientId, sub));

  let sameSub = false;
  if (ok1.status === 200 && ok2.status === 200) {
    const jwt1 = JSON.parse(ok1.body).accessToken;
    const jwt2 = JSON.parse(ok2.body).accessToken;
    const p1 = JSON.parse(Buffer.from(jwt1.split(".")[1], "base64url").toString("utf8"));
    const p2 = JSON.parse(Buffer.from(jwt2.split(".")[1], "base64url").toString("utf8"));
    sameSub = p1.sub === p2.sub;
  }

  console.log(
    JSON.stringify({
      ok1Status: ok1.status,
      badAudStatus: badAud.status,
      ok2Status: ok2.status,
      sameSub,
      jwkUri: `http://localhost:${jwkPort}/certs`,
    })
  );
} finally {
  server.close();
}
