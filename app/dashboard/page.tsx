import type { Metadata } from "next";
import Link from "next/link";
import { OAuthResultNotice } from "@/components/cockpit/OAuthResultNotice";
import { SectionContainer } from "@/components/cockpit/SectionContainer";
import { StatusBadge } from "@/components/cockpit/StatusBadge";
import { readCockpitState } from "@/lib/server/cockpit/read-only-state";
import { logout } from "../login/actions";
import { requirePrivateCockpitAccess } from "@/src/lib/auth/guards";
import type {
  CockpitOAuthState,
  CockpitReadOnlyState,
  CockpitStatus,
} from "@/types/cockpit";

export const metadata: Metadata = {
  title: "Dashboard - L'Edifice",
  description: "Accueil operationnel prive de L'Edifice.",
};

type PlatformCard = {
  name: string;
  status: CockpitStatus;
  summary: string;
  details: string[];
};

function getOAuthStatus(
  state: CockpitReadOnlyState,
  provider: string,
): CockpitOAuthState | null {
  return (
    state.oauthStatuses.find((status) => status.provider === provider) ?? null
  );
}

function hasExternalReview(state: CockpitReadOnlyState, name: string) {
  const normalized = name.toLowerCase();

  return state.externalReviews.some((review) =>
    review.name.toLowerCase().includes(normalized),
  );
}

function platformCards(state: CockpitReadOnlyState): PlatformCard[] {
  const tiktok = getOAuthStatus(state, "tiktok");
  const pinterest = getOAuthStatus(state, "pinterest");
  const meta = getOAuthStatus(state, "meta");
  const youtube = getOAuthStatus(state, "youtube");

  return [
    {
      name: "TikTok",
      status: hasExternalReview(state, "TikTok") ? "Review" : "En cours",
      summary: hasExternalReview(state, "TikTok")
        ? "Sandbox lisible, review produit en attente."
        : "Connexion TikTok a verifier.",
      details: [
        `OAuth: ${tiktok?.configured ? "configure" : "incomplet"}`,
        `Token: ${tiktok?.tokenPresent ? "present" : "absent"}`,
        "Sandbox fonctionnel: suivi en lecture seule",
        hasExternalReview(state, "TikTok")
          ? "Review en attente"
          : "Review externe non signalee",
      ],
    },
    {
      name: "Pinterest",
      status: "Review",
      summary: "Review externe en attente avant activation.",
      details: [
        `OAuth: ${pinterest?.configured ? "configure" : "incomplet"}`,
        `Token: ${pinterest?.tokenPresent ? "present" : "absent"}`,
        "Publication automatique bloquee",
        "Review en attente",
      ],
    },
    {
      name: "Instagram / Meta",
      status: meta?.tokenPresent ? "Operationnel" : "En cours",
      summary: meta?.tokenPresent
        ? "Meta connecte, publication a garder controlee."
        : "Connexion Meta a finaliser avant publication controlee.",
      details: [
        `OAuth Meta: ${meta?.configured ? "configure" : "incomplet"}`,
        `Token: ${meta?.tokenPresent ? "present" : "absent"}`,
        meta?.tokenPresent
          ? "Publication validee: a confirmer dans le test controle"
          : "Publication validee: non detectee",
        "Aucune publication depuis ce dashboard",
      ],
    },
    {
      name: "YouTube",
      status: youtube?.tokenPresent ? "Operationnel" : "En cours",
      summary: youtube?.tokenPresent
        ? "YouTube connecte, upload prive a garder controle."
        : "Connexion YouTube a verifier.",
      details: [
        `OAuth: ${youtube?.configured ? "configure" : "incomplet"}`,
        `Token: ${youtube?.tokenPresent ? "present" : "absent"}`,
        youtube?.tokenPresent
          ? "Upload prive valide: a verifier dans le test controle"
          : "Upload prive valide: non detecte",
        "Publication publique non activee",
      ],
    },
  ];
}

function buildRecommendations(state: CockpitReadOnlyState) {
  const recommendations = [
    ...(state.contentDrafts.readyToPublish.length > 0
      ? [
          `Finaliser ${state.contentDrafts.readyToPublish.length} brouillon(s) pret(s) a publier avant toute production media.`,
        ]
      : []),
    ...(state.contentDrafts.inProgress.length > 0
      ? [
          `Continuer l'edition de ${state.contentDrafts.inProgress.length} brouillon(s) en cours dans l'Atelier de contenu.`,
        ]
      : []),
    "Commencer les assets images/voix uniquement pour les brouillons valides.",
    ...(state.externalReviews.length > 0
      ? ["Attendre les reviews TikTok/Pinterest avant d'ouvrir l'automation sociale."]
      : []),
    "Tester Instagram/YouTube uniquement via les pages de test controlees, sans publication automatique.",
  ];

  return recommendations.slice(0, 3);
}

function countStatus(state: CockpitReadOnlyState, status: string) {
  return state.contentDrafts.byStatus[status] ?? 0;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    provider?: string;
    connected?: string;
    status?: string;
  }>;
}) {
  const user = await requirePrivateCockpitAccess();
  const result = await searchParams;
  const cockpitState = await readCockpitState();
  const recommendations = buildRecommendations(cockpitState);
  const cards = platformCards(cockpitState);

  return (
    <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:py-14">
      <OAuthResultNotice
        provider={result.provider}
        connected={result.connected}
        status={result.status}
      />

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#39E6D0]">
            Accueil cockpit
          </p>
          <h1 className="mt-3 text-4xl font-semibold text-[#F8FAFC] sm:text-5xl">
            Bonjour Vincent
          </h1>
          <p className="mt-4 max-w-3xl leading-7 text-[#A7B0C0]">
            Resume operationnel du jour, alimente par l&apos;etat reel lisible
            du cockpit. Lecture seule: aucune publication, aucune suppression,
            aucun token modifie.
          </p>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="rounded-md border border-[#1D2A44] bg-[#08111A] px-4 py-2.5 text-sm font-semibold text-[#A7B0C0] transition hover:border-[#39E6D0]/50 hover:text-[#F8FAFC]"
          >
            Deconnexion
          </button>
        </form>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
        <div className="space-y-6">
          <SectionContainer>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#39E6D0]">
                  Contenus
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-[#F8FAFC]">
                  Brouillons content_drafts
                </h2>
              </div>
              <StatusBadge status="Operationnel" />
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {[
                ["Total", cockpitState.contentDrafts.total],
                ["Draft", countStatus(cockpitState, "draft")],
                ["Approved", countStatus(cockpitState, "approved")],
                [
                  "Ready",
                  countStatus(cockpitState, "ready_to_publish"),
                ],
                ["Published", countStatus(cockpitState, "published")],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-md border border-[#1D2A44] bg-[#08111A] p-4"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#A7B0C0]">
                    {label}
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-[#F8FAFC]">
                    {value}
                  </p>
                </div>
              ))}
            </div>
            {cockpitState.contentDrafts.readError ? (
              <p className="mt-4 rounded-md border border-[#F97316]/40 bg-[#F97316]/10 px-3 py-2 text-sm font-semibold text-[#FDBA74]">
                {cockpitState.contentDrafts.readError}
              </p>
            ) : null}
          </SectionContainer>

          <SectionContainer>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#39E6D0]">
              Plateformes
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-[#F8FAFC]">
              Etat des connexions sociales
            </h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {cards.map((card) => (
                <article
                  key={card.name}
                  className="rounded-md border border-[#1D2A44] bg-[#08111A] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-[#F8FAFC]">
                        {card.name}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-[#A7B0C0]">
                        {card.summary}
                      </p>
                    </div>
                    <StatusBadge status={card.status} />
                  </div>
                  <div className="mt-4 grid gap-2">
                    {card.details.map((detail) => (
                      <p
                        key={detail}
                        className="rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2 text-sm text-[#A7B0C0]"
                      >
                        {detail}
                      </p>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </SectionContainer>

          <SectionContainer>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#39E6D0]">
              Recommandations du jour
            </p>
            <div className="mt-4 grid gap-3">
              {recommendations.map((recommendation, index) => (
                <div
                  key={recommendation}
                  className="rounded-md border border-[#1D2A44] bg-[#08111A] p-4"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7DD3FC]">
                    Action {index + 1}
                  </p>
                  <p className="mt-2 leading-7 text-[#F8FAFC]">
                    {recommendation}
                  </p>
                </div>
              ))}
            </div>
          </SectionContainer>
        </div>

        <aside className="space-y-6">
          <SectionContainer>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#39E6D0]">
              Actions rapides
            </p>
            <div className="mt-4 grid gap-3">
              {[
                ["Ouvrir Atelier de contenu", "/interface/post-creation"],
                [
                  "Voir brouillons prets a publier",
                  "/interface/post-creation?status=ready_to_publish",
                ],
                ["Ouvrir Observatoire", "/interface/monitoring"],
                ["Ouvrir Reseaux sociaux", "/interface/publishers/shorts"],
                ["Ouvrir Assistant global", "/interface"],
              ].map(([label, href]) => (
                <Link
                  key={href}
                  href={href}
                  className="rounded-md border border-[#1D2A44] bg-[#08111A] px-4 py-3 text-sm font-semibold text-[#A7B0C0] transition hover:border-[#39E6D0]/50 hover:bg-[#0B1420] hover:text-[#F8FAFC]"
                >
                  {label}
                </Link>
              ))}
            </div>
          </SectionContainer>

          <SectionContainer>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#39E6D0]">
              Blocages
            </p>
            <div className="mt-4 grid gap-2">
              {cockpitState.blockers.length > 0 ? (
                cockpitState.blockers.slice(0, 5).map((blocker) => (
                  <p
                    key={blocker}
                    className="rounded-md border border-[#F97316]/30 bg-[#F97316]/10 px-3 py-2 text-sm leading-6 text-[#FDBA74]"
                  >
                    {blocker}
                  </p>
                ))
              ) : (
                <p className="rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-2 text-sm text-[#A7B0C0]">
                  Aucun blocage dur detecte par le connecteur.
                </p>
              )}
            </div>
          </SectionContainer>

          <SectionContainer>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#39E6D0]">
              Securite
            </p>
            <div className="mt-4 grid gap-2 text-sm text-[#A7B0C0]">
              {cockpitState.guardrails.map((guardrail) => (
                <p
                  key={guardrail}
                  className="rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-2"
                >
                  {guardrail}
                </p>
              ))}
              <p className="rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-2">
                Session: <span className="text-[#F8FAFC]">{user.email}</span>
              </p>
            </div>
          </SectionContainer>
        </aside>
      </div>
    </div>
  );
}
