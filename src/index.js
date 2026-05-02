require("dotenv").config();
const express = require("express");
const { Pool } = require("pg");

const app = express();
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

app.get("/", (req, res) => {
  res.json({ service: "matching-service", status: "running", matching: true });
});

async function findMatches(item) {
  const oppositeType = item.type === "lost" ? "found" : "lost";

  const result = await pool.query(
    `SELECT * FROM items
     WHERE type = $1
       AND category = $2
       AND id != $3
     ORDER BY created_at DESC
     LIMIT 5`,
    [oppositeType, item.category, item.id]
  );

  return result.rows;
}

async function processMatch(item) {
  const matches = await findMatches(item);

  if (matches.length === 0) {
    console.log("No matches found for item:", item.id);
    return { matches: [] };
  }

  for (const match of matches) {
    await fetch(`${process.env.NOTIFICATION_URL}/notify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: item.contact,
        subject: "Possible Lost & Found Match",
        message: `We found a possible match for your ${item.type} item: ${item.title}.
Matched item: ${match.title}
Location: ${match.location}
Contact: ${match.contact}`,
        match
      })
    });
  }

  return { matches };
}

app.post("/match", async (req, res) => {
  const result = await processMatch(req.body);
  res.json({ message: "Matching completed", result });
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