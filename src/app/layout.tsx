import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
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
        <SiteHeader />
        {children}
        <footer className="site-footer">
          <div className="footer-inner">
            <div>
              <strong>Keep the recipe. Find a way forward.</strong>
              <p>AI-assisted cooking guidance. Food safety comes first.</p>
            </div>
            <Link href="/about">How it works & privacy</Link>
          </div>
        </footer>
      </body>
    </html>
  );
}
