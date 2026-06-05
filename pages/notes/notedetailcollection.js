/* =====================================================
   YONNASSISTANT COLLECTION DETAIL SCRIPT
===================================================== */

const SUPABASE_URL = "https://ibimfihvynrdjiqtsyrl.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImliaW1maWh2eW5yZGppcXRzeXJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNTM5NzIsImV4cCI6MjA5NTYyOTk3Mn0.8iKoQgoBUrBiaK1CCuGJ14QhrIQV1CYV0f0GW6xvSTQ";

const supabaseClient = window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

document.addEventListener("DOMContentLoaded", () => {
  if (!supabaseClient) {
    console.error("Supabase client tidak tersedia.");
    return;
  }

  const collectionTitleEl = document.getElementById("collectionTitle");
  const collectionGridEl = document.getElementById("collectionGrid");
  const addItemBtn = document.getElementById("addItemBtn");
  const collectionNotesEl = document.getElementById("collectionNotes");
  const totalItemsEl = document.getElementById("totalItems");
  const updatedAtEl = document.getElementById("updatedAt");
  const saveBtn = document.getElementById("saveBtn");
  const deleteBtn = document.getElementById("deleteBtn");
  const itemTemplateEl = document.getElementById("itemTemplate");

  let currentNote = null;

  const COLORS = [
    "#dff5b7",
    "#dfe7ff",
    "#f9dddd",
    "#f8ebbf",
    "#efe8ff",
    "#dff3ff",
  ];

  const formatDate = (value) => {
    if (!value) return "-";
    try {
      return new Date(value).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "-";
    }
  };

  const normalizeType = (type) => {
    if (type === "checklist") return "list";
    if (type === "collection") return "collection";
    if (type === "list") return "list";
    return "note";
  };

  const getNoteIdFromStorage = () => {
    const idFromStorage = localStorage.getItem("selectedNoteId");
    if (idFromStorage) return idFromStorage;

    const raw = localStorage.getItem("selectedNote");
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw);
      if (parsed?.id) return String(parsed.id);
    } catch {
      return null;
    }

    return null;
  };

  const getFallbackNoteFromStorage = () => {
    const raw = localStorage.getItem("selectedNote");
    if (!raw) return null;

    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };

  const normalizeItem = (item) => {
    if (typeof item === "string") return item.trim();
    if (item && typeof item === "object") {
      return String(item.text || item.label || "").trim();
    }
    return "";
  };

  const getItemsFromUI = () => {
    return Array.from(
      collectionGridEl.querySelectorAll(".collection-item-input"),
    )
      .map((input) => input.value.trim())
      .filter(Boolean);
  };

  const buildContentSummary = (notesText, items) => {
    const parts = [];

    if (notesText && notesText.trim()) {
      parts.push(notesText.trim());
    }

    items.forEach((item) => {
      if (item) parts.push(item);
    });

    return parts.join("\n");
  };

  const updateCounter = () => {
    const items = getItemsFromUI();

    if (totalItemsEl) {
      totalItemsEl.textContent = String(items.length);
    }
  };

  const makeItemElement = (value = "", color = COLORS[0]) => {
    const wrapper = document.createElement("div");
    wrapper.className = "tag";
    wrapper.style.background = color;

    wrapper.innerHTML = `
      <input
        type="text"
        class="collection-item-input"
        placeholder="Nama Item..."
        value="${String(value).replaceAll('"', "&quot;")}"
      />
      <button class="remove-item-btn" type="button">×</button>
    `;

    const input = wrapper.querySelector(".collection-item-input");
    const removeBtn = wrapper.querySelector(".remove-item-btn");

    if (input) {
      input.addEventListener("input", updateCounter);

      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          addCollectionItem("");
        }
      });
    }

    if (removeBtn) {
      removeBtn.addEventListener("click", () => {
        wrapper.remove();

        if (!collectionGridEl.querySelector(".collection-item-input")) {
          addCollectionItem("");
        }

        updateCounter();
      });
    }

    return wrapper;
  };

  const addCollectionItem = (value = "") => {
    const index = collectionGridEl.querySelectorAll(".tag").length;
    const color = COLORS[index % COLORS.length];
    const itemEl = makeItemElement(value, color);

    collectionGridEl.appendChild(itemEl);

    const input = itemEl.querySelector(".collection-item-input");
    if (input) {
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    }

    updateCounter();
  };

  const renderItems = (items = []) => {
    collectionGridEl.innerHTML = "";

    const normalizedItems = items.map(normalizeItem).filter(Boolean);

    if (!normalizedItems.length) {
      addCollectionItem("");
      return;
    }

    normalizedItems.forEach((item, index) => {
      const color = COLORS[index % COLORS.length];
      const itemEl = makeItemElement(item, color);
      collectionGridEl.appendChild(itemEl);
    });

    updateCounter();
  };

  const renderNote = (note) => {
    if (!note) return;

    document.title = note.title
      ? `${note.title} - Collection Detail`
      : "Collection Detail";

    if (collectionTitleEl) {
      collectionTitleEl.value = note.title || "";
    }

    const metadata = note.metadata || {};
    const items =
      Array.isArray(metadata.items) && metadata.items.length
        ? metadata.items
        : String(note.content || "")
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean);

    renderItems(items);

    if (collectionNotesEl) {
      collectionNotesEl.value = metadata.notes || "";
    }

    if (updatedAtEl) {
      updatedAtEl.textContent = formatDate(
        note.updated_at || note.created_at || note.date,
      );
    }
  };

  const resetCreateState = () => {
    currentNote = null;

    if (collectionTitleEl) collectionTitleEl.value = "";
    if (collectionNotesEl) collectionNotesEl.value = "";
    if (updatedAtEl) updatedAtEl.textContent = "-";

    renderItems([]);
  };

  const loadNote = async () => {
    const createMode = localStorage.getItem("createMode");
    const noteId = getNoteIdFromStorage();

    if (createMode === "collection") {
      localStorage.removeItem("selectedNote");
      localStorage.removeItem("selectedNoteId");
      currentNote = null;
      resetCreateState();
      return;
    }

    if (noteId) {
      const { data, error } = await supabaseClient
        .from("notes")
        .select("*")
        .eq("id", noteId)
        .single();

      if (!error && data) {
        currentNote = data;
        renderNote(data);
        return;
      }

      console.warn("Gagal load via id, fallback ke localStorage selectedNote.");
    }

    const fallback = getFallbackNoteFromStorage();

    if (fallback) {
      currentNote = fallback;
      renderNote(fallback);
      return;
    }

    resetCreateState();
  };

  const createCollection = async () => {
    const title = collectionTitleEl.value.trim();
    const notesText = collectionNotesEl.value.trim();
    const items = getItemsFromUI();

    if (!title) {
      alert("Isi judul collection dulu.");
      return;
    }

    const { error } = await supabaseClient.from("notes").insert([
      {
        title,
        content: buildContentSummary(notesText, items),
        type: "collection",
        metadata: {
          items,
          notes: notesText,
        },
      },
    ]);

    if (error) {
      console.error("CREATE ERROR:", error);
      alert("Gagal membuat collection.");
      return;
    }

    localStorage.removeItem("createMode");
    localStorage.removeItem("selectedNote");
    localStorage.removeItem("selectedNoteId");

    alert("Collection berhasil dibuat.");
    window.location.href = "notes.html";
  };

  const updateCollection = async () => {
    if (!currentNote?.id) return;

    const title = collectionTitleEl.value.trim();
    const notesText = collectionNotesEl.value.trim();
    const items = getItemsFromUI();

    if (!title) {
      alert("Isi judul collection dulu.");
      return;
    }

    const { error } = await supabaseClient
      .from("notes")
      .update({
        title,
        content: buildContentSummary(notesText, items),
        metadata: {
          items,
          notes: notesText,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", currentNote.id);

    if (error) {
      console.error("UPDATE ERROR:", error);
      alert("Gagal update collection.");
      return;
    }

    localStorage.removeItem("createMode");

    alert("Collection berhasil diupdate.");
    window.location.href = "notes.html";
  };

  const deleteCollection = async () => {
    if (!currentNote?.id) {
      const cancelDraft = confirm("Batalkan collection baru ini?");
      if (!cancelDraft) return;

      localStorage.removeItem("createMode");
      localStorage.removeItem("selectedNote");
      localStorage.removeItem("selectedNoteId");
      window.location.href = "notes.html";
      return;
    }

    const confirmed = confirm(`Hapus "${currentNote.title}" ?`);
    if (!confirmed) return;

    const { error } = await supabaseClient
      .from("notes")
      .delete()
      .eq("id", currentNote.id);

    if (error) {
      console.error("DELETE ERROR:", error);
      alert("Gagal hapus collection.");
      return;
    }

    localStorage.removeItem("selectedNote");
    localStorage.removeItem("selectedNoteId");
    localStorage.removeItem("createMode");

    alert("Collection berhasil dihapus.");
    window.location.href = "notes.html";
  };

  if (addItemBtn) {
    addItemBtn.addEventListener("click", () => {
      addCollectionItem("");
    });
  }

  if (saveBtn) {
    saveBtn.addEventListener("click", async () => {
      if (currentNote?.id) {
        await updateCollection();
        return;
      }

      await createCollection();
    });
  }

  if (deleteBtn) {
    deleteBtn.addEventListener("click", deleteCollection);
  }

  loadNote();
});
