require("dotenv").config();
const express = require("express");
const cors = require("cors");
const Database = require("better-sqlite3");
const { randomUUID } = require("crypto");
const { readFileSync } = require("fs");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const app = express();

// Security headers
app.use(helmet());

// Allow requests from Chrome extensions
app.use(cors({
  origin: /^chrome-extension:\/\//,
}));

// Limit request body size to 10KB
app.use(express.json({ limit: "10kb" }));

// Global rate limit: 200 requests per 15 minutes per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, try again later." },
});
app.use(globalLimiter);

// Specific rate limit for public pixel: 30 requests per 15 minutes per IP
const pixelLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests." },
});

// Server domain
const SERVER_DOMAIN = process.env.SERVER_DOMAIN;
if (!SERVER_DOMAIN) {
  console.error("ERROR : the SERVER_DOMAIN environment variable is required.");
  process.exit(1);
}

// API key verification for admin routes
const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  console.error("ERROR : the API_KEY environment variable is required.");
  process.exit(1);
}

// API key verification function
function requireApiKey(req, res, next) {
  const key = req.headers["x-api-key"];
  if (!key || key !== API_KEY) {
    return res.status(401).json({ error: "Unauthorized." });
  }
  next();
}

// DB initialization
const db = new Database("pixels.db");
db.exec(`
  CREATE TABLE IF NOT EXISTS pixels (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    created_at TEXT NOT NULL,
    read_count INTEGER DEFAULT 0,
    last_read_at TEXT
  )
`);

const PIXEL = readFileSync("./pixel.gif");

// Pixel loading by recipient (public)
app.get("/pixel/:id", pixelLimiter, (req, res) => {
  const { id } = req.params;

  const pixel = db.prepare("SELECT * FROM pixels WHERE id = ?").get(id);

  if (pixel) {
    db.prepare(`
      UPDATE pixels
      SET read_count = read_count + 1, last_read_at = ?
      WHERE id = ?
    `).run(new Date().toISOString(), id);
  }

  res.set("Content-Type", "image/gif");
  res.set("Cache-Control", "no-store, no-cache, must-revalidate");
  res.send(PIXEL);
});

// All data for the dashboard (protected)
app.get("/pixels", requireApiKey, (req, res) => {
  const pixels = db.prepare("SELECT * FROM pixels ORDER BY created_at DESC").all();
  res.json(pixels);
});

// Create a new pixel (protected)
app.post("/pixels", requireApiKey, (req, res) => {
  if (!req.body) return res.status(400).json({ error: "Body JSON required (Content-Type: application/json)" });
  const { label } = req.body;
  if (!label || typeof label !== "string") return res.status(400).json({ error: "label required" });
  if (label.length > 200) return res.status(400).json({ error: "label too long (max 200 characters)" });

  const id = randomUUID();
  db.prepare(`
    INSERT INTO pixels (id, label, created_at) VALUES (?, ?, ?)
  `).run(id, label.trim(), new Date().toISOString());

  res.json({ id, url: `${SERVER_DOMAIN}/pixel/${id}` });
});

// Delete a pixel (protected)
app.delete("/pixels/:id", requireApiKey, (req, res) => {
  db.prepare("DELETE FROM pixels WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

app.listen(3000, () => console.log(`Serveur on ${SERVER_DOMAIN}`));