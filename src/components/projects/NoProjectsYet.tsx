import styles from './NoProjectsYet.module.css';

/** Lo que ve un Invitado mientras el admin no lo agrega a ningún proyecto. */
export function NoProjectsYet() {
  return (
    <div className={styles.box} role="status">
      <p className={styles.title}>Todavía no tienes proyectos asignados.</p>
      <p>El administrador te agregará.</p>
    </div>
  );
}
