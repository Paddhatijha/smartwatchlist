import { useEffect, useMemo, useRef, useState } from "react";

import { api, clearToken, isLoggedIn } from "./api.js";
import Login from "./Login.jsx";
import SymbolSearch from "./SymbolSearch.jsx";
import WatchlistCard from "./WatchlistCard.jsx";
import Compare from "./Compare.jsx";
import Performance from "./Performance.jsx";

const PERSONAS = [
  { id: "casual", label: "Casual Investor" },
  { id: "trader", label: "Active Trader" },
  { id: "accessible", label: "Accessibility-first" },
];

const MARKET_INDICES = [
  {
    name: "NIFTY 50",
    value: "22,437.05",
    change: "+188.35",
    pct: "+0.84%",
    up: true,
  },
  {
    name: "SENSEX",
    value: "73,961.30",
    change: "+554.20",
    pct: "+0.76%",
    up: true,
  },
  {
    name: "BANK NIFTY",
    value: "48,210.15",
    change: "+534.80",
    pct: "+1.12%",
    up: true,
  },
  {
    name: "NIFTY IT",
    value: "34,820.40",
    change: "-151.60",
    pct: "-0.43%",
    up: false,
  },
];

const SORT_OPTIONS = [
  { id: "meaningful", label: "⚡ Meaningful first" },
  { id: "gainers", label: "▲ Top gainers" },
  { id: "losers", label: "▼ Top losers" },
  { id: "favorites", label: "★ Favorites first" },
  { id: "alpha", label: "A–Z" },
  { id: "recent", label: "Recently added" },
];

// ─── Toast system ────────────────────────────────────────────────────────────

let _toastId = 0;
let _setToasts = null;

export function toast(message, type = "info", duration = 3500) {
  if (!_setToasts) return;

  const id = ++_toastId;

  _setToasts((prev) => [...prev, { id, message, type }]);

  setTimeout(() => {
    _setToasts((prev) => prev.filter((t) => t.id !== id));
  }, duration);
}

function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  _setToasts = setToasts;

  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <span>{t.message}</span>

          <button
            className="toast-close"
            onClick={() =>
              setToasts((p) => p.filter((x) => x.id !== t.id))
            }
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── Market bar ─────────────────────────────────────────────────────────────

function MarketBar() {
  return (
    <div className="market-bar">
      {MARKET_INDICES.map((idx) => (
        <div key={idx.name} className="market-bar-item">
          <span className="mb-name">{idx.name}</span>
          <span className="mb-value">{idx.value}</span>

          <span className={`mb-chg ${idx.up ? "up" : "down"}`}>
            {idx.pct}
          </span>
        </div>
      ))}

      <div className="market-bar-time">
        NSE ·{" "}
        {new Date().toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </div>
    </div>
  );
}

// ─── "Since you were gone" digest ───────────────────────────────────────────

function DigestBanner({ items, lastVisit, onDismiss }) {
  const meaningful = items.filter((i) => i.meaningful);

  const targetHit = items.filter(
    (i) =>
      i.priceTarget != null &&
      i.price != null &&
      Math.abs(i.price - i.priceTarget) / i.priceTarget < 0.02
  );

  if (meaningful.length === 0 && targetHit.length === 0) {
    return null;
  }

  const top = meaningful.slice(0, 3).map((i) => {
    const up = i.pctChangeSinceLastCheck >= 0;

    return (
      <span
        key={i.symbol}
        className={`digest-move ${up ? "up" : "down"}`}
      >
        {i.symbol} {up ? "▲" : "▼"}
        {Math.abs(i.pctChangeSinceLastCheck)}%
      </span>
    );
  });

  const elapsed = lastVisit
    ? (() => {
        const mins = Math.round((Date.now() - lastVisit) / 60000);

        if (mins < 60) {
          return `${mins}m ago`;
        }

        return `${Math.round(mins / 60)}h ago`;
      })()
    : "last visit";

  return (
    <div className="digest-banner">
      <div className="digest-left">
        <span className="digest-icon">👋</span>

        <div className="digest-body">
          <div className="digest-title">
            Welcome back! Since {elapsed}:
          </div>

          <div className="digest-details">
            {meaningful.length > 0 && (
              <span className="digest-section">
                <strong>{meaningful.length}</strong> meaningful move
                {meaningful.length !== 1 ? "s" : ""} — {top}
              </span>
            )}

            {targetHit.length > 0 && (
              <span className="digest-section target-hit">
                🎯 <strong>{targetHit.length}</strong> price target
                {targetHit.length !== 1 ? "s" : ""} nearly hit:{" "}
                {targetHit.map((i) => i.symbol).join(", ")}
              </span>
            )}
          </div>
        </div>
      </div>

      <button
        className="digest-dismiss"
        onClick={onDismiss}
        title="Dismiss"
      >
        ×
      </button>
    </div>
  );
}

// ─── All Stocks view ─────────────────────────────────────────────────────────

const ALL_STOCKS_DEMO = [
  {
    symbol: "RELIANCE",
    name: "Reliance Industries",
    sector: "Energy",
    price: 2841.3,
    chg: 2.4,
  },
  {
    symbol: "TCS",
    name: "Tata Consultancy Services",
    sector: "IT",
    price: 3920.15,
    chg: 1.8,
  },
  {
    symbol: "HDFCBANK",
    name: "HDFC Bank",
    sector: "Banking",
    price: 1680.45,
    chg: 1.3,
  },
  {
    symbol: "INFY",
    name: "Infosys",
    sector: "IT",
    price: 1432.7,
    chg: -0.9,
  },
  {
    symbol: "WIPRO",
    name: "Wipro",
    sector: "IT",
    price: 478.25,
    chg: -0.5,
  },
  {
    symbol: "BAJFINANCE",
    name: "Bajaj Finance",
    sector: "NBFC",
    price: 7320.8,
    chg: 4.2,
  },
  {
    symbol: "SBIN",
    name: "State Bank of India",
    sector: "Banking",
    price: 812.6,
    chg: 0.7,
  },
  {
    symbol: "TATAMOTORS",
    name: "Tata Motors",
    sector: "Auto",
    price: 1042.35,
    chg: -2.1,
  },
  {
    symbol: "ADANIENT",
    name: "Adani Enterprises",
    sector: "Conglomerate",
    price: 3215.9,
    chg: 5.3,
  },
  {
    symbol: "MARUTI",
    name: "Maruti Suzuki",
    sector: "Auto",
    price: 12840.0,
    chg: 1.1,
  },
  {
    symbol: "LTIM",
    name: "LTIMindtree",
    sector: "IT",
    price: 5620.4,
    chg: -1.4,
  },
  {
    symbol: "AXISBANK",
    name: "Axis Bank",
    sector: "Banking",
    price: 1124.75,
    chg: 0.9,
  },
  {
    symbol: "KOTAKBANK",
    name: "Kotak Mahindra Bank",
    sector: "Banking",
    price: 1876.3,
    chg: -0.3,
  },
  {
    symbol: "ICICIBANK",
    name: "ICICI Bank",
    sector: "Banking",
    price: 1124.6,
    chg: 1.5,
  },
  {
    symbol: "HINDUNILVR",
    name: "Hindustan Unilever",
    sector: "FMCG",
    price: 2341.8,
    chg: 0.4,
  },
  {
    symbol: "NESTLEIND",
    name: "Nestle India",
    sector: "FMCG",
    price: 24120.0,
    chg: -0.8,
  },
  {
    symbol: "TITAN",
    name: "Titan Company",
    sector: "Consumer",
    price: 3456.7,
    chg: 2.1,
  },
  {
    symbol: "SUNPHARMA",
    name: "Sun Pharmaceutical",
    sector: "Pharma",
    price: 1678.4,
    chg: 1.3,
  },
];

function AllStocksView({ items, onAdd }) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("symbol");

  const watchedSymbols = new Set(items.map((i) => i.symbol));

  const filtered = ALL_STOCKS_DEMO
    .filter(
      (s) =>
        s.symbol.toLowerCase().includes(search.toLowerCase()) ||
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.sector.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === "chg") {
        return b.chg - a.chg;
      }

      if (sortBy === "price") {
        return b.price - a.price;
      }

      return a.symbol.localeCompare(b.symbol);
    });

  return (
    <div className="all-stocks-view">
      <div className="all-stocks-toolbar">
        <input
          className="all-stocks-search"
          placeholder="Filter by name, symbol, or sector…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="sort-btns">
          <span className="sort-label">Sort:</span>

          {[
            ["symbol", "Symbol"],
            ["chg", "Change %"],
            ["price", "Price"],
          ].map(([k, l]) => (
            <button
              key={k}
              className={`sort-btn ${sortBy === k ? "active" : ""}`}
              onClick={() => setSortBy(k)}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="stocks-table-wrap">
        <table className="stocks-table">
          <thead>
            <tr>
              <th>Symbol</th>
              <th>Company</th>
              <th>Sector</th>
              <th>Price</th>
              <th>Change</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((s) => (
              <tr
                key={s.symbol}
                className={
                  watchedSymbols.has(s.symbol) ? "row-watched" : ""
                }
              >
                <td>
                  <span className="tbl-symbol">{s.symbol}</span>
                </td>

                <td className="tbl-name">{s.name}</td>

                <td>
                  <span className="sector-pill">{s.sector}</span>
                </td>

                <td className="tbl-price">
                  ₹{s.price.toLocaleString("en-IN")}
                </td>

                <td>
                  <span
                    className={`tbl-chg ${
                      s.chg >= 0 ? "up" : "down"
                    }`}
                  >
                    {s.chg >= 0 ? "▲" : "▼"} {Math.abs(s.chg)}%
                  </span>
                </td>

                <td>
                  {watchedSymbols.has(s.symbol) ? (
                    <span className="watching-badge">Watching</span>
                  ) : (
                    <button
                      className="add-btn"
                      onClick={() => onAdd(s.symbol)}
                    >
                      + Add
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main App ────────────────────────────────────────────────────────────────

export default function App() {
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [items, setItems] = useState([]);
  const [persona, setPersona] = useState("casual");
  const [darkMode, setDarkMode] = useState(false);
  const [alertSymbols, setAlertSymbols] = useState(new Set());
  const [compareSet, setCompareSet] = useState(new Set());
  const [showCompare, setShowCompare] = useState(false);
  const [perfSymbol, setPerfSymbol] = useState(null);
  const [groupFilter, setGroupFilter] = useState("All");
  const [isOffline, setIsOffline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("watchlist");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Feature 1: sort
  const [sortMode, setSortMode] = useState("meaningful");

  // Feature 2: search within watchlist
  const [watchlistSearch, setWatchlistSearch] = useState("");

  // Feature 3: digest
  const [lastVisit] = useState(() => {
    const stored = localStorage.getItem("lastVisit");
    const ts = stored ? parseInt(stored, 10) : null;

    localStorage.setItem("lastVisit", Date.now().toString());

    return ts;
  });

  const [digestDismissed, setDigestDismissed] = useState(false);

  const cardRefs = useRef([]);

  // ─── Auth ────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isLoggedIn()) {
      setCheckingAuth(false);
      return;
    }

    api
      .me()
      .then((u) => {
        setUser(u);
        setPersona(u.persona);
        setDarkMode(u.darkMode);
      })
      .catch(() => clearToken())
      .finally(() => setCheckingAuth(false));
  }, []);

  // ─── Dark mode ──────────────────────────────────────────────────────────

  useEffect(() => {
    document.body.classList.toggle("dark", darkMode);
  }, [darkMode]);

  // ─── Online/offline detection ───────────────────────────────────────────

  useEffect(() => {
    const goOnline = () => {
      setIsOffline(false);
      toast("Back online", "success");
    };

    const goOffline = () => {
      setIsOffline(true);
      toast("You're offline — showing cached data", "warning");
    };

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    setIsOffline(!navigator.onLine);

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  // ─── Export CSV ─────────────────────────────────────────────────────────

  function exportCSV() {
    if (items.length === 0) {
      toast("Nothing to export", "warning");
      return;
    }

    const header = [
      "Symbol",
      "Name",
      "Price",
      "Change%",
      "Group",
      "PriceTarget",
      "Note",
    ];

    const rows = items.map((i) => [
      i.symbol,
      `"${i.name || ""}"`,
      i.price?.toFixed(2) ?? "",
      i.pctChangeSinceLastCheck ?? "",
      `"${i.group || ""}"`,
      i.priceTarget ?? "",
      `"${(i.note || "").replace(/"/g, "'")}"`,
    ]);

    const csv = [header, ...rows]
      .map((r) => r.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `watchlist-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    a.click();

    URL.revokeObjectURL(url);

    toast("Watchlist exported", "success");
  }

  // ─── Refresh watchlist ──────────────────────────────────────────────────

  async function refresh() {
    try {
      const data = await api.getWatchlist();

      setItems(data.items || []);
      setIsOffline(!!data._offline);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  // ─── Refresh alerts ─────────────────────────────────────────────────────

  async function refreshAlerts() {
    try {
      const data = await api.getAlerts();

      setAlertSymbols(
        new Set((data.alerts || []).map((a) => a.symbol))
      );
    } catch {
      // Ignore alert refresh errors
    }
  }

  // ─── Polling ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user) return;

    refresh();
    refreshAlerts();

    const poll = setInterval(refresh, 5000);

    return () => clearInterval(poll);
  }, [user]);

  // ─── Mark seen ──────────────────────────────────────────────────────────

  useEffect(() => {
    function markSeenOnLeave() {
      if (items.length) {
        navigator.sendBeacon?.(
          "/api/watchlist/mark-seen",
          new Blob(
            [
              JSON.stringify({
                symbols: items.map((i) => i.symbol),
              }),
            ],
            { type: "application/json" }
          )
        );
      }
    }

    window.addEventListener("beforeunload", markSeenOnLeave);

    return () =>
      window.removeEventListener("beforeunload", markSeenOnLeave);
  }, [items]);

  // ─── Authentication ─────────────────────────────────────────────────────

  function onAuthed(u) {
    setUser(u);
    setPersona(u.persona);
    setDarkMode(u.darkMode);
  }

  function logout() {
    clearToken();
    setUser(null);
    setItems([]);
  }

  // ─── Persona ────────────────────────────────────────────────────────────

  async function changePersona(next) {
    setPersona(next);

    await api.setPreferences({
      persona: next,
    });

    refresh();

    toast(`Persona switched to ${next}`, "info");
  }

  // ─── Dark mode toggle ───────────────────────────────────────────────────

  async function toggleDarkMode() {
    const n = !darkMode;

    setDarkMode(n);

    await api.setPreferences({
      darkMode: n,
    });
  }

  // ─── Add symbol ──────────────────────────────────────────────────────────

  async function addSymbol(symbol) {
    try {
      await api.addToWatchlist(
        symbol,
        groupFilter === "All" ? "My Watchlist" : groupFilter
      );

      await refresh();

      toast(`${symbol} added to watchlist`, "success");
    } catch (e) {
      toast(e.message, "error");
    }
  }

  // ─── Remove symbol ──────────────────────────────────────────────────────

  async function removeSymbol(symbol) {
    await api.removeFromWatchlist(symbol);

    setItems((prev) =>
      prev.filter((i) => i.symbol !== symbol)
    );

    toast(`${symbol} removed`, "info");
  }

  // ─── Favorite ───────────────────────────────────────────────────────────

  async function toggleFavorite(symbol, val) {
    setItems((prev) =>
      prev.map((i) =>
        i.symbol === symbol
          ? { ...i, isFavorite: val }
          : i
      )
    );

    await api.updateWatchlistItem(symbol, {
      isFavorite: val,
    });
  }

  // ─── Save details ───────────────────────────────────────────────────────

  async function saveDetails(symbol, patch) {
    setItems((prev) =>
      prev.map((i) =>
        i.symbol === symbol
          ? { ...i, ...patch }
          : i
      )
    );

    await api.updateWatchlistItem(symbol, patch);

    toast("Saved", "success");
  }

  // ─── Alerts ──────────────────────────────────────────────────────────────

  async function toggleAlert(symbol, on) {
    const next = new Set(alertSymbols);

    if (on) {
      await api.addAlert(symbol);

      next.add(symbol);

      toast(`Alert set for ${symbol}`, "success");
    } else {
      await api.removeAlert(symbol);

      next.delete(symbol);

      toast(`Alert removed for ${symbol}`, "info");
    }

    setAlertSymbols(next);
  }

  // ─── Compare ────────────────────────────────────────────────────────────

  function toggleCompareSelect(symbol) {
    const next = new Set(compareSet);

    if (next.has(symbol)) {
      next.delete(symbol);
    } else if (next.size < 3) {
      next.add(symbol);
    } else {
      toast("Max 3 stocks for comparison", "warning");
      return;
    }

    setCompareSet(next);
  }

  // ─── Keyboard navigation ────────────────────────────────────────────────

  function onGridKeyDown(e) {
    const focusable = cardRefs.current.filter(Boolean);

    const currentIndex = focusable.indexOf(
      document.activeElement
    );

    if (e.key === "ArrowDown") {
      e.preventDefault();

      focusable[
        Math.min(
          currentIndex + 1,
          focusable.length - 1
        )
      ]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();

      focusable[
        Math.max(currentIndex - 1, 0)
      ]?.focus();
    }
  }

  // ─── Groups ─────────────────────────────────────────────────────────────

  const groups = useMemo(() => {
    const set = new Set(
      items.map((i) => i.group || "My Watchlist")
    );

    return ["All", ...set];
  }, [items]);

  // ─── Sort logic ─────────────────────────────────────────────────────────

  const sortedItems = useMemo(() => {
    const arr = [...items];

    switch (sortMode) {
      case "meaningful":
        return arr.sort(
          (a, b) =>
            (b.meaningful ? 1 : 0) -
            (a.meaningful ? 1 : 0)
        );

      case "gainers":
        return arr.sort(
          (a, b) =>
            (b.pctChangeSinceLastCheck ?? 0) -
            (a.pctChangeSinceLastCheck ?? 0)
        );

      case "losers":
        return arr.sort(
          (a, b) =>
            (a.pctChangeSinceLastCheck ?? 0) -
            (b.pctChangeSinceLastCheck ?? 0)
        );

      case "favorites":
        return arr.sort(
          (a, b) =>
            (b.isFavorite ? 1 : 0) -
            (a.isFavorite ? 1 : 0)
        );

      case "alpha":
        return arr.sort((a, b) =>
          a.symbol.localeCompare(b.symbol)
        );

      case "recent":
        return arr;

      default:
        return arr;
    }
  }, [items, sortMode]);

  // ─── Search + group filter ──────────────────────────────────────────────

  const visibleItems = useMemo(() => {
    return sortedItems.filter((i) => {
      const matchGroup =
        groupFilter === "All" ||
        i.group === groupFilter;

      const q = watchlistSearch.toLowerCase();

      const matchSearch =
        !q ||
        i.symbol.toLowerCase().includes(q) ||
        (i.name || "").toLowerCase().includes(q);

      return matchGroup && matchSearch;
    });
  }, [
    sortedItems,
    groupFilter,
    watchlistSearch,
  ]);

  // ─── Summary counts ─────────────────────────────────────────────────────

  const meaningfulCount = items.filter(
    (i) => i.meaningful
  ).length;

  const gainers = items.filter(
    (i) => i.pctChangeSinceLastCheck > 0
  ).length;

  const losers = items.filter(
    (i) => i.pctChangeSinceLastCheck < 0
  ).length;

  // ─── Auth loading ───────────────────────────────────────────────────────

  if (checkingAuth) {
    return (
      <div className="center-screen">
        <div className="spinner" />
      </div>
    );
  }

  if (!user) {
    return <Login onAuthed={onAuthed} />;
  }

  // ─── Main UI ─────────────────────────────────────────────────────────────

  return (
    <div className="app-shell">
      <ToastContainer />

      {/* Sidebar */}
      <aside
        className={`sidebar ${
          sidebarOpen ? "open" : "collapsed"
        }`}
      >
        <div className="sidebar-logo">
          <div className="sidebar-logo-mark">
            SW
          </div>

          {sidebarOpen && (
            <span className="sidebar-logo-text">
              SmartWatch
            </span>
          )}
        </div>

        <nav className="sidebar-nav">
          <button
            className={`sidebar-nav-item ${
              viewMode === "watchlist" ? "active" : ""
            }`}
            onClick={() =>
              setViewMode("watchlist")
            }
            title="My Watchlist"
          >
            <span className="nav-icon">⭐</span>

            {sidebarOpen && (
              <span>My Watchlist</span>
            )}
          </button>

          <button
            className={`sidebar-nav-item ${
              viewMode === "market" ? "active" : ""
            }`}
            onClick={() =>
              setViewMode("market")
            }
            title="All Stocks"
          >
            <span className="nav-icon">📊</span>

            {sidebarOpen && (
              <span>All Stocks</span>
            )}
          </button>

          {compareSet.size >= 2 && (
            <button
              className="sidebar-nav-item compare-trigger"
              onClick={() =>
                setShowCompare(true)
              }
              title="Compare"
            >
              <span className="nav-icon">
                ⚖️
              </span>

              {sidebarOpen && (
                <span>
                  Compare ({compareSet.size})
                </span>
              )}
            </button>
          )}
        </nav>

        <div className="sidebar-bottom">
          {sidebarOpen && (
            <button
              className="sidebar-nav-item export-btn"
              onClick={exportCSV}
              title="Export CSV"
            >
              <span className="nav-icon">⬇</span>
              <span>Export CSV</span>
            </button>
          )}

          <button
            className="sidebar-nav-item"
            onClick={toggleDarkMode}
            title="Toggle theme"
          >
            <span className="nav-icon">
              {darkMode ? "☀️" : "🌙"}
            </span>

            {sidebarOpen && (
              <span>
                {darkMode
                  ? "Light mode"
                  : "Dark mode"}
              </span>
            )}
          </button>

          <button
            className="sidebar-nav-item"
            onClick={logout}
            title="Log out"
          >
            <span className="nav-icon">↩</span>

            {sidebarOpen && (
              <span>Log out</span>
            )}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div
        className={`main-content ${
          sidebarOpen
            ? ""
            : "sidebar-collapsed"
        }`}
      >
        {/* Topbar */}
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-btn"
              onClick={() =>
                setSidebarOpen(!sidebarOpen)
              }
            >
              ☰
            </button>

            <div className="page-title">
              {viewMode === "watchlist"
                ? "My Watchlist"
                : "Market Overview"}
            </div>
          </div>

          <MarketBar />

          <div className="topbar-right">
            <select
              value={persona}
              onChange={(e) =>
                changePersona(e.target.value)
              }
            >
              {PERSONAS.map((p) => (
                <option
                  key={p.id}
                  value={p.id}
                >
                  {p.label}
                </option>
              ))}
            </select>

            <div className="user-chip">
              <div className="user-avatar">
                {user.email[0].toUpperCase()}
              </div>

              <span className="user-email">
                {user.email}
              </span>
            </div>
          </div>
        </header>

        {isOffline && (
          <div className="offline-banner">
            📴 Offline — showing last synced data
          </div>
        )}

        {/* Digest */}
        {viewMode === "watchlist" &&
          !digestDismissed &&
          items.length > 0 && (
            <DigestBanner
              items={items}
              lastVisit={lastVisit}
              onDismiss={() =>
                setDigestDismissed(true)
              }
            />
          )}

        {/* Summary row */}
        <div className="summary-row">
          <div className="summary-card">
            <div className="summary-num">
              {items.length}
            </div>

            <div className="summary-label">
              Tracked
            </div>
          </div>

          <div className="summary-card up">
            <div className="summary-num">
              {gainers}
            </div>

            <div className="summary-label">
              Gaining
            </div>
          </div>

          <div className="summary-card down">
            <div className="summary-num">
              {losers}
            </div>

            <div className="summary-label">
              Declining
            </div>
          </div>

          <div className="summary-card accent">
            <div className="summary-num">
              {meaningfulCount}
            </div>

            <div className="summary-label">
              Meaningful moves
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="toolbar">
          <SymbolSearch onAdd={addSymbol} />

          <div className="toolbar-right">
            {/* Watchlist search */}
            {viewMode === "watchlist" && (
              <div className="watchlist-search-wrap">
                <span className="ws-icon">
                  🔍
                </span>

                <input
                  className="watchlist-search"
                  placeholder="Filter watchlist…"
                  value={watchlistSearch}
                  onChange={(e) =>
                    setWatchlistSearch(
                      e.target.value
                    )
                  }
                />

                {watchlistSearch && (
                  <button
                    className="ws-clear"
                    onClick={() =>
                      setWatchlistSearch("")
                    }
                  >
                    ×
                  </button>
                )}
              </div>
            )}

            {/* Group filter */}
            <select
              value={groupFilter}
              onChange={(e) =>
                setGroupFilter(e.target.value)
              }
            >
              {groups.map((g) => (
                <option
                  key={g}
                  value={g}
                >
                  {g}
                </option>
              ))}
            </select>

            {/* Sort */}
            {viewMode === "watchlist" && (
              <div className="sort-select-wrap">
                <select
                  className="sort-select"
                  value={sortMode}
                  onChange={(e) =>
                    setSortMode(e.target.value)
                  }
                  title="Sort watchlist"
                >
                  {SORT_OPTIONS.map((s) => (
                    <option
                      key={s.id}
                      value={s.id}
                    >
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* View toggle */}
            <div className="view-toggle">
              <button
                className={`vt-btn ${
                  viewMode === "watchlist"
                    ? "vt-active"
                    : ""
                }`}
                onClick={() =>
                  setViewMode("watchlist")
                }
              >
                ⭐ Watchlist
              </button>

              <button
                className={`vt-btn ${
                  viewMode === "market"
                    ? "vt-active"
                    : ""
                }`}
                onClick={() =>
                  setViewMode("market")
                }
              >
                📊 All Stocks
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="center-screen">
            <div className="spinner" />
          </div>
        ) : viewMode === "market" ? (
          <AllStocksView
            items={items}
            onAdd={addSymbol}
          />
        ) : visibleItems.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              {watchlistSearch ? "🔍" : "📭"}
            </div>

            <h3>
              {watchlistSearch
                ? `No results for "${watchlistSearch}"`
                : "Your watchlist is empty"}
            </h3>

            <p>
              {watchlistSearch
                ? "Try a different symbol or company name."
                : "Search for a stock above and add it to start tracking."}
            </p>

            {watchlistSearch && (
              <button
                className="secondary"
                style={{ marginTop: 12 }}
                onClick={() =>
                  setWatchlistSearch("")
                }
              >
                Clear filter
              </button>
            )}
          </div>
        ) : (
          <div
            className="grid"
            onKeyDown={onGridKeyDown}
          >
            {visibleItems.map((item, idx) => (
              <WatchlistCard
                key={item.symbol}
                ref={(el) =>
                  (cardRefs.current[idx] = el)
                }
                item={item}
                onToggleFavorite={
                  toggleFavorite
                }
                onRemove={removeSymbol}
                onSaveDetails={saveDetails}
                onToggleAlert={toggleAlert}
                alertActive={alertSymbols.has(
                  item.symbol
                )}
                onToggleCompareSelect={
                  toggleCompareSelect
                }
                compareSelected={compareSet.has(
                  item.symbol
                )}
                onFocus={() => {}}
                focused={false}
                onOpenPerformance={
                  setPerfSymbol
                }
              />
            ))}
          </div>
        )}

        {/* Compare */}
        {showCompare && (
          <Compare
            symbols={[...compareSet]}
            onClose={() =>
              setShowCompare(false)
            }
          />
        )}

        {/* Performance */}
        {perfSymbol && (
          <Performance
            symbol={perfSymbol}
            onClose={() =>
              setPerfSymbol(null)
            }
          />
        )}

        <footer className="footer">
          Simulated market data · Demo purposes
          only · Persona engine active
        </footer>
      </div>
    </div>
  );
}