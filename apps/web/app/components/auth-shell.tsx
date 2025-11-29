import type { ReactNode } from "react";
import styles from "./auth-shell.module.css";

type AuthShellProps = {
  children: ReactNode;
  hero: ReactNode;
};

export function AuthShell({ children, hero }: AuthShellProps) {
  return (
    <div className={styles.shell}>
      <div className={styles.glowOne} />
      <div className={styles.glowTwo} />
      <div className={styles.grid}>
        <section className={styles.panel}>{children}</section>
        <aside className={styles.hero}>{hero}</aside>
      </div>
    </div>
  );
}


