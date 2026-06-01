"use client";

import { useEffect, useMemo, useState } from "react";
import { SectionContainer } from "@/components/cockpit/SectionContainer";

type ContentDraft = {
  id: string;
  createdAt: string;
  project: string;
  platformTargets: string[];
  theme: string;
  concept: string;
  angle: string;
  hook: string;
  script: string;
  title: string;
  caption: string;
  hashtags: string[];
  visualPrompt: string;
  voiceStyle: string;
  status: string;
  source: string;
  userId: string | null;
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

type DraftEditorState = {
  project: string;
  platformTargets: string;
  theme: string;
  angle: string;
  hook: string;
  script: string;
  title: string;
  caption: string;
  hashtags: string;
  visualPrompt: string;
  voiceStyle: string;
  status: string;
  source: string;
};

const platforms = [
  "Multi-plateforme",
  "YouTube Shorts",
  "TikTok",
  "Instagram Reels",
  "Pinterest",
];

const statusFilters = ["all", "draft", "review", "ready", "archived"];
const editableStatuses = ["draft", "review", "ready", "archived"];

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

function TextInput({
  value,
  onChange,
  maxLength,
  required = true,
}: {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  required?: boolean;
}) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="mt-2 w-full rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-2.5 text-sm text-[#F8FAFC] outline-none"
      maxLength={maxLength}
      required={required}
    />
  );
}

function TextArea({
  value,
  onChange,
  minHeight = "min-h-28",
  maxLength,
}: {
  value: string;
  onChange: (value: string) => void;
  minHeight?: string;
  maxLength?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={`mt-2 w-full rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-2.5 text-sm leading-6 text-[#F8FAFC] outline-none ${minHeight}`}
      maxLength={maxLength}
      required
    />
  );
}

function toEditorState(draft: ContentDraft): DraftEditorState {
  return {
    project: draft.project,
    platformTargets: draft.platformTargets.join(", "),
    theme: draft.theme,
    angle: draft.angle,
    hook: draft.hook,
    script: draft.script,
    title: draft.title,
    caption: draft.caption,
    hashtags: draft.hashtags.join(" "),
    visualPrompt: draft.visualPrompt,
    voiceStyle: draft.voiceStyle,
    status: draft.status,
    source: draft.source,
  };
}

function buildUpdatePayload(editor: DraftEditorState) {
  return {
    project: editor.project,
    platformTargets: editor.platformTargets
      .split(",")
      .map((target) => target.trim())
      .filter(Boolean),
    theme: editor.theme,
    angle: editor.angle,
    hook: editor.hook,
    script: editor.script,
    title: editor.title,
    caption: editor.caption,
    hashtags: editor.hashtags
      .split(/\s+/)
      .map((tag) => tag.trim())
      .filter(Boolean),
    visualPrompt: editor.visualPrompt,
    voiceStyle: editor.voiceStyle,
    status: editor.status,
    source: editor.source,
  };
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
  const [drafts, setDrafts] = useState<ContentDraft[]>([]);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [editor, setEditor] = useState<DraftEditorState | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingDrafts, setIsLoadingDrafts] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const selectedDraft = useMemo(
    () => drafts.find((draft) => draft.id === selectedDraftId) ?? null,
    [drafts, selectedDraftId],
  );

  const scoreItems = useMemo(() => {
    if (!selectedDraft) {
      return [];
    }

    return [
      ["Viral", selectedDraft.score.viral],
      ["Hook", selectedDraft.score.hook],
      ["Emotion", selectedDraft.score.emotion],
      ["Retention", selectedDraft.score.retention],
      ["Clarte", selectedDraft.score.clarity],
      ["Total", selectedDraft.score.total],
    ];
  }, [selectedDraft]);

  async function loadDrafts(filter = statusFilter) {
    setIsLoadingDrafts(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (filter !== "all") {
        params.set("status", filter);
      }

      const response = await fetch(`/api/content-workshop/drafts?${params}`);
      const payload = await response.json() as {
        drafts?: ContentDraft[];
        error?: string;
      };

      if (!response.ok || !payload.drafts) {
        throw new Error(payload.error ?? "Lecture des brouillons indisponible.");
      }

      setDrafts(payload.drafts);

      if (selectedDraftId && !payload.drafts.some((draft) => draft.id === selectedDraftId)) {
        setSelectedDraftId(null);
        setEditor(null);
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Lecture des brouillons indisponible.",
      );
    } finally {
      setIsLoadingDrafts(false);
    }
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadDrafts("all");
    }, 0);

    return () => window.clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openDraft(draft: ContentDraft) {
    setSelectedDraftId(draft.id);
    setEditor(toEditorState(draft));
    setNotice(null);
    setError(null);
  }

  function updateEditor<K extends keyof DraftEditorState>(
    key: K,
    value: DraftEditorState[K],
  ) {
    setEditor((current) => current ? { ...current, [key]: value } : current);
  }

  async function handleGenerate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
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

      setDrafts((current) => [payload.draft as ContentDraft, ...current]);
      openDraft(payload.draft);
      setNotice("Brouillon genere et sauvegarde.");
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

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedDraft || !editor) {
      return;
    }

    setIsSaving(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(`/api/content-workshop/drafts/${selectedDraft.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(buildUpdatePayload(editor)),
      });
      const payload = await response.json() as {
        draft?: ContentDraft;
        error?: string;
      };

      if (!response.ok || !payload.draft) {
        throw new Error(payload.error ?? "Mise a jour indisponible.");
      }

      setDrafts((current) =>
        current.map((draft) => draft.id === payload.draft?.id ? payload.draft : draft),
      );
      setSelectedDraftId(payload.draft.id);
      setEditor(toEditorState(payload.draft));
      setNotice("Brouillon modifie.");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Mise a jour indisponible.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedDraft) {
      return;
    }

    setIsDeleting(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(`/api/content-workshop/drafts/${selectedDraft.id}`, {
        method: "DELETE",
      });
      const payload = await response.json() as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Suppression indisponible.");
      }

      setDrafts((current) => current.filter((draft) => draft.id !== selectedDraft.id));
      setSelectedDraftId(null);
      setEditor(null);
      setNotice("Brouillon supprime.");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Suppression indisponible.",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleFilterChange(value: string) {
    setStatusFilter(value);
    await loadDrafts(value);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
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
                Cette brique genere un brouillon texte et l&apos;ajoute a
                l&apos;atelier editorial. Aucun montage, planning ou publication
                n&apos;est lance.
              </p>
            </div>
            <span className="rounded-md border border-[#39E6D0]/35 bg-[#39E6D0]/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#39E6D0]">
              Brouillons Supabase
            </span>
          </div>

          <form onSubmit={handleGenerate} className="mt-6 grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Sujet / idee de depart">
                <TextInput value={theme} onChange={setTheme} maxLength={180} />
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
                <TextArea value={angle} onChange={setAngle} maxLength={240} />
              </Field>
              <div className="grid gap-4">
                <Field label="Emotion recherchee">
                  <TextInput value={emotion} onChange={setEmotion} maxLength={80} />
                </Field>
                <Field label="Objectif">
                  <TextInput value={objective} onChange={setObjective} maxLength={180} />
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

            <button
              type="submit"
              disabled={isGenerating}
              className="inline-flex w-fit rounded-md border border-[#39E6D0]/50 bg-[#39E6D0]/10 px-4 py-2.5 text-sm font-semibold text-[#39E6D0] transition hover:bg-[#1D2A44] hover:text-[#F8FAFC] disabled:cursor-wait disabled:opacity-60"
            >
              {isGenerating ? "Generation en cours..." : "Generer et sauvegarder"}
            </button>
          </form>
        </SectionContainer>

        <SectionContainer>
          <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#39E6D0]">
                Editeur
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-[#F8FAFC]">
                {selectedDraft ? selectedDraft.title : "Ouvrir un brouillon"}
              </h2>
              <p className="mt-3 max-w-3xl leading-7 text-[#A7B0C0]">
                Modifier le contenu editorial reste une action de brouillon.
                Rien n&apos;est envoye vers les plateformes.
              </p>
            </div>
            {selectedDraft ? (
              <span className="rounded-md border border-[#38BDF8]/35 bg-[#38BDF8]/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#7DD3FC]">
                {selectedDraft.status}
              </span>
            ) : null}
          </div>

          {error ? (
            <p className="mt-5 rounded-md border border-[#F97316]/40 bg-[#F97316]/10 px-4 py-3 text-sm font-semibold text-[#FDBA74]">
              {error}
            </p>
          ) : null}
          {notice ? (
            <p className="mt-5 rounded-md border border-[#39E6D0]/35 bg-[#39E6D0]/10 px-4 py-3 text-sm font-semibold text-[#39E6D0]">
              {notice}
            </p>
          ) : null}

          {editor ? (
            <form onSubmit={handleSave} className="mt-6 grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Projet">
                  <TextInput
                    value={editor.project}
                    onChange={(value) => updateEditor("project", value)}
                    maxLength={120}
                  />
                </Field>
                <Field label="Statut">
                  <select
                    value={editor.status}
                    onChange={(event) => updateEditor("status", event.target.value)}
                    className="mt-2 w-full rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-2.5 text-sm text-[#F8FAFC] outline-none"
                  >
                    {editableStatuses.map((status) => (
                      <option key={status}>{status}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Plateformes ciblees">
                  <TextInput
                    value={editor.platformTargets}
                    onChange={(value) => updateEditor("platformTargets", value)}
                    maxLength={240}
                  />
                </Field>
                <Field label="Source">
                  <TextInput
                    value={editor.source}
                    onChange={(value) => updateEditor("source", value)}
                    maxLength={120}
                  />
                </Field>
                <Field label="Theme">
                  <TextInput
                    value={editor.theme}
                    onChange={(value) => updateEditor("theme", value)}
                    maxLength={180}
                  />
                </Field>
                <Field label="Titre">
                  <TextInput
                    value={editor.title}
                    onChange={(value) => updateEditor("title", value)}
                    maxLength={120}
                  />
                </Field>
                <Field label="Angle">
                  <TextArea
                    value={editor.angle}
                    onChange={(value) => updateEditor("angle", value)}
                    maxLength={240}
                  />
                </Field>
                <Field label="Hook">
                  <TextArea
                    value={editor.hook}
                    onChange={(value) => updateEditor("hook", value)}
                    maxLength={240}
                  />
                </Field>
              </div>

              <Field label="Script">
                <TextArea
                  value={editor.script}
                  onChange={(value) => updateEditor("script", value)}
                  minHeight="min-h-48"
                  maxLength={4000}
                />
              </Field>
              <Field label="Legende">
                <TextArea
                  value={editor.caption}
                  onChange={(value) => updateEditor("caption", value)}
                  maxLength={500}
                />
              </Field>
              <Field label="Hashtags">
                <TextInput
                  value={editor.hashtags}
                  onChange={(value) => updateEditor("hashtags", value)}
                  maxLength={240}
                />
              </Field>
              <Field label="Prompt visuel">
                <TextArea
                  value={editor.visualPrompt}
                  onChange={(value) => updateEditor("visualPrompt", value)}
                  minHeight="min-h-40"
                  maxLength={1400}
                />
              </Field>
              <Field label="Style voix">
                <TextArea
                  value={editor.voiceStyle}
                  onChange={(value) => updateEditor("voiceStyle", value)}
                  maxLength={240}
                />
              </Field>

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-md border border-[#39E6D0]/50 bg-[#39E6D0]/10 px-4 py-2.5 text-sm font-semibold text-[#39E6D0] transition hover:bg-[#1D2A44] hover:text-[#F8FAFC] disabled:cursor-wait disabled:opacity-60"
                >
                  {isSaving ? "Sauvegarde..." : "Sauvegarder les modifications"}
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleDelete}
                  className="rounded-md border border-[#F97316]/45 bg-[#F97316]/10 px-4 py-2.5 text-sm font-semibold text-[#FDBA74] transition hover:bg-[#7C2D12]/40 hover:text-[#F8FAFC] disabled:cursor-wait disabled:opacity-60"
                >
                  {isDeleting ? "Suppression..." : "Supprimer le brouillon"}
                </button>
              </div>
            </form>
          ) : (
            <p className="mt-6 rounded-md border border-[#1D2A44] bg-[#08111A] px-4 py-4 leading-7 text-[#A7B0C0]">
              Choisis un brouillon dans la liste pour l&apos;ouvrir et le
              modifier.
            </p>
          )}
        </SectionContainer>
      </div>

      <aside className="space-y-6">
        <SectionContainer>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-[#F8FAFC]">
                Brouillons
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#A7B0C0]">
                Filtrer, ouvrir et piloter les statuts editoriaux.
              </p>
            </div>
            <button
              type="button"
              onClick={() => loadDrafts(statusFilter)}
              className="rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-2 text-xs font-semibold text-[#A7B0C0] transition hover:border-[#39E6D0]/50 hover:text-[#F8FAFC]"
            >
              Actualiser
            </button>
          </div>

          <label className="mt-4 block">
            <span className="text-sm font-semibold text-[#F8FAFC]">
              Filtrer par statut
            </span>
            <select
              value={statusFilter}
              onChange={(event) => void handleFilterChange(event.target.value)}
              className="mt-2 w-full rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-2.5 text-sm text-[#F8FAFC] outline-none"
            >
              {statusFilters.map((status) => (
                <option key={status} value={status}>
                  {status === "all" ? "Tous" : status}
                </option>
              ))}
            </select>
          </label>

          <div className="mt-5 grid gap-3">
            {isLoadingDrafts ? (
              <p className="rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-3 text-sm text-[#A7B0C0]">
                Chargement des brouillons...
              </p>
            ) : null}

            {!isLoadingDrafts && drafts.length === 0 ? (
              <p className="rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-3 text-sm text-[#A7B0C0]">
                Aucun brouillon pour ce filtre.
              </p>
            ) : null}

            {drafts.map((draft) => (
              <button
                key={draft.id}
                type="button"
                onClick={() => openDraft(draft)}
                className={`rounded-lg border p-4 text-left transition ${
                  draft.id === selectedDraftId
                    ? "border-[#39E6D0]/50 bg-[#39E6D0]/10"
                    : "border-[#1D2A44] bg-[#08111A] hover:border-[#39E6D0]/35"
                }`}
              >
                <span className="block text-base font-semibold text-[#F8FAFC]">
                  {draft.title}
                </span>
                <span className="mt-2 block text-sm leading-6 text-[#A7B0C0]">
                  {draft.theme}
                </span>
                <span className="mt-3 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.12em]">
                  <span className="rounded-md border border-[#1D2A44] bg-[#03070B] px-2 py-1 text-[#7DD3FC]">
                    {draft.status}
                  </span>
                  <span className="rounded-md border border-[#1D2A44] bg-[#03070B] px-2 py-1 text-[#A7B0C0]">
                    {draft.platformTargets.join(", ") || "Sans plateforme"}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </SectionContainer>

        <SectionContainer>
          <h2 className="text-xl font-semibold text-[#F8FAFC]">
            Garde-fous
          </h2>
          <div className="mt-4 grid gap-3 text-sm text-[#A7B0C0]">
            <p className="rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-2">
              Publication: <span className="text-[#F8FAFC]">bloquee</span>
            </p>
            <p className="rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-2">
              Edition: <span className="text-[#F8FAFC]">brouillons uniquement</span>
            </p>
            <p className="rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-2">
              Schema: <span className="text-[#F8FAFC]">content_drafts reel</span>
            </p>
          </div>
        </SectionContainer>

        {selectedDraft ? (
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
              {selectedDraft.score.reason}
            </p>
          </SectionContainer>
        ) : null}
      </aside>
    </div>
  );
}
