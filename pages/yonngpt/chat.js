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
const recordingUI = document.getElementById("recordingUI");
const quickButtons = document.querySelectorAll(".quick-btn");
const emptyState = document.getElementById("emptyState");
const statusText = document.getElementById("statusText");
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
const imagePreview = document.getElementById("imagePreview");
const previewImage = document.getElementById("previewImage");
const removeImageBtn = document.getElementById("removeImageBtn");
imageInput.addEventListener("change", () => {
  const file = imageInput.files[0];

  if (!file) return;

  selectedImage = file;

  const url = URL.createObjectURL(file);

  previewImage.src = url;

  imagePreview.style.display = "block";
});
removeImageBtn.addEventListener("click", () => {
  selectedImage = null;

  imageInput.value = "";

  imagePreview.style.display = "none";
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
  const hasText = input.value.trim().length > 0;

  sendBtn.style.opacity = hasText ? "1" : ".4";

  sendBtn.disabled = !hasText;
}
updateSendButton();

input.addEventListener("input", () => {
  updateSendButton();

  input.style.height = "auto";

  input.style.height = Math.min(input.scrollHeight, 120) + "px";
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

function addUserMessage(text, imageHtml = "") {
  emptyState.style.display = "none";

  messages.insertAdjacentHTML(
    "beforeend",
    `
      <div class="user-message">
      <div class="message-bubble">
        ${imageHtml}
        ${text ? formatMessage(text) : ""}
      </div>
    </div>
  `,
  );

  scrollBottom();
}

/* =========================================================
   THINKING MESSAGE
========================================================= */

function addThinkingMessage() {
  const div = document.createElement("div");

  div.className = "bot-message thinking";

  div.innerHTML = `
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
          // tampil state transcribing
          recordingUI.innerHTML = `
            <span>
              🔄 Mengubah suara menjadi teks...
            </span>
          `;

          const blob = new Blob(audioChunks, {
            type: "audio/webm",
          });

          const text = await transcribeAudio(blob);

          // balikin UI normal
          recordingUI.style.display = "none";
          input.style.display = "block";

          input.value = text;

          input.focus();

          updateSendButton();

          // reset isi recordingUI
          recordingUI.innerHTML = `
            <div class="record-dot"></div>

            <span>Mendengarkan...</span>

            <div class="wave">
              <span></span>
              <span></span>
              <span></span>
              <span></span>
              <span></span>
            </div>
          `;
        } catch (err) {
          console.error(err);

          recordingUI.style.display = "none";
          input.style.display = "block";

          alert("gagal transcribe");
        }
      };

      mediaRecorder.start();

      isRecording = true;

      // tampil mode recording
      recordingUI.style.display = "flex";

      input.style.display = "none";

      micBtn.classList.add("recording");

      micBtn.textContent = "⏹";
    } else {
      isRecording = false;

      micBtn.classList.remove("recording");

      micBtn.textContent = "🎤";

      mediaRecorder.stop();
    }
  } catch (err) {
    console.error(err);
    alert(err.message);
  }
}

let isSending = false;
async function sendMessage(customText = null) {
  const text = customText || input.value.trim();

  // simpan referensi gambar dulu
  const imageFile = selectedImage;

  if (!text && !imageFile) return;

  let imageHtml = "";

  if (imageFile) {
    const url = URL.createObjectURL(imageFile);

    imageHtml = `
      <img
        src="${url}"
        style="
          width:100%;
          border-radius:14px;
          margin-bottom:${text ? "12px" : "0"};
        "
      >
    `;
  }

  // tampilkan bubble user langsung
  addUserMessage(text, imageHtml);

  emptyState.style.display = "none";

  scrollBottom();

  statusText.textContent = "Obrolan sedang berlangsung";

  input.value = "";
  input.style.height = "52px";

  // bersihkan preview setelah bubble muncul
  selectedImage = null;
  imagePreview.style.display = "none";
  imageInput.value = "";

  const thinking = addThinkingMessage();

  try {
    let result;

    // ==========================
    // IMAGE MODE
    // ==========================
    if (imageFile) {
      const fd = new FormData();

      fd.append("image", imageFile);
      fd.append("message", text || "Jelaskan isi gambar ini");
      fd.append("history", JSON.stringify(getChatHistory()));

      console.log("IMAGE MODE");
      console.log("FILE:", imageFile.name);

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
    }

    // ==========================
    // TEXT MODE
    // ==========================
    else {
      console.log("TEXT MODE");

      result = await askYonn(text);
    }

    const answer = result.answer || "tidak ada jawaban";

    updateBotMessage(thinking, answer, detectAvatar(answer));

    addHistory("assistant", answer);

    statusText.textContent = "Siap ngobrol";
  } catch (err) {
    console.error(err);

    statusText.textContent = "Ada gangguan";

    updateBotMessage(thinking, err.message, ICONS.surprised);
  }
}
/* =========================================================
   EVENTS
========================================================= */
sendBtn.addEventListener("click", () => {
  if (!input.value.trim() && !selectedImage) {
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
sendBtn.addEventListener("contextmenu", (e) => {
  e.preventDefault();
});
micBtn.addEventListener("contextmenu", (e) => {
  e.preventDefault();
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
document.addEventListener("contextmenu", (e) => {
  e.preventDefault();
});
