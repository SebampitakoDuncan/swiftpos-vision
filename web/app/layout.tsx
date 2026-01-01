import "./globals.css";

export const metadata = {
  title: "SwiftPOS Vision Demo",
  description: "Real-time item detection for POS workflows.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
