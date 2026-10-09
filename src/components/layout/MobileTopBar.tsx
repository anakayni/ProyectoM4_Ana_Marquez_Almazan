import type { UserProfile } from '@/types/auth';
import { BrandMark } from './BrandMark';
import styles from './MobileTopBar.module.css';
import { UserMenu } from './UserMenu';

/** Barra superior del celular: logo y menú de cuenta. */
export function MobileTopBar({ profile, onLogout }: { profile: UserProfile; onLogout: () => void }) {
  return (
    <header className={styles.bar}>
      <BrandMark inverse />
      <UserMenu profile={profile} onLogout={onLogout} />
    </header>
  );
}
