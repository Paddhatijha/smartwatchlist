import { useEffect, useRef, useState } from "react";
import { api, setToken } from "./api.js";

const PHRASES = [
  "Track meaningful moves, filter the noise.",
  "Real-time insights, personalized for you.",
  "Smart alerts before the market moves.",
  "Your edge in every session.",
];

// Simulated live traders feed
const TRADER_NAMES = ["Arjun S.", "Priya M.", "Rohan K.", "Neha T.", "Vikram D.", "Sanya R.", "Aditya P.", "Meera L."];
const TRADE_ACTIONS = [
  { action: "added", symbol: "RELIANCE", change: "+2.4%", dir: "up" },
  { action: "alerted", symbol: "TCS", change: "+1.8%", dir: "up" },
  { action: "watching", symbol: "INFY", change: "-0.9%", dir: "down" },
  { action: "added", symbol: "HDFCBANK", change: "+3.1%", dir: "up" },
  { action: "alerted", symbol: "WIPRO", change: "-1.2%", dir: "down" },
  { action: "watching", symbol: "BAJFINANCE", change: "+4.2%", dir: "up" },
  { action: "added", symbol: "SBIN", change: "+0.7%", dir: "up" },
  { action: "alerted", symbol: "TATAMOTORS", change: "-2.1%", dir: "down" },
  { action: "watching", symbol: "ADANIENT", change: "+5.3%", dir: "up" },
  { action: "added", symbol: "MARUTI", change: "+1.1%", dir: "up" },
];

function useTypewriter(phrases, typingSpeed = 45, pauseTime = 1800) {
  const [text, setText] = useState("");
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const current = phrases[phraseIndex];
    let timeout;
    if (!deleting && text.length < current.length) {
      timeout = setTimeout(() => setText(current.slice(0, text.length + 1)), typingSpeed);
    } else if (!deleting && text.length === current.length) {
      timeout = setTimeout(() => setDeleting(true), pauseTime);
    } else if (deleting && text.length > 0) {
      timeout = setTimeout(() => setText(current.slice(0, text.length - 1)), typingSpeed / 2);
    } else {
      setDeleting(false);
      setPhraseIndex((i) => (i + 1) % phrases.length);
    }
    return () => clearTimeout(timeout);
  }, [text, deleting, phraseIndex, phrases, typingSpeed, pauseTime]);

  return text;
}

function LiveTraderFeed() {
  const [feeds, setFeeds] = useState(() =>
    Array.from({ length: 4 }, (_, i) => ({
      id: i,
      trader: TRADER_NAMES[i % TRADER_NAMES.length],
      ...TRADE_ACTIONS[i % TRADE_ACTIONS.length],
      ts: Date.now() - i * 12000,
    }))
  );
  const counterRef = useRef(4);

  useEffect(() => {
    const iv = setInterval(() => {
      const idx = counterRef.current % TRADE_ACTIONS.length;
      const nameIdx = counterRef.current % TRADER_NAMES.length;
      counterRef.current++;
      setFeeds((prev) => [
        {
          id: Date.now(),
          trader: TRADER_NAMES[nameIdx],
          ...TRADE_ACTIONS[idx],
          ts: Date.now(),
        },
        ...prev.slice(0, 5),
      ]);
    }, 2800);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="live-feed">
      <div className="live-feed-header">
        <span className="live-dot" /> Live activity
      </div>
      <div className="live-feed-list">
        {feeds.map((f) => (
          <div key={f.id} className="feed-row">
            <div className="feed-avatar">{f.trader[0]}</div>
            <div className="feed-text">
              <span className="feed-name">{f.trader}</span>
              <span className="feed-action"> {f.action} </span>
              <span className="feed-symbol">{f.symbol}</span>
            </div>
            <span className={`feed-change ${f.dir}`}>{f.change}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MarketTicker() {
  const tickers = [
    { sym: "NIFTY 50", val: "22,437", chg: "+0.84%" },
    { sym: "SENSEX", val: "73,961", chg: "+0.76%" },
    { sym: "BANK NIFTY", val: "48,210", chg: "+1.12%" },
    { sym: "NIFTY IT", val: "34,820", chg: "-0.43%" },
    { sym: "RELIANCE", val: "₹2,841", chg: "+2.4%" },
    { sym: "TCS", val: "₹3,920", chg: "+1.8%" },
    { sym: "INFY", val: "₹1,432", chg: "-0.9%" },
    { sym: "HDFCBANK", val: "₹1,680", chg: "+1.3%" },
    { sym: "WIPRO", val: "₹478", chg: "-0.5%" },
  ];

  return (
    <div className="market-ticker">
      <div className="ticker-track">
        {[...tickers, ...tickers].map((t, i) => (
          <div key={i} className="ticker-item">
            <span className="ticker-sym">{t.sym}</span>
            <span className="ticker-val">{t.val}</span>
            <span className={`ticker-chg ${t.chg.startsWith("-") ? "down" : "up"}`}>{t.chg}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Login({ onAuthed }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const typed = useTypewriter(PHRASES);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const fn = mode === "login" ? api.login : api.signup;
      const data = await fn(email, password);
      setToken(data.token);
      onAuthed(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-screen">
      {/* Animated grid background */}
      <div className="auth-bg-grid" />
      <div className="auth-glow auth-glow-1" />
      <div className="auth-glow auth-glow-2" />

      {/* Market Ticker */}
      <MarketTicker />

      {/* Left panel — branding + live feed */}
      <div className="auth-left">
        <div className="auth-brand">
          <div className="auth-logo">SW</div>
          <span>SmartWatch</span>
        </div>

        <div className="auth-hero-text">
          <h2>Markets move fast.<br />Stay ahead.</h2>
          <p className="auth-hero-sub">
            Institutional-grade watchlists for serious retail investors.
            Track what matters, ignore the noise.
          </p>
        </div>

        <div className="auth-stats-row">
          <div className="auth-stat">
            <div className="auth-stat-num">12,400+</div>
            <div className="auth-stat-label">Active traders</div>
          </div>
          <div className="auth-stat">
            <div className="auth-stat-num">₹840Cr</div>
            <div className="auth-stat-label">Tracked daily</div>
          </div>
          <div className="auth-stat">
            <div className="auth-stat-num">99.9%</div>
            <div className="auth-stat-label">Uptime</div>
          </div>
        </div>

        <LiveTraderFeed />
      </div>

      {/* Right panel — login form */}
      <div className="auth-right">
        <form className="auth-card" onSubmit={submit}>
          <div className="auth-card-header">
            <h1>{mode === "login" ? "Welcome back" : "Get started"}</h1>
            <p className="typewriter">
              {typed}<span className="cursor" />
            </p>
          </div>

          <div className="form-group">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <div className="error-text">⚠ {error}</div>}

          <button type="submit" className="btn-primary-full" disabled={busy}>
            {busy ? "Please wait…" : mode === "login" ? "Sign in to dashboard" : "Create account"}
          </button>

          <div className="divider"><span>or</span></div>

          <div className="auth-footer">
            {mode === "login" ? (
              <>
                Don't have an account?{" "}
                <button type="button" className="link-btn" onClick={() => setMode("signup")}>
                  Sign up free
                </button>
              </>
            ) : (
              <>
                Already registered?{" "}
                <button type="button" className="link-btn" onClick={() => setMode("login")}>
                  Sign in
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}