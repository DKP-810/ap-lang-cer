async function callGemini(systemPrompt, userMessage) {
  const cleanKey = GEMINI_API_KEY.trim();
  const apiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

  const res = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": cleanKey
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ parts: [{ text: userMessage }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.7 }
    })
  });

  const data = await res.json();

  if (data.error) {
    const preview = cleanKey.slice(0, 8) + "..." + cleanKey.slice(-4);
    throw new Error(`${data.error.message} [Key: ${preview}, status: ${data.error.code}]`);
  }

  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  return JSON.parse(raw.replace(/```json|```/g, "").trim());
}
