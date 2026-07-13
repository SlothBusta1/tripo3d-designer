import Designer from "./components/Designer";
import styles from "./App.module.css";

export default function App() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.glow} aria-hidden="true" />
        <div className={styles.headerInner}>
          <h1 className={styles.title}>Tripo3D Designer</h1>
          <p className={styles.subtitle}>
            Turn a prompt or photo into a print-ready 3D model in minutes — preview it in 3D, then send it straight to checkout.
          </p>
        </div>
      </header>
      <main className={styles.main}>
        <Designer />
      </main>
    </div>
  );
}
