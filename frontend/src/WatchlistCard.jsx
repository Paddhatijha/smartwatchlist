import { forwardRef, useState } from "react";

const STATUS_BADGE = {
  fresh: { label: "Fresh", cls: "badge-fresh" },
  stale: { label: "Stale", cls: "badge-stale" },
  conflicting: { label: "Conflicting", cls: "badge-conflict" },
};

const WatchlistCard = forwardRef(function WatchlistCard({
  item,
  onToggleFavorite,
  onRemove,
  onSaveDetails,
  onToggleAlert,
  alertActive,
  onToggleCompareSelect,
  compareSelected,
  focused,
  onFocus,
  onOpenPerformance,
}, ref) {
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState(item.note || "");
  const [target, setTarget] = useState(item.priceTarget ?? "");

  const badge = STATUS_BADGE[item.dataStatus] || STATUS_BADGE.fresh;
  const changed = item.meaningful;
  const changeUp = item.pctChangeSinceLastCheck >= 0;

  function save() {
    onSaveDetails(item.symbol, {
      note,
      priceTarget: target === "" ? null : Number(target),
    });
    setEditing(false);
  }

  return (
    <div
      className={`watchlist-card ${changed ? "meaningful" : ""} ${focused ? "focused" : ""}`}
      tabIndex={0}
      ref={ref}
      onFocus={onFocus}
      onClick={() => onOpenPerformance?.(item.symbol)}
      onKeyDown={(e) => {
        if (e.key === "Enter") onOpenPerformance?.(item.symbol);
      }}
      data-symbol={item.symbol}
    >
      <div className="card-top">
        <div className="card-title">
          <button
            className={`star-btn ${item.isFavorite ? "starred" : ""}`}
            aria-label={item.isFavorite ? "Remove from favorites" : "Add to favorites"}
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(item.symbol, !item.isFavorite); }}
          >
            {item.isFavorite ? "★" : "☆"}
          </button>
          <div>
            <div className="symbol">{item.symbol}</div>
            <div className="name muted">{item.name}</div>
          </div>
        </div>

        <label className="compare-select" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={!!compareSelected}
            onChange={() => onToggleCompareSelect(item.symbol)}
            aria-label={`Select ${item.symbol} for comparison`}
          />
          Compare
        </label>
      </div>

      <div className="card-price-row">
        <span className="price">₹{item.price?.toFixed(2)}</span>
        <span className={`pct ${changeUp ? "up" : "down"}`}>
          {changeUp ? "▲" : "▼"} {Math.abs(item.pctChangeSinceLastCheck)}%
        </span>
        <span className={`badge ${badge.cls}`}>{badge.label}</span>
        {item.isNew && <span className="badge badge-new">New</span>}
      </div>

      {changed && (
        <div className="meaningful-flag">
          ⚡ Meaningful move for your persona (threshold {item.thresholdUsed}% · z={item.zScore})
        </div>
      )}

      <div className="card-meta muted">
        {item.priceTarget != null && <span>🎯 Target ₹{item.priceTarget} · </span>}
        Updated {item.updatedAt}
      </div>

      {editing ? (
        <div className="edit-block" onClick={(e) => e.stopPropagation()}>
          <input
            type="number"
            placeholder="Price target"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          />
          <textarea
            placeholder="Notes…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="btn-row">
            <button onClick={save}>Save</button>
            <button className="secondary" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          {item.note && <div className="note-preview">📝 {item.note}</div>}
          <div className="btn-row" onClick={(e) => e.stopPropagation()}>
            <button className="secondary" onClick={() => setEditing(true)}>
              Edit note / target
            </button>
            <button
              className={`secondary ${alertActive ? "alert-on" : ""}`}
              onClick={() => onToggleAlert(item.symbol, !alertActive)}
            >
              {alertActive ? "🔔 Alert on" : "🔕 Set alert"}
            </button>
            <button className="danger" onClick={() => onRemove(item.symbol)}>
              Remove
            </button>
          </div>
        </>
      )}
    </div>
  );
});

export default WatchlistCard;
