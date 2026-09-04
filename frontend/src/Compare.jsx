import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts";
import { api } from "./api.js";

const COLORS = ["#38bdf8", "#f472b6", "#a3e635"];

export default function Compare({ symbols, onClose }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .compare(symbols)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [symbols]);

  // reshape into one array of {ts, SYM1, SYM2, ...} for a single chart
  const merged = [];
  if (data?.result) {
    const maxLen = Math.max(...data.result.map((r) => r.series.length), 0);
    for (let i = 0; i < maxLen; i++) {
      const point = {};
      data.result.forEach((r) => {
        if (r.series[i]) {
          point.ts = point.ts || r.series[i].ts?.slice(11, 16);
          point[r.symbol] = r.series[i].price;
        }
      });
      merged.push(point);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Compare: {symbols.join(" vs ")}</h2>
          <button className="secondary" onClick={onClose}>Close</button>
        </div>

        {error && <div className="error-text">{error}</div>}

        {data && (
          <>
            <div className="compare-summary">
              {data.result.map((r, i) => (
                <div key={r.symbol} className="compare-chip" style={{ borderColor: COLORS[i] }}>
                  <strong>{r.symbol}</strong>
                  <span className={r.changePct >= 0 ? "up" : "down"}>
                    {r.changePct >= 0 ? "▲" : "▼"} {Math.abs(r.changePct)}% (24h)
                  </span>
                </div>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={merged}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="ts" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} domain={["auto", "auto"]} />
                <Tooltip />
                <Legend />
                {data.result.map((r, i) => (
                  <Line
                    key={r.symbol}
                    type="monotone"
                    dataKey={r.symbol}
                    stroke={COLORS[i]}
                    dot={false}
                    strokeWidth={2}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </>
        )}
      </div>
    </div>
  );
}
