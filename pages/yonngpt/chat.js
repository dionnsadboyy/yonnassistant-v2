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
    CHAT MANAGEMENT 
========================================================= */
const menuBtn = document.getElementById("menuBtn");
const menuPopup = document.getElementById("menuPopup");

menuBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  menuPopup.classList.toggle("show");
});
document.getElementById("newChatBtn").addEventListener("click", (e) => {
  e.preventDefault();

  localStorage.removeItem("yonn_chat_history");

  location.reload();
});
/* =========================================================
   CHAT HISTORY
========================================================= */
const CHAT_STORAGE_KEY = "yonn_chat_history";

function getChatHistory() {
  return JSON.parse(localStorage.getItem(CHAT_STORAGE_KEY) || "[]");
}

function saveChatHistory(history) {
  localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(history));
}

function addHistory(role, content) {
  const history = getChatHistory();

  history.push({
    role,
    content,
    time: Date.now(),
  });

  if (history.length > 30) {
    history.shift();
  }

  saveChatHistory(history);
}

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
      history: getChatHistory(),
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
  addHistory("user", text);

  input.value = "";

  const thinking = addThinkingMessage();

  let answer = "";

  try {
    const result = await askYonn(text);

    answer = result.answer || "tidak ada jawaban.";

    const avatar = detectAvatar(answer);

    updateBotMessage(thinking, answer, avatar);

    addHistory("assistant", answer);
  } catch (error) {
    console.error(error);

    answer = `yonn lagi ada masalah 😅

${error.message}`;

    updateBotMessage(thinking, answer, ICONS.surprised);

    addHistory("assistant", answer);
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
function renderSavedHistory() {
  const history = getChatHistory();

  history.forEach((item) => {
    if (item.role === "user") {
      addUserMessage(item.content);
    } else {
      const div = document.createElement("div");

      div.className = "bot-message";

      messages.appendChild(div);

      updateBotMessage(div, item.content, detectAvatar(item.content));
    }
  });
}
window.addEventListener("load", () => {
  renderSavedHistory();

  setTimeout(() => {
    scrollBottom();
  }, 300);

  console.log("🔥 YonnGPT V4 Ready");
});
window.clearYonnChat = function () {
  localStorage.removeItem(CHAT_STORAGE_KEY);

  location.reload();
};
