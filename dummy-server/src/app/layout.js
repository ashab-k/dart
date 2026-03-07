import "./globals.css";

export const metadata = {
  title: "Dummy Server — DART",
  description: "Simulated production server for DART demo",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
