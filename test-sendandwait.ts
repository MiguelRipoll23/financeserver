// Test using sendAndWait instead of manual event listening

const apiUrl = "http://localhost:8000/api/v1/test/sendandwait";

const payload = {
  sessionId: "test-sendandwait-session",
  mcpServer: "GLOBAL",
  model: "openrouter/auto:free",
  userMessage: "Hi, tell me a short joke"
};

console.log("Sending message with sendAndWait approach...");

const response = await fetch(apiUrl, {
  method: "POST",
  headers: { 
    "Content-Type": "application/json"
  },
  body: JSON.stringify(payload)
});

console.log(`Status: ${response.status}`);

if (response.ok) {
  const data = await response.json();
  console.log("Response:", data);
} else {
  console.error("Error:", await response.text());
}
