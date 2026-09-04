import db from "./db.js";

// Persona thresholds: how big a % move (or z-score) must be before we call
// it "meaningful" for that kind of user.
const PERSONA_CONFIG = {
  casual: { pctThreshold: 3.0, windowMinutes: 24 * 60, label: "Casual Investor" },
  trader: { pctThreshold: 0.5, windowMinutes: 15, label: "Active Trader" },
  accessible: { pctThreshold: 2.0, windowMinutes: 60, label: "Accessibility-first" },
};

const getHistory = db.prepare(
  `SELECT price, ts, status FROM price_ticks
   WHERE symbol = ? AND ts >= datetime('now', ?)
   ORDER BY id ASC`
);

const getLastSeen = db.prepare(
  "SELECT last_price, last_seen_at FROM user_last_seen WHERE user_id = ? AND symbol = ?"
);

function stdev(values) {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((a, b) => a + (b - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

/**
 * Evaluates "meaningfulness" of the move since the user last checked this
 * symbol, calibrated to their persona.
 */
export function evaluateSymbol(userId, symbol, persona = "casual") {
  const cfg = PERSONA_CONFIG[persona] || PERSONA_CONFIG.casual;
  const rows = getHistory.all(symbol, `-${cfg.windowMinutes} minutes`);
  if (rows.length === 0) return null;

  const latest = rows[rows.length - 1];
  const prices = rows.map((r) => r.price);
  const sd = stdev(prices);
  const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
  const zScore = sd > 0 ? (latest.price - mean) / sd : 0;

  const lastSeen = getLastSeen.get(userId, symbol);
  const referencePrice = lastSeen ? lastSeen.last_price : rows[0].price;
  const pctChange = referencePrice
    ? ((latest.price - referencePrice) / referencePrice) * 100
    : 0;

  const isStale = latest.status === "stale" || rows.slice(-3).every((r) => r.status === "stale");
  const hasConflict = rows.slice(-5).some((r) => r.status === "conflicting");

  const meaningful =
    Math.abs(pctChange) >= cfg.pctThreshold || Math.abs(zScore) >= 2;

  return {
    symbol,
    price: latest.price,
    pctChangeSinceLastCheck: Math.round(pctChange * 100) / 100,
    zScore: Math.round(zScore * 100) / 100,
    meaningful,
    isNew: !lastSeen,
    dataStatus: hasConflict ? "conflicting" : isStale ? "stale" : "fresh",
    personaLabel: cfg.label,
    thresholdUsed: cfg.pctThreshold,
    lastSeenAt: lastSeen?.last_seen_at ?? null,
    updatedAt: latest.ts,
  };
}

export const upsertLastSeen = db.prepare(`
  INSERT INTO user_last_seen (user_id, symbol, last_price, last_seen_at)
  VALUES (?, ?, ?, datetime('now'))
  ON CONFLICT(user_id, symbol) DO UPDATE SET
    last_price = excluded.last_price,
    last_seen_at = excluded.last_seen_at
`);

export { PERSONA_CONFIG };
