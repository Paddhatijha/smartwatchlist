import nodemailer from "nodemailer";
import db from "./db.js";

// In dev (no SMTP env vars set) we just log the "email" and store it in
// alert_log so the frontend can show a notification feed instead of a real
// inbox. Set SMTP_HOST/PORT/USER/PASS env vars to send real email.

let transporter = null;
if (process.env.SMTP_HOST) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

const logAlert = db.prepare(
  "INSERT INTO alert_log (user_id, symbol, message) VALUES (?,?,?)"
);

export async function sendAlert(userEmail, userId, symbol, message) {
  logAlert.run(userId, symbol, message);

  if (!transporter) {
    console.log(`[mock-email] to=${userEmail} subject="${symbol} alert" body="${message}"`);
    return { sent: false, mocked: true };
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM || "alerts@smartwatchlist.app",
    to: userEmail,
    subject: `${symbol} moved — Smart Watchlist alert`,
    text: message,
  });
  return { sent: true, mocked: false };
}
