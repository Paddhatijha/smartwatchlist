import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts";
import { api } from "./api.js";

export default function Performance({ symbol, onClose }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .performance(symbol)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [symbol]);

  const points = (data?.points || []).map((p) => ({
    ...p,
    ts: p.ts?.slice(11, 16),
  }));

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{symbol} vs NIFTY50 (24h)</h2>
          <button className="secondary" onClick={onClose}>Close</button>
        </div>
        {error && <div className="error-text">{error}</div>}
        {points.length > 0 ? (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={points}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis dataKey="ts" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} unit="%" />
              <Tooltip />
              <Legend />
              <ReferenceLine y={0} stroke="#64748b" />
              <Line type="monotone" dataKey="stockPct" name={symbol} stroke="#38bdf8" dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="benchmarkPct" name="NIFTY50" stroke="#f59e0b" dot={false} strokeWidth={2} strokeDasharray="4 4" />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          !error && <p className="muted">Gathering enough data points… check back shortly.</p>
        )}
      </div>
    </div>
  );
}
