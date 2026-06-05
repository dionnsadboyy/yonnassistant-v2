/* =========================================================
   YONNGPT V4
========================================================= */

const API_URL =
  "https://yonnassistant-v2-production.up.railway.app/api/ai/chat";

/* =========================================================
   ELEMENTS
========================================================= */

const messages = document.getElementById("chatMessages");
const input = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const quickButtons = document.querySelectorAll(".quick-btn");

/* =========================================================
   ICONS
========================================================= */

const ICONS = {
  hello: "../../assets/iconpack/hello.png",
  thinking: "../../assets/iconpack/thinking.png",
  analyzing: "../../assets/iconpack/analyzing.png",
  success: "../../assets/iconpack/success.png",
  saving: "../../assets/iconpack/saving.png",
  surprised: "../../assets/iconpack/surprised.png",
};

/* =========================================================
   HELPERS
========================================================= */

function scrollBottom() {
  messages.scrollTop = messages.scrollHeight;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function formatMessage(text) {
  return escapeHtml(text)
    .replace(/\n/g, "<br>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
}

/* =========================================================
   USER MESSAGE
========================================================= */

function addUserMessage(text) {
  messages.innerHTML += `
    <div class="user-message">
      <div class="message-bubble">
        ${formatMessage(text)}
      </div>
    </div>
  `;

  scrollBottom();
}

/* =========================================================
   THINKING MESSAGE
========================================================= */

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

/* =========================================================
   BOT MESSAGE
========================================================= */

function updateBotMessage(target, text, avatar = ICONS.analyzing) {
  target.innerHTML = `
    <img
      src="${avatar}"
      class="message-avatar"
    >

    <div class="message-bubble">
      ${formatMessage(text)}
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
    lower.includes("tabungan") ||
    lower.includes("menabung") ||
    lower.includes("saldo")
  ) {
    return ICONS.saving;
  }

  if (lower.includes("bagus") || lower.includes("selamat")) {
    return ICONS.success;
  }

  return ICONS.analyzing;
}
/* =========================================================
   MEMORY CONTEXT
========================================================= */

async function getMemoryContext() {
  const { data, error } = await supabaseClient.from("user_memory").select("*");

  if (error) {
    console.error(error);
    return "";
  }

  return data.map((m) => `[${m.category}] ${m.title}: ${m.content}`).join("\n");
}

async function askYonn(message) {
  const memoryContext = await getMemoryContext();

  const response = await fetch(API_URL, {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
    },

    body: JSON.stringify({
      message,
      memory: memoryContext,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error || `HTTP ${response.status}`);
  }

  if (!data.success) {
    throw new Error(data?.error || "Unknown Error");
  }

  return data;
}

/* =========================================================
   SEND MESSAGE
========================================================= */

async function sendMessage(customText = null) {
  const text = customText || input.value.trim();

  if (!text) return;

  addUserMessage(text);

  input.value = "";

  const thinking = addThinkingMessage();

  try {
    const result = await askYonn(text);

    const answer = result.answer || "Tidak ada jawaban.";

    const avatar = detectAvatar(answer);

    updateBotMessage(thinking, answer, avatar);
  } catch (error) {
    console.error(error);

    updateBotMessage(
      thinking,
      `Yonn lagi ada masalah 😅

${error.message}`,
      ICONS.surprised,
    );
  }
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

window.addEventListener("load", () => {
  setTimeout(() => {
    scrollBottom();
  }, 300);

  console.log("🔥 YonnGPT V4 Ready");
});
