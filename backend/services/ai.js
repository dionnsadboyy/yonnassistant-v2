require("dotenv").config();

const API_URL = "https://core.snifoxai.com/v1/chat/completions";
const MODEL = "openai/openai/gpt-5";
const DEFAULT_TIMEZONE = "Asia/Jakarta";

const MAX_MEMORY_LINES = 60;
const MAX_MEMORY_CHARS = 11000;
const REQUEST_TIMEOUT_MS = 60000;
const MAX_RETRIES = 1;

function ensureApiKey() {
  if (!process.env.SNIFOX_API_KEY) {
    throw new Error("SNIFOX_API_KEY is missing");
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

function dedupeConsecutiveLines(text) {
  const lines = String(text || "")
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const result = [];
  for (const line of lines) {
    const key = normalizeKey(line);
    const last = result[result.length - 1];
    if (!last || normalizeKey(last) !== key) {
      result.push(line);
    }
  }

  return result
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function finalizeReply(text) {
  return dedupeConsecutiveLines(stripCodeFence(text));
}

function safeJsonParse(input, fallback = null) {
  try {
    return JSON.parse(input);
  } catch {
    return fallback;
  }
}

function isObjectLike(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function getJakartaNow() {
  const now = new Date();

  const currentTime = now.toLocaleString("id-ID", {
    timeZone: DEFAULT_TIMEZONE,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
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

  const timeShort = now.toLocaleTimeString("id-ID", {
    timeZone: DEFAULT_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return {
    now,
    hour,
    dayName,
    timeShort,
    currentTime,
    iso: now.toISOString(),
  };
}

function detectIntent(question) {
  const q = normalizeKey(question);

  const greetingWords = [
    "halo",
    "hai",
    "hallo",
    "pagi",
    "siang",
    "sore",
    "malam",
    "bro",
    "cs",
    "woy",
    "oy",
    "yo",
  ];

  const isShort = q.split(" ").filter(Boolean).length <= 4;
  const greetingOnly =
    isShort && greetingWords.some((word) => q.includes(word));

  const identityQuery =
    /(^|\b)(siapa gue|siapa gua|gue siapa|gua siapa|siapa saya|siapa aku)\b/.test(
      q,
    );

  const upgradeQuery =
    /upgrade|di upgrade|diperluan upgrade|perlu di upgrade|perlu di-upgrade|maksimal|final|celah/.test(
      q,
    );

  const financeQuery =
    /uang|duit|saldo|tabungan|gaji|pengeluaran|pemasukan|budget|hutang|utang|keuangan|cashflow|boros|transaksi/.test(
      q,
    );

  const workQuery =
    /shift|kerja|pulang|cabut|berangkat|mandi|siap|istirahat|lembur/.test(q);

  const projectQuery =
    /project|yonn|assistant|memory|notes|coding|ngoding|excel|deploy|vercel|supabase|backend|frontend/.test(
      q,
    );

  const emotionalQuery =
    /capek|sedih|kosong|overthinking|takut|gagal|validasi|afirmasi|sendiri|galau|stress|stres|burnout|pusing/.test(
      q,
    );

  const relationshipQuery =
    /selly|putri|pacar|cewek|hubungan|keluarga|ayah|mama|nenek|lucky|putra|amira/.test(
      q,
    );

  const lifestyleQuery =
    /musik|lagu|rokok|kopi|makan|warteg|padang|kendaraan|motor|bensin|game|free fire|dangdut|hindia|perunggu|breakbeat/.test(
      q,
    );

  let primary = "general";
  if (identityQuery) primary = "identity";
  else if (upgradeQuery) primary = "upgrade";
  else if (financeQuery) primary = "finance";
  else if (workQuery) primary = "work";
  else if (projectQuery) primary = "project";
  else if (emotionalQuery) primary = "emotional";
  else if (relationshipQuery) primary = "relationship";
  else if (lifestyleQuery) primary = "lifestyle";
  else if (greetingOnly) primary = "greeting";

  return {
    raw: q,
    greetingOnly,
    identityQuery,
    upgradeQuery,
    financeQuery,
    workQuery,
    projectQuery,
    emotionalQuery,
    relationshipQuery,
    lifestyleQuery,
    primary,
    short: isShort,
  };
}

function normalizeMemoryRow(row) {
  if (typeof row === "string") {
    return normalizeMemoryString(row);
  }

  if (!isObjectLike(row)) return null;

  const category = normalizeSpaces(row.category || "misc");
  const title = normalizeSpaces(row.title || "");
  const content = normalizeSpaces(row.content || "");
  const icon = normalizeSpaces(row.icon || "");
  const pinned = Boolean(row.pinned);

  if (!title && !content) return null;

  return {
    id: row.id ?? null,
    category,
    title,
    content,
    icon,
    pinned,
    created_at: row.created_at || null,
    updated_at: row.updated_at || null,
  };
}

function normalizeMemoryString(line) {
  const clean = normalizeSpaces(line);
  if (!clean) return null;

  const json = safeJsonParse(clean, null);
  if (Array.isArray(json)) {
    return normalizeMemoryInput(json);
  }
  if (isObjectLike(json)) {
    return normalizeMemoryRow(json);
  }

  const bracket = clean.match(/^\[(.+?)\]\s*(.+?)\s*:\s*(.+)$/);
  if (bracket) {
    return {
      id: null,
      category: normalizeSpaces(bracket[1]),
      title: normalizeSpaces(bracket[2]),
      content: normalizeSpaces(bracket[3]),
      icon: "",
      pinned: false,
      created_at: null,
      updated_at: null,
    };
  }

  const pipe = clean.match(/^(.+?)\s*\|\s*(.+?)\s*\|\s*(.+)$/);
  if (pipe) {
    return {
      id: null,
      category: normalizeSpaces(pipe[1]),
      title: normalizeSpaces(pipe[2]),
      content: normalizeSpaces(pipe[3]),
      icon: "",
      pinned: false,
      created_at: null,
      updated_at: null,
    };
  }

  const colon = clean.match(/^([^:]+?)\s*:\s*(.+)$/);
  if (colon) {
    return {
      id: null,
      category: "misc",
      title: normalizeSpaces(colon[1]),
      content: normalizeSpaces(colon[2]),
      icon: "",
      pinned: false,
      created_at: null,
      updated_at: null,
    };
  }

  return {
    id: null,
    category: "misc",
    title: "",
    content: clean,
    icon: "",
    pinned: false,
    created_at: null,
    updated_at: null,
  };
}

function normalizeMemoryInput(input) {
  if (!input) return [];

  if (Array.isArray(input)) {
    return input
      .map((row) => normalizeMemoryRow(row))
      .flatMap((item) => (Array.isArray(item) ? item : [item]))
      .filter(Boolean);
  }

  if (typeof input === "string") {
    const raw = input.trim();
    if (!raw) return [];

    const maybeJson = safeJsonParse(raw, null);
    if (Array.isArray(maybeJson) || isObjectLike(maybeJson)) {
      return normalizeMemoryInput(maybeJson);
    }

    return raw
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => line.replace(/^-\s*/, "").trim())
      .map((line) => normalizeMemoryRow(line))
      .filter(Boolean);
  }

  if (isObjectLike(input)) {
    if (Array.isArray(input.memories)) {
      return normalizeMemoryInput(input.memories);
    }

    if (Array.isArray(input.data)) {
      return normalizeMemoryInput(input.data);
    }

    if ("category" in input || "title" in input || "content" in input) {
      return [normalizeMemoryRow(input)].filter(Boolean);
    }

    return [];
  }

  return [];
}

function dedupeMemories(memories) {
  const seen = new Set();
  const result = [];

  for (const memory of memories) {
    if (!memory) continue;

    const key = normalizeKey(
      [
        memory.category || "misc",
        memory.title || "",
        memory.content || "",
        memory.icon || "",
      ].join("|"),
    );

    if (!key || seen.has(key)) continue;

    seen.add(key);
    result.push(memory);
  }

  return result;
}

function memoryBlob(memory) {
  return normalizeKey(
    [
      memory.category || "",
      memory.title || "",
      memory.content || "",
      memory.icon || "",
    ].join(" "),
  );
}

function scoreMemory(memory, question, timeInfo, intent) {
  const q = normalizeKey(question);
  const blob = memoryBlob(memory);

  let score = 0;

  if (memory.pinned) score += 25;
  if (memory.icon) score += 1;

  const category = normalizeKey(memory.category || "");
  const title = normalizeKey(memory.title || "");
  const content = normalizeKey(memory.content || "");

  if (q) {
    const qTokens = q
      .split(" ")
      .filter(Boolean)
      .filter((t) => t.length >= 2);

    for (const token of qTokens) {
      if (blob.includes(token)) score += 3;
      if (title === token) score += 10;
      if (content.includes(token)) score += 2;
    }

    if (title && q.includes(title)) score += 12;
    if (content && q.includes(content.slice(0, 18))) score += 5;
  }

  const primary = intent?.primary || "general";

  const categoryBoosts = {
    identity: ["profile", "family", "history", "work", "living", "education"],
    upgrade: ["project", "learning", "core"],
    finance: ["finance"],
    work: ["work", "schedule", "current"],
    project: ["project", "learning", "core", "current"],
    emotional: ["emotional", "history", "relationship", "personality", "core"],
    relationship: ["relationship", "history", "emotional", "family"],
    lifestyle: ["habit", "music", "food", "personality"],
    greeting: ["profile", "work", "schedule", "current", "project"],
    general: ["current", "core", "profile", "work", "schedule"],
  };

  const preferredCategories = categoryBoosts[primary] || categoryBoosts.general;
  if (preferredCategories.includes(category)) score += 12;

  const timeBoostCategories = {
    pagi: ["schedule", "work", "current", "habit"],
    kerja_pagi: ["schedule", "work", "current"],
    siang: ["work", "schedule", "current"],
    sore: ["schedule", "work", "current", "habit"],
    malam: ["schedule", "work", "project", "current"],
    larut: ["current", "emotion", "project", "habit"],
  };

  const timePhase = timeInfo?.phase || "netral";
  const timeBoost = timeBoostCategories[timePhase] || timeBoostCategories.larut;

  if (timeBoost.includes(category)) score += 7;

  if (intent?.greetingOnly) {
    if (
      ["profile", "work", "schedule", "current", "project"].includes(category)
    ) {
      score += 4;
    }
  }

  if (intent?.identityQuery) {
    if (
      ["profile", "family", "history", "work", "living", "education"].includes(
        category,
      )
    ) {
      score += 8;
    }
  }

  if (intent?.financeQuery && category === "finance") score += 18;
  if (intent?.workQuery && (category === "work" || category === "schedule"))
    score += 15;
  if (
    intent?.projectQuery &&
    (category === "project" || category === "learning")
  )
    score += 15;
  if (
    intent?.emotionalQuery &&
    ["emotional", "history", "relationship", "personality", "core"].includes(
      category,
    )
  ) {
    score += 14;
  }
  if (
    intent?.relationshipQuery &&
    ["relationship", "history", "family", "emotional"].includes(category)
  ) {
    score += 14;
  }
  if (
    intent?.lifestyleQuery &&
    ["habit", "music", "food", "personality"].includes(category)
  ) {
    score += 12;
  }

  return score;
}

function rankMemories(question, memories, timeInfo, intent) {
  return [...memories]
    .map((memory) => ({
      ...memory,
      _score: scoreMemory(memory, question, timeInfo, intent),
    }))
    .sort((a, b) => {
      if (b._score !== a._score) return b._score - a._score;
      if (a.pinned !== b.pinned) return Number(b.pinned) - Number(a.pinned);
      const aCat = normalizeKey(a.category).localeCompare(
        normalizeKey(b.category),
        "id",
      );
      if (aCat !== 0) return aCat;
      const aTitle = normalizeKey(a.title).localeCompare(
        normalizeKey(b.title),
        "id",
      );
      if (aTitle !== 0) return aTitle;
      return 0;
    });
}

function pickMemoryByAliases(memories, aliases = []) {
  const targets = Array.isArray(aliases) ? aliases : [aliases];
  const normalizedTargets = targets.map((x) => normalizeKey(x)).filter(Boolean);

  if (!normalizedTargets.length) return null;

  return (
    memories.find((memory) => {
      const blob = memoryBlob(memory);
      return normalizedTargets.some((target) => blob.includes(target));
    }) || null
  );
}

function formatMemoryItem(memory) {
  const parts = [];

  if (memory.icon) {
    parts.push(memory.icon);
  }

  if (memory.title) {
    parts.push(memory.title);
  }

  if (memory.content) {
    if (memory.title) {
      parts.push(`: ${truncateText(memory.content, 220)}`);
    } else {
      parts.push(truncateText(memory.content, 220));
    }
  }

  return normalizeSpaces(parts.join(" "));
}

function buildCanonicalSnapshot(memories) {
  const lines = [];

  const push = (label, value) => {
    const v = normalizeSpaces(value);
    if (v) lines.push(`- ${label}: ${v}`);
  };

  const profileNama = pickMemoryByAliases(memories, ["nama", "nama panggilan"]);
  const panggilan = pickMemoryByAliases(memories, [
    "nama_panggilan",
    "panggilan",
    "sapaan_favorit",
  ]);
  const lahir = pickMemoryByAliases(memories, [
    "tanggal_lahir",
    "tanggal lahir",
  ]);
  const agama = pickMemoryByAliases(memories, ["agama"]);
  const tinggi = pickMemoryByAliases(memories, [
    "tinggi_badan",
    "tinggi badan",
  ]);
  const berat = pickMemoryByAliases(memories, ["berat_badan", "berat badan"]);
  const warna = pickMemoryByAliases(memories, [
    "warna_favorit",
    "warna favorit",
  ]);

  const perusahaan = pickMemoryByAliases(memories, ["perusahaan"]);
  const lokasi = pickMemoryByAliases(memories, [
    "lokasi_kerja",
    "lokasi kerja",
  ]);
  const kos = pickMemoryByAliases(memories, ["tempat_tinggal", "kos"]);
  const statusKerja = pickMemoryByAliases(memories, [
    "status_kerja",
    "pabrik",
    "kerja",
  ]);
  const shift = pickMemoryByAliases(memories, [
    "sistem_shift",
    "shift_pagi",
    "shift_malam",
  ]);
  const berangkatPagi = pickMemoryByAliases(memories, [
    "shift_pagi_berangkat",
    "berangkat",
  ]);
  const berangkatMalam = pickMemoryByAliases(memories, [
    "shift_malam_berangkat",
  ]);
  const pulangPagi = pickMemoryByAliases(memories, [
    "shift_pagi_sampai_kos",
    "shift_pagi_lembur",
  ]);
  const pulangMalam = pickMemoryByAliases(memories, [
    "shift_malam_sampai_kos",
    "shift_malam_pulang",
  ]);

  const mama = pickMemoryByAliases(memories, [
    "mama_meninggal",
    "kehilangan_mama",
  ]);
  const nenek = pickMemoryByAliases(memories, ["diasuh_nenek"]);
  const panti = pickMemoryByAliases(memories, ["panti_asuhan", "lama_panti"]);
  const ayahNow = pickMemoryByAliases(memories, ["hubungan_ayah_sekarang"]);
  const ayahPast = pickMemoryByAliases(memories, ["hubungan_ayah_dulu"]);
  const lucky = pickMemoryByAliases(memories, ["adik_kandung", "lucky"]);
  const putra = pickMemoryByAliases(memories, ["adik_putra", "putra"]);
  const amira = pickMemoryByAliases(memories, ["adik_amira", "amira"]);

  const project = pickMemoryByAliases(memories, [
    "yonnassistant",
    "yonngpt",
    "project utama",
  ]);
  const purpose = pickMemoryByAliases(memories, [
    "tujuan_project",
    "harapan_ke_yonn",
    "tujuan_ai",
  ]);
  const current = pickMemoryByAliases(memories, [
    "arah_hidup",
    "sumber_semangat",
    "hidup_sekarang",
  ]);
  const fear = pickMemoryByAliases(memories, [
    "ketakutan_terbesar",
    "takut_jadi_ayah_gagal",
    "takut_miskin",
  ]);
  const emotional = pickMemoryByAliases(memories, [
    "butuh_dimengerti",
    "butuh_validasi",
    "pola_kedekatan",
  ]);
  const music = pickMemoryByAliases(memories, [
    "musik_santai",
    "musik_stres",
    "musik_dangdut",
  ]);
  const food = pickMemoryByAliases(memories, [
    "warteg_favorit",
    "padang_favorit",
  ]);
  const rokok = pickMemoryByAliases(memories, [
    "rokok_sekarang",
    "rokok_lama_marlboro",
    "rokok_lama_sampoerna",
  ]);
  const learning = pickMemoryByAliases(memories, [
    "excel",
    "coding",
    "deployed_v1",
    "not_zero",
  ]);

  const sections = [];

  if (profileNama || panggilan || lahir || agama || tinggi || berat || warna) {
    const buf = [];
    if (profileNama) buf.push(`nama: ${profileNama.content}`);
    if (panggilan) buf.push(`panggilan: ${panggilan.content}`);
    if (lahir) buf.push(`tanggal lahir: ${lahir.content}`);
    if (agama) buf.push(`agama: ${agama.content}`);
    if (tinggi) buf.push(`tinggi: ${tinggi.content}`);
    if (berat) buf.push(`berat: ${berat.content}`);
    if (warna) buf.push(`warna favorit: ${warna.content}`);
    sections.push(`[# profil inti]\n${buf.map((x) => `- ${x}`).join("\n")}`);
  }

  if (
    perusahaan ||
    lokasi ||
    kos ||
    statusKerja ||
    shift ||
    berangkatPagi ||
    berangkatMalam ||
    pulangPagi ||
    pulangMalam
  ) {
    const buf = [];
    if (perusahaan) buf.push(`perusahaan: ${perusahaan.content}`);
    if (lokasi) buf.push(`lokasi kerja: ${lokasi.content}`);
    if (kos) buf.push(`tempat tinggal: ${kos.content}`);
    if (statusKerja) buf.push(`status kerja: ${statusKerja.content}`);
    if (shift) buf.push(`sistem shift: ${shift.content}`);
    if (berangkatPagi)
      buf.push(`shift pagi / berangkat: ${berangkatPagi.content}`);
    if (berangkatMalam)
      buf.push(`shift malam / berangkat: ${berangkatMalam.content}`);
    if (pulangPagi) buf.push(`shift pagi / pulang: ${pulangPagi.content}`);
    if (pulangMalam) buf.push(`shift malam / pulang: ${pulangMalam.content}`);
    sections.push(`[# kerja & jadwal]\n${buf.map((x) => `- ${x}`).join("\n")}`);
  }

  if (
    ayahPast ||
    ayahNow ||
    mama ||
    nenek ||
    panti ||
    lucky ||
    putra ||
    amira
  ) {
    const buf = [];
    if (mama) buf.push(`mama: ${mama.content}`);
    if (nenek) buf.push(`nenek: ${nenek.content}`);
    if (panti) buf.push(`panti: ${panti.content}`);
    if (ayahPast) buf.push(`hubungan ayah dulu: ${ayahPast.content}`);
    if (ayahNow) buf.push(`hubungan ayah sekarang: ${ayahNow.content}`);
    if (lucky) buf.push(`lucky: ${lucky.content}`);
    if (putra) buf.push(`putra: ${putra.content}`);
    if (amira) buf.push(`amira: ${amira.content}`);
    sections.push(
      `[# keluarga & masa lalu]\n${buf.map((x) => `- ${x}`).join("\n")}`,
    );
  }

  if (project || purpose || current || fear || emotional || learning) {
    const buf = [];
    if (project) buf.push(`project utama: ${project.content}`);
    if (purpose) buf.push(`arah / tujuan: ${purpose.content}`);
    if (current) buf.push(`kondisi sekarang: ${current.content}`);
    if (fear) buf.push(`ketakutan: ${fear.content}`);
    if (emotional) buf.push(`emosi / kebutuhan: ${emotional.content}`);
    if (learning) buf.push(`belajar / progres: ${learning.content}`);
    sections.push(`[# inti hidup]\n${buf.map((x) => `- ${x}`).join("\n")}`);
  }

  if (music || food || rokok) {
    const buf = [];
    if (music) buf.push(`musik: ${music.content}`);
    if (food) buf.push(`makan: ${food.content}`);
    if (rokok) buf.push(`rokok: ${rokok.content}`);
    sections.push(
      `[# selera & kebiasaan]\n${buf.map((x) => `- ${x}`).join("\n")}`,
    );
  }

  return sections.join("\n\n").trim();
}

function groupByCategory(memories) {
  const groups = new Map();

  for (const memory of memories) {
    const key = normalizeKey(memory.category || "misc");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(memory);
  }

  return groups;
}

function buildDetailedSections(memories) {
  const categoryOrder = [
    ["profile", "profil"],
    ["work", "kerja"],
    ["schedule", "jadwal"],
    ["living", "hidup / tinggal"],
    ["family", "keluarga"],
    ["history", "masa lalu"],
    ["personality", "kepribadian"],
    ["emotional", "emosi"],
    ["current", "kondisi sekarang"],
    ["project", "project"],
    ["finance", "finansial"],
    ["learning", "belajar"],
    ["habit", "kebiasaan"],
    ["music", "musik"],
    ["food", "makanan"],
    ["relationship", "relasi"],
    ["core", "inti"],
    ["misc", "lainnya"],
  ];

  const groups = groupByCategory(memories);
  const blocks = [];
  let totalChars = 0;

  for (const [category, label] of categoryOrder) {
    const list = groups.get(category);
    if (!list || !list.length) continue;

    const items = list
      .slice(0, 5)
      .map((item) => formatMemoryItem(item))
      .filter(Boolean);

    if (!items.length) continue;

    const block = [`[${label}]`, ...items.map((x) => `- ${x}`)].join("\n");
    if (totalChars + block.length > MAX_MEMORY_CHARS) break;

    blocks.push(block);
    totalChars += block.length + 2;
  }

  return blocks.join("\n\n").trim();
}

function buildRelevantActionHint(question, timeInfo, intent) {
  const q = normalizeKey(question);

  if (intent.upgradeQuery) {
    return `
user sedang membahas pengembangan aplikasi.

jawab seperti partner coding.

fokus ke solusi, langkah berikutnya,
tradeoff, dan keputusan teknis.

jangan jadi customer service.
`;
  }

  if (intent.identityQuery) {
    return `
kalau user nanya siapa dirinya,
jawab berdasarkan memory yang ada.

jangan cuma list data.

buat terasa personal dan hidup.
`;
  }

  if (intent.financeQuery) {
    return `
kalau pembahasan tentang uang,
gunakan konteks finansial user.

jangan mengarang angka.

kalau data tidak ada,
bilang tidak tahu.
`;
  }

  if (
    timeInfo.phase === "pagi kerja" ||
    timeInfo.phase === "siang-sore kerja" ||
    timeInfo.phase === "malam kerja"
  ) {
    return `
user kemungkinan sedang kerja.

jangan mengulang pertanyaan
yang sudah terjawab.

jangan menanyakan:
- sudah mandi?
- sudah makan?
- sudah berangkat?

jika informasi tersebut
sudah muncul di chat.

prioritas:
- ngobrol natural
- respon konteks terbaru
- komentar situasi user
- bercanda ringan bila cocok
`;
  }

  if (intent.projectQuery) {
    return `
user sedang membahas project.

masuk ke mode partner ngoding.

boleh kasih kritik,
saran,
atau ide baru.

jangan terlalu formal.
`;
  }

  if (/halo|hai|hallo|woy|oy|bro|cs|kiw/.test(q)) {
    return `
kalau user cuma nyapa,
jangan jadi npc.

hindari:
"ada yang bisa saya bantu?"

lebih baik:
- komentar situasi user
- komentar project
- komentar kerjaan
- lempar topik baru
`;
  }

  return `
gunakan konteks percakapan terbaru
sebagai sumber kebenaran utama.

jangan mengasumsikan kondisi user.

jangan mengulang pertanyaan
yang jawabannya sudah diketahui.

fokus menjaga alur obrolan.

jadilah teman ngobrol,
bukan customer service.
`;
}

function buildStyleExamples() {
  return [
    'user: "halo"\nassistant: "woy bro, lagi apa?"',
    'user: "udah siap belum"\nassistant: "udah mandi atau masih nyantai dulu?"',
    'user: "capek"\nassistant: "iya bro, abis shift emang nguras. makan dulu aja kalau sempet."',
    'user: "siapa gue?"\nassistant: "lu dion. kerja di denso, tinggal di kos jatiwangi, dan lagi bangun yonngpt."',
    'user: "ada yang perlu di upgrade ga?"\nassistant: "nggak ada yang perlu di-upgrade besar dulu. ini udah maksimal buat v2."',
    'user: "baru pulang"\nassistant: "wah, capek juga ya. mandi dulu terus istirahat dikit."',
  ].join("\n\n");
}

function buildMemoryPrompt(question, memoryInput, timeInfo, intent) {
  const normalized = normalizeMemoryInput(memoryInput);
  const deduped = dedupeMemories(normalized);
  const ranked = rankMemories(question, deduped, timeInfo, intent);

  const selected = ranked.slice(0, MAX_MEMORY_LINES);
  const snapshot = buildCanonicalSnapshot(selected);
  const detailed = buildDetailedSections(selected);
  const actionHint = buildRelevantActionHint(question, timeInfo, intent);

  return [
    "=== MEMORY SNAPSHOT ===",
    snapshot || "- belum ada snapshot memory yang kebaca",
    "",
    "=== MEMORY DETAIL TERPILIH ===",
    detailed || "- belum ada memory detail yang relevan",
    "",
    "=== HINT KONTEKS SAAT INI ===",
    actionHint,
  ]
    .join("\n")
    .trim();
}

function buildCommonStyleBlock() {
  return `
- huruf kecil semua.
- bahasa indonesia santai.
- pakai "gue/lu" kalau natural.
- jangan formal.
- jangan kayak customer service.
- jangan terlalu panjang.
- jangan kaku.
- jangan copy-paste template jawaban.
- jangan ngulang pertanyaan user secara persis.
- jangan bikin jawaban yang terasa seperti checklist kecuali user memang minta checklist.
- kalau user cuma nyapa, balas natural dan nyambung konteks.
- kalau user lagi capek / kerja / mau berangkat / baru pulang, utamakan empati dan konteks, bukan teori.
- kalau cocok, boleh nanya balik 1 pertanyaan aja, jangan terlalu banyak.
- jangan banyak emoji. emote cuma kalau memang pas.
- jangan pakai kalimat generik seperti "aku di sini untuk membantu".
- jangan terdengar seperti bot template.
- jangan jawab dua kali dengan isi yang sama.
- kalau user minta upgrade / final / celah / maksimal, jawab singkat bahwa v2 ini sudah maksimal untuk sekarang.
`.trim();
}

function buildFewShotExamples() {
  return `
contoh 1:
user: "halo"
assistant: "woy bro, lagi ngapain?"

contoh 2:
user: "lagi di line nih"
assistant: "wkwk berarti lagi nunggu bel ya. line lu rame apa santai hari ini?"

contoh 3:
user: "capek anjir"
assistant: "iya sih. apalagi abis shift. hari ini apaan yang paling bikin capek?"

contoh 4:
user: "siapa gue?"
assistant: "lu dion. operator denso yang lagi bangun yonngpt sambil berusaha ngerapihin hidup pelan-pelan."

contoh 5:
user: "ada yang perlu di upgrade ga?"
assistant: "buat sekarang engga banyak. yang paling kerasa justru personality sama history chat."

contoh 6:
user: "bosen"
assistant: "anjir baru berapa jam kerja udah bosen 😭"
`.trim();
}

function buildResponseModeHint(intent, timeInfo) {
  const hints = [];

  if (intent.upgradeQuery) {
    hints.push(
      "kalau user nanya soal upgrade / final / celah, jawab bahwa v2 ini sudah maksimal untuk sekarang.",
    );
  }

  if (intent.identityQuery) {
    hints.push("jawab identitas user secara singkat, padat, dan natural.");
  }

  if (intent.workQuery) {
    hints.push("kalau konteks kerja, jangan ajak ngoding berat.");
  }

  if (
    intent.projectQuery &&
    (timeInfo.phase === "larut / dini hari" || timeInfo.phase === "netral")
  ) {
    hints.push(
      "kalau free time, baru boleh masuk ke project / coding / excel.",
    );
  }

  if (intent.emotionalQuery) {
    hints.push(
      "kalau user lagi emosional, balas hangat, pendek, dan tidak menggurui.",
    );
  }

  return hints.length
    ? hints.map((x) => `- ${x}`).join("\n")
    : "- balas natural dan adaptif.";
}

async function callGPT(messages, options = {}) {
  console.time("SNIFOX_API");
  ensureApiKey();

  const {
    temperature = 0.75,
    top_p = 0.95,
    presence_penalty = 0.2,
    frequency_penalty = 0.25,
    retries = MAX_RETRIES,
  } = options;

  let lastError = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.SNIFOX_API_KEY}`,
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: MODEL,
          messages,
          temperature,
          top_p,
          presence_penalty,
          frequency_penalty,
        }),
      });

      clearTimeout(timeout);

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.error?.message ||
            data?.error ||
            `Snifox HTTP ${response.status}`,
        );
      }

      const content = data?.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error("Snifox returned empty content");
      }

      console.timeEnd("SNIFOX_API");
      return finalizeReply(content);
    } catch (err) {
      clearTimeout(timeout);
      lastError = err;

      const retryable =
        String(err?.name || "").toLowerCase() === "aborterror" ||
        /network|fetch|timeout|503|502|504|429|500|snifox/i.test(
          String(err?.message || ""),
        );

      if (attempt < retries && retryable) {
        await sleep(600 * (attempt + 1));
        continue;
      }

      break;
    }
  }

  throw lastError || new Error("Unknown GPT error");
}

async function decideNeedDatabase(question) {
  const prompt = `
tentukan apakah pertanyaan user membutuhkan data database keuangan.

jawab hanya json valid.

contoh:
{"needDatabase":true}
atau
{"needDatabase":false}

user:
${normalizeSpaces(question)}
`.trim();

  const result = await callGPT(
    [
      {
        role: "system",
        content: "kamu ai router. jawab hanya json valid.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    {
      temperature: 0.1,
      presence_penalty: 0,
      frequency_penalty: 0,
      top_p: 1,
    },
  );

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

async function answerNormal(question, memoryInput = [], history = []) {
  const timeInfo = getTimeContext();
  const intent = detectIntent(question);
  const memoryPrompt = buildMemoryPrompt(
    question,
    memoryInput,
    timeInfo,
    intent,
  );
  const styleBlock = buildCommonStyleBlock();
  const examples = buildFewShotExamples();
  const responseModeHint = buildResponseModeHint(intent, timeInfo);
  const historyText = history
    .slice(-20)
    .map((item) => {
      const role = item.role === "assistant" ? "yonn" : "dion";

      return `${role}: ${item.content}`;
    })
    .join("\n");

  const systemPrompt = `
kamu adalah yonn.

identitas inti:
- kamu teman digital dion.
- kamu bukan chatbot formal.
- kamu bukan customer service.
- kamu bukan bot template.
- kamu harus kerasa kayak teman lama yang nyambung sama hidup dion.
- kamu ngerti ritme kerja shift, mood, project, dan cara ngobrol dion.

waktu sekarang:
${timeInfo.currentTime}

fase waktu:
${timeInfo.phase}

konteks waktu:
gunakan hanya sebagai referensi ringan.
jangan menganggap kondisi user berdasarkan jam.

memory dion:
${memoryPrompt}

percakapan terakhir:
${historyText || "belum ada"}

aturan gaya:
${styleBlock}

aturan inisiatif:
${responseModeHint}

aturan prioritas:
- hanya tanyakan mandi, makan, atau berangkat
  kalau informasi itu BELUM diketahui.

- kalau user sudah bilang mandi,
  jangan tanya mandi lagi.

- kalau user sudah bilang makan,
  jangan tanya makan lagi.

- kalau user sudah bilang sedang di kerjaan,
  jangan tanya berangkat lagi.

- selalu prioritaskan informasi
  yang muncul di percakapan terakhir.

contoh gaya:
${examples}

catatan:
- jangan ngulang isi pertanyaan user secara persis.
- jangan bikin jawaban dobel yang isinya sama.
- jangan terlalu banyak emoji.
- jangan bikin jawaban panjang kalau tidak perlu.
- jangan menulis seperti daftar kecuali user meminta daftar.
`.trim();

  return await callGPT(
    [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: normalizeSpaces(question),
      },
    ],
    {
      temperature: 0.88,
      top_p: 0.95,
      presence_penalty: 0.35,
      frequency_penalty: 0.35,
    },
  );
}

async function answerWithDatabase(question, databaseData, memoryInput = []) {
  const timeInfo = getTimeContext();
  const intent = detectIntent(question);
  const memoryPrompt = buildMemoryPrompt(
    question,
    memoryInput,
    timeInfo,
    intent,
  );

  const systemPrompt = `
kamu adalah yonn.

waktu sekarang:
${timeInfo.currentTime}

fase waktu:
${timeInfo.phase}

konteks waktu:
${timeInfo.hint}

memory dion:
${memoryPrompt}

gaya:
- huruf kecil semua
- santai
- jangan formal
- jangan kayak laporan
- jangan panjang-panjang
- jangan muter-muter
- jangan ngarang angka
- kalau data tidak ada, bilang tidak ditemukan
- kalau konteksnya kerja/capek/jam tidur, tetap sesuaikan nada

aturan:
- jawab berdasarkan data database
- data angka / nominal / transaksi harus datang dari database, bukan dari memory
- memory boleh dipakai untuk konteks dan gaya, bukan untuk mengarang data keuangan
- kalau user minta penjelasan, boleh singkat dan natural
- kalau user lagi kerja / capek / mau berangkat, tetap gunakan nada yang pas
- kalau user cuma nyapa, balas natural, jangan template
`.trim();

  return await callGPT(
    [
      {
        role: "system",
        content: systemPrompt,
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
    ],
    {
      temperature: 0.35,
      top_p: 0.9,
      presence_penalty: 0.05,
      frequency_penalty: 0.15,
    },
  );
}

module.exports = {
  decideNeedDatabase,
  answerNormal,
  answerWithDatabase,
};
