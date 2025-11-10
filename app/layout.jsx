import dynamic from 'next/dynamic';
  import Footer from "./footer";
  import ClientOnly from './components/ClientOnly';
  import "./globals.css";

  const DynamicParticleBackground = dynamic(
    () => import('./components/ParticleBackground')
  );

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
        <header>
        <script defer src="https://umami.mpst.me/script.js" data-website-id="dd2446f6-ca34-45d9-9967-b055d3b75afc"></script>
        </header>
          <ClientOnly>
            <DynamicParticleBackground />
          </ClientOnly>
          <main className="relative z-10">
            {children}
          </main>
          <Footer/>
        </body>
      </html>
    );
  }