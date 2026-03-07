/**
 * DART Frontend — Root Layout
 */
import "./globals.css";

export const metadata = {
  title: "DART — Dynamic Routing & Alert Triage",
  description: "SOC Dashboard for automated alert enrichment, scoring, and playbook routing",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">{children}</body>
    </html>
  );
}
