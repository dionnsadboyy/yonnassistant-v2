/* =====================================================
   YONNASSISTANT NOTES SCRIPT
===================================================== */

/* ==========================================
   SUPABASE CONFIG
========================================== */
const SUPABASE_URL = "https://ibimfihvynrdjiqtsyrl.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImliaW1maWh2eW5yZGppcXRzeXJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNTM5NzIsImV4cCI6MjA5NTYyOTk3Mn0.8iKoQgoBUrBiaK1CCuGJ14QhrIQV1CYV0f0GW6xvSTQ";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
(async () => {
  const { data, error } = await supabaseClient.from("notes").select("*");

  console.log("SUPABASE DATA:", data);
  console.log("SUPABASE ERROR:", error);
})();

document.addEventListener("DOMContentLoaded", () => {
  /* =====================================================
     GREETING
  ===================================================== */

  const greetingText = document.querySelector("#greetingText");
  const mobileGreeting = document.querySelector("#mobileGreeting");

  const hour = new Date().getHours();
  let greeting = "";

  if (hour >= 4 && hour < 11) {
    greeting = "pagiiii, yonnnn 🌤️";
  } else if (hour >= 11 && hour < 15) {
    greeting = "sianggg, yonnnn ☀️";
  } else if (hour >= 15 && hour < 18) {
    greeting = "soreee, yonnnn 👋";
  } else {
    greeting = "maleeeeemmm, yonnnn 🌙";
  }

  if (greetingText) {
    greetingText.textContent = greeting;
  }

  if (mobileGreeting) {
    mobileGreeting.textContent = greeting;
  }

  /* =====================================================
     ELEMENTS
  ===================================================== */

  const notesGrid = document.querySelector("#notesGrid");
  const mobileNotesGrid = document.querySelector("#mobileNotesGrid");

  const emptyState = document.querySelector("#emptyState");
  const mobileEmptyState = document.querySelector("#mobileEmptyState");

  const noteModal = document.querySelector("#noteModal");
  const noteTitle = document.querySelector("#noteTitle");
  const noteContent = document.querySelector("#noteContent");

  const saveNoteBtn = document.querySelector("#saveNoteBtn");
  const closeModalBtn = document.querySelector("#closeModalBtn");
  const openModalBtn = document.querySelector("#openModalBtn");
  const mobileOpenModalBtn = document.querySelector(
    ".mobile-layout #mobileOpenModalBtn",
  );
  const deleteNoteBtn = document.querySelector("#deleteNoteBtn");
  const editTitle = document.querySelector("#editTitle");
  const editContent = document.querySelector("#editContent");
  const updateNoteBtn = document.querySelector("#updateNoteBtn");

  const searchInput = document.querySelector("#searchInput");
  const mobileSearchInput = document.querySelector("#mobileSearchInput");

  const viewNoteModal = document.querySelector("#viewNoteModal");
  const viewNoteTitle = document.querySelector("#viewNoteTitle");
  const viewNoteDate = document.querySelector("#viewNoteDate");
  const viewNoteText = document.querySelector("#viewNoteText");
  const closeViewNote = document.querySelector("#closeViewNote");

  const mobileMenuToggler = document.querySelector(
    ".mobile-layout #mobile-menu-toggler",
  );
  const mobileMenu = document.querySelector(".mobile-menu");

  /* =====================================================
     LOCAL STORAGE
  ===================================================== */

  let notes = [];
  let selectedNote = null;

  function saveNotesToStorage() {
    localStorage.setItem("yonnNotes", JSON.stringify(notes));
  }

  const formatDate = () => {
    const now = new Date();
    return now.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  /* =====================================================
     MODALS
  ===================================================== */

  const openModal = () => {
    if (noteModal) noteModal.classList.add("show");
  };

  const closeModal = () => {
    if (noteModal) noteModal.classList.remove("show");
    if (noteTitle) noteTitle.value = "";
    if (noteContent) noteContent.value = "";
  };

  const openViewModal = (note) => {
    selectedNote = note;

    if (editTitle) editTitle.value = note.title;

    if (editContent) editContent.value = note.content;

    if (viewNoteModal) viewNoteModal.classList.add("show");
  };

  const closeViewModal = () => {
    if (viewNoteModal) viewNoteModal.classList.remove("show");
  };

  /* =====================================================
     READ DATA DARI SUPABASE
  ===================================================== */

  const loadNotesFromSupabase = async () => {
    const { data, error } = await supabaseClient
      .from("notes")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    console.log("DATA DARI DB:", data);

    notes = data.map((note) => ({
      id: note.id,
      title: note.title,
      content: note.content,
      date: new Date(note.created_at).toLocaleDateString("id-ID"),
    }));

    console.log(notes);

    renderNotes();
  };

  /* =====================================================
     RENDER NOTES
  ===================================================== */

  const renderNotes = (search = "") => {
    console.log("RENDER NOTES:", notes);
    if (notesGrid) notesGrid.innerHTML = "";
    if (mobileNotesGrid) mobileNotesGrid.innerHTML = "";

    const query = search.trim().toLowerCase();

    const filteredNotes = notes.filter((note) => {
      return (
        note.title.toLowerCase().includes(query) ||
        note.content.toLowerCase().includes(query)
      );
    });

    if (emptyState) {
      emptyState.style.display = filteredNotes.length === 0 ? "block" : "none";
    }

    if (mobileEmptyState) {
      mobileEmptyState.style.display =
        filteredNotes.length === 0 ? "block" : "none";
    }

    filteredNotes.forEach((note) => {
      if (notesGrid) {
        const noteCard = document.createElement("div");
        noteCard.className = "note-card";
        noteCard.innerHTML = `
          <h3>${note.title}</h3>
          <p>${note.content}</p>
          <span>${note.date}</span>
        `;
        noteCard.addEventListener("click", () => openViewModal(note));
        notesGrid.appendChild(noteCard);
      }

      if (mobileNotesGrid) {
        const mobileCard = document.createElement("div");
        mobileCard.className = "mobile-note-card";
        mobileCard.innerHTML = `
          <h3>${note.title}</h3>
          <p>${note.content}</p>
          <span>${note.date}</span>
        `;
        mobileCard.addEventListener("click", () => openViewModal(note));
        mobileNotesGrid.appendChild(mobileCard);
      }
    });
  };

  /* =====================================================
     SAVE NOTE
  ===================================================== */
  const saveNote = async () => {
    const title = noteTitle ? noteTitle.value.trim() : "";
    const content = noteContent ? noteContent.value.trim() : "";

    if (!title || !content) return;

    const { error } = await supabaseClient.from("notes").insert([
      {
        title,
        content,
      },
    ]);

    if (error) {
      console.error("SUPABASE ERROR FULL:", error);

      alert(JSON.stringify(error, null, 2));

      return;
    }

    notes.unshift({
      title,
      content,
      date: formatDate(),
    });

    saveNotesToStorage();
    renderNotes();
    closeModal();

    console.log("NOTE BERHASIL MASUK DATABASE 🔥");
  };

  /* =====================================================
     DELETE NOTE
  ===================================================== */
  if (deleteNoteBtn) {
    console.log(deleteNoteBtn);
    deleteNoteBtn.addEventListener("click", async () => {
      if (!selectedNote) return;

      const confirmDelete = confirm(`Hapus "${selectedNote.title}" ?`);

      if (!confirmDelete) return;

      await deleteNote(selectedNote.id);

      closeViewModal();
    });
  }
  const deleteNote = async (id) => {
    const { error } = await supabaseClient.from("notes").delete().eq("id", id);

    if (error) {
      console.error(error);
      return;
    }

    notes = notes.filter((note) => note.id !== id);

    renderNotes();

    console.log("NOTE BERHASIL DIHAPUS 🔥");
  };

  async function updateNote(id) {
    const { error } = await supabaseClient
      .from("notes")
      .update({
        title: editTitle.value,
        content: editContent.value,
      })
      .eq("id", id);

    if (error) {
      console.error(error);
      return;
    }

    await loadNotesFromSupabase();

    closeViewModal();

    console.log("NOTE BERHASIL DIUPDATE 🔥");
  }
  if (updateNoteBtn) {
    updateNoteBtn.addEventListener("click", async () => {
      if (!selectedNote) return;

      await updateNote(selectedNote.id);
    });
  }

  /* =====================================================
     EVENTS
  ===================================================== */
  const openButtons = [openModalBtn, mobileOpenModalBtn].filter(Boolean);
  openButtons.forEach((btn) => {
    btn.addEventListener("click", openModal);
  });

  if (closeModalBtn) {
    closeModalBtn.addEventListener("click", closeModal);
  }

  if (saveNoteBtn) {
    saveNoteBtn.addEventListener("click", saveNote);
  }

  if (closeViewNote) {
    closeViewNote.addEventListener("click", closeViewModal);
  }

  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      renderNotes(e.target.value);
    });
  }

  if (mobileSearchInput) {
    mobileSearchInput.addEventListener("input", (e) => {
      renderNotes(e.target.value);
    });
  }

  if (mobileMenuToggler) {
    mobileMenuToggler.addEventListener("click", () => {
      document.body.classList.toggle("show-mobile-menu");
    });
  }

  document.addEventListener("click", (e) => {
    if (
      document.body.classList.contains("show-mobile-menu") &&
      mobileMenu &&
      mobileMenuToggler &&
      !mobileMenu.contains(e.target) &&
      !mobileMenuToggler.contains(e.target)
    ) {
      document.body.classList.remove("show-mobile-menu");
    }
  });

  window.addEventListener("click", (e) => {
    if (e.target === noteModal) {
      closeModal();
    }

    if (e.target === viewNoteModal) {
      closeViewModal();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeModal();
      closeViewModal();
      document.body.classList.remove("show-mobile-menu");
    }
  });

  /* =====================================================
   INITIAL LOAD
===================================================== */
  loadNotesFromSupabase();

  /* =====================================================
     INITIAL RENDER
  ===================================================== */
});
