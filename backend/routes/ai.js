const express = require("express");
const router = express.Router();

const supabase = require("../services/db");

const { answerNormal, answerWithDatabase } = require("../services/ai");

router.post("/chat", async (req, res) => {
  console.time("TOTAL_REQUEST");

  try {
    const { message } = req.body || {};

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: "Message is required",
      });
    }

    const dbKeywords = [
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
      "tabungan",
    ];

    const needDatabase = dbKeywords.some((keyword) =>
      message.toLowerCase().includes(keyword),
    );

    if (!needDatabase) {
      console.time("NORMAL_AI");

      const answer = await answerNormal(message);

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
      .limit(500);

    console.timeEnd("SUPABASE");

    if (error) {
      throw error;
    }

    console.time("DATABASE_AI");

    const answer = await answerWithDatabase(message, data || []);

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
