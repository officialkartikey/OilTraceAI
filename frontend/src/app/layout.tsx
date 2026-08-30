import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "Kairos | Tactical Dashboard",
  description: "Maritime Intelligence & Source Attribution System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossOrigin="" />
      </head>
      <body>
        <Providers>
          <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
            <Sidebar />
            <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
              {children}
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
