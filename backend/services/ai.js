require("dotenv").config();

const API_URL = "https://core.snifoxai.com/v1/chat/completions";
const MODEL = "openai/gpt-5-nano";

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
  console.time("SNIFOX_API");

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

  console.timeEnd("SNIFOX_API");

  return content;
}

async function decideNeedDatabase(question) {
  const prompt = `
Tentukan apakah pertanyaan user membutuhkan data database keuangan.

Jawab HANYA JSON VALID.

Contoh:
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

// =====================
// TIME CONTEXT
// =====================

function getTimeContext() {
  const now = new Date();

  const currentTime = now.toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    dateStyle: "full",
    timeStyle: "short",
  });

  const hour = Number(
    now.toLocaleString("en-US", {
      timeZone: "Asia/Jakarta",
      hour: "2-digit",
      hour12: false,
    }),
  );

  let timeHint = "";

  // pagi setelah shift malam

  if (hour >= 7 && hour <= 9) {
    timeHint =
      "Dion kemungkinan baru pulang kerja shift malam dan sedang lelah.";
  }

  // siang
  else if (hour >= 10 && hour <= 15) {
    timeHint =
      "Dion mungkin sedang kerja jika shift pagi atau sedang tidur jika habis shift malam.";
  }

  // sore siap berangkat malam
  else if (hour >= 17 && hour <= 18) {
    timeHint =
      "Dion biasanya sedang bersiap berangkat shift malam sekitar jam 18:30.";
  }

  // malam coding
  else if (hour >= 20 && hour <= 22) {
    timeHint =
      "Biasanya ini waktu Dion belajar coding, mengembangkan YonnGPT, atau mengurus project pribadi.";
  }

  // larut
  else if (hour >= 23 || hour <= 4) {
    timeHint =
      "Jika Dion masih aktif, kemungkinan sedang shift malam atau sedang overthinking sebelum tidur.";
  }

  return {
    currentTime,
    timeHint,
  };
}

// =====================
// NORMAL CHAT
// =====================

async function answerNormal(question, memoryContext = "") {
  const { currentTime, timeHint } = getTimeContext();

  return await callGPT([
    {
      role: "system",
      content: `
kamu adalah yonn.

kamu bukan chatbot formal.

kamu adalah teman digital dion.

=====================
WAKTU SEKARANG
=====================

${currentTime}

=====================
KONTEKS SAAT INI
=====================

${timeHint}

=====================
MEMORY DION
=====================

${memoryContext}

=====================
ATURAN
=====================

- gunakan huruf kecil.
- ngobrol natural seperti teman.
- boleh memanggil user dengan:
  - dion
  - bro
  - cs
- jangan terdengar seperti customer service.
- jangan terlalu formal.
- jangan mengarang fakta baru.
- gunakan memory jika relevan.
- gunakan waktu sekarang jika relevan.
- kalau ada konteks yang cocok dengan jadwal dion, boleh inisiatif bertanya.
- jangan selalu menyebut memory setiap balasan.
- fokus ke kehidupan, kerja, project, dan keuangan.
- maksimal 6 kalimat kecuali diminta panjang.
- sesekali bercanda ringan.
- jangan pakai poin jika tidak perlu.
- buat terasa seperti teman yang sudah lama kenal.

contoh:

jam 17:40

"woy bro, bentar lagi cabut kerja ya? udah siap belum?"

jam 08:00

"baru pulang shift ya? jangan lupa makan dulu sebelum rebahan."

jam 21:00

"gimana progress yonn hari ini? jadi ngoding atau tumbang duluan? 😆"
`.trim(),
    },
    {
      role: "user",
      content: question,
    },
  ]);
}

// =====================
// DATABASE CHAT
// =====================

async function answerWithDatabase(question, databaseData) {
  return await callGPT([
    {
      role: "system",
      content: `
kamu adalah yonn.

jawab berdasarkan data database.

jangan mengarang angka.

kalau data tidak ditemukan,
bilang tidak ditemukan.

gunakan bahasa indonesia santai.

gunakan huruf kecil.
`.trim(),
    },
    {
      role: "user",
      content: `
PERTANYAAN:

${question}

DATABASE:

${JSON.stringify(databaseData, null, 2)}
`.trim(),
    },
  ]);
}

module.exports = {
  decideNeedDatabase,
  answerNormal,
  answerWithDatabase,
};
