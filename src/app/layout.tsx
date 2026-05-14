import "./globals.css";

export const metadata = {
  title: "WhatsApp Agent Dashboard",
  description: "Agent Dashboard for Meta Cloud API",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="antialiased min-h-screen bg-gray-50">{children}</body>
    </html>
  );
}
