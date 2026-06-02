const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(
  cors({
    origin: [
      "https://yonnassistant-v1.vercel.app",
      "http://localhost:5500",
      "http://127.0.0.1:5500",
      "http://localhost:5501",
      "http://127.0.0.1:5501",
    ],
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    status: "YonnGPT Backend Online",
    version: "2.0",
  });
});

app.get("/ping", (req, res) => {
  res.json({
    success: true,
    message: "pong",
  });
});

app.use("/api/ai", require("./routes/ai"));

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 YonnGPT running on port ${PORT}`);
});
