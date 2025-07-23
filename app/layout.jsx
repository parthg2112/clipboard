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