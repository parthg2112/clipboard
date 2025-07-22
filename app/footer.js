// footer.js
import styles from './footer.module.css'

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <p className={styles.text}>
        Made with ❤️ by <a href="https://github.com/parthg2112" className={styles.link} target="_blank" rel="noopener noreferrer">Parth G.</a>
      </p>
    </footer>
  )
}