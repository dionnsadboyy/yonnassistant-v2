const express = require("express");
require("dotenv").config();
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    status: "YonnGPT Backend Online",
    version: "2.0",
  });
});
app.use("/api/ai", require("./routes/ai"));
app.listen(3000, () => {
  console.log("🚀 YonnGPT running on port 3000");
});
