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

async function testNonStreaming() {
  const token = await createToken();
  console.log("Testing NON-streaming endpoint...\n");

  const response = await fetch("http://localhost:8000/api/v1/conversations/stream-message", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({
      sessionId: "550e8400-e29b-41d4-a716-446655440000",
      userMessage: "Say just: OK",
      model: "openrouter/auto:free",
      mcpServer: "GLOBAL"
    }),
  });

  console.log("Response status:", response.status);
  
  if (!response.ok) {
    const error = await response.text();
    console.error(`Error: ${response.status}`, error);
    return;
  }

  // Wait for any response
  console.log("Waiting for response (30 seconds timeout)...");
  
  const timeout = setTimeout(() => {
    console.log("\n⏰ Timeout after 30 seconds - no response received");
    Deno.exit(1);
  }, 30000);
  
  const reader = response.body?.getReader();
  if (!reader) {
    console.error("No reader available");
    return;
  }

  const decoder = new TextDecoder();
  let receivedData = false;
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    if (!receivedData) {
      receivedData = true;
      console.log("✅ First data received!");
      clearTimeout(timeout);
    }
    
    const chunk = decoder.decode(value);
    process.stdout.write(chunk);
  }
  
  if (!receivedData) {
    console.log("❌ No data received before stream ended");
  } else {
    console.log("\n\n✅ Stream completed");
  }
  
  clearTimeout(timeout);
}

testNonStreaming().catch(console.error);
