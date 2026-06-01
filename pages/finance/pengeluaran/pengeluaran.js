console.log("PENGELUARAN READY 🔥");

const overviewTotal = document.getElementById("overviewTotal");
const donutChart = document.getElementById("donutChart");
const donutLabel = document.getElementById("donutLabel");
const donutAmount = document.getElementById("donutAmount");
const avgPill = document.getElementById("avgPill");

const segmentCategory = document.getElementById("segmentCategory");
const segmentAccount = document.getElementById("segmentAccount");
const segmentMerchant = document.getElementById("segmentMerchant");

const legendRow = document.getElementById("legendRow");
const groupList = document.getElementById("groupList");

const detailOverlay = document.getElementById("detailOverlay");
const detailTitle = document.getElementById("detailTitle");
const detailSub = document.getElementById("detailSub");
const detailTotal = document.getElementById("detailTotal");
const detailCount = document.getElementById("detailCount");
const detailList = document.getElementById("detailList");
const closeDetailBtn = document.getElementById("closeDetailBtn");

const categoryIcons = {
  Pinjaman: "🏦",
  Investasi: "📈",
  "Pengeluaran Keuangan Lainnya": "🧺",
  "Makanan & minuman": "🍲",
  Shopping: "🛍️",
  Transportasi: "🚌",
  "Kebutuhan rumah": "🏠",
  "Lain-lain": "…",
};

const walletIcons = {
  Cash: "💵",
  Jago: "🏦",
  Tabungan: "💰",
  Buffer: "🛡️",
  Utility: "⚡",
};

const colorPalette = [
  "#C85B4A",
  "#F2A01C",
  "#8E44AD",
  "#FB923C",
  "#4B2A1A",
  "#2563EB",
  "#22C55E",
  "#B9BBC5",
  "#D66A5A",
  "#7C4DFF",
];

const state = {
  mode: "category",
  transactions: [],
  selectedGroup: null,
};

function rupiah(value) {
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

function normalizeLabel(text) {
  return String(text || "")
    .trim()
    .replace(/\s+/g, " ");
}

function guessIcon(text) {
  const t = normalizeLabel(text).toLowerCase();

  if (t.includes("kopi") || t.includes("coffee")) return "☕";
  if (
    t.includes("makan") ||
    t.includes("soto") ||
    t.includes("mie") ||
    t.includes("nasi") ||
    t.includes("goreng") ||
    t.includes("bubur") ||
    t.includes("warteg") ||
    t.includes("ayam")
  )
    return "🍜";
  if (t.includes("rokok")) return "🚬";
  if (
    t.includes("alkohol") ||
    t.includes("mabuk") ||
    t.includes("beer") ||
    t.includes("bir")
  )
    return "🍺";
  if (
    t.includes("parkir") ||
    t.includes("bensin") ||
    t.includes("motor") ||
    t.includes("cuci")
  )
    return "🚗";
  if (t.includes("skincare") || t.includes("cream") || t.includes("serum"))
    return "🧴";
  if (
    t.includes("rumah") ||
    t.includes("gas") ||
    t.includes("tali") ||
    t.includes("jepitan") ||
    t.includes("meja")
  )
    return "🏠";
  if (t.includes("hutang") || t.includes("utang") || t.includes("pinjam"))
    return "💳";
  if (t.includes("invest")) return "📈";
  if (t.includes("transfer") || t.includes("cashflow")) return "↔️";
  return "🧾";
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

function getModeLabel(mode) {
  if (mode === "account") return "akun";
  if (mode === "merchant") return "merchant";
  return "kategori";
}

function getGroupLabel(item, mode) {
  if (mode === "account") {
    return normalizeLabel(item.wallets?.name) || "Tanpa akun";
  }

  if (mode === "merchant") {
    return normalizeLabel(item.note) || "Tanpa catatan";
  }

  return normalizeLabel(item.categories?.name) || "Lainnya";
}

function getGroupMeta(item, mode) {
  if (mode === "category")
    return normalizeLabel(item.wallets?.name) || "Tanpa akun";
  if (mode === "account")
    return normalizeLabel(item.categories?.name) || "Tanpa kategori";
  return normalizeLabel(item.wallets?.name) || "Tanpa akun";
}

function getGroupIcon(mode, label) {
  if (mode === "category") return categoryIcons[label] || guessIcon(label);
  if (mode === "account") return walletIcons[label] || "🏦";
  return guessIcon(label);
}

function groupExpenses(rows, mode) {
  const map = new Map();

  rows.forEach((item) => {
    const label = getGroupLabel(item, mode);

    if (!map.has(label)) {
      map.set(label, {
        label,
        meta: getGroupMeta(item, mode),
        total: 0,
        count: 0,
        icon: getGroupIcon(mode, label),
        items: [],
      });
    }

    const group = map.get(label);
    group.total += Number(item.amount || 0);
    group.count += 1;
    group.items.push(item);
  });

  return [...map.values()].sort((a, b) => b.total - a.total);
}

function buildDonutGradient(groups, total) {
  if (!groups.length || total <= 0) {
    return "conic-gradient(#E9ECF5 0 100%)";
  }

  const topGroups = groups.slice(0, 7);
  let start = 0;
  const segments = [];

  topGroups.forEach((group, index) => {
    const percent = (group.total / total) * 100;
    const end = start + percent;
    const color = colorPalette[index % colorPalette.length];
    segments.push(`${color} ${start}% ${end}%`);
    start = end;
  });

  if (start < 100) {
    segments.push(`#E9ECF5 ${start}% 100%`);
  }

  return `conic-gradient(${segments.join(",")})`;
}

function renderAveragePill(expenses, totalExpense) {
  const monthlyTotals = new Map();

  expenses.forEach((item) => {
    const monthKey = item.transaction_date?.slice(0, 7) || "unknown";
    monthlyTotals.set(
      monthKey,
      (monthlyTotals.get(monthKey) || 0) + Number(item.amount || 0),
    );
  });

  const monthCount = monthlyTotals.size || 1;
  const avgMonthly = totalExpense / monthCount;

  avgPill.textContent = `Avg ${monthCount} bulan terakhir ${rupiah(avgMonthly)}`;
}

function renderLegend(groups) {
  const chips = groups.slice(0, 8).map((group, index) => {
    const color = colorPalette[index % colorPalette.length];
    return `
      <span class="legend-chip">
        <i class="dot" style="background:${color}"></i>
        ${safeText(group.label)}
      </span>
    `;
  });

  legendRow.innerHTML = chips.join("");
}

function renderOverview(expenses, groups, totalExpense) {
  overviewTotal.textContent = rupiah(totalExpense);
  donutAmount.textContent = rupiah(totalExpense);
  donutLabel.textContent = `Pengeluaran ${getModeLabel(state.mode)}`;

  donutChart.style.background = buildDonutGradient(groups, totalExpense);

  renderAveragePill(expenses, totalExpense);

  const topGroup = groups[0];
  const topLabel = topGroup ? topGroup.label : "belum ada data";
  const summaryText = document.querySelector(".summary-text");

  if (!expenses.length) {
    summaryText.textContent = "Belum ada pengeluaran pada data ini.";
    return;
  }

  summaryText.textContent = `Total pengeluaran kamu ${rupiah(totalExpense)} dari ${expenses.length} transaksi. Yang paling besar ada di ${getModeLabel(state.mode)} ${topLabel}.`;
}

function renderGroupList(groups, totalExpense) {
  if (!groups.length) {
    groupList.innerHTML = `
      <div class="empty-state">
        Belum ada data pengeluaran.
      </div>
    `;
    return;
  }

  groupList.innerHTML = groups
    .map((group, index) => {
      const color = colorPalette[index % colorPalette.length];
      const percent =
        totalExpense > 0 ? Math.round((group.total / totalExpense) * 100) : 0;

      return `
        <article class="category-card" style="--card-accent:${color}" data-index="${index}">
          <div class="category-icon">${group.icon}</div>

          <div class="category-copy">
            <h2>${safeText(group.label)}</h2>
            <p><span>${percent}%</span> · ${rupiah(group.total)}</p>
            <small>${safeText(group.meta)} · ${group.count} transaksi</small>
          </div>

          <div class="category-arrow">›</div>
        </article>
      `;
    })
    .join("");

  groupList.querySelectorAll(".category-card").forEach((cardEl) => {
    cardEl.addEventListener("click", () => {
      const index = Number(cardEl.dataset.index);
      openDetail(groups[index]);
    });
  });
}

function renderView() {
  const expenses = state.transactions.filter((item) => item.type === "expense");
  const groups = groupExpenses(expenses, state.mode);
  const totalExpense = expenses.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0,
  );

  renderOverview(expenses, groups, totalExpense);
  renderLegend(groups);
  renderGroupList(groups, totalExpense);
}

function openDetail(group) {
  if (!group) return;

  state.selectedGroup = group;

  detailTitle.textContent = group.label;
  detailSub.textContent = `${group.meta} • ${group.count} transaksi`;
  detailTotal.textContent = rupiah(group.total);
  detailCount.textContent = String(group.count);

  detailList.innerHTML = group.items
    .map((item) => {
      const dateLabel = formatDateLabel(item.transaction_date);
      const walletName = item.wallets?.name || "-";
      const note = item.note || "-";
      const categoryName = item.categories?.name || "-";

      return `
        <article class="detail-item">
          <div class="detail-item-top">
            <div>
              <div class="detail-item-title">${safeText(categoryName)}</div>
              <div class="detail-item-meta">${safeText(walletName)} • ${safeText(dateLabel)}</div>
              <div class="detail-item-note">${safeText(note)}</div>
            </div>

            <div class="detail-item-amount expense">
              - ${rupiah(item.amount)}
            </div>
          </div>
        </article>
      `;
    })
    .join("");

  detailOverlay.classList.remove("hidden");
}

function closeDetail() {
  detailOverlay.classList.add("hidden");
  state.selectedGroup = null;
}

function setActiveMode(mode) {
  state.mode = mode;

  segmentCategory.classList.toggle("active", mode === "category");
  segmentAccount.classList.toggle("active", mode === "account");
  segmentMerchant.classList.toggle("active", mode === "merchant");

  renderView();
}

async function loadExpenseDashboard() {
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
      document.querySelector(".summary-text").textContent =
        "Gagal memuat data pengeluaran.";
      return;
    }

    state.transactions = Array.isArray(data) ? data : [];
    renderView();

    console.log("PENGELUARAN LOADED ✅", state.transactions.length);
  } catch (err) {
    console.error(err);
    document.querySelector(".summary-text").textContent =
      "Terjadi error saat memuat data.";
  }
}

segmentCategory.addEventListener("click", () => setActiveMode("category"));
segmentAccount.addEventListener("click", () => setActiveMode("account"));
segmentMerchant.addEventListener("click", () => setActiveMode("merchant"));

closeDetailBtn.addEventListener("click", closeDetail);

detailOverlay.addEventListener("click", (event) => {
  if (event.target === detailOverlay) {
    closeDetail();
  }
});

loadExpenseDashboard();
