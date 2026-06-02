import styles from "./HistoryPanel.module.css";

function formatAge(ts) {
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function HistoryPanel({ entries, onSelect, selectedId, onClear }) {
  if (!entries.length) return null;

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>Recent generations</span>
        <button className={styles.clearBtn} onClick={onClear} type="button">
          Clear all
        </button>
      </div>

      <div className={styles.list}>
        {entries.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className={`${styles.item} ${entry.id === selectedId ? styles.selected : ""}`}
            onClick={() => onSelect(entry)}
          >
            <div className={styles.thumb}>
              {entry.thumbnail ? (
                <img src={entry.thumbnail} alt="" className={styles.thumbImg} />
              ) : (
                <CubeIcon />
              )}
            </div>
            <div className={styles.info}>
              <span className={styles.label}>{entry.label}</span>
              <span className={styles.meta}>
                <span className={`${styles.modeBadge} ${styles[entry.mode]}`}>
                  {entry.mode === "text" ? "Text" : "Image"}
                </span>
                {formatAge(entry.timestamp)}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function CubeIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    </svg>
  );
}
