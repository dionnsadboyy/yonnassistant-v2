/* =========================================================
   YONNGPT V3
========================================================= */

const API_KEY = "snfx-tzatRLahho7l9u5PCqKx6iEtIllm2fDgWkDQ8nwmvjXH2";
const API_URL = "https://core.snifoxai.com/v1/chat/completions";
const MODEL = "openai/gpt-5.2";

/* =========================================================
   ELEMENTS
========================================================= */

const messages = document.getElementById("chatMessages");
const input = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const quickButtons = document.querySelectorAll(".quick-btn");

/* =========================================================
   HISTORY
========================================================= */

const chatHistory = [
  {
    role: "system",
    content: `
Kamu adalah YonnGPT.

Asisten finansial pribadi.

Gaya bahasa:
- santai
- bahasa indonesia
- tidak kaku
- singkat
- praktis
- jangan terlalu panjang

Kalau ada data transaksi user, gunakan data tersebut.
Jangan mengarang angka.
Berikan insight yang mudah dipahami.
`,
  },
];

/* =========================================================
   ICONS
========================================================= */

const ICONS = {
  hello: "../../assets/iconpack/hello.png",
  thinking: "../../assets/iconpack/thinking.png",
  analyzing: "../../assets/iconpack/analyzing.png",
  tip: "../../assets/iconpack/financial-tip.png",
  success: "../../assets/iconpack/success.png",
  saving: "../../assets/iconpack/saving.png",
  surprised: "../../assets/iconpack/surprised.png",
};

/* =========================================================
   HELPERS
========================================================= */

function rupiah(number) {
  return "Rp " + Number(number || 0).toLocaleString("id-ID");
}

function scrollBottom() {
  messages.scrollTop = messages.scrollHeight;
}

/* =========================================================
   MESSAGE UI
========================================================= */

function addUserMessage(text) {
  messages.innerHTML += `
    <div class="user-message">
      <div class="message-bubble">
        ${text}
      </div>
    </div>
  `;

  scrollBottom();
}

function addThinkingMessage() {
  const div = document.createElement("div");

  div.className = "bot-message thinking";

  div.innerHTML = `
    <img
      src="${ICONS.thinking}"
      class="message-avatar"
    >

    <div class="message-bubble">

      <div class="typing">
        <span></span>
        <span></span>
        <span></span>
      </div>

    </div>
  `;

  messages.appendChild(div);

  scrollBottom();

  return div;
}

function updateBotMessage(target, text, avatar = ICONS.analyzing) {
  target.innerHTML = `
    <img
      src="${avatar}"
      class="message-avatar"
    >

    <div class="message-bubble">
      ${text}
    </div>
  `;

  target.classList.remove("thinking");

  scrollBottom();
}

/* =========================================================
   AVATAR DETECTOR
========================================================= */

function detectAvatar(text) {
  const lower = text.toLowerCase();

  if (
    lower.includes("hemat") ||
    lower.includes("tabungan") ||
    lower.includes("menabung")
  ) {
    return ICONS.saving;
  }

  if (lower.includes("tips") || lower.includes("saran")) {
    return ICONS.tip;
  }

  if (lower.includes("selamat") || lower.includes("bagus")) {
    return ICONS.success;
  }

  return ICONS.analyzing;
}

/* =========================================================
   INTENT DETECTOR
========================================================= */

function detectIntent(text) {
  const q = text.toLowerCase();

  if (
    q.includes("kategori paling boros") ||
    q.includes("kategori terbesar") ||
    q.includes("pengeluaran terbesar") ||
    q.includes("boros")
  ) {
    return "TOP_CATEGORY";
  }

  if (q.includes("saldo")) {
    return "BALANCE";
  }

  if (q.includes("pengeluaran bulan ini")) {
    return "MONTHLY_EXPENSE";
  }

  if (q.includes("pengeluaran minggu") || q.includes("minggu ini")) {
    return "WEEKLY_EXPENSE";
  }

  if (q.includes("rokok")) {
    return "CIGARETTE";
  }

  return null;
}

/* =========================================================
   LOCAL FINANCE ANSWER
========================================================= */

async function getLocalFinanceAnswer(intent) {
  if (!window.YonnAnalytics) {
    return null;
  }

  if (YonnAnalytics.transactions.length === 0) {
    await YonnAnalytics.load();
  }

  switch (intent) {
    case "TOP_CATEGORY": {
      const top = YonnAnalytics.getTopCategory();

      if (!top) {
        return {
          text: "Belum ada data transaksi untuk dianalisis.",
          avatar: ICONS.surprised,
        };
      }

      return {
        text: `Kategori paling boros bulan ini adalah ${top.category} dengan total ${rupiah(top.amount)}.`,
        avatar: ICONS.analyzing,
      };
    }

    case "BALANCE": {
      const balance = YonnAnalytics.getBalance();

      return {
        text: `Saldo keseluruhan saat ini sekitar ${rupiah(balance)}.`,
        avatar: ICONS.saving,
      };
    }

    case "MONTHLY_EXPENSE": {
      const total = YonnAnalytics.getMonthlyExpense();

      return {
        text: `Total pengeluaran bulan ini adalah ${rupiah(total)}.`,
        avatar: ICONS.analyzing,
      };
    }

    case "WEEKLY_EXPENSE": {
      const total = YonnAnalytics.getWeeklyExpense();

      return {
        text: `Total pengeluaran 7 hari terakhir adalah ${rupiah(total)}.`,
        avatar: ICONS.analyzing,
      };
    }

    case "CIGARETTE": {
      const total = YonnAnalytics.getCategoryExpense("rokok");

      return {
        text: `Pengeluaran rokok bulan ini adalah ${rupiah(total)}.`,
        avatar: ICONS.analyzing,
      };
    }

    default:
      return null;
  }
}

/* =========================================================
   GPT CONTEXT
========================================================= */

async function buildContext(userPrompt) {
  if (!window.YonnAnalytics) {
    return userPrompt;
  }

  if (YonnAnalytics.transactions.length === 0) {
    await YonnAnalytics.load();
  }

  const insight = YonnAnalytics.generateInsight();

  const balance = YonnAnalytics.getBalance();

  return `
DATA USER

Saldo:
${rupiah(balance)}

Pengeluaran Bulan Ini:
${rupiah(insight.monthlyExpense)}

Kategori Terbesar:
${insight.topCategory?.category || "-"}

Nominal Kategori Terbesar:
${rupiah(insight.topCategory?.amount || 0)}

Pengeluaran Rokok:
${rupiah(insight.cigaretteExpense)}

PERTANYAAN USER:

${userPrompt}

Jawab sebagai YonnGPT.
`;
}

/* =========================================================
   GPT REQUEST
========================================================= */

async function askGPT(prompt) {
  const context = await buildContext(prompt);

  chatHistory.push({
    role: "user",
    content: context,
  });

  const response = await fetch(API_URL, {
    method: "POST",

    headers: {
      "Content-Type": "application/json",

      Authorization: `Bearer ${API_KEY}`,
    },

    body: JSON.stringify({
      model: MODEL,

      messages: chatHistory,

      temperature: 0.7,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.error?.message || data?.message || `Error ${response.status}`,
    );
  }

  const answer = data?.choices?.[0]?.message?.content?.trim();

  if (!answer) {
    throw new Error("Response kosong");
  }

  chatHistory.push({
    role: "assistant",
    content: answer,
  });

  return answer;
}

/* =========================================================
   MAIN
========================================================= */

async function askYonn(prompt, thinkingMessage) {
  try {
    const intent = detectIntent(prompt);

    if (intent) {
      const localAnswer = await getLocalFinanceAnswer(intent);

      if (localAnswer) {
        updateBotMessage(thinkingMessage, localAnswer.text, localAnswer.avatar);

        return;
      }
    }

    const answer = await askGPT(prompt);

    updateBotMessage(thinkingMessage, answer, detectAvatar(answer));
  } catch (error) {
    console.error(error);

    updateBotMessage(
      thinkingMessage,
      "Yonn lagi ada masalah koneksi 😅",
      ICONS.surprised,
    );
  }
}

/* =========================================================
   SEND
========================================================= */

function sendMessage(customText = null) {
  const text = customText || input.value.trim();

  if (!text) return;

  addUserMessage(text);

  input.value = "";

  const thinking = addThinkingMessage();

  askYonn(text, thinking);
}

/* =========================================================
   EVENTS
========================================================= */

sendBtn.addEventListener("click", () => sendMessage());

input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();

    sendMessage();
  }
});

quickButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    sendMessage(btn.textContent.trim());
  });
});

/* =========================================================
   INIT
========================================================= */

(async () => {
  try {
    if (window.YonnAnalytics) {
      await YonnAnalytics.load();

      console.log("YONN ANALYTICS READY 🔥");
    }
  } catch (err) {
    console.error(err);
  }

  setTimeout(scrollBottom, 300);
})();
