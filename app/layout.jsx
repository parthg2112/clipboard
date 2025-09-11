import "./globals.css";
import ParticleBackground from "./components/ParticleBackground";
import Footer from "./footer";

export const metadata = {
  title: "Live Clipboard",
  description: "End-to-end encrypted live clipboard",
  icons: {
    icon: '/icon.png',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <header>
      <script defer src="https://umami.mpst.me/script.js" data-website-id="dd2446f6-ca34-45d9-9967-b055d3b75afc"></script>
      </header>
      <body>
        <ParticleBackground />
        <main className="relative z-10">
          {children}
        </main>
        <Footer/>
      </body>
    </html>
  );
}