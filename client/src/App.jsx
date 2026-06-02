import Designer from "./components/Designer";
import styles from "./App.module.css";

export default function App() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div>
            <h1 className={styles.title}>Tripo3D Designer</h1>
            <p className={styles.subtitle}>Generate custom 3D models from text or images</p>
          </div>
        </div>
      </header>
      <main className={styles.main}>
        <Designer />
      </main>
    </div>
  );
}
