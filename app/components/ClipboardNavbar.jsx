// components/ClipboardNavbar.js
import { Share2, LogOut, Trash2, Wifi, WifiOff, Database } from 'lucide-react';

export default function ClipboardNavbar({ 
  connectionStatus = { socket: 'disconnected', mongodb: 'disconnected' }, 
  onShare = () => {}, 
  onDeleteRoom = () => {}, 
  onLogout = () => {} 
}) {
  const isConnected = connectionStatus.socket === 'connected';
  
  const styles = {
    navbar: {
      background: 'rgba(0, 0, 0, 0.6)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderBottom: '1px solid rgba(56, 189, 248, 0.3)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), 0 0 20px rgba(56, 189, 248, 0.1)',
      padding: '1rem 0',
      width: '100%',
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 9999
    },
    navContainer: {
      width: '100%',
      maxWidth: '1200px',
      margin: '0 auto',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '0 2rem',
      gap: '2rem'
    },
    logo: {
      color: 'white',
      textDecoration: 'none',
      fontSize: '1.3rem',
      fontWeight: 400,
      lineHeight: 1.2,
      display: 'flex',
      alignItems: 'center',
      textShadow: '0 0 10px rgba(56, 189, 248, 0.5)'
    },
    connectionStatus: {
      display: 'flex',
      alignItems: 'center',
      gap: '1.5rem',
      flex: 1,
      justifyContent: 'center'
    },
    statusItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      fontSize: '0.75rem',
      fontWeight: 300,
      padding: '0.25rem 0.75rem',
      borderRadius: '12px',
      border: '1px solid rgba(56, 189, 248, 0.2)',
      background: 'rgba(56, 189, 248, 0.1)',
      transition: 'all 0.3s ease'
    },
    connected: {
      color: '#4ade80',
      textShadow: '0 0 8px rgba(74, 222, 128, 0.6)',
      borderColor: 'rgba(74, 222, 128, 0.3)',
      background: 'rgba(74, 222, 128, 0.1)'
    },
    disconnected: {
      color: '#ef4444',
      textShadow: '0 0 8px rgba(239, 68, 68, 0.6)',
      borderColor: 'rgba(239, 68, 68, 0.3)',
      background: 'rgba(239, 68, 68, 0.1)'
    },
    navActions: {
      display: 'flex',
      alignItems: 'center',
      gap: '1.5rem'
    },
    navButton: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      background: 'none',
      border: '1px solid rgba(56, 189, 248, 0.3)',
      borderRadius: '8px',
      color: '#38bdf8',
      textDecoration: 'none',
      padding: '0.5rem 1rem',
      transition: 'all 0.3s ease',
      fontWeight: 300,
      fontSize: '0.9rem',
      lineHeight: 1.2,
      cursor: 'pointer',
      textShadow: '0 0 8px rgba(56, 189, 248, 0.4)',
      boxShadow: '0 0 10px rgba(56, 189, 248, 0.2)'
    },
    navButtonHover: {
      color: '#0ea5e9',
      borderColor: 'rgba(14, 165, 233, 0.5)',
      background: 'rgba(56, 189, 248, 0.1)',
      textShadow: '0 0 12px rgba(14, 165, 233, 0.6)',
      boxShadow: '0 0 15px rgba(14, 165, 233, 0.3)',
      transform: 'translateY(-1px)'
    },
    deleteButton: {
      color: '#ef4444',
      borderColor: 'rgba(239, 68, 68, 0.3)',
      textShadow: '0 0 8px rgba(239, 68, 68, 0.4)',
      boxShadow: '0 0 10px rgba(239, 68, 68, 0.2)'
    },
    deleteButtonHover: {
      color: '#dc2626',
      borderColor: 'rgba(220, 38, 38, 0.5)',
      background: 'rgba(239, 68, 68, 0.1)',
      textShadow: '0 0 12px rgba(220, 38, 38, 0.6)',
      boxShadow: '0 0 15px rgba(220, 38, 38, 0.3)',
      transform: 'translateY(-1px)'
    }
  };

  // Responsive styles for mobile
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
  
  if (isMobile) {
    styles.navContainer = {
      ...styles.navContainer,
      flexDirection: 'column',
      gap: '1rem',
      padding: '0 1rem'
    };
    styles.connectionStatus = {
      ...styles.connectionStatus,
      flexDirection: 'column',
      gap: '0.5rem'
    };
    styles.navActions = {
      ...styles.navActions,
      gap: '1rem'
    };
  }

  return (
    <nav style={styles.navbar}>
      <div style={styles.navContainer}>
        <div style={styles.logo}>
          <span>Live Clipboard</span>
        </div>
        
        {/* <div style={styles.connectionStatus}>
          <div style={{
            ...styles.statusItem,
            ...(isConnected ? styles.connected : styles.disconnected)
          }}>
            {isConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
            <span>Socket: {connectionStatus.socket}</span>
          </div>
          <div style={{
            ...styles.statusItem,
            ...(connectionStatus.mongodb === 'connected' ? styles.connected : styles.disconnected)
          }}>
            <Database size={14} />
            <span>Database: {connectionStatus.mongodb}</span>
          </div>
        </div> */}
        
        <div style={styles.navActions}>
          <button 
            onClick={onShare} 
            style={styles.navButton}
            type="button"
            aria-label="Share room"
            onMouseEnter={(e) => Object.assign(e.target.style, styles.navButtonHover)}
            onMouseLeave={(e) => Object.assign(e.target.style, styles.navButton)}
          >
            <Share2 size={18} />
            {!isMobile && <span>Share</span>}
          </button>
          <button 
            onClick={onDeleteRoom} 
            style={{...styles.navButton, ...styles.deleteButton}}
            type="button"
            aria-label="Delete room"
            onMouseEnter={(e) => Object.assign(e.target.style, {...styles.deleteButton, ...styles.deleteButtonHover})}
            onMouseLeave={(e) => Object.assign(e.target.style, {...styles.navButton, ...styles.deleteButton})}
          >
            <Trash2 size={18} />
            {!isMobile && <span>Delete Room</span>}
          </button>
          <button 
            onClick={onLogout} 
            style={styles.navButton}
            type="button"
            aria-label="Logout"
            onMouseEnter={(e) => Object.assign(e.target.style, styles.navButtonHover)}
            onMouseLeave={(e) => Object.assign(e.target.style, styles.navButton)}
          >
            <LogOut size={18} />
            {!isMobile && <span>Logout</span>}
          </button>
        </div>
      </div>
    </nav>
  );
}