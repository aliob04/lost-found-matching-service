require("dotenv").config();
const express = require("express");

const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ service: "matching-service", status: "running" });
});

app.post("/match", async (req, res) => {
  const item = req.body;

  const matchResult = {
    possibleMatch: true,
    confidence: "medium",
    matchedCategory: item.category || "unknown",
    item
  };

  await fetch(`${process.env.NOTIFICATION_URL}/notify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(matchResult)
  });

  res.json({
    message: "Matching completed",
    result: matchResult
  });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Matching service running on port ${PORT}`));
