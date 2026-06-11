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
const micBtn = document.getElementById("micBtn");
const quickButtons = document.querySelectorAll(".quick-btn");
const emptyState = document.getElementById("emptyState");
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

// UX PREFERENCES

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
  updateEmptyState();
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

// IMAGE UPLOAD
const imageBtn = document.getElementById("imageBtn");
const imageInput = document.getElementById("imageInput");
imageInput.addEventListener("change", () => {
  const file = imageInput.files[0];

  selectedImage = file;
  console.log(selectedImage.name, selectedImage.size, selectedImage.type);

  if (!file) return;

  const url = URL.createObjectURL(file);

  messages.innerHTML += `
    <div class="user-message">
      <div class="message-bubble">
        <img
          src="${url}"
          style="
            max-width:220px;
            border-radius:12px;
          "
        >
      </div>
    </div>
  `;

  scrollBottom();
});

imageBtn.addEventListener("click", () => {
  imageInput.click();
});

async function uploadImage() {
  if (!selectedImage) return;

  const fd = new FormData();

  fd.append("image", selectedImage);

  const response = await fetch(
    "https://yonnassistant-v2-production.up.railway.app/api/ai/image",
    {
      method: "POST",
      body: fd,
    },
  );

  return response.json();
}

/* =========================================================
   HELPERS
========================================================= */
// kontrol mic
function updateSendButton() {
  if (input.value.trim()) {
    sendBtn.textContent = "➤";
  } else {
    sendBtn.textContent = "🎤";
  }
}
updateSendButton();
input.addEventListener("input", () => {
  updateSendButton();
});

let holdTimer;
let longPressTriggered = false;

function startHold() {
  if (input.value.trim()) return;

  longPressTriggered = false;

  holdTimer = setTimeout(() => {
    longPressTriggered = true;

    toggleRecording();

    sendBtn.textContent = "⏹";
  }, 350);
}
function endHold() {
  clearTimeout(holdTimer);

  if (!longPressTriggered) return;

  if (isRecording) {
    toggleRecording();

    sendBtn.textContent = "🎤";
  }
}

function updateEmptyState() {
  const history = getChatHistory();

  if (history.length > 0) {
    emptyState.style.display = "none";
  } else {
    emptyState.style.display = "flex";
  }
}

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

let mediaRecorder;
let audioChunks = [];
let isRecording = false;
let selectedImage = null;
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
async function transcribeAudio(blob) {
  const fd = new FormData();

  fd.append("audio", blob, "recording.webm");

  const response = await fetch(
    "https://yonnassistant-v2-production.up.railway.app/api/ai/transcribe",
    {
      method: "POST",
      body: fd,
    },
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error || "transcribe gagal");
  }

  return data.text || "";
}
async function toggleRecording() {
  try {
    if (!isRecording) {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      audioChunks = [];

      mediaRecorder = new MediaRecorder(stream);

      mediaRecorder.ondataavailable = (e) => {
        audioChunks.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        try {
          const blob = new Blob(audioChunks, {
            type: "audio/webm",
          });

          const text = await transcribeAudio(blob);

          input.value = text;
          updateSendButton();
        } catch (err) {
          console.error(err);
          alert("gagal transcribe");
        }
      };

      mediaRecorder.start();

      isRecording = true;

      micBtn.textContent = "⏹";
    } else {
      mediaRecorder.stop();

      isRecording = false;

      micBtn.textContent = "🎤";
    }
  } catch (err) {
    console.error(err);
    alert(err.message);
  }
}
async function sendMessage(customText = null) {
  const text = customText || input.value.trim();

  if (!text && !selectedImage) return;

  if (text) {
    addUserMessage(text);

    addHistory("user", text);

    updateEmptyState();
  }

  input.value = "";

  const thinking = addThinkingMessage();

  try {
    let result;

    if (selectedImage) {
      const fd = new FormData();

      fd.append("image", selectedImage);
      fd.append("message", text || "Jelaskan isi gambar ini");

      const response = await fetch(
        "https://yonnassistant-v2-production.up.railway.app/api/ai/image",
        {
          method: "POST",
          body: fd,
        },
      );

      result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}`);
      }

      const answer = result.answer || "tidak ada jawaban";
      // const answer = result.answer || "tidak ada jawaban";

      updateBotMessage(thinking, answer, detectAvatar(answer));

      addHistory("assistant", answer);

      selectedImage = null;
      imageInput.value = "";
    } else {
      result = await askYonn(text);
    }

    const answer = result.answer || "tidak ada jawaban";

    updateBotMessage(thinking, answer, detectAvatar(answer));

    addHistory("assistant", answer);
  } catch (err) {
    console.error(err);

    updateBotMessage(thinking, err.message, ICONS.surprised);
  }
}
/* =========================================================
   EVENTS
========================================================= */

// sendBtn.addEventListener("click", () => sendMessage())
sendBtn.addEventListener("click", () => {
  if (!input.value.trim()) {
    return;
  }

  sendMessage();

  updateSendButton();
});
sendBtn.addEventListener("mousedown", startHold);

sendBtn.addEventListener("mouseup", endHold);

sendBtn.addEventListener("mouseleave", endHold);

sendBtn.addEventListener("touchstart", startHold, { passive: true });

sendBtn.addEventListener("touchend", endHold);

sendBtn.addEventListener("touchcancel", endHold);
micBtn.addEventListener("click", () => {
  toggleRecording();

  document.querySelector(".chat-input").classList.toggle("recording-mode");
});
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
  updateEmptyState();

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
window.testImage = uploadImage;
