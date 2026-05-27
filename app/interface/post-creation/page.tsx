import type { Metadata } from "next";
import Link from "next/link";
import { CockpitHeader } from "@/components/cockpit/CockpitHeader";
import { LogPanel } from "@/components/cockpit/LogPanel";
import { SafetyModeBadge } from "@/components/cockpit/SafetyModeBadge";
import { SectionContainer } from "@/components/cockpit/SectionContainer";
import { StatusBadge } from "@/components/cockpit/StatusBadge";
import type { CockpitLog, CockpitStatus } from "@/types/cockpit";

export const metadata: Metadata = {
  title: "Atelier de contenu - L’Édifice",
};

const ideaSuggestions = [
  "Vérité inconfortable",
  "Ligne intérieure",
  "Discipline",
  "Solitude",
  "Reconstruction",
  "Déclic personnel",
];

const forgeBlocks: {
  title: string;
  description: string;
  status: CockpitStatus;
}[] = [
  {
    title: "Hook",
    description: "Accroche courte pour capter l’attention dès les premières secondes.",
    status: "En migration",
  },
  {
    title: "Script court",
    description: "Structure verticale concise, prête à être relue avant validation.",
    status: "En migration",
  },
  {
    title: "Caption",
    description: "Texte d’accompagnement clair, adapté au ton de L’Édifice.",
    status: "En migration",
  },
  {
    title: "Titre",
    description: "Promesse lisible, exploitable pour Shorts, TikTok ou Pinterest.",
    status: "En migration",
  },
  {
    title: "Description",
    description: "Version courte pour cadrer l’intention et préparer la publication.",
    status: "En migration",
  },
  {
    title: "Hashtags",
    description: "Mots-clés de brouillon, sans optimisation automatisée réelle.",
    status: "Plus tard",
  },
  {
    title: "Prompt visuel",
    description: "Direction d’image ou de plan, utile pour préparer le média plus tard.",
    status: "Plus tard",
  },
  {
    title: "Voix / audio plus tard",
    description: "Repère pour une future voix, sans ElevenLabs ni génération réelle.",
    status: "Plus tard",
  },
];

const platformVariations: {
  platform: string;
  items: string[];
  status: CockpitStatus;
}[] = [
  {
    platform: "YouTube Shorts",
    items: ["Titre court", "Description courte", "Script vertical"],
    status: "Disponible",
  },
  {
    platform: "Pinterest",
    items: ["Titre épingle", "Description épingle", "Idée visuelle"],
    status: "En migration",
  },
  {
    platform: "TikTok",
    items: ["Hook rapide", "Caption", "Format direct"],
    status: "A securiser",
  },
  {
    platform: "Instagram",
    items: ["Reel / caption", "Description", "Point d’entrée visuel"],
    status: "A securiser",
  },
];

const drafts = [
  {
    title: "Ligne intérieure — Discipline",
    type: "Script court",
    platform: "YouTube Shorts",
    status: "Brouillon",
    date: "Aujourd’hui",
  },
  {
    title: "Vérité inconfortable — Solitude",
    type: "Caption",
    platform: "Multi-plateforme",
    status: "À valider",
    date: "Aujourd’hui",
  },
  {
    title: "Déclic personnel — Reconstruction",
    type: "Déclinaison",
    platform: "Pinterest",
    status: "Prêt pour Publications",
    date: "Aujourd’hui",
  },
];

const workshopLogs: CockpitLog[] = [
  {
    timestamp: "10:20",
    type: "system",
    message: "Atelier prêt en mode brouillon.",
    status: "Disponible",
  },
  {
    timestamp: "10:21",
    type: "security",
    message: "Garde-fou actif sur toutes les actions sensibles.",
    status: "Disponible",
  },
  {
    timestamp: "10:22",
    type: "publication",
    message: "Aucune action réelle déclenchée.",
    status: "A securiser",
  },
];

function PlaceholderField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-[#F8FAFC]">{label}</span>
      <input
        disabled
        value={value}
        className="mt-2 w-full rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-2.5 text-sm text-[#A7B0C0] outline-none"
      />
    </label>
  );
}

function PlaceholderButton({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="button"
      disabled
      className="rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-2 text-sm font-semibold text-[#64748b]"
    >
      {children}
    </button>
  );
}

export default function PostCreationPage() {
  return (
    <div>
      <CockpitHeader
        eyebrow="Atelier de contenu"
        title="Atelier de contenu"
        description="Transformer une idée brute en contenu prêt à valider, décliner et publier."
        status="En migration"
      />

      <div className="mb-6">
        <SafetyModeBadge />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <SectionContainer>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#39E6D0]">
                  Chambre d’idée
                </p>
                <h2 className="mt-3 text-2xl font-semibold text-[#F8FAFC]">
                  Cadrer l’intention
                </h2>
                <p className="mt-3 max-w-3xl leading-7 text-[#A7B0C0]">
                  Capturer l’idée de départ et poser l’angle avant toute
                  préparation de contenu.
                </p>
              </div>
              <span className="rounded-md border border-[#39E6D0]/35 bg-[#39E6D0]/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#39E6D0]">
                Création en brouillon uniquement
              </span>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <PlaceholderField
                label="Sujet / idée de départ"
                value="Une vérité simple à transformer en format court"
              />
              <PlaceholderField
                label="Angle"
                value="Ce que l’on évite de regarder devient souvent le point de départ"
              />
              <PlaceholderField
                label="Émotion recherchée"
                value="Lucidité calme"
              />
              <PlaceholderField
                label="Objectif"
                value="Préparer un brouillon prêt à valider"
              />
              <label className="block md:col-span-2">
                <span className="text-sm font-semibold text-[#F8FAFC]">
                  Plateforme cible
                </span>
                <select
                  disabled
                  value="Multi-plateforme"
                  className="mt-2 w-full rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-2.5 text-sm text-[#A7B0C0] outline-none"
                >
                  <option>YouTube Shorts</option>
                  <option>Pinterest</option>
                  <option>TikTok</option>
                  <option>Instagram</option>
                  <option>Multi-plateforme</option>
                </select>
              </label>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {ideaSuggestions.map((suggestion) => (
                <span
                  key={suggestion}
                  className="rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-1.5 text-sm font-semibold text-[#A7B0C0]"
                >
                  {suggestion}
                </span>
              ))}
            </div>
          </SectionContainer>

          <SectionContainer>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#39E6D0]">
                Forge du contenu
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-[#F8FAFC]">
                Préparer les composants
              </h2>
              <p className="mt-3 max-w-3xl leading-7 text-[#A7B0C0]">
                Chaque pièce reste un brouillon local tant qu’elle n’a pas été
                relue et validée.
              </p>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {forgeBlocks.map((block) => (
                <article
                  key={block.title}
                  className="rounded-lg border border-[#1D2A44] bg-[#08111A] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-lg font-semibold text-[#F8FAFC]">
                      {block.title}
                    </h3>
                    <StatusBadge status={block.status} />
                  </div>
                  <p className="mt-3 min-h-14 leading-7 text-[#A7B0C0]">
                    {block.description}
                  </p>
                  <div className="mt-4">
                    <PlaceholderButton>Générer</PlaceholderButton>
                  </div>
                </article>
              ))}
            </div>
          </SectionContainer>

          <SectionContainer>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#39E6D0]">
                Déclinaisons
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-[#F8FAFC]">
                Adapter sans publier
              </h2>
              <p className="mt-3 max-w-3xl leading-7 text-[#A7B0C0]">
                Préparer l’adaptation du contenu selon les plateformes.
              </p>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              {platformVariations.map((variation) => (
                <article
                  key={variation.platform}
                  className="rounded-lg border border-[#1D2A44] bg-[#08111A] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-lg font-semibold text-[#F8FAFC]">
                      {variation.platform}
                    </h3>
                    <StatusBadge status={variation.status} />
                  </div>
                  <div className="mt-4 grid gap-2">
                    {variation.items.map((item) => (
                      <p
                        key={item}
                        className="rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2 text-sm text-[#A7B0C0]"
                      >
                        {item}
                      </p>
                    ))}
                  </div>
                </article>
              ))}
            </div>

            <p className="mt-5 rounded-md border border-[#38BDF8]/35 bg-[#38BDF8]/10 px-4 py-3 text-sm font-semibold text-[#7DD3FC]">
              Les déclinaisons restent en brouillon tant qu’elles ne sont pas
              envoyées vers Publications.
            </p>
          </SectionContainer>

          <SectionContainer>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#39E6D0]">
                  Brouillons
                </p>
                <h2 className="mt-3 text-2xl font-semibold text-[#F8FAFC]">
                  Voir avant validation
                </h2>
                <p className="mt-3 max-w-3xl leading-7 text-[#A7B0C0]">
                  Les contenus préparés restent visibles ici avant passage vers
                  l’espace Publications.
                </p>
              </div>
              <Link
                href="/interface/publishers"
                className="inline-flex rounded-md border border-[#39E6D0]/50 bg-[#08111A] px-4 py-2 text-sm font-semibold text-[#39E6D0] transition hover:bg-[#1D2A44] hover:text-[#F8FAFC] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                Envoyer vers Publications
              </Link>
            </div>

            <div className="mt-6 grid gap-4">
              {drafts.map((draft) => (
                <article
                  key={draft.title}
                  className="rounded-lg border border-[#1D2A44] bg-[#08111A] p-4"
                >
                  <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
                    <div>
                      <h3 className="text-lg font-semibold text-[#F8FAFC]">
                        {draft.title}
                      </h3>
                      <div className="mt-3 flex flex-wrap gap-2 text-sm text-[#A7B0C0]">
                        <span>{draft.type}</span>
                        <span>·</span>
                        <span>{draft.platform}</span>
                        <span>·</span>
                        <span>{draft.date}</span>
                      </div>
                      <p className="mt-3 text-sm font-semibold text-[#7DD3FC]">
                        Statut : {draft.status}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <PlaceholderButton>Ouvrir</PlaceholderButton>
                      <PlaceholderButton>Envoyer vers Publications</PlaceholderButton>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <p className="mt-5 leading-7 text-[#A7B0C0]">
              Une fois validé, le contenu pourra être transmis à l’espace
              Publications pour préparation et contrôle final.
            </p>
          </SectionContainer>
        </div>

        <aside className="space-y-6">
          <SectionContainer>
            <h2 className="text-xl font-semibold text-[#F8FAFC]">
              État de l’atelier
            </h2>
            <div className="mt-4 grid gap-3 text-sm text-[#A7B0C0]">
              <p className="rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-2">
                Mode : <span className="text-[#F8FAFC]">Brouillon</span>
              </p>
              <p className="rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-2">
                Publication réelle :{" "}
                <span className="text-[#F8FAFC]">bloquée</span>
              </p>
              <p className="rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-2">
                Validation humaine :{" "}
                <span className="text-[#F8FAFC]">obligatoire</span>
              </p>
            </div>
          </SectionContainer>

          <SectionContainer>
            <h2 className="text-xl font-semibold text-[#F8FAFC]">
              Sources futures
            </h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {[
                "Assistant de L’Édifice",
                "Recherche web contrôlée",
                "OpenAI",
                "ElevenLabs",
                "Publications",
              ].map((source) => (
                <span
                  key={source}
                  className="rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-1.5 text-xs font-semibold text-[#A7B0C0]"
                >
                  {source}
                </span>
              ))}
            </div>
          </SectionContainer>

          <SectionContainer>
            <h2 className="text-xl font-semibold text-[#F8FAFC]">
              Raccourcis
            </h2>
            <div className="mt-4 grid gap-2">
              {[
                { href: "/interface", label: "Assistant de L’Édifice" },
                { href: "/interface/publishers", label: "Publications" },
                { href: "/interface/monitoring", label: "Observatoire" },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-2 text-sm font-semibold text-[#A7B0C0] transition hover:border-[#39E6D0]/50 hover:text-[#F8FAFC] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </SectionContainer>

          <LogPanel logs={workshopLogs} title="Signaux récents" />
        </aside>
      </div>
    </div>
  );
}
