console.log("TRANSAKSI READY 🔥");

const transactionList = document.getElementById("transactionList");
const summaryText = document.getElementById("summaryText");

const allTab = document.getElementById("allTab");
const incomeTab = document.getElementById("incomeTab");
const expenseTab = document.getElementById("expenseTab");

let allTransactions = [];
let activeFilter = "all";

const EDIT_PAGE_URL = "../crudtransaksi/edittransaksi.html";

const categoryEmojiMap = {
  Gaji: "💵",
  Bonus: "🎁",
  THR: "🎉",
  Makanan: "🍜",
  Minuman: "🥤",
  Rokok: "🚬",
  "Coffee Shop": "☕",
  Alkohol: "🍺",
  Kendaraan: "🚗",
  Rumah: "🏠",
  Skincare: "🧴",
  Hutang: "💳",
  Investasi: "📈",
  Lainnya: "📦",
};

function rupiah(number) {
  return "Rp " + Number(number || 0).toLocaleString("id-ID");
}

function formatDateLabel(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  const weekdays = [
    "Minggu",
    "Senin",
    "Selasa",
    "Rabu",
    "Kamis",
    "Jumat",
    "Sabtu",
  ];
  const months = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];

  return `${weekdays[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function safeText(value) {
  return String(value ?? "-")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getEmoji(item) {
  const categoryName = item.categories?.name || "Lainnya";
  return categoryEmojiMap[categoryName] || "💸";
}

function setActiveTab(filter) {
  activeFilter = filter;

  [allTab, incomeTab, expenseTab].forEach((btn) =>
    btn.classList.remove("active"),
  );

  if (filter === "all") allTab.classList.add("active");
  if (filter === "income") incomeTab.classList.add("active");
  if (filter === "expense") expenseTab.classList.add("active");
}

function getFilteredData() {
  if (activeFilter === "income") {
    return allTransactions.filter((item) => item.type === "income");
  }

  if (activeFilter === "expense") {
    return allTransactions.filter((item) => item.type === "expense");
  }

  return allTransactions;
}

function renderSummary(data) {
  const expenseRows = data.filter((item) => item.type === "expense");
  const incomeRows = data.filter((item) => item.type === "income");

  const totalExpense = expenseRows.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0,
  );

  const totalIncome = incomeRows.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0,
  );

  const byCategory = {};
  expenseRows.forEach((item) => {
    const key = item.categories?.name || "Lainnya";
    byCategory[key] = (byCategory[key] || 0) + Number(item.amount || 0);
  });

  const topCategory = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0];
  const categoryText = topCategory
    ? topCategory[0]
    : "belum ada kategori dominan";

  summaryText.textContent = `Bulan ini total pengeluaran kamu ${rupiah(totalExpense)} dari ${expenseRows.length} transaksi. Pengeluaran terbesar ada di kategori ${categoryText}.`;
}

function groupByDate(data) {
  const groups = new Map();

  data.forEach((item) => {
    const key = item.transaction_date || "Unknown";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  });

  return [...groups.entries()];
}

function openEditPage(transactionId) {
  if (!transactionId) return;
  window.location.href = `${EDIT_PAGE_URL}?id=${encodeURIComponent(transactionId)}`;
}

function renderTransactions(data) {
  transactionList.innerHTML = "";

  if (!data.length) {
    transactionList.innerHTML = `
      <div class="empty-state">
        Belum ada transaksi untuk filter ini.
      </div>
    `;
    return;
  }

  const groups = groupByDate(data);

  groups.forEach(([date, items]) => {
    const groupTotal = items.reduce((sum, item) => {
      const amount = Number(item.amount || 0);
      return item.type === "income" ? sum + amount : sum - amount;
    }, 0);

    const totalClass =
      groupTotal > 0 ? "income" : groupTotal < 0 ? "expense" : "neutral";
    const sign = groupTotal > 0 ? "+" : groupTotal < 0 ? "-" : "";

    const groupEl = document.createElement("section");
    groupEl.className = "date-group";

    groupEl.innerHTML = `
      <div class="date-header">
        <span>${safeText(formatDateLabel(date))}</span>
        <strong class="date-total ${totalClass}">
          ${sign} ${rupiah(Math.abs(groupTotal))}
        </strong>
      </div>
    `;

    items.forEach((item) => {
      const isExpense = item.type === "expense";
      const isIncome = item.type === "income";
      const amountClass = isExpense
        ? "expense"
        : isIncome
          ? "income"
          : "transfer";

      const signText = isExpense ? "-" : isIncome ? "+" : "";

      const card = document.createElement("article");
      card.className = "transaction-card";
      card.dataset.id = item.id;
      card.setAttribute("role", "button");
      card.setAttribute("tabindex", "0");

      card.innerHTML = `
        <div class="transaction-left">
          <div class="transaction-icon">${getEmoji(item)}</div>

          <div class="transaction-meta">
            <h3>${safeText(item.categories?.name || item.type || "-")}</h3>
            <p>${safeText(item.wallets?.name || "-")}</p>
            <small>${safeText(item.note || "-")}</small>
          </div>
        </div>

        <div class="amount ${amountClass}">
          ${signText} ${rupiah(item.amount)}
        </div>
      `;

      card.addEventListener("click", () => openEditPage(item.id));

      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openEditPage(item.id);
        }
      });

      groupEl.appendChild(card);
    });

    transactionList.appendChild(groupEl);
  });
}

async function loadTransactions() {
  try {
    const { data, error } = await supabaseClient
      .from("transactions")
      .select(
        `
          id,
          transaction_date,
          type,
          amount,
          note,
          created_at,
          categories(name),
          wallets(name)
        `,
      )
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("SUPABASE ERROR:", error);
      summaryText.textContent = "Gagal memuat data transaksi.";
      return;
    }

    allTransactions = Array.isArray(data) ? data : [];

    renderSummary(allTransactions);
    renderTransactions(getFilteredData());

    console.log("TRANSAKSI LOADED ✅", allTransactions.length);
  } catch (err) {
    console.error(err);
    summaryText.textContent = "Terjadi error saat memuat transaksi.";
  }
}

allTab.addEventListener("click", () => {
  setActiveTab("all");
  renderTransactions(getFilteredData());
});

incomeTab.addEventListener("click", () => {
  setActiveTab("income");
  renderTransactions(getFilteredData());
});

expenseTab.addEventListener("click", () => {
  setActiveTab("expense");
  renderTransactions(getFilteredData());
});

loadTransactions();
