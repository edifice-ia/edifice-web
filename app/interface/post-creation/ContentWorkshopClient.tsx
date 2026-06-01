"use client";

import { useMemo, useState } from "react";
import { SectionContainer } from "@/components/cockpit/SectionContainer";

type ContentDraft = {
  id: string;
  createdAt: string;
  idea: string;
  hook: string;
  script: string;
  title: string;
  caption: string;
  hashtags: string[];
  visualPrompt: string;
  visualPrompts: string[];
  emotionalAngle: string;
  estimatedDuration: string;
  score: {
    viral: number;
    hook: number;
    emotion: number;
    retention: number;
    clarity: number;
    total: number;
    reason: string;
  };
};

const platforms = [
  "Multi-plateforme",
  "YouTube Shorts",
  "TikTok",
  "Instagram Reels",
  "Pinterest",
];

const presets = [
  "Pouvoir discret",
  "Solitude calme",
  "Respect perdu",
  "Froid emotionnel",
  "Verite tardive",
  "Force calme",
];

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-[#F8FAFC]">{label}</span>
      {children}
    </label>
  );
}

function OutputBlock({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-[#1D2A44] bg-[#08111A] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#39E6D0]">
        {label}
      </p>
      <div className="mt-3 whitespace-pre-wrap leading-7 text-[#D7DEE8]">
        {children}
      </div>
    </div>
  );
}

export function ContentWorkshopClient() {
  const [theme, setTheme] = useState("Pouvoir discret");
  const [angle, setAngle] = useState(
    "Ce qu'on ne montre pas devient parfois ce qui impose le plus de respect.",
  );
  const [emotion, setEmotion] = useState("Lucidite calme");
  const [objective, setObjective] = useState(
    "Generer un brouillon complet a relire avant toute production.",
  );
  const [platform, setPlatform] = useState(platforms[0]);
  const [draft, setDraft] = useState<ContentDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const scoreItems = useMemo(() => {
    if (!draft) {
      return [];
    }

    return [
      ["Viral", draft.score.viral],
      ["Hook", draft.score.hook],
      ["Emotion", draft.score.emotion],
      ["Retention", draft.score.retention],
      ["Clarte", draft.score.clarity],
      ["Total", draft.score.total],
    ];
  }, [draft]);

  async function handleGenerate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsGenerating(true);

    try {
      const response = await fetch("/api/content-workshop/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          theme,
          angle,
          emotion,
          objective,
          platform,
        }),
      });
      const payload = await response.json() as {
        draft?: ContentDraft;
        error?: string;
      };

      if (!response.ok || !payload.draft) {
        throw new Error(payload.error ?? "Generation indisponible.");
      }

      setDraft(payload.draft);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Generation indisponible.",
      );
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-6">
        <SectionContainer>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#39E6D0]">
                Chambre d&apos;idee
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-[#F8FAFC]">
                Generer un brouillon complet
              </h2>
              <p className="mt-3 max-w-3xl leading-7 text-[#A7B0C0]">
                Cette premiere brique reprend uniquement l&apos;atelier texte:
                idee, hook, script, titre, legende, hashtags et direction
                visuelle. Aucun montage, planning ou publication n&apos;est lance.
              </p>
            </div>
            <span className="rounded-md border border-[#39E6D0]/35 bg-[#39E6D0]/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#39E6D0]">
              Sauvegarde Supabase en brouillon
            </span>
          </div>

          <form onSubmit={handleGenerate} className="mt-6 grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Sujet / idee de depart">
                <input
                  value={theme}
                  onChange={(event) => setTheme(event.target.value)}
                  className="mt-2 w-full rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-2.5 text-sm text-[#F8FAFC] outline-none"
                  maxLength={180}
                  required
                />
              </Field>
              <Field label="Plateforme cible">
                <select
                  value={platform}
                  onChange={(event) => setPlatform(event.target.value)}
                  className="mt-2 w-full rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-2.5 text-sm text-[#F8FAFC] outline-none"
                >
                  {platforms.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </Field>
              <Field label="Angle">
                <textarea
                  value={angle}
                  onChange={(event) => setAngle(event.target.value)}
                  className="mt-2 min-h-28 w-full rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-2.5 text-sm leading-6 text-[#F8FAFC] outline-none"
                  maxLength={240}
                />
              </Field>
              <div className="grid gap-4">
                <Field label="Emotion recherchee">
                  <input
                    value={emotion}
                    onChange={(event) => setEmotion(event.target.value)}
                    className="mt-2 w-full rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-2.5 text-sm text-[#F8FAFC] outline-none"
                    maxLength={80}
                  />
                </Field>
                <Field label="Objectif">
                  <input
                    value={objective}
                    onChange={(event) => setObjective(event.target.value)}
                    className="mt-2 w-full rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-2.5 text-sm text-[#F8FAFC] outline-none"
                    maxLength={180}
                  />
                </Field>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {presets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setTheme(preset)}
                  className="rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-1.5 text-sm font-semibold text-[#A7B0C0] transition hover:border-[#39E6D0]/50 hover:text-[#F8FAFC]"
                >
                  {preset}
                </button>
              ))}
            </div>

            {error ? (
              <p className="rounded-md border border-[#F97316]/40 bg-[#F97316]/10 px-4 py-3 text-sm font-semibold text-[#FDBA74]">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isGenerating}
              className="inline-flex w-fit rounded-md border border-[#39E6D0]/50 bg-[#39E6D0]/10 px-4 py-2.5 text-sm font-semibold text-[#39E6D0] transition hover:bg-[#1D2A44] hover:text-[#F8FAFC] disabled:cursor-wait disabled:opacity-60"
            >
              {isGenerating ? "Generation en cours..." : "Generer et sauvegarder"}
            </button>
          </form>
        </SectionContainer>

        {draft ? (
          <SectionContainer>
            <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#39E6D0]">
                  Brouillon sauvegarde
                </p>
                <h2 className="mt-3 text-2xl font-semibold text-[#F8FAFC]">
                  {draft.title}
                </h2>
                <p className="mt-3 text-sm text-[#A7B0C0]">
                  ID Supabase: {draft.id}
                </p>
              </div>
              <span className="rounded-md border border-[#38BDF8]/35 bg-[#38BDF8]/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#7DD3FC]">
                {draft.estimatedDuration}
              </span>
            </div>

            <div className="mt-6 grid gap-4">
              <OutputBlock label="Idee">{draft.idea}</OutputBlock>
              <OutputBlock label="Hook">{draft.hook}</OutputBlock>
              <OutputBlock label="Script">{draft.script}</OutputBlock>
              <div className="grid gap-4 lg:grid-cols-2">
                <OutputBlock label="Legende">{draft.caption}</OutputBlock>
                <OutputBlock label="Hashtags">
                  <div className="flex flex-wrap gap-2">
                    {draft.hashtags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-1.5 text-sm font-semibold text-[#D7DEE8]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </OutputBlock>
              </div>
              <OutputBlock label="Prompt visuel principal">
                {draft.visualPrompt}
              </OutputBlock>
              <OutputBlock label="Prompts visuels 1-7">
                {draft.visualPrompts.map((prompt, index) => (
                  <p key={`${prompt}-${index}`} className="mb-4 last:mb-0">
                    <span className="font-semibold text-[#F8FAFC]">
                      Image {index + 1}:
                    </span>{" "}
                    {prompt}
                  </p>
                ))}
              </OutputBlock>
            </div>
          </SectionContainer>
        ) : null}
      </div>

      <aside className="space-y-6">
        <SectionContainer>
          <h2 className="text-xl font-semibold text-[#F8FAFC]">
            Etat de l&apos;atelier
          </h2>
          <div className="mt-4 grid gap-3 text-sm text-[#A7B0C0]">
            <p className="rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-2">
              Mode: <span className="text-[#F8FAFC]">brouillon</span>
            </p>
            <p className="rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-2">
              Publication: <span className="text-[#F8FAFC]">bloquee</span>
            </p>
            <p className="rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-2">
              Ancien dossier:{" "}
              <span className="text-[#F8FAFC]">lecture seule</span>
            </p>
          </div>
        </SectionContainer>

        {draft ? (
          <SectionContainer>
            <h2 className="text-xl font-semibold text-[#F8FAFC]">Scoring</h2>
            <div className="mt-4 grid gap-2">
              {scoreItems.map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-2 text-sm"
                >
                  <span className="text-[#A7B0C0]">{label}</span>
                  <span className="font-semibold text-[#F8FAFC]">
                    {Number(value).toFixed(1)}/10
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-4 leading-7 text-[#A7B0C0]">
              {draft.score.reason}
            </p>
          </SectionContainer>
        ) : null}

        <SectionContainer>
          <h2 className="text-xl font-semibold text-[#F8FAFC]">
            Fichiers de reference lus
          </h2>
          <div className="mt-4 grid gap-3 text-sm text-[#A7B0C0]">
            <p className="rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-2">
              `shared/prompts.py`: regles idees, descriptions, hashtags,
              visuels.
            </p>
            <p className="rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-2">
              `ideation_agent.py`: variantes et profils de duree.
            </p>
            <p className="rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-2">
              `scoring_agent.py`: criteres de selection editoriale.
            </p>
            <p className="rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-2">
              `creation_agent.py`: format final du brouillon texte.
            </p>
          </div>
        </SectionContainer>
      </aside>
    </div>
  );
}
