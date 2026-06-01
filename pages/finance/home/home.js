console.log("HOME V3 READY 🔥");

// ======================
// TAB SWITCH
// ======================

const monthTab = document.getElementById("monthTab");
const totalTab = document.getElementById("totalTab");

const monthCard = document.getElementById("monthCard");
const walletCard = document.getElementById("walletCard");

if (monthTab && totalTab && monthCard && walletCard) {
  monthTab.addEventListener("click", () => {
    monthCard.classList.remove("hidden");
    walletCard.classList.add("hidden");
    monthTab.classList.add("active-tab");
    totalTab.classList.remove("active-tab");
  });

  totalTab.addEventListener("click", () => {
    walletCard.classList.remove("hidden");
    monthCard.classList.add("hidden");
    totalTab.classList.add("active-tab");
    monthTab.classList.remove("active-tab");
  });
}

// ======================
// FORMAT RUPIAH
// ======================

function formatRupiah(value) {
  return "Rp " + Number(value || 0).toLocaleString("id-ID");
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
  const map = {
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

  const categoryName = item.categories?.name || "Lainnya";
  return map[categoryName] || "💸";
}

function formatDateLabel(dateString) {
  if (!dateString) return "-";

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

// ======================
// ELEMENTS
// ======================

const monthBalance = document.getElementById("monthBalance");
const incomeValue = document.getElementById("incomeValue");
const expenseValue = document.getElementById("expenseValue");

const totalAsset = document.getElementById("totalAsset");
const walletList = document.getElementById("walletList");

const recentTransactions = document.getElementById("recentTransactions");
const insightContent = document.getElementById("insightContent");

// ======================
// LOAD DASHBOARD
// ======================

const menuBtn = document.getElementById("menuBtn");
const menuPopup = document.getElementById("menuPopup");

menuBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  menuPopup.classList.toggle("show");
});

document.addEventListener("click", () => {
  menuPopup.classList.remove("show");
});

async function loadDashboard() {
  console.log("Loading dashboard...");

  const { data: transactions, error: transactionError } = await supabaseClient
    .from("transactions")
    .select(
      `
      id,
      wallet_id,
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

  if (transactionError) {
    console.error(transactionError);
    return;
  }

  const { data: transfers, error: transferError } = await supabaseClient
    .from("transfers")
    .select("*");

  if (transferError) {
    console.error(transferError);
    return;
  }

  const { data: wallets, error: walletError } = await supabaseClient
    .from("wallets")
    .select("*")
    .order("id");

  if (walletError) {
    console.error(walletError);
    return;
  }

  const totalIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const totalExpense = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  if (incomeValue) incomeValue.textContent = formatRupiah(totalIncome);
  if (expenseValue) expenseValue.textContent = formatRupiah(totalExpense);
  if (monthBalance)
    monthBalance.textContent = formatRupiah(totalIncome - totalExpense);

  let grandTotal = 0;

  if (walletList) walletList.innerHTML = "";

  wallets.forEach((wallet) => {
    const income = transactions
      .filter((t) => t.wallet_id === wallet.id && t.type === "income")
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const expense = transactions
      .filter((t) => t.wallet_id === wallet.id && t.type === "expense")
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const transferIn = transfers
      .filter((t) => t.to_wallet_id === wallet.id)
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const transferOut = transfers
      .filter((t) => t.from_wallet_id === wallet.id)
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const balance = income - expense + transferIn - transferOut;
    grandTotal += balance;

    if (walletList) {
      walletList.innerHTML += `
        <div class="wallet-item">
          <small>${safeText(wallet.name)}</small>
          <h3>${formatRupiah(balance)}</h3>
        </div>
      `;
    }
  });

  if (totalAsset) totalAsset.textContent = formatRupiah(grandTotal);

  // ======================
  // INSIGHT YONNGPT
  // ======================

  const transactionCount = transactions.length;

  const categorySummary = {};

  transactions
    .filter((t) => t.type === "expense")
    .forEach((t) => {
      const category = t.categories?.name || "Lainnya";

      categorySummary[category] =
        (categorySummary[category] || 0) + Number(t.amount || 0);
    });

  let topCategory = "-";
  let topCategoryAmount = 0;

  Object.entries(categorySummary).forEach(([name, amount]) => {
    if (amount > topCategoryAmount) {
      topCategory = name;
      topCategoryAmount = amount;
    }
  });

  if (insightContent) {
    insightContent.innerHTML = `
    Bulan ini total pengeluaran kamu
    sebesar <b>${formatRupiah(totalExpense)}</b>
    dari <b>${transactionCount}</b> transaksi.
<br>
    Pengeluaran terbesar ada di kategori
    <b>${safeText(topCategory)}</b>
    sebesar
    <b>${formatRupiah(topCategoryAmount)}</b>.
  `;
  }

  if (recentTransactions) {
    recentTransactions.innerHTML = "";

    const latest = transactions.slice(0, 5);

    if (!latest.length) {
      recentTransactions.innerHTML = `
      <div class="empty-state">
        Belum ada transaksi.
      </div>
    `;
    } else {
      latest.forEach((item) => {
        const isExpense = item.type === "expense";
        const isIncome = item.type === "income";
        const amountClass = isExpense
          ? "amount expense-amount"
          : isIncome
            ? "amount income-amount"
            : "amount transfer-amount";
        const sign = isExpense ? "-" : isIncome ? "+" : "";

        recentTransactions.innerHTML += `
  <div
    class="transaction-row clickable-transaction"
    data-id="${item.id}"
  >
    <div class="transaction-left">
      <div class="emoji">${getEmoji(item)}</div>

      <div class="transaction-info">
        <h3>${safeText(item.categories?.name || item.type || "-")}</h3>
        <p>${safeText(item.wallets?.name || "-")}</p>
        <small>${safeText(item.note || "-")}</small>
      </div>
    </div>

    <div class="amount ${amountClass}">
      ${sign} ${formatRupiah(item.amount)}
    </div>
  </div>
`;
      });
    }
  }

  console.log("HOME LOADED ✅");
  console.log("TOTAL ASSET:", grandTotal);
}
document.addEventListener("click", (e) => {
  const transaction = e.target.closest(".clickable-transaction");

  if (!transaction) return;

  const id = transaction.dataset.id;

  if (!id) return;

  window.location.href = `../crudtransaksi/edittransaksi.html?id=${id}`;
});

// ======================
// INIT
// ======================

loadDashboard();
