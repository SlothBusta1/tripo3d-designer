const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 3001;
const TRIPO_BASE = "https://api.tripo3d.ai/v2/openapi";

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json({ limit: "20mb" }));

function tripoHeaders() {
  const key = process.env.TRIPO_API_KEY;
  if (!key) throw new Error("TRIPO_API_KEY not configured");
  return {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

// POST /api/tripo/task — create a new generation task
app.post("/api/tripo/task", async (req, res) => {
  try {
    const upstream = await fetch(`${TRIPO_BASE}/task`, {
      method: "POST",
      headers: tripoHeaders(),
      body: JSON.stringify(req.body),
    });
    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (err) {
    console.error("POST /task error:", err.message);
    const status = err.message.includes("not configured") ? 500 : 502;
    res.status(status).json({ error: err.message });
  }
});

// GET /api/tripo/task/:id — poll task status
app.get("/api/tripo/task/:id", async (req, res) => {
  try {
    const upstream = await fetch(`${TRIPO_BASE}/task/${req.params.id}`, {
      headers: tripoHeaders(),
    });
    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (err) {
    console.error("GET /task/:id error:", err.message);
    const status = err.message.includes("not configured") ? 500 : 502;
    res.status(status).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Tripo3D proxy → http://localhost:${PORT}`);
});
