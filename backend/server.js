const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
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

// sementara matikan dulu buat isolasi
app.use("/api/ai", require("./routes/ai"));

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 YonnGPT running on port ${PORT}`);
});
