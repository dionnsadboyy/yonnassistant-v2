/* =====================================================
   YONNASSISTANT NOTES SCRIPT
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

  /* =====================================================
     GREETING
  ===================================================== */
  const greetingText = document.querySelector("#greetingText");
  const mobileGreeting = document.querySelector("#mobileGreeting");

  const hour = new Date().getHours();
  let greeting = "";

  if (hour >= 4 && hour < 11) {
    greeting = "pagii, yonn 🌤️";
  } else if (hour >= 11 && hour < 15) {
    greeting = "siangg, yonn ☀️";
  } else if (hour >= 15 && hour < 18) {
    greeting = "soree, yonn 👋";
  } else {
    greeting = "malemm, yonn 🌙";
  }

  if (greetingText) greetingText.textContent = greeting;
  if (mobileGreeting) mobileGreeting.textContent = greeting;

  /* =====================================================
     ELEMENTS
  ===================================================== */
  const notesGrid = document.querySelector("#notesGrid");
  const mobileNotesGrid = document.querySelector("#mobileNotesGrid");

  const emptyState = document.querySelector("#emptyState");
  const mobileEmptyState = document.querySelector("#mobileEmptyState");

  const noteModal = document.querySelector("#noteModal");
  const noteModalTitle = document.querySelector("#noteModalTitle");
  const noteTitle = document.querySelector("#noteTitle");
  const noteContent = document.querySelector("#noteContent");

  const saveNoteBtn = document.querySelector("#saveNoteBtn");
  const closeModalBtn = document.querySelector("#closeModalBtn");
  const openModalBtn = document.querySelector("#openModalBtn");
  const mobileOpenModalBtn = document.querySelector("#mobileOpenModalBtn");

  const searchInput = document.querySelector("#searchInput");
  const mobileSearchInput = document.querySelector("#mobileSearchInput");

  const typePicker = document.querySelector("#typePicker");
  const closeTypePicker = document.querySelector("#closeTypePicker");
  const closeTypePickerBtn = document.querySelector("#closeTypePickerBtn");
  const typeCards = document.querySelectorAll("[data-note-type]");

  const menuBtn = document.getElementById("menuBtn");
  const menuPopup = document.getElementById("menuPopup");

  /* =====================================================
     STATE
  ===================================================== */
  let notes = [];
  let pendingNoteType = "note";

  /* =====================================================
     ROUTES / CONFIG
  ===================================================== */
  const detailPageMap = {
    note: "notedetail.html",
    list: "notedetaillist.html",
    checklist: "notedetaillist.html",
    collection: "notedetailcollection.html",
  };

  const typeTitleMap = {
    note: "Tambah Note",
    list: "Tambah List",
    checklist: "Tambah List",
    collection: "Tambah Collection",
  };

  const placeholderMap = {
    note: {
      title: "Judul catatan...",
      content: "Tulis sesuatu...",
    },
    list: {
      title: "Judul list...",
      content: "Tulis item per baris...",
    },
    checklist: {
      title: "Judul list...",
      content: "Tulis item per baris...",
    },
    collection: {
      title: "Judul collection...",
      content: "Tulis daftar / kumpulan item...",
    },
  };

  const normalizeType = (type) => {
    if (type === "checklist") return "list";
    if (type === "collection") return "collection";
    if (type === "list") return "list";
    return "note";
  };

  const getDetailPageByType = (type) => {
    const normalized = normalizeType(type);
    return detailPageMap[normalized] || "notedetail.html";
  };

  const formatDate = () => {
    const now = new Date();
    return now.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const escapeHTML = (value) =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");

  /* =====================================================
     PICKER / MODAL
  ===================================================== */
  const openTypePicker = () => {
    if (typePicker) {
      typePicker.classList.add("show");
      return;
    }
    openCreateModal();
  };

  const closeTypePickerFn = () => {
    if (typePicker) typePicker.classList.remove("show");
  };

  const openCreateModal = () => {
    const titleMap = typeTitleMap[pendingNoteType] || "Tambah Catatan";
    const placeholder = placeholderMap[pendingNoteType] || placeholderMap.note;

    if (noteModalTitle) noteModalTitle.textContent = titleMap;
    if (noteTitle) {
      noteTitle.placeholder = placeholder.title;
      noteTitle.value = "";
    }
    if (noteContent) {
      noteContent.placeholder = placeholder.content;
      noteContent.value = "";
    }

    if (noteModal) noteModal.classList.add("show");
  };

  const closeModal = () => {
    if (noteModal) noteModal.classList.remove("show");
    if (noteTitle) noteTitle.value = "";
    if (noteContent) noteContent.value = "";
  };

  /* =====================================================
     NAVIGATE TO DETAIL
  ===================================================== */
  const openDetailPage = (note) => {
    localStorage.removeItem("createMode");
    localStorage.setItem("selectedNote", JSON.stringify(note));
    localStorage.setItem("selectedNoteId", String(note.id));
    window.location.href = getDetailPageByType(note.type);
  };

  /* =====================================================
     LOAD NOTES
  ===================================================== */
  const loadNotesFromSupabase = async () => {
    try {
      const { data, error } = await supabaseClient
        .from("notes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("SUPABASE ERROR:", error);
        notes = [];
        renderNotes();
        return;
      }

      notes = (data || []).map((note) => ({
        id: note.id,
        title: note.title || "",
        content: note.content || "",
        type: normalizeType(note.type || "note"),
        created_at: note.created_at || null,
        updated_at: note.updated_at || null,
        date: note.created_at
          ? new Date(note.created_at).toLocaleDateString("id-ID")
          : formatDate(),
      }));

      renderNotes();
    } catch (err) {
      console.error("LOAD NOTES ERROR:", err);
      notes = [];
      renderNotes();
    }
  };

  /* =====================================================
     RENDER NOTES
  ===================================================== */
  const renderNotes = (search = "") => {
    if (notesGrid) notesGrid.innerHTML = "";
    if (mobileNotesGrid) mobileNotesGrid.innerHTML = "";

    const query = search.trim().toLowerCase();

    const filteredNotes = notes.filter((note) => {
      return (
        note.title.toLowerCase().includes(query) ||
        note.content.toLowerCase().includes(query)
      );
    });

    const shouldShowEmpty = filteredNotes.length === 0;

    if (emptyState) {
      emptyState.style.display = shouldShowEmpty ? "block" : "none";
    }

    if (mobileEmptyState) {
      mobileEmptyState.style.display = shouldShowEmpty ? "block" : "none";
    }

    filteredNotes.forEach((note) => {
      const preview = note.content.replace(/\n+/g, " ").trim();

      if (notesGrid) {
        const noteCard = document.createElement("div");
        noteCard.className = "card note-card";

        noteCard.innerHTML = `
          <h3>${escapeHTML(note.title)}</h3>
          <div class="small">
            ${
              preview.length > 90
                ? escapeHTML(preview.slice(0, 90)) + "..."
                : escapeHTML(preview)
            }
          </div>
        `;

        noteCard.addEventListener("click", () => {
          openDetailPage(note);
        });

        notesGrid.appendChild(noteCard);
      }

      if (mobileNotesGrid) {
        const mobileCard = document.createElement("div");
        mobileCard.className = "card mobile-note-card";

        mobileCard.innerHTML = `
          <h3>${escapeHTML(note.title)}</h3>
          <div class="small">
            ${
              preview.length > 70
                ? escapeHTML(preview.slice(0, 70)) + "..."
                : escapeHTML(preview)
            }
          </div>
        `;

        mobileCard.addEventListener("click", () => {
          openDetailPage(note);
        });

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

    const noteType = normalizeType(pendingNoteType);

    const { error } = await supabaseClient.from("notes").insert([
      {
        title,
        content,
        type: noteType,
      },
    ]);

    if (error) {
      console.error("SUPABASE ERROR FULL:", error);
      alert(JSON.stringify(error, null, 2));
      return;
    }

    pendingNoteType = "note";
    closeModal();
    await loadNotesFromSupabase();

    console.log("NOTE BERHASIL MASUK DATABASE 🔥");
  };

  /* =====================================================
     EVENTS
  ===================================================== */
  const openButtons = [openModalBtn, mobileOpenModalBtn].filter(Boolean);
  openButtons.forEach((btn) => {
    btn.addEventListener("click", openTypePicker);
  });

  if (closeModalBtn) {
    closeModalBtn.addEventListener("click", closeModal);
  }

  if (saveNoteBtn) {
    saveNoteBtn.addEventListener("click", saveNote);
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

  if (typeCards && typeCards.length) {
    typeCards.forEach((card) => {
      card.addEventListener("click", () => {
        const type = card.dataset.noteType || "note";

        localStorage.setItem("createMode", type);
        localStorage.removeItem("selectedNote");
        localStorage.removeItem("selectedNoteId");

        if (type === "note") {
          window.location.href = "notedetail.html";
        }

        if (type === "list") {
          window.location.href = "notedetaillist.html";
        }

        if (type === "collection") {
          window.location.href = "notedetailcollection.html";
        }
      });
    });
  }

  if (closeTypePicker) {
    closeTypePicker.addEventListener("click", closeTypePickerFn);
  }

  if (closeTypePickerBtn) {
    closeTypePickerBtn.addEventListener("click", closeTypePickerFn);
  }

  window.addEventListener("click", (e) => {
    if (e.target === noteModal) {
      closeModal();
    }

    if (e.target === typePicker) {
      closeTypePickerFn();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeModal();
      closeTypePickerFn();
    }
  });

  if (menuBtn && menuPopup) {
    menuBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      menuPopup.classList.toggle("show");
    });

    document.addEventListener("click", (e) => {
      if (!menuPopup.contains(e.target) && !menuBtn.contains(e.target)) {
        menuPopup.classList.remove("show");
      }
    });
  }

  /* =====================================================
     INITIAL LOAD
  ===================================================== */
  loadNotesFromSupabase();
});
