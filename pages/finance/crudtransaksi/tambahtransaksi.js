console.log("TAMBAH TRANSAKSI READY 🔥");

// ======================
// ELEMENT
// ======================

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

// ======================
// STATE
// ======================

const state = {
  amount: "",
  walletId: 1,
  categoryId: null,
  type: "expense",
  transactionDate: new Date().toISOString().split("T")[0],
};

// ======================
// FORMAT RUPIAH
// ======================

function renderAmount() {
  if (!state.amount) {
    amountDisplay.textContent = "0";
    return;
  }

  amountDisplay.textContent = Number(state.amount).toLocaleString("id-ID");
}

// ======================
// NUMPAD OPEN
// ======================

amountDisplay.addEventListener("click", () => {
  numpadOverlay.classList.remove("hidden");
});

// ======================
// NUMPAD CLOSE
// ======================

numpadOverlay.addEventListener("click", (e) => {
  if (e.target === numpadOverlay) {
    numpadOverlay.classList.add("hidden");
  }
});

numpadSheet.addEventListener("click", (e) => {
  e.stopPropagation();
});

// ======================
// NUMPAD BUTTON
// ======================

document.querySelectorAll(".num-btn[data-value]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const value = btn.dataset.value;

    state.amount += value;

    renderAmount();
  });
});

// ======================
// DELETE
// ======================

deleteBtn.addEventListener("click", () => {
  state.amount = state.amount.slice(0, -1);

  renderAmount();
});

// ======================
// WALLET
// ======================

walletList.querySelectorAll(".wallet-chip").forEach((wallet) => {
  wallet.addEventListener("click", () => {
    walletList.querySelectorAll(".wallet-chip").forEach((w) => {
      w.classList.remove("active");
    });

    wallet.classList.add("active");

    state.walletId = Number(wallet.dataset.wallet);
  });
});

// ======================
// TYPE
// ======================

expenseBtn.addEventListener("click", () => {
  state.type = "expense";

  expenseBtn.classList.add("active");

  incomeBtn.classList.remove("active");
});

incomeBtn.addEventListener("click", () => {
  state.type = "income";

  incomeBtn.classList.add("active");

  expenseBtn.classList.remove("active");
});

// ======================
// CATEGORY MODAL
// ======================

categoryButton.addEventListener("click", () => {
  categoryOverlay.classList.remove("hidden");
});

categoryOverlay.addEventListener("click", (e) => {
  if (e.target === categoryOverlay) {
    categoryOverlay.classList.add("hidden");
  }
});

// ======================
// LOAD CATEGORY
// ======================

async function loadCategories() {
  try {
    const { data, error } = await supabaseClient
      .from("categories")
      .select("*")
      .order("id");

    if (error) {
      console.error(error);
      return;
    }

    categorySelect.innerHTML = "";

    categoryList.innerHTML = "";

    data.forEach((cat) => {
      categorySelect.innerHTML += `
        <option value="${cat.id}">
          ${cat.name}
        </option>
      `;

      categoryList.innerHTML += `
        <button
          class="category-item"
          data-id="${cat.id}"
          data-name="${cat.name}"
        >
          ${cat.name}
        </button>
      `;
    });
  } catch (err) {
    console.error(err);
  }
}

// ======================
// SELECT CATEGORY
// ======================

document.addEventListener("click", (e) => {
  if (e.target.classList.contains("category-item")) {
    const id = e.target.dataset.id;

    const name = e.target.dataset.name;

    state.categoryId = Number(id);

    categorySelect.value = id;

    categoryButton.textContent = name;

    categoryOverlay.classList.add("hidden");
  }
});

// ======================
// RESET
// ======================

resetBtn.addEventListener("click", () => {
  state.amount = "";
  state.categoryId = null;
  state.walletId = 1;
  state.type = "expense";

  merchantInput.value = "";
  noteInput.value = "";

  categoryButton.textContent = "Pilih kategori";

  renderAmount();
});

// ======================
// SAVE
// ======================

saveBtn.addEventListener("click", async () => {
  try {
    if (!state.amount) {
      alert("Masukkan nominal dulu");

      return;
    }

    if (!state.categoryId) {
      alert("Pilih kategori dulu");

      return;
    }

    saveBtn.disabled = true;

    saveBtn.textContent = "Menyimpan...";

    const payload = {
      wallet_id: state.walletId,

      category_id: state.categoryId,

      transaction_date: state.transactionDate,

      type: state.type,

      amount: Number(state.amount),

      note: noteInput.value.trim(),
    };

    console.log("SAVE PAYLOAD", payload);

    const { error } = await supabaseClient.from("transactions").insert(payload);

    if (error) {
      console.error(error);

      alert("Gagal menyimpan transaksi");

      saveBtn.disabled = false;

      saveBtn.textContent = "Simpan";

      return;
    }

    alert("Transaksi berhasil disimpan 🎉");

    window.location.href = "../home/home.html";
  } catch (err) {
    console.error(err);

    alert("Terjadi kesalahan");

    saveBtn.disabled = false;

    saveBtn.textContent = "Simpan";
  }
});

// ======================
// CLOSE PAGE
// ======================

closePageBtn.addEventListener("click", () => {
  history.back();
});

// ======================
// INIT
// ======================

loadCategories();

renderAmount();

console.log("CRUD TRANSAKSI LOADED ✅");
