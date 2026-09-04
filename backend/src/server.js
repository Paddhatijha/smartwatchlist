import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import "./db.js"; // initializes + seeds DB
import { startFeed } from "./feedSimulator.js";
import { startAlertChecker } from "./alertChecker.js";

import authRoutes from "./routes/auth.js";
import watchlistRoutes from "./routes/watchlist.js";
import symbolsRoutes from "./routes/symbols.js";
import alertsRoutes from "./routes/alerts.js";
import analyticsRoutes from "./routes/analytics.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

app.use("/api/auth", authRoutes);
app.use("/api/watchlist", watchlistRoutes);
app.use("/api/symbols", symbolsRoutes);
app.use("/api/alerts", alertsRoutes);
app.use("/api/analytics", analyticsRoutes);

// Serve the built frontend (frontend/dist) as static files, so the whole
// app — API + UI — runs from a single process/port. Run `npm run build`
// in /frontend first (see README), which outputs into frontend/dist.
const frontendDist = path.join(__dirname, "..", "..", "frontend", "dist");
app.use(express.static(frontendDist));
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) return next();
  res.sendFile(path.join(frontendDist, "index.html"), (err) => {
    if (err) next();
  });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Smart Watchlist running on http://localhost:${PORT}`);
  startFeed(4000);          // simulated market tick every 4s
  startAlertChecker(10000); // check alert thresholds every 10s
});
