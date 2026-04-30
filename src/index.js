require("dotenv").config();
const express = require("express");

const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ service: "matching-service", status: "running", eventDriven: true });
});

async function processMatch(item) {
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

  return matchResult;
}

app.post("/match", async (req, res) => {
  const result = await processMatch(req.body);
  res.json({ message: "Matching completed using REST", result });
});

app.post("/events/item-created", async (req, res) => {
  try {
    const pubsubMessage = req.body.message;

    const data = Buffer.from(pubsubMessage.data, "base64").toString();
    const item = JSON.parse(data);

    const result = await processMatch(item);

    console.log("Processed Pub/Sub item-created event:", result);

    res.status(204).send();
  } catch (error) {
    console.error("Failed to process Pub/Sub event:", error);
    res.status(500).send("Failed to process event");
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Matching service running on port ${PORT}`));
