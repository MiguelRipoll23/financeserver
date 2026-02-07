const API_KEY = "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";
const BASE_URL = "https://openrouter.ai/api/v1";

async function testOpenRouter() {
  console.log("Testing OpenRouter API directly...");
  
  const response = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${API_KEY}`,
      "HTTP-Referer": "http://localhost:8000",
      "X-Title": "Finance Server Test"
    },
    body: JSON.stringify({
      model: "openrouter/auto:free",
      messages: [
        { role: "user", content: "Hi, tell me a short joke" }
      ],
      stream: true
    }),
  });

  console.log("Response status:", response.status);
  console.log("Response headers:", Object.fromEntries(response.headers.entries()));
  
  if (!response.ok) {
    const error = await response.text();
    console.error(`Error: ${response.status}`, error);
    return;
  }

  console.log("\nStreaming response:");
  const reader = response.body?.getReader();
  if (!reader) {
    console.error("No reader available");
    return;
  }

  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value);
    process.stdout.write(chunk);
  }
  console.log("\n\nDone!");
}

testOpenRouter().catch(console.error);
