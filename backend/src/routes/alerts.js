import { Router } from "express";
import { v4 as uuid } from "uuid";
import db from "../db.js";
import { authMiddleware } from "../auth.js";

const router = Router();
router.use(authMiddleware);

// GET /api/alerts -> configured alerts + recent log
router.get("/", (req, res) => {
  const alerts = db.prepare("SELECT * FROM alerts WHERE user_id = ?").all(req.userId);
  const log = db
    .prepare("SELECT * FROM alert_log WHERE user_id = ? ORDER BY id DESC LIMIT 20")
    .all(req.userId);
  res.json({ alerts, log });
});

// POST /api/alerts { symbol } -> enable alert for symbol
router.post("/", (req, res) => {
  const { symbol } = req.body;
  const id = uuid();
  try {
    db.prepare("INSERT INTO alerts (id, user_id, symbol) VALUES (?,?,?)").run(
      id,
      req.userId,
      symbol
    );
  } catch {
    return res.status(409).json({ error: "Alert already exists for symbol" });
  }
  res.json({ id });
});

// DELETE /api/alerts/:symbol
router.delete("/:symbol", (req, res) => {
  db.prepare("DELETE FROM alerts WHERE user_id = ? AND symbol = ?").run(
    req.userId,
    req.params.symbol
  );
  res.json({ ok: true });
});

export default router;
