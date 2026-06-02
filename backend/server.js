const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.set("trust proxy", 1);

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

app.use(
  cors({
    origin: [
      "https://yonnassistant-v1.vercel.app",
      "http://127.0.0.1:5501",
      "http://localhost:5501",
      "http://127.0.0.1:5500",
      "http://localhost:5500",
    ],
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.options("*", cors());
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

// sementara test dulu sampai /ping 200
// app.use("/api/ai", require("./routes/ai"));

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 YonnGPT running on port ${PORT}`);
});
