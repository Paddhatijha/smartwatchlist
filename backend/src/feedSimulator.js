import db from "./db.js";

// Simulates a realistic feed: normal random-walk ticks, occasional spikes,
// occasional stale symbols (skip update), occasional conflicting duplicate
// ticks from a "second source" with a different price for the same instant.

const getLatest = db.prepare(
  "SELECT price FROM price_ticks WHERE symbol = ? ORDER BY id DESC LIMIT 1"
);
const insertTick = db.prepare(
  "INSERT INTO price_ticks (symbol, price, status, source) VALUES (?,?,?,?)"
);
const allSymbols = db.prepare("SELECT symbol FROM symbols").all();

function randn() {
  // Box-Muller for roughly normal noise
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function tickOnce() {
  for (const { symbol } of allSymbols) {
    const roll = Math.random();

    // ~8% chance a symbol goes "stale" this round (feed lags, no update)
    if (roll < 0.08) continue;

    const latest = getLatest.get(symbol);
    const base = latest ? latest.price : 100 + Math.random() * 900;

    // ~5% chance of a sharp spike (news event, earnings, etc.)
    const isSpike = Math.random() < 0.05;
    const drift = isSpike ? randn() * base * 0.06 : randn() * base * 0.004;
    let newPrice = Math.max(1, base + drift);
    newPrice = Math.round(newPrice * 100) / 100;

    insertTick.run(symbol, newPrice, "fresh", "feed-a");

    // ~4% chance a second source reports a conflicting price for the same
    // symbol at nearly the same time (out-of-order / conflicting data)
    if (Math.random() < 0.04) {
      const conflictPrice = Math.round((newPrice * (1 + (Math.random() - 0.5) * 0.02)) * 100) / 100;
      insertTick.run(symbol, conflictPrice, "conflicting", "feed-b");
    }
  }

  // Move the benchmark index a little too (for performance-vs-benchmark feature)
  const lastBench = db
    .prepare("SELECT value FROM benchmark_ticks ORDER BY id DESC LIMIT 1")
    .get();
  const newBench = Math.max(1, (lastBench?.value ?? 22000) + randn() * 15);
  db.prepare("INSERT INTO benchmark_ticks (index_name, value) VALUES ('NIFTY50', ?)").run(
    Math.round(newBench * 100) / 100
  );
}

export function startFeed(intervalMs = 4000) {
  tickOnce(); // prime immediately
  setInterval(tickOnce, intervalMs);
}
