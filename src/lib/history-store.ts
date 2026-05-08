import { useEffect, useState } from "react";

export interface HistoryEntry {
  id: string;
  name: string;
  originalSize: number;
  resultSize: number;
  resultWidth: number;
  resultHeight: number;
  format: string;
  createdAt: number;
}

const KEY = "dbk-history-v1";
const MAX = 50;

function read(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}

function write(entries: HistoryEntry[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(entries.slice(0, MAX)));
  window.dispatchEvent(new Event("dbk-history-update"));
}

export function addHistory(entry: HistoryEntry) {
  const list = [entry, ...read()];
  write(list);
}

export function clearHistory() {
  write([]);
}

export function useHistory() {
  const [list, setList] = useState<HistoryEntry[]>([]);
  useEffect(() => {
    setList(read());
    const handler = () => setList(read());
    window.addEventListener("dbk-history-update", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("dbk-history-update", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);
  return list;
}