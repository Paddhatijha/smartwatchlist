import db from "./db.js";
import { evaluateSymbol } from "./significanceEngine.js";
import { sendAlert } from "./mailer.js";

// Avoid spamming: only re-alert a user/symbol pair once every 10 minutes
const recentlyAlerted = new Map(); // key `${userId}:${symbol}` -> timestamp

export function startAlertChecker(intervalMs = 10000) {
  setInterval(async () => {
    const alerts = db
      .prepare(
        `SELECT a.user_id, a.symbol, u.email, u.persona
         FROM alerts a JOIN users u ON u.id = a.user_id
         WHERE a.enabled = 1`
      )
      .all();

    for (const a of alerts) {
      const sig = evaluateSymbol(a.user_id, a.symbol, a.persona || "casual");
      if (!sig || !sig.meaningful) continue;

      const key = `${a.user_id}:${a.symbol}`;
      const last = recentlyAlerted.get(key) || 0;
      if (Date.now() - last < 10 * 60 * 1000) continue;

      recentlyAlerted.set(key, Date.now());
      const direction = sig.pctChangeSinceLastCheck >= 0 ? "up" : "down";
      const msg = `${a.symbol} moved ${direction} ${Math.abs(
        sig.pctChangeSinceLastCheck
      )}% (now ₹${sig.price}). This crossed your alert threshold.`;
      try {
        await sendAlert(a.email, a.user_id, a.symbol, msg);
      } catch (err) {
        console.error("alert send failed", err.message);
      }
    }
  }, intervalMs);
}
