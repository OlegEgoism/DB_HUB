
import clsx from 'clsx';
import styles from '../detail-page.module.scss';

interface Props {
  isActive: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

export function DetailTabButton({ isActive, onClick, children }: Props) {
  return (
    <button
      className={clsx(styles.tabButton, isActive && styles.tabButton_active)}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}