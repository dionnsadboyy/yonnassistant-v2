/* =====================================================
   YONN MEMORY
===================================================== */

const SUPABASE_URL = "https://ibimfihvynrdjiqtsyrl.supabase.co";

const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImliaW1maWh2eW5yZGppcXRzeXJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNTM5NzIsImV4cCI6MjA5NTYyOTk3Mn0.8iKoQgoBUrBiaK1CCuGJ14QhrIQV1CYV0f0GW6xvSTQ";

const supabaseClient = window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

/* =====================================================
   ELEMENT
===================================================== */

const memoryGrid = document.getElementById("memoryGrid");

const memoryCount = document.getElementById("memoryCount");

const emptyState = document.getElementById("emptyState");

const memoryModal = document.getElementById("memoryModal");

const openModalBtn = document.getElementById("openModalBtn");

const cancelBtn = document.getElementById("cancelBtn");

const saveBtn = document.getElementById("saveBtn");

const categoryInput = document.getElementById("memoryCategory");

const titleInput = document.getElementById("memoryTitle");

const contentInput = document.getElementById("memoryContent");

/* =====================================================
   ICON
===================================================== */

function getCategoryIcon(category) {
  switch (category) {
    case "profile":
      return "👤";

    case "schedule":
      return "🌙";

    case "goal":
      return "🎯";

    case "habit":
      return "☕";

    case "project":
      return "💻";

    default:
      return "🧠";
  }
}

/* =====================================================
   MODAL
===================================================== */

function openModal() {
  memoryModal.classList.add("show");
}

function closeModal() {
  memoryModal.classList.remove("show");

  categoryInput.value = "profile";

  titleInput.value = "";

  contentInput.value = "";
}

/* =====================================================
   COUNTER
===================================================== */

function updateCounter(total) {
  memoryCount.textContent = total;
}

/* =====================================================
   RENDER
===================================================== */

function renderMemories(memories) {
  memoryGrid.innerHTML = "";

  if (!memories.length) {
    emptyState.style.display = "block";

    updateCounter(0);

    return;
  }

  emptyState.style.display = "none";

  updateCounter(memories.length);

  memories.forEach((memory) => {
    const card = document.createElement("div");

    card.className = "memory-card";

    card.innerHTML = `
      <div class="memory-category">
        ${getCategoryIcon(memory.category)} ${memory.category}
      </div>

      <div class="memory-title">
        ${memory.title}
      </div>

      <div class="memory-content">
        ${memory.content}
      </div>

      <button
        class="memory-delete"
        data-id="${memory.id}"
      >
        Hapus
      </button>
    `;

    memoryGrid.appendChild(card);
  });
}

/* =====================================================
   LOAD
===================================================== */

async function loadMemories() {
  try {
    const { data, error } = await supabaseClient
      .from("user_memory")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(error);

      return;
    }

    renderMemories(data || []);
  } catch (err) {
    console.error(err);
  }
}

/* =====================================================
   CREATE
===================================================== */

async function createMemory() {
  const category = categoryInput.value;

  const title = titleInput.value.trim();

  const content = contentInput.value.trim();

  if (!title) {
    alert("Isi judul dulu");

    return;
  }

  if (!content) {
    alert("Isi memory dulu");

    return;
  }

  try {
    const { error } = await supabaseClient.from("user_memory").insert([
      {
        category,
        title,
        content,
      },
    ]);

    if (error) {
      console.error(error);

      alert("Gagal menyimpan");

      return;
    }

    closeModal();

    await loadMemories();

    console.log("MEMORY CREATED 🔥");
  } catch (err) {
    console.error(err);
  }
}

/* =====================================================
   DELETE
===================================================== */

async function deleteMemory(id) {
  const confirmDelete = confirm("Hapus memory ini?");

  if (!confirmDelete) {
    return;
  }

  try {
    const { error } = await supabaseClient
      .from("user_memory")
      .delete()
      .eq("id", id);

    if (error) {
      console.error(error);

      alert("Gagal hapus");

      return;
    }

    await loadMemories();

    console.log("MEMORY DELETED 🔥");
  } catch (err) {
    console.error(err);
  }
}

/* =====================================================
   EVENTS
===================================================== */

openModalBtn.addEventListener("click", openModal);

cancelBtn.addEventListener("click", closeModal);

saveBtn.addEventListener("click", createMemory);

memoryModal.addEventListener("click", (e) => {
  if (e.target === memoryModal) {
    closeModal();
  }
});

document.addEventListener("click", (e) => {
  if (e.target.classList.contains("memory-delete")) {
    deleteMemory(Number(e.target.dataset.id));
  }
});

/* =====================================================
   INIT
===================================================== */

loadMemories();

console.log("YONN MEMORY READY 🧠🔥");
