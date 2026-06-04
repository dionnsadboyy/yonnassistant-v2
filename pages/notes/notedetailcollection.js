/* =====================================================
   YONNASSISTANT NOTE DETAIL SCRIPT
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

  const noteTitleEl = document.getElementById("noteTitle");
  const noteContentEl = document.getElementById("noteContent");
  const noteDateEl = document.getElementById("noteDate");
  const editBtn = document.getElementById("editBtn");
  const deleteBtn = document.getElementById("deleteBtn");

  let currentNote = null;

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

  const renderListContent = (content) => {
    const lines = String(content || "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    if (!lines.length) return "-";

    return `
      <ul class="detail-list">
        ${lines
          .map((line) => `<li>${line.replace(/^[-*•]\s*/, "")}</li>`)
          .join("")}
      </ul>
    `;
  };

  const renderNote = (note) => {
    if (!note) return;

    const type = normalizeType(note.type);

    document.title = note.title ? `${note.title} - Note Detail` : "Note Detail";

    if (noteTitleEl) noteTitleEl.textContent = note.title || "-";
    if (noteDateEl) {
      noteDateEl.textContent = formatDate(note.created_at || note.date);
    }

    if (noteContentEl) {
      if (type === "list" || type === "collection") {
        noteContentEl.innerHTML = renderListContent(note.content);
      } else {
        noteContentEl.textContent = note.content || "-";
      }
    }
  };

  const loadNote = async () => {
    const noteId = getNoteIdFromStorage();

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

    alert("Note tidak ditemukan.");
    history.back();
  };

  const refreshCurrentNote = async () => {
    if (!currentNote?.id) {
      await loadNote();
      return;
    }

    const { data, error } = await supabaseClient
      .from("notes")
      .select("*")
      .eq("id", currentNote.id)
      .single();

    if (error || !data) {
      console.error(error);
      await loadNote();
      return;
    }

    currentNote = data;
    renderNote(data);
  };

  const updateCurrentNote = async () => {
    if (!currentNote?.id) return;

    const nextTitle = prompt("Edit judul:", currentNote.title || "");
    if (nextTitle === null) return;

    const nextContent = prompt("Edit isi:", currentNote.content || "");
    if (nextContent === null) return;

    const { error } = await supabaseClient
      .from("notes")
      .update({
        title: nextTitle.trim(),
        content: nextContent.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", currentNote.id);

    if (error) {
      console.error("UPDATE ERROR:", error);
      alert("Gagal update note.");
      return;
    }

    await refreshCurrentNote();
    alert("Note berhasil diupdate.");
  };

  const deleteCurrentNote = async () => {
    if (!currentNote?.id) return;

    const confirmDelete = confirm(`Hapus "${currentNote.title}" ?`);
    if (!confirmDelete) return;

    const { error } = await supabaseClient
      .from("notes")
      .delete()
      .eq("id", currentNote.id);

    if (error) {
      console.error("DELETE ERROR:", error);
      alert("Gagal hapus note.");
      return;
    }

    localStorage.removeItem("selectedNote");
    localStorage.removeItem("selectedNoteId");

    alert("Note berhasil dihapus.");
    window.location.href = "notes.html";
  };

  if (editBtn) {
    editBtn.addEventListener("click", updateCurrentNote);
  }

  if (deleteBtn) {
    deleteBtn.addEventListener("click", deleteCurrentNote);
  }

  loadNote();
});
