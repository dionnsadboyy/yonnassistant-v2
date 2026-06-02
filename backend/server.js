app.options("*", cors());
const express = require("express");
require("dotenv").config();
const cors = require("cors");

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, "../")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../pages/home/home.html"));
});

app.use("/api/ai", require("./routes/ai"));

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 YonnGPT running on port ${PORT}`);
});
