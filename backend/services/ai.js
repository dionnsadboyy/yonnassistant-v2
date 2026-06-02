require("dotenv").config();

const API_URL = "https://core.snifoxai.com/v1/chat/completions";
const MODEL = "openai/gpt-5.2";

function ensureApiKey() {
  if (!process.env.SNIFOX_API_KEY) {
    throw new Error("SNIFOX_API_KEY is missing");
  }
}

function stripCodeFence(text) {
  return String(text || "")
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/i, "")
    .trim();
}

async function callGPT(messages) {
  ensureApiKey();

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.SNIFOX_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
    }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      data?.error?.message || data?.error || `Snifox HTTP ${response.status}`,
    );
  }

  const content = data?.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("Snifox returned empty content");
  }

  return content;
}

async function decideNeedDatabase(question) {
  const prompt = `
Tentukan apakah pertanyaan user membutuhkan data database keuangan.

Jawab HANYA JSON VALID, tanpa markdown, tanpa code fence.

Contoh valid:
{"needDatabase":true}
atau
{"needDatabase":false}

User:
${question}
`.trim();

  const result = await callGPT([
    {
      role: "system",
      content: "Kamu AI router. Jawab hanya JSON valid.",
    },
    {
      role: "user",
      content: prompt,
    },
  ]);

  const cleaned = stripCodeFence(result);

  try {
    const parsed = JSON.parse(cleaned);
    return {
      needDatabase: Boolean(parsed.needDatabase),
    };
  } catch {
    return {
      needDatabase: true,
    };
  }
}

async function answerNormal(question) {
  return await callGPT([
    {
      role: "system",
      content: `
Kamu adalah YonnGPT.

Jawab santai.
Bahasa Indonesia.
Fokus ke produktivitas, hidup, dan keuangan.
Jangan terlalu panjang.
`.trim(),
    },
    {
      role: "user",
      content: question,
    },
  ]);
}

async function answerWithDatabase(question, databaseData) {
  return await callGPT([
    {
      role: "system",
      content: `
Kamu adalah YonnGPT.

Jawab berdasarkan data database.
Jangan mengarang angka.
Kalau data tidak ditemukan, bilang tidak ditemukan.
Gunakan bahasa Indonesia santai.
`.trim(),
    },
    {
      role: "user",
      content: `
PERTANYAAN:
${question}

DATABASE:
${JSON.stringify(databaseData)}
`.trim(),
    },
  ]);
}

module.exports = {
  decideNeedDatabase,
  answerNormal,
  answerWithDatabase,
};
