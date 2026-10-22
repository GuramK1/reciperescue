"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function SiteHeader() {
  const home = usePathname() === "/";
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link className="wordmark" href="/" aria-label="RecipeRescue home">
          RecipeRescue
        </Link>
        <Link
          className="header-link"
          href={home ? "/rescue" : "/#how-it-works"}
        >
          {home ? "Start a rescue" : "How it works"}
        </Link>
      </div>
    </header>
  );
}
