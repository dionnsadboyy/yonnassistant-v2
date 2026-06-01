console.log("EDIT TRANSAKSI READY 🔥");

const amountDisplay = document.getElementById("amountDisplay");
const numpadOverlay = document.getElementById("numpadOverlay");
const numpadSheet = document.getElementById("numpadSheet");
const deleteBtn = document.getElementById("deleteBtn");

const walletList = document.getElementById("walletList");
const categoryButton = document.getElementById("categoryButton");
const categorySelect = document.getElementById("categorySelect");
const categoryOverlay = document.getElementById("categoryOverlay");
const categoryList = document.getElementById("categoryList");

const merchantInput = document.getElementById("merchantInput");
const noteInput = document.getElementById("noteInput");

const saveBtn = document.getElementById("saveBtn");
const resetBtn = document.getElementById("resetBtn");
const expenseBtn = document.getElementById("expenseBtn");
const incomeBtn = document.getElementById("incomeBtn");
const closePageBtn = document.getElementById("closePageBtn");
const deleteTransactionBtn = document.getElementById("deleteTransactionBtn");

const params = new URLSearchParams(window.location.search);
const transactionId = Number(params.get("id"));

const state = {
  id: Number.isFinite(transactionId) ? transactionId : null,
  amount: "",
  walletId: 1,
  categoryId: null,
  type: "expense",
  transactionDate: new Date().toISOString().split("T")[0],
};

let originalSnapshot = null;
let lastTap = 0;
let replaceAmount = false;

function renderAmount() {
  if (!state.amount) {
    amountDisplay.textContent = "0";
    return;
  }

  amountDisplay.textContent = Number(state.amount).toLocaleString("id-ID");
}

function setActiveWallet(walletId) {
  state.walletId = Number(walletId);

  walletList.querySelectorAll(".wallet-chip").forEach((btn) => {
    btn.classList.toggle(
      "active",
      Number(btn.dataset.wallet) === Number(walletId),
    );
  });
}

function setType(type) {
  state.type = type;
  expenseBtn.classList.toggle("active", type === "expense");
  incomeBtn.classList.toggle("active", type === "income");
}

function setCategory(categoryId, categoryName = "") {
  state.categoryId = categoryId ? Number(categoryId) : null;
  categorySelect.value = categoryId ? String(categoryId) : "";

  if (categoryName) {
    categoryButton.textContent = categoryName;
    return;
  }

  const selectedOption = categorySelect.querySelector(
    `option[value="${String(categoryId)}"]`,
  );

  categoryButton.textContent =
    selectedOption?.textContent?.trim() || "Pilih kategori";
}

function openNumpad() {
  replaceAmount = true;
  numpadOverlay.classList.remove("hidden");
}

function closeNumpad() {
  numpadOverlay.classList.add("hidden");
}

function openCategoryModal() {
  categoryOverlay.classList.remove("hidden");
}

function closeCategoryModal() {
  categoryOverlay.classList.add("hidden");
}

function normalizeAmountInput(raw) {
  const digitsOnly = String(raw || "").replace(/\D/g, "");
  if (!digitsOnly) return "";
  return String(Number(digitsOnly));
}

function applySnapshot(snapshot) {
  state.amount = snapshot.amount ?? "";
  state.walletId = Number(snapshot.walletId || 1);
  state.categoryId = snapshot.categoryId ? Number(snapshot.categoryId) : null;
  state.type = snapshot.type || "expense";
  state.transactionDate = snapshot.transactionDate || state.transactionDate;

  renderAmount();
  setActiveWallet(state.walletId);
  setType(state.type);
  setCategory(state.categoryId, snapshot.categoryName || "");
  if (merchantInput) merchantInput.value = snapshot.merchant || "";
  if (noteInput) noteInput.value = snapshot.note || "";
}

async function loadCategories() {
  const { data, error } = await supabaseClient
    .from("categories")
    .select("id, name")
    .order("id");

  if (error) {
    console.error("LOAD CATEGORY ERROR:", error);
    return;
  }

  categorySelect.innerHTML = '<option value="">Pilih kategori</option>';
  categoryList.innerHTML = "";

  (data || []).forEach((cat) => {
    categorySelect.innerHTML += `<option value="${cat.id}">${cat.name}</option>`;

    categoryList.innerHTML += `
      <button
        type="button"
        class="category-item"
        data-id="${cat.id}"
        data-name="${cat.name}"
      >
        ${cat.name}
      </button>
    `;
  });
}

async function loadWallets() {
  const { data, error } = await supabaseClient
    .from("wallets")
    .select("id, name")
    .order("id");

  if (error) {
    console.error("LOAD WALLET ERROR:", error);
    return;
  }

  walletList.innerHTML = "";

  (data || []).forEach((wallet, index) => {
    walletList.innerHTML += `
      <button
        type="button"
        class="wallet-chip ${index === 0 ? "active" : ""}"
        data-wallet="${wallet.id}"
      >
        ${wallet.name}
      </button>
    `;
  });
}

async function loadTransaction() {
  if (!state.id) {
    alert("ID transaksi tidak valid.");
    history.back();
    return;
  }

  const { data, error } = await supabaseClient
    .from("transactions")
    .select(
      `
        id,
        transaction_date,
        wallet_id,
        category_id,
        type,
        amount,
        note,
        created_at,
        categories(name),
        wallets(name)
      `,
    )
    .eq("id", state.id)
    .single();

  if (error) {
    console.error("LOAD TRANSACTION ERROR:", error);
    alert("Transaksi tidak ditemukan.");
    history.back();
    return;
  }

  originalSnapshot = {
    amount: String(data.amount || ""),
    walletId: data.wallet_id,
    categoryId: data.category_id,
    categoryName: data.categories?.name || "",
    type: data.type,
    transactionDate: data.transaction_date,
    merchant: "",
    note: data.note || "",
  };

  applySnapshot(originalSnapshot);
  saveBtn.textContent = "Simpan Perubahan";
}

function bindEvents() {
  amountDisplay.addEventListener("click", openNumpad);

  numpadOverlay.addEventListener("click", (e) => {
    if (e.target === numpadOverlay) closeNumpad();
  });

  numpadSheet.addEventListener("click", (e) => {
    e.stopPropagation();
  });

  numpadSheet.addEventListener(
    "touchend",
    (e) => {
      const now = Date.now();
      if (now - lastTap < 300) {
        e.preventDefault();
      }
      lastTap = now;
    },
    { passive: false },
  );

  document.querySelectorAll(".num-btn[data-value]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const value = btn.dataset.value || "";

      if (replaceAmount) {
        state.amount = value;
        replaceAmount = false;
      } else {
        state.amount = `${state.amount || ""}${value}`;
      }

      state.amount = normalizeAmountInput(state.amount);

      renderAmount();
    });
  });
  deleteBtn.addEventListener("click", () => {
    replaceAmount = false;

    state.amount = String(state.amount || "").slice(0, -1);

    state.amount = normalizeAmountInput(state.amount);

    renderAmount();
  });

  walletList.addEventListener("click", (e) => {
    const btn = e.target.closest(".wallet-chip");
    if (!btn) return;
    setActiveWallet(btn.dataset.wallet);
  });

  expenseBtn.addEventListener("click", () => setType("expense"));
  incomeBtn.addEventListener("click", () => setType("income"));

  categoryButton.addEventListener("click", openCategoryModal);

  categoryOverlay.addEventListener("click", (e) => {
    if (e.target === categoryOverlay) closeCategoryModal();
  });

  document.addEventListener("click", (e) => {
    const item = e.target.closest(".category-item");
    if (!item) return;

    const id = item.dataset.id;
    const name = item.dataset.name;

    setCategory(id, name);
    closeCategoryModal();
  });

  resetBtn.addEventListener("click", () => {
    if (originalSnapshot) {
      applySnapshot(originalSnapshot);
      return;
    }

    state.amount = "";
    state.walletId = 1;
    state.categoryId = null;
    state.type = "expense";

    renderAmount();
    setActiveWallet(1);
    setType("expense");
    setCategory(null, "Pilih kategori");

    if (merchantInput) merchantInput.value = "";
    if (noteInput) noteInput.value = "";
  });

  saveBtn.addEventListener("click", async () => {
    try {
      if (!state.id) {
        alert("ID transaksi tidak valid.");
        return;
      }

      if (!state.amount || Number(state.amount) <= 0) {
        alert("Masukkan nominal dulu.");
        return;
      }

      if (!state.categoryId) {
        alert("Pilih kategori dulu.");
        return;
      }

      saveBtn.disabled = true;
      saveBtn.textContent = "Menyimpan...";

      const payload = {
        transaction_date: state.transactionDate,
        wallet_id: Number(state.walletId),
        category_id: Number(state.categoryId),
        type: state.type,
        amount: Number(state.amount),
        note: noteInput ? noteInput.value.trim() : "",
      };

      const { error } = await supabaseClient
        .from("transactions")
        .update(payload)
        .eq("id", state.id);

      if (error) {
        console.error("UPDATE ERROR:", error);
        alert("Gagal menyimpan perubahan.");
        saveBtn.disabled = false;
        saveBtn.textContent = "Simpan Perubahan";
        return;
      }

      alert("Transaksi berhasil diperbarui 🎉");
      window.location.href = "../transaksi/transaksi.html";
    } catch (err) {
      console.error(err);
      alert("Terjadi error saat menyimpan.");
      saveBtn.disabled = false;
      saveBtn.textContent = "Simpan Perubahan";
    }
  });

  deleteTransactionBtn.addEventListener("click", async () => {
    try {
      if (!state.id) {
        alert("ID transaksi tidak valid.");
        return;
      }

      const confirmed = confirm("Yakin mau hapus transaksi ini?");
      if (!confirmed) return;

      deleteTransactionBtn.disabled = true;
      deleteTransactionBtn.textContent = "Menghapus...";

      const { error } = await supabaseClient
        .from("transactions")
        .delete()
        .eq("id", state.id);

      if (error) {
        console.error("DELETE ERROR:", error);
        alert("Gagal menghapus transaksi.");
        deleteTransactionBtn.disabled = false;
        deleteTransactionBtn.textContent = "Hapus";
        return;
      }

      alert("Transaksi berhasil dihapus 🗑️");
      window.location.href = "../transaksi/transaksi.html";
    } catch (err) {
      console.error(err);
      alert("Terjadi error saat menghapus.");
      deleteTransactionBtn.disabled = false;
      deleteTransactionBtn.textContent = "Hapus";
    }
  });

  closePageBtn.addEventListener("click", () => {
    history.back();
  });
}

async function init() {
  bindEvents();
  renderAmount();
  setType("expense");
  setCategory(null, "Pilih kategori");

  await loadCategories();
  await loadWallets();
  await loadTransaction();

  console.log("EDIT CRUD LOADED ✅");
}

init();
