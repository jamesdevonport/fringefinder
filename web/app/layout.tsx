import type { Metadata } from "next";
import { Bricolage_Grotesque, Inter } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import Script from "next/script";
import { BookmarksNavLink } from "@/components/BookmarksNavLink";
import { JsonLd } from "@/components/JsonLd";
import { SITE_URL } from "@/lib/seo";
import { GENRES } from "@/lib/seo";
import "./globals.css";

const GA_MEASUREMENT_ID = "G-NBPPL87BTE";

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

const SITE_TITLE = "Fringe Finder — an unofficial guide to Brighton Fringe 2026";
const SITE_DESCRIPTION =
  "A fan-made, interactive directory of Brighton Fringe 2026 events. Wander the bubble-graph, search by venue or date, or let the AI match you to shows.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: "%s | Fringe Finder",
  },
  description: SITE_DESCRIPTION,
  applicationName: "Fringe Finder",
  alternates: { canonical: "/" },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    type: "website",
    siteName: "Fringe Finder",
    locale: "en_GB",
    url: "/",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Fringe Finder — unofficial Brighton Fringe 2026 directory",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/og-image.jpg"],
  },
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Fringe Finder",
  alternateName: "Fringe Finder — unofficial Brighton Fringe 2026 guide",
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  inLanguage: "en-GB",
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${SITE_URL}/browse/?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Fringe Finder",
  url: SITE_URL,
  logo: `${SITE_URL}/fringe-finder-logo.png`,
  description:
    "Fan-made, unofficial directory of Brighton Fringe 2026 events. All data is scraped from brightonfringe.org.",
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
        <JsonLd data={[websiteSchema, organizationSchema]} />
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="ga-init" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_MEASUREMENT_ID}');`}
        </Script>
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
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2 flex items-center gap-2 sm:gap-6">
        <Link href="/" className="flex items-center gap-3 group shrink-0">
          <Image
            src="/fringe-finder-logo.png"
            alt="Fringe Finder"
            width={360}
            height={240}
            priority
            className="h-12 sm:h-20 lg:h-24 w-auto"
            sizes="(min-width: 1024px) 300px, (min-width: 640px) 240px, 140px"
          />
          <span className="sr-only">Fringe Finder</span>
          <span className="text-[10px] sm:text-xs uppercase tracking-[0.22em] text-ink-soft font-bold mt-4 hidden sm:inline-block">
            Unofficial
          </span>
        </Link>
        <nav className="ml-auto flex items-center gap-0.5 sm:gap-1 text-sm">
          <NavLink href="/browse">Browse</NavLink>
          <NavLink href="/calendar" hideOnXs>
            Calendar
          </NavLink>
          <NavLink href="/explore" hideOnXs>
            Wander
          </NavLink>
          <BookmarksNavLink />
          <NavLink href="/match" primary>
            <span className="sm:hidden">Match</span>
            <span className="hidden sm:inline">Match me</span>
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
  hideOnXs,
}: {
  href: string;
  children: React.ReactNode;
  primary?: boolean;
  hideOnXs?: boolean;
}) {
  const hidden = hideOnXs ? "hidden sm:inline-flex" : "inline-flex";
  if (primary) {
    return (
      <Link
        href={href}
        className={`${hidden} items-center px-2.5 sm:px-3 py-1.5 rounded-full font-medium border-2 border-ink transition-colors whitespace-nowrap`}
        style={{ background: "var(--color-purple)", color: "white" }}
      >
        {children}
      </Link>
    );
  }
  return (
    <Link
      href={href}
      className={`${hidden} items-center px-2 sm:px-3 py-1.5 rounded-full hover:bg-ink hover:text-cream transition-colors font-medium whitespace-nowrap`}
    >
      {children}
    </Link>
  );
}

function SiteFooter() {
  const topGenres = GENRES.slice(0, 6);
  const browseLinks = [
    { href: "/browse/", label: "All shows" },
    { href: "/free/", label: "Free shows" },
    { href: "/accessible/wheelchair-accessible/", label: "Wheelchair-accessible" },
    { href: "/for/family/", label: "Family-friendly" },
    { href: "/for/kids/", label: "For kids" },
  ];
  const monthDates = [
    { href: "/on/2026-05-01/", label: "Opening day · 1 May" },
    { href: "/on/2026-05-02/", label: "Sat 2 May" },
    { href: "/on/2026-05-09/", label: "Sat 9 May" },
    { href: "/on/2026-05-16/", label: "Sat 16 May" },
    { href: "/on/2026-05-23/", label: "Sat 23 May" },
    { href: "/on/2026-05-31/", label: "Closing day · 31 May" },
  ];
  return (
    <footer className="mt-24 border-t-2 border-ink bg-paper">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid gap-8 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <p
              className="text-xs font-semibold uppercase tracking-[0.2em] mb-3"
              style={{ color: "var(--color-purple-deep)" }}
            >
              About
            </p>
            <p className="text-sm ink-soft max-w-sm">
              <span className="font-display font-semibold text-ink">
                Fringe Finder
              </span>{" "}
              is an unofficial, fan-made directory. All event information is
              scraped from{" "}
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
            <p className="text-xs ink-soft mt-4">
              Built by{" "}
              <a
                href="https://x.com/jamesdevonport"
                target="_blank"
                rel="noopener noreferrer"
                className="wobble-underline font-semibold"
              >
                @jamesdevonport
              </a>{" "}
              · ✦ Made with squiggles &amp; glee
            </p>
          </div>

          <FooterColumn
            title="Browse"
            links={browseLinks.map((l) => ({ href: l.href, label: l.label }))}
          />
          <FooterColumn
            title="By genre"
            links={topGenres.map((g) => ({
              href: `/genre/${g.slug}/`,
              label: g.name,
            }))}
          />
          <FooterColumn title="By date" links={monthDates} />
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div>
      <p
        className="text-xs font-semibold uppercase tracking-[0.2em] mb-3"
        style={{ color: "var(--color-purple-deep)" }}
      >
        {title}
      </p>
      <ul className="space-y-1.5 text-sm">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="wobble-underline ink-soft">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
