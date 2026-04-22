import type { Metadata } from "next";
import { Bricolage_Grotesque, Inter } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import { BookmarksNavLink } from "@/components/BookmarksNavLink";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  display: "swap",
  axes: ["wdth", "opsz"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Fringe Finder — an unofficial guide to Brighton Fringe 2026",
  description:
    "A fan-made, interactive directory of Brighton Fringe 2026 events. Wander the bubble-graph, search by venue or date, or let the AI match you to shows.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${bricolage.variable} ${inter.variable}`}
    >
      <body className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}

function SiteHeader() {
  return (
    <header
      className="relative"
      style={{ background: "#FFFFFF" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex items-center gap-6">
        <Link href="/" className="flex items-center gap-3 group">
          <Image
            src="/fringe-finder-logo.png"
            alt="Fringe Finder"
            width={360}
            height={240}
            priority
            className="h-16 sm:h-20 lg:h-24 w-auto"
            sizes="(min-width: 1024px) 300px, (min-width: 640px) 240px, 180px"
          />
          <span className="sr-only">Fringe Finder</span>
          <span className="text-[10px] sm:text-xs uppercase tracking-[0.22em] text-ink-soft font-bold mt-4 hidden sm:inline-block">
            Unofficial
          </span>
        </Link>
        <nav className="ml-auto flex items-center gap-1 text-sm">
          <NavLink href="/browse">Browse</NavLink>
          <NavLink href="/calendar">Calendar</NavLink>
          <NavLink href="/explore">Wander</NavLink>
          <BookmarksNavLink />
          <NavLink href="/match" primary>
            Match me
          </NavLink>
        </nav>
      </div>

      {/* Brush-stroke bottom edge — echoes the logo's painted lettering */}
      <div
        aria-hidden="true"
        className="absolute left-0 right-0 -bottom-[1px] pointer-events-none"
        style={{ height: 18 }}
      >
        <svg
          viewBox="0 0 1440 18"
          preserveAspectRatio="none"
          width="100%"
          height="18"
        >
          <defs>
            <linearGradient id="brushStroke" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#7F3F98" />
              <stop offset="45%" stopColor="#AB1DFE" />
              <stop offset="100%" stopColor="#330968" />
            </linearGradient>
          </defs>
          <path
            d="M-10 10 C 140 1, 260 17, 420 8 S 720 2, 900 12 S 1180 17, 1330 6 S 1440 14, 1450 8 L 1450 18 L -10 18 Z"
            fill="url(#brushStroke)"
            style={{ filter: "drop-shadow(0 1px 0 rgba(26,23,20,0.2))" }}
          />
          <path
            d="M-10 11 C 140 4, 260 16, 420 9 S 720 4, 900 12 S 1180 16, 1330 7 S 1440 13, 1450 9"
            fill="none"
            stroke="rgba(255,255,255,0.25)"
            strokeWidth="1"
          />
        </svg>
      </div>
    </header>
  );
}

function NavLink({
  href,
  children,
  primary,
}: {
  href: string;
  children: React.ReactNode;
  primary?: boolean;
}) {
  if (primary) {
    return (
      <Link
        href={href}
        className="px-3 py-1.5 rounded-full font-medium border-2 border-ink transition-colors"
        style={{ background: "var(--color-purple)", color: "white" }}
      >
        {children}
      </Link>
    );
  }
  return (
    <Link
      href={href}
      className="px-3 py-1.5 rounded-full hover:bg-ink hover:text-cream transition-colors font-medium"
    >
      {children}
    </Link>
  );
}

function SiteFooter() {
  return (
    <footer className="mt-24 border-t-2 border-ink bg-paper">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 text-sm flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <p className="max-w-xl ink-soft">
          <span className="font-display font-semibold text-ink">Fringe Finder</span> is an
          unofficial, fan-made directory. All event information is scraped from{" "}
          <a
            href="https://www.brightonfringe.org"
            className="wobble-underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            brightonfringe.org
          </a>{" "}
          — please book tickets through them.
        </p>
        <p
          className="text-sm font-semibold uppercase tracking-wider"
          style={{ color: "var(--color-purple-deep)" }}
        >
          ✦ Made with squiggles &amp; glee
        </p>
      </div>
    </footer>
  );
}
