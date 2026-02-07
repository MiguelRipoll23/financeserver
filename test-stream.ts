import { create } from "https://deno.land/x/djwt@v3.0.1/mod.ts";

const JWT_SECRET = "this is an example of a development secret";

async function createToken() {
  const secretBytes = new TextEncoder().encode(JWT_SECRET);
  const key = await crypto.subtle.importKey(
    "raw",
    secretBytes,
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign", "verify"]
  );

  const now = Math.floor(Date.now() / 1000);
  const threeMonthsInSeconds = 90 * 24 * 60 * 60;

  return await create(
    { alg: "HS512", typ: "JWT" },
    {
      id: "00000000-0000-0000-0000-000000000000",
      name: "Management",
      aud: `http://localhost:8000/*`,
      exp: now + threeMonthsInSeconds,
    },
    key
  );
}

async function testStream() {
  const token = await createToken();
  console.log("Using token:", token);

  console.log("Sending request to stream-message...");
  const response = await fetch("http://localhost:8000/api/v1/conversations/stream-message", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({
      sessionId: "123e4567-e89b-12d3-a456-426614174000",
      userMessage: "Hi, tell me a short joke",
      model: "openrouter/auto:free",
      mcpServer: "GLOBAL"
    }),
  });

  console.log("Response status:", response.status);
  if (!response.ok) {
    const error = await response.text();
    console.error(`Error: ${response.status} ${response.statusText}`, error);
    return;
  }

  console.log("Streaming response:");
  const reader = response.body?.getReader();
  if (!reader) {
    console.error("No reader available");
    return;
  }

  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    await Deno.stdout.write(value);
  }
}

testStream().catch(console.error);
