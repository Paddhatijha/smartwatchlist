import { Router } from "express";
import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";
import db from "../db.js";
import { signToken, authMiddleware } from "../auth.js";

const router = Router();

router.post("/signup", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password || password.length < 6) {
    return res.status(400).json({ error: "Valid email and 6+ char password required" });
  }
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) return res.status(409).json({ error: "Account already exists" });

  const id = uuid();
  const hash = await bcrypt.hash(password, 10);
  db.prepare("INSERT INTO users (id, email, password_hash) VALUES (?,?,?)").run(
    id,
    email,
    hash
  );
  const user = { id, email };
  res.json({ token: signToken(user), user: { id, email, persona: "casual", darkMode: false } });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const row = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (!row) return res.status(401).json({ error: "Invalid credentials" });
  const ok = await bcrypt.compare(password, row.password_hash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });
  res.json({
    token: signToken(row),
    user: {
      id: row.id,
      email: row.email,
      persona: row.persona,
      darkMode: !!row.dark_mode,
    },
  });
});

router.get("/me", authMiddleware, (req, res) => {
  const row = db.prepare("SELECT id, email, persona, dark_mode FROM users WHERE id = ?").get(
    req.userId
  );
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json({ id: row.id, email: row.email, persona: row.persona, darkMode: !!row.dark_mode });
});

router.patch("/preferences", authMiddleware, (req, res) => {
  const { persona, darkMode } = req.body;
  if (persona) {
    db.prepare("UPDATE users SET persona = ? WHERE id = ?").run(persona, req.userId);
  }
  if (typeof darkMode === "boolean") {
    db.prepare("UPDATE users SET dark_mode = ? WHERE id = ?").run(darkMode ? 1 : 0, req.userId);
  }
  res.json({ ok: true });
});

export default router;
