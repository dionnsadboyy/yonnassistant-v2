const express = require("express");
const router = express.Router();

const supabase = require("../services/db");
const {
  answerNormal,
  answerWithDatabase,
  decideNeedDatabase,
} = require("../services/ai");

const FINANCE_KEYWORDS = [
  "uang",
  "saldo",
  "pengeluaran",
  "pemasukan",
  "transaksi",
  "budget",
  "anggaran",
  "dompet",
  "wallet",
  "laporan",
  "bulan",
  "minggu",
  "cashflow",
  "keuangan",
  "boros",
  "hutang",
  "utang",
  "tabungan",
  "gaji",
  "nominal",
  "nominalnya",
  "nominal gue",
  "nominal gua",
];

function hasFinanceKeyword(message) {
  const lower = String(message || "").toLowerCase();
  return FINANCE_KEYWORDS.some((keyword) => lower.includes(keyword));
}

async function loadUserMemory() {
  try {
    const { data, error } = await supabase
      .from("user_memory")
      .select(
        "id, category, title, content, icon, pinned, created_at, updated_at",
      )
      .order("pinned", { ascending: false })
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("LOAD MEMORY ERROR:", error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error("LOAD MEMORY EXCEPTION:", err);
    return [];
  }
}

router.post("/chat", async (req, res) => {
  console.time("TOTAL_REQUEST");

  try {
    // const { message } = req.body || {};
    const { message, history = [] } = req.body || {};
    const cleanMessage = String(message || "").trim();

    if (!cleanMessage) {
      return res.status(400).json({
        success: false,
        error: "Message is required",
      });
    }

    const memoryPromise = loadUserMemory();

    let needDatabase = hasFinanceKeyword(cleanMessage);

    if (!needDatabase) {
      try {
        const decision = await decideNeedDatabase(cleanMessage);
        needDatabase = Boolean(decision?.needDatabase);
      } catch (err) {
        console.error("DECIDE DB ERROR:", err);
      }
    }

    const memories = await memoryPromise;

    if (!needDatabase) {
      console.time("NORMAL_AI");

      const answer = await answerNormal(cleanMessage, memories, history);

      console.timeEnd("NORMAL_AI");
      console.timeEnd("TOTAL_REQUEST");

      return res.json({
        success: true,
        source: "gpt",
        answer,
      });
    }

    console.time("SUPABASE");

    const { data, error } = await supabase
      .from("transactions")
      .select(
        `
        *,
        categories(name),
        wallets(name)
      `,
      )
      .order("transaction_date", {
        ascending: false,
      })
      .limit(50);

    console.timeEnd("SUPABASE");

    if (error) {
      throw error;
    }

    console.time("DATABASE_AI");

    const answer = await answerWithDatabase(
      cleanMessage,
      data || [],
      memories,
      history,
    );

    console.timeEnd("DATABASE_AI");
    console.timeEnd("TOTAL_REQUEST");

    return res.json({
      success: true,
      source: "database",
      answer,
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,
      error: err.message || "Internal Server Error",
    });
  }
});

module.exports = router;
