import { Inter } from "next/font/google";
import "./globals.css";
import ParticleBackground from "./components/ParticleBackground";
import Footer from "./footer";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Live Clipboard",
  description: "End-to-end encrypted live clipboard",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-black`}>
        <ParticleBackground />
        {/* The z-10 ensures all content renders on top of the particles */}
        <main className="relative z-10 min-h-screen flex flex-col">
          <div className="flex-grow">
            {children}
          </div>
          <Footer/>
        </main>
      </body>
    </html>
  );
}
