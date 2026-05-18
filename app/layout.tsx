import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Meta Ads Optimizer",
  description:
    "Conecta tu cuenta de Meta Ads, analiza el rendimiento con IA y recibe recomendaciones de optimización accionables.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
