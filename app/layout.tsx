import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "L'Edifice - Cockpit IA prive",
  description:
    "Portail officiel de L'Edifice, cockpit IA prive pour organiser, generer, planifier et piloter des contenus multi-plateformes.",
};

const navLinks = [
  { href: "/", label: "Accueil" },
  { href: "/features", label: "Fonctionnalites" },
  { href: "/login", label: "Connexion" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/contact", label: "Contact" },
];

const footerLinks = [
  { href: "/", label: "Accueil" },
  { href: "/features", label: "Fonctionnalites" },
  { href: "/privacy", label: "Confidentialite" },
  { href: "/terms", label: "Conditions" },
  { href: "/contact", label: "Contact" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="h-full antialiased">
      <body className="min-h-full bg-[#0b0f14] text-slate-100">
        <div className="flex min-h-screen flex-col">
          <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0b0f14]/90 backdrop-blur">
            <nav className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-4 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
              <Link href="/" className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-lg border border-cyan-300/30 bg-cyan-300/10 font-mono text-sm font-semibold text-cyan-200">
                  LE
                </span>
                <span>
                  <span className="block text-base font-semibold tracking-wide text-white">
                    L&apos;Edifice
                  </span>
                  <span className="block text-xs text-slate-400">
                    Cockpit IA prive
                  </span>
                </span>
              </Link>
              <div className="flex flex-wrap items-center gap-2 text-sm text-slate-300">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="rounded-md px-3 py-2 transition hover:bg-white/8 hover:text-white"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </nav>
          </header>

          <main className="flex-1">{children}</main>

          <footer className="border-t border-white/10 bg-[#080b0f]">
            <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-8 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold text-white">L&apos;Edifice</p>
                <p className="mt-1 max-w-xl text-sm leading-6 text-slate-400">
                  Portail officiel d&apos;une version privee en developpement.
                  Le Cockpit local Streamlit reste l&apos;interface
                  operationnelle.
                </p>
                <p className="mt-2 text-sm text-slate-400">
                  Adresse de contact officielle provisoire :
                  contact.edificeia@gmail.com
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-sm text-slate-400">
                {footerLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="rounded-md px-3 py-2 transition hover:bg-white/8 hover:text-white"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
