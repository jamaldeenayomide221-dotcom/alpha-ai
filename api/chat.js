export default async function handler(req, res) {
if (req.method !== "POST") {
return res.status(405).json({
error: "Only POST requests are allowed."
});
}

try {
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  return res.status(500).json({
    error: "AI is not configured yet. Please set GEMINI_API_KEY."
  });
}

const { message, history = [] } = req.body || {};

if (typeof message !== "string" || !message.trim()) {
  return res.status(400).json({
    error: "Please enter a message."
  });
}

const contents = [];

for (const item of history.slice(-10)) {
  if (
    item &&
    ["user", "model"].includes(item.role) &&
    typeof item.text === "string"
  ) {
    contents.push({
      role: item.role,
      parts: [{ text: item.text.slice(0, 4000) }]
    });
  }
}

contents.push({
  role: "user",
  parts: [{ text: message.trim().slice(0, 4000) }]
});

const response = await fetch(
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{
          text: "You are ALPHA AI, a friendly and helpful AI assistant. Answer questions on many topics, explain school subjects clearly, help with mathematics step by step, assist with writing and coding, and be honest when you are uncertain. Use clear language suitable for the user's level."
        }]
      },
      contents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1500
      }
    })
  }
);

const data = await response.json();

if (!response.ok) {
  console.error("Gemini API error:", data.error?.message);

  return res.status(502).json({
    error: "The AI service could not answer. Please check the API configuration and try again."
  });
}

const answer = data.candidates?.[0]?.content?.parts
  ?.map(part => part.text || "")
  .join("")
  .trim();

if (!answer) {
  return res.status(502).json({
    error: "The AI returned no answer. Please try again."
  });
}

return res.status(200).json({ reply: answer });

} catch (error) {
console.error("ALPHA AI server error:", error.message);

return res.status(500).json({
  error: "Something went wrong. Please try again."
});

}
}