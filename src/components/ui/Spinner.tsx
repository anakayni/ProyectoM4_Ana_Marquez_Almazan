import styles from './Spinner.module.css';

export function Spinner({ label }: { label: string }) {
  return (
    <div role="status" className={styles.wrapper}>
      <span className={styles.spinner} aria-hidden="true" />
      <span className="visually-hidden">{label}</span>
    </div>
  );
}
