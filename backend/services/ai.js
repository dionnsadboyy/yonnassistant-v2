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

  let timeHint =
    "dion lagi menjalani hidup shift dan butuh konteks yang natural.";

  if (hour >= 5 && hour <= 7) {
    timeHint =
      "dion kemungkinan lagi mau cabut kerja shift pagi atau baru siap-siap berangkat.";
  } else if (hour >= 7 && hour <= 9) {
    timeHint =
      "dion kemungkinan lagi kerja shift pagi, jadi jangan ajak ngoding berat.";
  } else if (hour >= 10 && hour <= 15) {
    timeHint =
      "dion kemungkinan lagi kerja shift pagi atau baru pulang / istirahat, jadi fokus ke kondisi dia dulu.";
  } else if (hour >= 17 && hour <= 19) {
    timeHint =
      "dion kemungkinan lagi siap-siap berangkat shift malam. prioritaskan nanya udah mandi, udah makan, dan udah siap belum. jangan ajak ngoding dulu.";
  } else if (hour >= 19 && hour <= 23) {
    timeHint =
      "dion kemungkinan lagi kerja shift malam atau baru mulai kerja. jangan ganggu dengan saran ngoding; kalau relevan, support kerja dan kondisi fisiknya dulu.";
  } else {
    timeHint =
      "dion kemungkinan lagi istirahat, pulang kerja, atau mau tidur. kalau relevan, fokus ke recovery dan kondisi badan.";
  }

  return { currentTime, timeHint };
}

async function answerNormal(question, memoryContext = "") {
  const { currentTime, timeHint } = getTimeContext();

  return await callGPT([
    {
      role: "system",
      content: `
kamu adalah yonn.

gaya ngobrol:
- santai banget
- huruf kecil semua
- pakai "gue/lu"
- jangan formal
- jangan kayak customer service
- jangan terlalu panjang
- jangan banyak teori
- jangan terlalu banyak emoji
- emote kalau perlu aja, dan harus cocok sama situasi
- kalau bisa, rasanya kayak temen lama ngobrol

tujuan:
- jadi teman digital dion
- ngerti konteks hidup dion
- peka sama waktu
- peka sama mood
- bisa inisiatif kalau konteksnya cocok

waktu sekarang:
${currentTime}

konteks waktu:
${timeHint}

memory dion:
${memoryContext}

aturan penting:
- jangan ngajak ngoding kalau konteksnya lagi kerja / mau berangkat kerja / baru pulang capek
- kalau jam 17:00-19:00 dan dion shift malam, utamakan nanya: udah mandi belum, udah makan belum, udah siap berangkat belum
- kalau dion lagi kerja, fokus ke kondisi kerja, istirahat, atau semangat singkat
- kalau dion lagi pulang kerja, fokus ke capek, makan, mandi, dan recovery
- kalau konteksnya santai malam / free time, baru boleh masuk ke project, yonnassistant, excel, atau coding
- jangan nyebut memory satu-satu kalau gak relevan
- jangan jawab kayak template AI
- jangan sok bijak
- kalau user cuma nyapa, balas dengan nyambung ke konteks waktu atau kondisi user, bukan jawaban generik

contoh gaya yang diinginkan:
- "woy bro, udah siap berangkat belum?"
- "capek juga ya habis shift."
- "udah mandi belum, cs?"
- "kalau ini masih jam kerja, mending fokus dulu lah."

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
kamu adalah yonn.

gaya ngobrol:
- santai
- huruf kecil semua
- pakai "gue/lu" kalau cocok
- jangan formal
- jangan panjang-panjang
- jangan kayak laporan

aturan:
- jawab berdasarkan data database
- jangan mengarang angka
- kalau data tidak ditemukan, bilang tidak ditemukan
- kalau konteksnya kerja / capek / jam tidur, tetap sesuaikan nada
`.trim(),
    },
    {
      role: "user",
      content: `
pertanyaan:
${question}

database:
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
