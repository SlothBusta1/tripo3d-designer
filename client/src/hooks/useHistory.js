import { useState, useCallback } from "react";

const STORAGE_KEY = "tripo3d_history";
const MAX_ENTRIES = 10;

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function useHistory() {
  const [entries, setEntries] = useState(load);

  const addEntry = useCallback((entry) => {
    setEntries((prev) => {
      const next = [entry, ...prev].slice(0, MAX_ENTRIES);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    setEntries([]);
  }, []);

  return { entries, addEntry, clearAll };
}
