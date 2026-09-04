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
  persona TEXT DEFAULT 'casual',        -- casual | trader | accessible
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
  status TEXT DEFAULT 'fresh',          -- fresh | stale | conflicting
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

// Seed symbols if empty
const symCount = db.prepare("SELECT COUNT(*) c FROM symbols").get().c;
if (symCount === 0) {
  const seed = db.prepare("INSERT INTO symbols (symbol, name, sector) VALUES (?,?,?)");
  const seedData = [
    ["RELI", "Reliance Industries", "Energy"],
    ["TCS", "Tata Consultancy Services", "IT"],
    ["INFY", "Infosys", "IT"],
    ["HDFB", "HDFC Bank", "Banking"],
    ["ICIB", "ICICI Bank", "Banking"],
    ["GROW", "Groww Financial", "Fintech"],
    ["TATM", "Tata Motors", "Auto"],
    ["SUNP", "Sun Pharma", "Pharma"],
    ["ITC", "ITC Ltd", "FMCG"],
    ["WIPR", "Wipro", "IT"],
    ["ADAG", "Adani Green", "Energy"],
    ["BAJF", "Bajaj Finance", "Finance"],
  ];
  const insertMany = (rows) => {
    db.exec("BEGIN");
    try {
      rows.forEach((r) => seed.run(...r));
      db.exec("COMMIT");
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
  };
  insertMany(seedData);

  // seed an initial price so the feed has a base to walk from
  const seedPrice = db.prepare(
    "INSERT INTO price_ticks (symbol, price, status, source) VALUES (?,?,?,?)"
  );
  const insertPrices = (rows) => {
    db.exec("BEGIN");
    try {
      rows.forEach((r) => seedPrice.run(r[0], 100 + Math.random() * 900, "fresh", "feed-a"));
      db.exec("COMMIT");
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
  };
  insertPrices(seedData);

  db.prepare("INSERT INTO benchmark_ticks (index_name, value) VALUES ('NIFTY50', 22000)").run();
}

export default db;
