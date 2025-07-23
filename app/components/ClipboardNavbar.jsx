// app/components/ClipboardNavbar.jsx
import styles from './ClipboardNavbar.module.css';

export default function ClipboardNavbar({
  onShare = () => {},
  onDeleteRoom = () => {},
  onLogout = () => {}
}) {
  return (
    <nav className={styles.navbar}>
      <div className={styles.navContainer}>
        <div className={styles.logo}>
          <span>clipboard</span>
        </div>
        
        <div className={styles.navActions}>
          <button onClick={onShare} className={styles.navButton}>
            share
          </button>
          
          <button onClick={onDeleteRoom} className={styles.navButton}>
            delete
          </button>
          
          <button onClick={onLogout} className={styles.navButton}>
            logout
          </button>
        </div>
      </div>
    </nav>
  );
}