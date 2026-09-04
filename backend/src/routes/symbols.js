import { Router } from "express";
import db from "../db.js";
import { authMiddleware } from "../auth.js";

const router = Router();
router.use(authMiddleware);

// GET /api/symbols/search?q=tc  -> autocomplete over symbol + name
router.get("/search", (req, res) => {
  const q = `%${(req.query.q || "").toLowerCase()}%`;
  const rows = db
    .prepare(
      `SELECT symbol, name, sector FROM symbols
       WHERE lower(symbol) LIKE ? OR lower(name) LIKE ?
       LIMIT 10`
    )
    .all(q, q);
  res.json({ results: rows });
});

export default router;
