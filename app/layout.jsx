import { Inter } from "next/font/google";
import "./globals.css";
import ParticleBackground from "./components/ParticleBackground";
import Footer from "./footer";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Secure Live Clipboard",
  description: "End-to-end encrypted live clipboard.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ParticleBackground />
        <main className="relative z-10">{children}</main>
      <Footer/>
      </body>
      
    </html>
  );
}