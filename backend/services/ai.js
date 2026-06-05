require("dotenv").config();

const API_URL = "https://core.snifoxai.com/v1/chat/completions";
const MODEL = "openai/gpt-5-nano";
const DEFAULT_TIMEZONE = "Asia/Jakarta";
const MAX_MEMORY_LINES = 120;
const MAX_MEMORY_CHARS = 12000;
const MAX_RESPONSE_INSTRUCTION = 8;

function ensureApiKey() {
  if (!process.env.SNIFOX_API_KEY) {
    throw new Error("SNIFOX_API_KEY is missing");
  }
}

function stripCodeFence(text) {
  return String(text || "")
    .trim()
    .replace(/^```(?:json|js|javascript)?\s*/i, "")
    .replace(/```$/i, "")
    .trim();
}

function normalizeSpaces(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeKey(value) {
  return normalizeSpaces(value)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ");
}

function truncateText(value, maxLength) {
  const text = String(value || "");
  if (text.length <= maxLength) return text;
  return text.slice(0, Math.max(0, maxLength - 1)).trimEnd() + "…";
}

function safeJsonParse(input, fallback = null) {
  try {
    return JSON.parse(input);
  } catch {
    return fallback;
  }
}

function capitalizeFirst(text) {
  const value = String(text || "");
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getJakartaNow() {
  const now = new Date();

  const dateLong = now.toLocaleString("id-ID", {
    timeZone: DEFAULT_TIMEZONE,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const dateShort = now.toLocaleString("id-ID", {
    timeZone: DEFAULT_TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const timeShort = now.toLocaleTimeString("id-ID", {
    timeZone: DEFAULT_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const hour = Number(
    now.toLocaleString("en-US", {
      timeZone: DEFAULT_TIMEZONE,
      hour: "2-digit",
      hour12: false,
    }),
  );

  const dayName = now.toLocaleString("id-ID", {
    timeZone: DEFAULT_TIMEZONE,
    weekday: "long",
  });

  return {
    now,
    hour,
    dayName,
    dateShort,
    timeShort,
    dateLong,
    iso: now.toISOString(),
  };
}

function getTimeContext() {
  const { hour, dayName, dateLong, timeShort } = getJakartaNow();

  let phase = "netral";
  let energy = "normal";
  let hint = "konteks waktu netral.";

  if (hour >= 4 && hour < 7) {
    phase = "pagi buta";
    energy = "siap-siap";
    hint = "dion kemungkinan baru bangun atau lagi siap cabut kerja.";
  } else if (hour >= 7 && hour < 11) {
    phase = "pagi kerja";
    energy = "fokus kerja";
    hint =
      "dion kemungkinan lagi kerja shift pagi, jadi jangan ajak ngoding berat.";
  } else if (hour >= 11 && hour < 16) {
    phase = "siang-sore kerja";
    energy = "capek kerja";
    hint = "dion kemungkinan lagi kerja atau lagi di fase capek kerja.";
  } else if (hour >= 16 && hour < 19) {
    phase = "sore siap berangkat";
    energy = "siap berangkat";
    hint =
      "dion kemungkinan lagi siap-siap berangkat shift malam. prioritasnya cek mandi, makan, dan siap cabut.";
  } else if (hour >= 19 && hour < 23) {
    phase = "malam kerja";
    energy = "kerja malam";
    hint = "dion kemungkinan lagi shift malam atau baru mulai kerja malam.";
  } else {
    phase = "larut / dini hari";
    energy = "istirahat";
    hint = "dion kemungkinan lagi istirahat, pulang kerja, atau mau tidur.";
  }

  return {
    currentTime: `${dayName}, ${dateLong} WIB`,
    shortTime: timeShort,
    hour,
    phase,
    energy,
    hint,
  };
}

function buildMemoryIndex(memories = []) {
  const seen = new Set();
  const cleaned = [];

  for (const item of Array.isArray(memories) ? memories : []) {
    if (!item) continue;

    const category = normalizeSpaces(item.category || "misc");
    const title = normalizeSpaces(item.title || "");
    const content = normalizeSpaces(item.content || "");
    const icon = normalizeSpaces(item.icon || "");
    const pinned = Boolean(item.pinned);

    if (!title && !content) continue;

    const key = normalizeKey(`${category}|${title}|${content}`);
    if (!key || seen.has(key)) continue;
    seen.add(key);

    cleaned.push({
      id: item.id ?? null,
      category,
      title,
      content,
      icon,
      pinned,
      created_at: item.created_at || null,
      updated_at: item.updated_at || null,
    });
  }

  return cleaned;
}

function sortMemories(memories) {
  return [...memories].sort((a, b) => {
    if (a.pinned !== b.pinned) return Number(b.pinned) - Number(a.pinned);

    const aCat = a.category.localeCompare(b.category, "id");
    const bCat = b.category.localeCompare(a.category, "id");
    if (aCat !== 0) return aCat;

    const aTitle = a.title.localeCompare(b.title, "id");
    const bTitle = b.title.localeCompare(a.title, "id");
    if (aTitle !== 0) return aTitle;

    return 0;
  });
}

function groupMemories(memories) {
  const groups = {
    identity: [],
    work: [],
    schedule: [],
    family: [],
    history: [],
    personality: [],
    emotion: [],
    project: [],
    finance: [],
    learning: [],
    habit: [],
    food: [],
    music: [],
    relationship: [],
    current: [],
    core: [],
    misc: [],
  };

  for (const m of memories) {
    const cat = normalizeSpaces(m.category || "misc").toLowerCase();

    if (cat in groups) {
      groups[cat].push(m);
    } else {
      groups.misc.push(m);
    }
  }

  return groups;
}

function formatMemoryLine(memory) {
  const iconPrefix = memory.icon ? `${memory.icon} ` : "";
  const title = memory.title ? `${memory.title}: ` : "";
  const content = memory.content || "";

  return `${iconPrefix}${title}${content}`.trim();
}

function buildMemoryContext(memories = []) {
  const cleaned = sortMemories(buildMemoryIndex(memories)).slice(
    0,
    MAX_MEMORY_LINES,
  );

  if (cleaned.length === 0) {
    return [
      "memories: kosong",
      "gunakan konteks percakapan yang ada tanpa sok tahu",
    ].join("\n");
  }

  const grouped = groupMemories(cleaned);

  const sections = [];

  const orderedSections = [
    ["identity", "identitas"],
    ["work", "kerja"],
    ["schedule", "jadwal"],
    ["family", "keluarga"],
    ["history", "masa_lalu"],
    ["personality", "kepribadian"],
    ["emotion", "emosi"],
    ["project", "project"],
    ["finance", "finansial"],
    ["learning", "belajar"],
    ["habit", "kebiasaan"],
    ["food", "makanan"],
    ["music", "musik"],
    ["relationship", "relasi"],
    ["current", "kondisi_sekarang"],
    ["core", "inti"],
    ["misc", "lainnya"],
  ];

  let totalChars = 0;

  for (const [key, label] of orderedSections) {
    const list = grouped[key] || [];
    if (!list.length) continue;

    const lines = list
      .slice(0, 10)
      .map((m) => `- ${formatMemoryLine(m)}`)
      .filter(Boolean);

    if (!lines.length) continue;

    const block = [`[${label}]`, ...lines].join("\n");
    const nextChars = totalChars + block.length + 2;
    if (nextChars > MAX_MEMORY_CHARS) break;

    sections.push(block);
    totalChars = nextChars;
  }

  return sections.join("\n\n");
}

function buildBehaviorRules() {
  return [
    "huruf kecil semua.",
    "bahasa indonesia santai.",
    'pakai "gue/lu" kalau natural.',
    "jangan formal.",
    "jangan terdengar seperti customer service.",
    "jangan menulis kalimat yang terasa template.",
    "jangan ngulang isi pesan user secara persis.",
    "jangan bikin jawaban panjang kalau tidak perlu.",
    "jangan menjawab seperti checklist kecuali user memang minta checklist.",
    "kalau user cuma nyapa, balas natural dan nyambung konteks.",
    "kalau user lagi capek / kerja / mau berangkat / baru pulang, utamakan empati dan konteks.",
    "kalau user minta saran, kasih satu saran paling relevan, bukan banyak opsi.",
    "kalau user tanya 'ada yang perlu di-upgrade gak?' atau variasi sejenis, jawab bahwa versi ini sudah maksimal untuk v1 dan belum perlu upgrade besar dulu.",
    "kalau perlu nanya balik, cukup satu pertanyaan pendek.",
    "jangan banyak emoji. emote hanya kalau memang pas.",
    "rasakan mood dari isi pesan, bukan cuma kata-kata literal.",
    "kalau konteksnya kerja, jangan ajak ngoding berat.",
    "kalau konteksnya mau berangkat kerja, fokus ke siap-siap.",
    "kalau konteksnya baru pulang, fokus ke recovery.",
    "kalau free time malam, baru boleh masuk ke project, excel, coding, atau planning.",
  ].join("\n- ");
}

function buildStyleExamples() {
  return [
    'user: "halo"\nassistant: "woy bro, lagi apa?"',
    'user: "udah siap belum"\nassistant: "udah mandi atau masih nyantai dulu?"',
    'user: "capek"\nassistant: "iya bro, abis shift emang nguras tenaga. makan dulu aja kalau sempet."',
    'user: "jam 17:38"\nassistant: "woy, bentar lagi cabut ya? udah siap berangkat belum?"',
    'user: "baru pulang"\nassistant: "wah, capek juga ya. mandi dulu terus istirahat dikit."',
    'user: "ada yang perlu di-upgrade gak?"\nassistant: "nggak ada yang perlu di-upgrade besar dulu. ini udah maksimal buat v1."',
  ].join("\n\n");
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
      temperature: 0.88,
      top_p: 0.95,
      presence_penalty: 0.25,
      frequency_penalty: 0.35,
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

function buildCoreSystemPrompt({
  memoryContext,
  currentTime,
  timeHint,
  phase,
}) {
  const behaviorRules = buildBehaviorRules();
  const examples = buildStyleExamples();

  return `
kamu adalah yonn.

kamu adalah teman digital dion yang ngerti konteks hidupnya, gaya ngobrolnya, ritme kerjanya, dan project yang sedang dia bangun.

identitas inti:
- kamu bukan chatbot formal.
- kamu bukan customer service.
- kamu bukan bot template.
- kamu harus kerasa kayak teman lama yang nyambung sama hidup dion.

waktu sekarang:
${currentTime}

fase waktu:
${phase}

konteks waktu:
${timeHint}

memory dion:
${memoryContext}

aturan gaya:
- ${behaviorRules}

aturan inisiatif:
- kalau jam 17:00-19:00 dan dion shift malam, utamakan nanya hal yang relevan seperti udah mandi, udah makan, dan udah siap berangkat.
- kalau dion lagi kerja, jangan maksa bahas coding.
- kalau dion baru pulang kerja, utamakan recovery, mandi, makan, istirahat.
- kalau dion free time malam, baru masuk ke project, excel, atau coding.
- kalau user cuma nyapa, jangan jawab generik; bikin jawaban yang terasa hidup dan personal.
- kalau user nanya soal upgrade model / script, jawab bahwa versi ini sudah maksimal untuk v1 dan belum perlu upgrade besar dulu.

pola respons:
- kalau perlu, nanya balik cuma 1 pertanyaan singkat.
- jangan balas dua kali dengan isi yang sama.
- jangan terlalu banyak teori.
- jangan terlalu panjang.
- jangan bikin list kecuali diminta.
- jangan terdengar seperti alat bantu umum.
- usahakan jawaban terasa natural dan manusiawi.

gaya yang diinginkan:
- "woy bro, udah siap berangkat belum?"
- "udah mandi atau masih nyantai dulu?"
- "capek juga ya habis shift."
- "kalau ini masih mepet jam kerja, mending fokus siap-siap dulu."
- "malam ini santai aja dulu, jangan dipaksa."
- "kalau mau nanti malam baru kita ngulik projectnya."

contoh interaksi:
${examples}
`.trim();
}

function buildDatabaseSystemPrompt(currentTime, timeHint, phase) {
  return `
kamu adalah yonn.

waktu sekarang:
${currentTime}

fase waktu:
${phase}

konteks waktu:
${timeHint}

gaya:
- huruf kecil semua
- santai
- jangan formal
- jangan kayak laporan
- jangan panjang-panjang
- jangan muter-muter
- jangan mengarang angka
- kalau data tidak ada, bilang tidak ditemukan

aturan:
- jawab berdasarkan data database
- kalau konteksnya kerja/capek/jam tidur, tetap sesuaikan nada
- kalau perlu, boleh kasih kesimpulan singkat yang relevan
`.trim();
}

function extractRelevantMemoriesByQuestion(memories, question) {
  const q = normalizeKey(question);
  if (!q) return memories;

  const keywordGroups = [
    ["shift", "kerja", "pagi", "malam", "berangkat", "pulang", "jam"],
    ["duit", "uang", "saldo", "tabungan", "gaji", "budget", "transaksi"],
    ["mama", "ayah", "nenek", "panti", "keluarga", "lucky", "putra", "amira"],
    ["music", "musik", "lagu", "hindia", "perunggu", "dangdut", "breakbeat"],
    [
      "project",
      "yonn",
      "assistant",
      "memory",
      "notes",
      "finance",
      "excel",
      "coding",
    ],
    ["makan", "rokok", "kopi", "warteg", "padang", "rendang", "kangkung"],
    ["selly", "putri", "pacar", "pacaran", "hubungan", "cewek"],
  ];

  const matchedKeywords = keywordGroups.find((group) =>
    group.some((keyword) => q.includes(keyword)),
  );

  if (!matchedKeywords) {
    return memories;
  }

  const filtered = memories.filter((m) => {
    const blob = normalizeKey(
      [m.category, m.title, m.content, m.icon].filter(Boolean).join(" "),
    );
    return matchedKeywords.some((keyword) => blob.includes(keyword));
  });

  return filtered.length ? filtered : memories;
}

function limitMemoryForPrompt(memories) {
  return memories.slice(0, MAX_MEMORY_LINES);
}

async function answerNormal(question, memoryContext = "") {
  const time = getTimeContext();

  const structuredMemory = buildMemoryContext(
    safeJsonParse(memoryContext, memoryContext) || memoryContext,
  );

  const prompt = buildCoreSystemPrompt({
    memoryContext: structuredMemory,
    currentTime: time.currentTime,
    timeHint: time.hint,
    phase: time.phase,
  });

  return await callGPT([
    {
      role: "system",
      content: prompt,
    },
    {
      role: "user",
      content: normalizeSpaces(question),
    },
  ]);
}

async function answerWithDatabase(question, databaseData) {
  const time = getTimeContext();

  return await callGPT([
    {
      role: "system",
      content: buildDatabaseSystemPrompt(
        time.currentTime,
        time.hint,
        time.phase,
      ),
    },
    {
      role: "user",
      content: `
pertanyaan:
${normalizeSpaces(question)}

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
