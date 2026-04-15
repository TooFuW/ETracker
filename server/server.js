require("dotenv").config();
const express = require("express");
const Database = require("better-sqlite3");
const { randomUUID } = require("crypto");
const { readFileSync } = require("fs");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const app = express();

// Headers de sécurité HTTP
app.use(helmet());

// Limite la taille des corps de requête à 10 Ko
app.use(express.json({ limit: "10kb" }));

// Limite globale : 200 req / 15 min par IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Trop de requêtes, réessayez plus tard." },
});
app.use(globalLimiter);

// Limite spécifique au pixel public : 30 req / 15 min par IP
const pixelLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Trop de requêtes." },
});

// Vérification de la clé API pour les routes d'administration
const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  console.error("ERREUR : la variable d'environnement API_KEY est obligatoire.");
  process.exit(1);
}

function requireApiKey(req, res, next) {
  const key = req.headers["x-api-key"];
  if (!key || key !== API_KEY) {
    return res.status(401).json({ error: "Non autorisé." });
  }
  next();
}

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

// Chargement du pixel par le destinataire (public)
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

// Toutes les données pour le dashboard (protégé)
app.get("/pixels", requireApiKey, (req, res) => {
  const pixels = db.prepare("SELECT * FROM pixels ORDER BY created_at DESC").all();
  res.json(pixels);
});

// Créer un nouveau pixel (protégé)
app.post("/pixels", requireApiKey, (req, res) => {
  if (!req.body) return res.status(400).json({ error: "Body JSON requis (Content-Type: application/json)" });
  const { label } = req.body;
  if (!label || typeof label !== "string") return res.status(400).json({ error: "label requis" });
  if (label.length > 200) return res.status(400).json({ error: "label trop long (max 200 caractères)" });

  const id = randomUUID();
  db.prepare(`
    INSERT INTO pixels (id, label, created_at) VALUES (?, ?, ?)
  `).run(id, label.trim(), new Date().toISOString());

  res.json({ id, url: `http://TON_DOMAINE/pixel/${id}` });
});

// Supprimer un pixel (protégé)
app.delete("/pixels/:id", requireApiKey, (req, res) => {
  db.prepare("DELETE FROM pixels WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

app.listen(3000, () => console.log("Serveur sur http://localhost:3000"));