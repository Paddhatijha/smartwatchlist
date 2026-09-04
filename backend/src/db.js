import { DatabaseSync } from "node:sqlite";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const db = new DatabaseSync(path.join(__dirname, "..", "watchlist.db"));

db.exec("PRAGMA journal_mode = WAL;");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    persona TEXT DEFAULT 'casual',
    dark_mode INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS symbols (
    symbol TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    sector TEXT DEFAULT 'General'
  );

  CREATE TABLE IF NOT EXISTS watchlist_items (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL REFERENCES symbols(symbol),
    is_favorite INTEGER DEFAULT 0,
    group_name TEXT DEFAULT 'My Watchlist',
    price_target REAL,
    note TEXT,
    added_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, symbol)
  );

  CREATE TABLE IF NOT EXISTS price_ticks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT NOT NULL,
    price REAL NOT NULL,
    ts TEXT DEFAULT (datetime('now')),
    status TEXT DEFAULT 'fresh',
    source TEXT DEFAULT 'feed-a'
  );

  CREATE TABLE IF NOT EXISTS user_last_seen (
    user_id TEXT NOT NULL,
    symbol TEXT NOT NULL,
    last_price REAL,
    last_seen_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, symbol)
  );

  CREATE TABLE IF NOT EXISTS alerts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    enabled INTEGER DEFAULT 1,
    channel TEXT DEFAULT 'email',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS alert_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    symbol TEXT NOT NULL,
    message TEXT,
    sent_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS benchmark_ticks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    index_name TEXT NOT NULL DEFAULT 'NIFTY50',
    value REAL NOT NULL,
    ts TEXT DEFAULT (datetime('now'))
  );
`);

// ============================================================
// STOCK SYMBOLS
// These symbols MUST match the symbols used in frontend/App.jsx
// ============================================================

const seedData = [
  ["RELIANCE", "Reliance Industries", "Energy"],
  ["TCS", "Tata Consultancy Services", "IT"],
  ["HDFCBANK", "HDFC Bank", "Banking"],
  ["INFY", "Infosys", "IT"],
  ["WIPRO", "Wipro", "IT"],
  ["BAJFINANCE", "Bajaj Finance", "NBFC"],
  ["SBIN", "State Bank of India", "Banking"],
  ["TATAMOTORS", "Tata Motors", "Auto"],
  ["ADANIENT", "Adani Enterprises", "Conglomerate"],
  ["MARUTI", "Maruti Suzuki", "Auto"],
  ["LTIM", "LTIMindtree", "IT"],
  ["AXISBANK", "Axis Bank", "Banking"],
  ["KOTAKBANK", "Kotak Mahindra Bank", "Banking"],
  ["ICICIBANK", "ICICI Bank", "Banking"],
  ["HINDUNILVR", "Hindustan Unilever", "FMCG"],
  ["NESTLEIND", "Nestle India", "FMCG"],
  ["TITAN", "Titan Company", "Consumer"],
  ["SUNPHARMA", "Sun Pharmaceutical", "Pharma"],
];

// ============================================================
// INITIAL PRICES
// ============================================================

const seedPrices = {
  RELIANCE: 2841.30,
  TCS: 3920.15,
  HDFCBANK: 1680.45,
  INFY: 1432.70,
  WIPRO: 478.25,
  BAJFINANCE: 7320.80,
  SBIN: 812.60,
  TATAMOTORS: 1042.35,
  ADANIENT: 3215.90,
  MARUTI: 12840.00,
  LTIM: 5620.40,
  AXISBANK: 1124.75,
  KOTAKBANK: 1876.30,
  ICICIBANK: 1124.60,
  HINDUNILVR: 2341.80,
  NESTLEIND: 24120.00,
  TITAN: 3456.70,
  SUNPHARMA: 1678.40,
};

// ============================================================
// INSERT MISSING SYMBOLS
// INSERT OR IGNORE is important because watchlist.db
// may already contain old symbols.
// ============================================================

const insertSymbol = db.prepare(`
  INSERT OR IGNORE INTO symbols
    (symbol, name, sector)
  VALUES (?, ?, ?)
`);

for (const row of seedData) {
  insertSymbol.run(...row);
}

// ============================================================
// INSERT INITIAL PRICE ONLY IF ONE DOES NOT EXIST
// ============================================================

const priceExists = db.prepare(`
  SELECT 1
  FROM price_ticks
  WHERE symbol = ?
  LIMIT 1
`);

const insertPrice = db.prepare(`
  INSERT INTO price_ticks
    (symbol, price, status, source)
  VALUES (?, ?, ?, ?)
`);

for (const [symbol, price] of Object.entries(seedPrices)) {
  if (!priceExists.get(symbol)) {
    insertPrice.run(
      symbol,
      price,
      "fresh",
      "feed-a"
    );
  }
}

// ============================================================
// BENCHMARK
// ============================================================

const benchmarkExists = db
  .prepare(`
    SELECT 1
    FROM benchmark_ticks
    LIMIT 1
  `)
  .get();

if (!benchmarkExists) {
  db.prepare(`
    INSERT INTO benchmark_ticks
      (index_name, value)
    VALUES ('NIFTY50', 22000)
  `).run();
}

export default db;