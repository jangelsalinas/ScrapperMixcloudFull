import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mixcloud Episode Scraper",
  description: "Una aplicación para obtener episodios de Mixcloud",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
