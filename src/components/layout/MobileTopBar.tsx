import type { UserProfile } from '@/types/auth';
import { BrandMark } from './BrandMark';
import styles from './MobileTopBar.module.css';
import { UserMenu } from './UserMenu';

type MobileTopBarProps = { profile: UserProfile; onLogout: () => void; onOpenProfile: () => void };

/** Barra superior del celular: logo y menú de cuenta. */
export function MobileTopBar({ profile, onLogout, onOpenProfile }: MobileTopBarProps) {
  return (
    <header className={styles.bar}>
      <BrandMark inverse />
      <UserMenu profile={profile} onLogout={onLogout} onOpenProfile={onOpenProfile} />
    </header>
  );
}
