const express = require("express");
const router = express.Router();

const supabase = require("../services/db");

const {
  decideNeedDatabase,
  answerNormal,
  answerWithDatabase,
} = require("../services/ai");

router.post("/chat", async (req, res) => {
  try {
    const { message } = req.body || {};

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: "Message is required",
      });
    }

    const decision = await decideNeedDatabase(message);

    if (!decision.needDatabase) {
      const answer = await answerNormal(message);

      return res.json({
        success: true,
        source: "gpt",
        answer,
      });
    }

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

    if (error) {
      throw error;
    }

    const answer = await answerWithDatabase(message, data || []);

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
