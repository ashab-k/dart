/**
 * DART Backend — Root Layout
 */
import "./globals.css";

export const metadata = {
  title: "DART Backend",
  description: "Dynamic Routing & Alert Triage — API Service",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
