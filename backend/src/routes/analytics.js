import { Router } from "express";
import db from "../db.js";
import { authMiddleware } from "../auth.js";

const router = Router();
router.use(authMiddleware);

// GET /api/analytics/compare?symbols=TCS,INFY,WIPR  (feature 14)
router.get("/compare", (req, res) => {
  const symbols = (req.query.symbols || "").split(",").filter(Boolean).slice(0, 3);
  if (symbols.length < 2) {
    return res.status(400).json({ error: "Provide 2-3 symbols to compare" });
  }

  const result = symbols.map((symbol) => {
    const rows = db
      .prepare(
        `SELECT price, ts FROM price_ticks
         WHERE symbol = ? AND ts >= datetime('now', '-24 hours')
         ORDER BY id ASC`
      )
      .all(symbol);
    if (rows.length === 0) return { symbol, series: [], changePct: 0 };
    const first = rows[0].price;
    const last = rows[rows.length - 1].price;
    return {
      symbol,
      series: rows.map((r) => ({ ts: r.ts, price: r.price })),
      changePct: Math.round(((last - first) / first) * 10000) / 100,
      latest: last,
    };
  });

  res.json({ symbols, result });
});

// GET /api/analytics/performance?symbol=TCS  (feature 16: vs benchmark index)
router.get("/performance", (req, res) => {
  const symbol = req.query.symbol;
  if (!symbol) return res.status(400).json({ error: "symbol required" });

  const stockRows = db
    .prepare(
      `SELECT price, ts FROM price_ticks
       WHERE symbol = ? AND ts >= datetime('now', '-24 hours')
       ORDER BY id ASC`
    )
    .all(symbol);
  const benchRows = db
    .prepare(
      `SELECT value, ts FROM benchmark_ticks
       WHERE ts >= datetime('now', '-24 hours')
       ORDER BY id ASC`
    )
    .all();

  if (stockRows.length === 0 || benchRows.length === 0) {
    return res.json({ symbol, points: [] });
  }

  const stockBase = stockRows[0].price;
  const benchBase = benchRows[0].value;

  // Normalize both series to % change from period start so they're
  // comparable on the same chart regardless of absolute price/index level.
  const points = stockRows.map((row, i) => {
    const benchRow = benchRows[Math.min(i, benchRows.length - 1)];
    return {
      ts: row.ts,
      stockPct: Math.round(((row.price - stockBase) / stockBase) * 10000) / 100,
      benchmarkPct: Math.round(((benchRow.value - benchBase) / benchBase) * 10000) / 100,
    };
  });

  res.json({ symbol, benchmark: "NIFTY50", points });
});

export default router;
