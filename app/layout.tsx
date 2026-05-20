import type { Metadata } from "next";
import Link from "next/link";
import { LogoMark } from "./components/LogoMark";
import { logout } from "./login/actions";
import { getCurrentUser } from "@/src/lib/supabase/server";
import "./globals.css";

export const metadata: Metadata = {
  title: "L'Edifice - Cockpit IA prive",
  description:
    "Portail officiel de L'Edifice, cockpit IA prive pour organiser, generer, planifier et piloter des contenus multi-plateformes.",
};

const navLinks = [
  { href: "/", label: "Accueil" },
  { href: "/features", label: "Fonctionnalites" },
  { href: "/contact", label: "Contact" },
];

const footerLinks = [
  { href: "/", label: "Accueil" },
  { href: "/features", label: "Fonctionnalites" },
  { href: "/privacy", label: "Confidentialite" },
  { href: "/terms", label: "Conditions" },
  { href: "/contact", label: "Contact" },
];

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();

  return (
    <html lang="fr" className="h-full antialiased">
      <body className="min-h-full bg-[#070B12] text-[#F4F7FB]">
        <div className="flex min-h-screen flex-col">
          <header className="sticky top-0 z-50 border-b border-[#223149] bg-[#070B12]/92 backdrop-blur">
            <nav className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-4 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
              <Link href="/" className="flex items-center gap-3">
                <LogoMark size="sm" priority />
                <span>
                  <span className="block text-base font-semibold tracking-wide text-[#F4F7FB]">
                    L&apos;Edifice
                  </span>
                  <span className="block text-xs text-[#9EADBF]">
                    Cockpit IA prive
                  </span>
                </span>
              </Link>
              <div className="flex flex-wrap items-center gap-2 text-sm text-[#9EADBF]">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="rounded-md px-3 py-2 transition hover:bg-[#111D2E] hover:text-[#7DD3FC] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                  >
                    {link.label}
                  </Link>
                ))}
                {user ? (
                  <>
                    <Link
                      href="/interface"
                      className="rounded-md border border-[#223149] px-3 py-2 font-semibold text-[#7DD3FC] transition hover:bg-[#111D2E] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                    >
                      Interface
                    </Link>
                    <form action={logout}>
                      <button
                        type="submit"
                        className="rounded-md bg-[#111D2E] px-3 py-2 font-semibold text-[#F4F7FB] transition hover:bg-[#1E293B] hover:text-[#7DD3FC] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                      >
                        Deconnexion
                      </button>
                    </form>
                  </>
                ) : (
                  <Link
                    href="/login"
                    className="rounded-md bg-[#38BDF8] px-3 py-2 font-semibold text-[#070B12] transition hover:bg-[#7DD3FC] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                  >
                    Connexion
                  </Link>
                )}
              </div>
            </nav>
          </header>

          <main className="flex-1">{children}</main>

          <footer className="border-t border-[#223149] bg-[#070B12]">
            <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-8 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex gap-4">
                <LogoMark size="sm" />
                <div>
                <p className="text-sm font-semibold text-[#F4F7FB]">L&apos;Edifice</p>
                <p className="mt-1 max-w-xl text-sm leading-6 text-[#9EADBF]">
                  Portail officiel d&apos;une version privee en developpement.
                  Le Cockpit local Streamlit reste l&apos;interface
                  operationnelle.
                </p>
                <p className="mt-2 text-sm text-[#9EADBF]">
                  Adresse de contact officielle provisoire :
                  contact.edificeia@gmail.com
                </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 text-sm text-[#9EADBF]">
                {footerLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="rounded-md px-3 py-2 transition hover:bg-[#111D2E] hover:text-[#7DD3FC] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
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
