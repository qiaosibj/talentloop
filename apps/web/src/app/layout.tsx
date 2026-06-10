import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TalentLoop — talent pool reactivation demo",
  description:
    "Turn every resume a company has ever received into a living talent asset. Demo with synthetic data — AI ranks and explains, humans decide.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <a className="logo" href="/">
            Talent<span>Loop</span>
          </a>
          <nav>
            <a href="https://github.com/qiaosibj/talentloop" target="_blank" rel="noreferrer">
              GitHub
            </a>
          </nav>
        </header>
        {children}
        <footer className="site-footer">
          Demo with synthetic data only · AI ranks and explains, humans decide · GDPR-first by design
        </footer>
      </body>
    </html>
  );
}
