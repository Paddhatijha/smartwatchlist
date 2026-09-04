import { Router } from "express";
import { v4 as uuid } from "uuid";
import db from "../db.js";
import { authMiddleware } from "../auth.js";
import { evaluateSymbol, upsertLastSeen } from "../significanceEngine.js";

const router = Router();
router.use(authMiddleware);

// GET /api/watchlist  -> full watchlist with significance evaluation batched
router.get("/", (req, res) => {
  const user = db.prepare("SELECT persona FROM users WHERE id = ?").get(req.userId);
  const items = db
    .prepare(
      `SELECT wi.*, s.name, s.sector FROM watchlist_items wi
       JOIN symbols s ON s.symbol = wi.symbol
       WHERE wi.user_id = ?
       ORDER BY wi.is_favorite DESC, wi.group_name, wi.added_at`
    )
    .all(req.userId);

  // Batch-evaluate significance for every held symbol in one pass
  // (avoids N+1 style per-symbol round trips from the frontend)
  const enriched = items.map((item) => {
    const sig = evaluateSymbol(req.userId, item.symbol, user?.persona || "casual");
    return {
      id: item.id,
      symbol: item.symbol,
      name: item.name,
      sector: item.sector,
      isFavorite: !!item.is_favorite,
      group: item.group_name,
      priceTarget: item.price_target,
      note: item.note,
      ...sig,
    };
  });

  res.json({ persona: user?.persona || "casual", items: enriched });
});

// POST /api/watchlist  { symbol, group } -> add symbol
router.post("/", (req, res) => {
  const { symbol, group } = req.body;
  const sym = db.prepare("SELECT symbol FROM symbols WHERE symbol = ?").get(symbol);
  if (!sym) return res.status(404).json({ error: "Unknown symbol" });

  const id = uuid();
  try {
    db.prepare(
      "INSERT INTO watchlist_items (id, user_id, symbol, group_name) VALUES (?,?,?,?)"
    ).run(id, req.userId, symbol, group || "My Watchlist");
  } catch {
    return res.status(409).json({ error: "Already in watchlist" });
  }
  res.json({ id });
});

// DELETE /api/watchlist/:symbol
router.delete("/:symbol", (req, res) => {
  db.prepare("DELETE FROM watchlist_items WHERE user_id = ? AND symbol = ?").run(
    req.userId,
    req.params.symbol
  );
  res.json({ ok: true });
});

// PATCH /api/watchlist/:symbol  { isFavorite?, group?, priceTarget?, note? }  (features 1, 7)
router.patch("/:symbol", (req, res) => {
  const { isFavorite, group, priceTarget, note } = req.body;
  const row = db
    .prepare("SELECT * FROM watchlist_items WHERE user_id = ? AND symbol = ?")
    .get(req.userId, req.params.symbol);
  if (!row) return res.status(404).json({ error: "Not in watchlist" });

  db.prepare(
    `UPDATE watchlist_items SET
      is_favorite = COALESCE(?, is_favorite),
      group_name = COALESCE(?, group_name),
      price_target = COALESCE(?, price_target),
      note = COALESCE(?, note)
     WHERE id = ?`
  ).run(
    typeof isFavorite === "boolean" ? (isFavorite ? 1 : 0) : null,
    group ?? null,
    priceTarget ?? null,
    note ?? null,
    row.id
  );
  res.json({ ok: true });
});

// POST /api/watchlist/mark-seen  { symbols: [] } -> updates "since last check" baseline
router.post("/mark-seen", (req, res) => {
  const { symbols } = req.body;
  if (!Array.isArray(symbols)) return res.status(400).json({ error: "symbols[] required" });

  const latest = db.prepare(
    "SELECT price FROM price_ticks WHERE symbol = ? ORDER BY id DESC LIMIT 1"
  );
  db.exec("BEGIN");
  try {
    for (const symbol of symbols) {
      const p = latest.get(symbol);
      if (p) upsertLastSeen.run(req.userId, symbol, p.price);
    }
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
  res.json({ ok: true });
});

export default router;
