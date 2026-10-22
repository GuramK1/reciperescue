import type { Metadata } from "next";
import Link from "next/link";
import "@fontsource/manrope/600.css";
import "@fontsource/manrope/700.css";
import "@fontsource/source-sans-3/400.css";
import "@fontsource/source-sans-3/600.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "RecipeRescue — Find a way forward",
  description:
    "A practical cooking troubleshooting tool. Tell us what went wrong and work out what to try next.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <header className="site-header">
          <div className="header-inner">
            <Link className="wordmark" href="/" aria-label="RecipeRescue home">
              <span className="brand-mark" aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
              RecipeRescue
            </Link>
            <span className="header-note">A little help in the kitchen</span>
            <Link className="header-link" href="/rescue">
              Start a rescue
            </Link>
          </div>
        </header>
        {children}
        <footer className="site-footer">
          <div className="footer-inner">
            <div>
              <strong>Keep the recipe. Find a way forward.</strong>
              <p>RecipeRescue · A cooking troubleshooting tool</p>
            </div>
            <Link href="/about">How it works & privacy</Link>
          </div>
        </footer>
      </body>
    </html>
  );
}
