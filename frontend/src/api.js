const BASE = "/api";

function getToken() {
  return localStorage.getItem("token");
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const res = await fetch(`${BASE}${path}`, { ...options, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);

    // Cache successful GET responses locally so the UI has something to
    // show when offline (feature 18, complementing the service worker).
    if (!options.method || options.method === "GET") {
      localStorage.setItem(`cache:${path}`, JSON.stringify(data));
    }
    return data;
  } catch (err) {
    // Offline fallback: serve last cached snapshot for GET requests
    if ((!options.method || options.method === "GET")) {
      const cached = localStorage.getItem(`cache:${path}`);
      if (cached) {
        return { ...JSON.parse(cached), _offline: true };
      }
    }
    throw err;
  }
}

export const api = {
  signup: (email, password) =>
    request("/auth/signup", { method: "POST", body: JSON.stringify({ email, password }) }),
  login: (email, password) =>
    request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  me: () => request("/auth/me"),
  setPreferences: (prefs) =>
    request("/auth/preferences", { method: "PATCH", body: JSON.stringify(prefs) }),

  getWatchlist: () => request("/watchlist"),
  addToWatchlist: (symbol, group) =>
    request("/watchlist", { method: "POST", body: JSON.stringify({ symbol, group }) }),
  removeFromWatchlist: (symbol) => request(`/watchlist/${symbol}`, { method: "DELETE" }),
  updateWatchlistItem: (symbol, patch) =>
    request(`/watchlist/${symbol}`, { method: "PATCH", body: JSON.stringify(patch) }),
  markSeen: (symbols) =>
    request("/watchlist/mark-seen", { method: "POST", body: JSON.stringify({ symbols }) }),

  searchSymbols: (q) => request(`/symbols/search?q=${encodeURIComponent(q)}`),

  getAlerts: () => request("/alerts"),
  addAlert: (symbol) => request("/alerts", { method: "POST", body: JSON.stringify({ symbol }) }),
  removeAlert: (symbol) => request(`/alerts/${symbol}`, { method: "DELETE" }),

  compare: (symbols) => request(`/analytics/compare?symbols=${symbols.join(",")}`),
  performance: (symbol) => request(`/analytics/performance?symbol=${symbol}`),
};

export function setToken(token) {
  localStorage.setItem("token", token);
}
export function clearToken() {
  localStorage.removeItem("token");
}
export function isLoggedIn() {
  return !!getToken();
}
