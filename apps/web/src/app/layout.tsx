import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PromoCards SV",
  description: "Promociones de tarjetas de crédito salvadoreñas consolidadas",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
