import { useEffect, useRef, useState } from "react";
import { api } from "./api.js";

export default function SymbolSearch({ onAdd }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const data = await api.searchSymbols(query);
        setResults(data.results || []);
        setOpen(true);
        setActiveIndex(-1);
      } catch {
        setResults([]);
      }
    }, 200); // debounce
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function onClickOutside(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function choose(item) {
    onAdd(item.symbol);
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  // Feature 4: keyboard navigation through the autocomplete list
  function onKeyDown(e) {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      choose(results[activeIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="symbol-search" ref={boxRef}>
      <input
        type="text"
        placeholder="Search symbol or company… (e.g. TCS)"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => results.length && setOpen(true)}
        aria-label="Search stocks to add to watchlist"
        aria-expanded={open}
        role="combobox"
      />
      {open && results.length > 0 && (
        <ul className="autocomplete-list" role="listbox">
          {results.map((r, i) => (
            <li
              key={r.symbol}
              role="option"
              aria-selected={i === activeIndex}
              className={i === activeIndex ? "active" : ""}
              onMouseDown={() => choose(r)}
              onMouseEnter={() => setActiveIndex(i)}
            >
              <strong>{r.symbol}</strong> — {r.name}
              <span className="sector-tag">{r.sector}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
