/* =====================================================
   YONN LIST DETAIL
===================================================== */

const SUPABASE_URL = "https://ibimfihvynrdjiqtsyrl.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImliaW1maWh2eW5yZGppcXRzeXJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNTM5NzIsImV4cCI6MjA5NTYyOTk3Mn0.8iKoQgoBUrBiaK1CCuGJ14QhrIQV1CYV0f0GW6xvSTQ";

const supabaseClient = window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

document.addEventListener("DOMContentLoaded", () => {
  if (!supabaseClient) {
    console.error("Supabase client tidak tersedia");
    return;
  }

  const listTitleEl = document.getElementById("listTitle");
  const taskListEl = document.getElementById("taskList");
  const addTaskBtn = document.getElementById("addTaskBtn");
  const listNotesEl = document.getElementById("listNotes");

  const progressFillEl = document.getElementById("progressFill");
  const progressTextEl = document.getElementById("progressText");

  const saveBtn = document.getElementById("saveBtn");
  const deleteBtn = document.getElementById("deleteBtn");

  const updatedAtEl = document.getElementById("updatedAt");

  let currentNote = null;

  /* =====================================
     HELPERS
  ===================================== */

  const formatDate = (date) => {
    if (!date) return "-";

    return new Date(date).toLocaleString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getNoteId = () => {
    const selectedId = localStorage.getItem("selectedNoteId");

    if (selectedId) return selectedId;

    const raw = localStorage.getItem("selectedNote");

    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw);
      return parsed?.id || null;
    } catch {
      return null;
    }
  };

  const getTasksFromUI = () => {
    const items = taskListEl.querySelectorAll(".task-item");

    return [...items]
      .map((item) => {
        const checkbox = item.querySelector(".task-checkbox");

        const input = item.querySelector(".task-input");

        return {
          text: input.value.trim(),
          done: checkbox.checked,
        };
      })
      .filter((task) => task.text);
  };

  const updateProgress = () => {
    const tasks = getTasksFromUI();

    const total = tasks.length;

    const done = tasks.filter((task) => task.done).length;

    const percent = total === 0 ? 0 : Math.round((done / total) * 100);

    progressFillEl.style.width = `${percent}%`;

    progressTextEl.textContent = `${done} of ${total} tasks completed`;
  };

  /* =====================================
     TASK UI
  ===================================== */

  const createTaskElement = (text = "", done = false) => {
    const wrapper = document.createElement("div");

    wrapper.className = "task-item";

    wrapper.innerHTML = `
      <input
        type="checkbox"
        class="task-checkbox"
        ${done ? "checked" : ""}
      />

      <input
        type="text"
        class="task-input"
        placeholder="Tambah task..."
        value="${text}"
      />
    `;

    const checkbox = wrapper.querySelector(".task-checkbox");

    const input = wrapper.querySelector(".task-input");

    const syncState = () => {
      wrapper.classList.toggle("task-done", checkbox.checked);

      updateProgress();
    };

    checkbox.addEventListener("change", syncState);

    input.addEventListener("input", updateProgress);

    syncState();

    return wrapper;
  };

  const renderTasks = (tasks = []) => {
    taskListEl.innerHTML = "";

    if (!tasks.length) {
      taskListEl.appendChild(createTaskElement());

      updateProgress();

      return;
    }

    tasks.forEach((task) => {
      taskListEl.appendChild(createTaskElement(task.text, task.done));
    });

    updateProgress();
  };

  /* =====================================
     LOAD
  ===================================== */

  const renderNote = (note) => {
    listTitleEl.value = note.title || "";

    updatedAtEl.textContent = formatDate(note.updated_at || note.created_at);

    const metadata = note.metadata || {};

    renderTasks(metadata.tasks || []);

    listNotesEl.value = metadata.notes || "";
  };

  const loadNote = async () => {
    const createMode = localStorage.getItem("createMode");

    if (createMode === "list") {
      currentNote = null;

      listTitleEl.value = "";
      listNotesEl.value = "";

      renderTasks([]);

      return;
    }

    const noteId = getNoteId();

    if (!noteId) {
      renderTasks([]);
      return;
    }

    const { data, error } = await supabaseClient
      .from("notes")
      .select("*")
      .eq("id", noteId)
      .single();

    if (error) {
      console.error(error);
      return;
    }

    currentNote = data;

    renderNote(data);
  };

  /* =====================================
     CREATE
  ===================================== */

  const createList = async () => {
    const tasks = getTasksFromUI();

    const { error } = await supabaseClient.from("notes").insert([
      {
        title: listTitleEl.value.trim(),

        type: "list",

        metadata: {
          tasks,
          notes: listNotesEl.value.trim(),
        },
      },
    ]);

    if (error) {
      console.error(error);
      alert("Gagal membuat list");
      return;
    }

    localStorage.removeItem("createMode");

    alert("List berhasil dibuat");

    window.location.href = "notes.html";
  };

  /* =====================================
     UPDATE
  ===================================== */

  const updateList = async () => {
    if (!currentNote?.id) return;

    const tasks = getTasksFromUI();

    const { error } = await supabaseClient
      .from("notes")
      .update({
        title: listTitleEl.value.trim(),

        metadata: {
          tasks,
          notes: listNotesEl.value.trim(),
        },

        updated_at: new Date().toISOString(),
      })
      .eq("id", currentNote.id);

    if (error) {
      console.error(error);
      alert("Gagal update");
      return;
    }

    alert("List berhasil diupdate");

    window.location.href = "notes.html";
  };

  /* =====================================
     DELETE
  ===================================== */

  const deleteList = async () => {
    if (!currentNote?.id) return;

    const confirmed = confirm(`Hapus "${currentNote.title}" ?`);

    if (!confirmed) return;

    const { error } = await supabaseClient
      .from("notes")
      .delete()
      .eq("id", currentNote.id);

    if (error) {
      console.error(error);
      alert("Gagal hapus");
      return;
    }

    localStorage.removeItem("selectedNote");

    localStorage.removeItem("selectedNoteId");

    alert("List berhasil dihapus");

    window.location.href = "notes.html";
  };

  /* =====================================
     EVENTS
  ===================================== */

  addTaskBtn.addEventListener("click", () => {
    taskListEl.appendChild(createTaskElement());

    updateProgress();
  });

  saveBtn.addEventListener("click", async () => {
    const createMode = localStorage.getItem("createMode");

    if (createMode === "list") {
      await createList();
      return;
    }

    await updateList();
  });

  deleteBtn.addEventListener("click", deleteList);

  /* =====================================
     START
  ===================================== */

  loadNote();
});
