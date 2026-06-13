"use client";

import { useEffect, useMemo, useState } from "react";
import { SectionContainer } from "@/components/cockpit/SectionContainer";
import {
  formatVisualPrompts,
  normalizeVisualPrompts,
} from "@/lib/content/visual-prompts";

type ContentDraft = {
  id: string;
  createdAt: string;
  updatedAt: string | null;
  project: string;
  platformTargets: string[];
  theme: string;
  concept: string;
  angle: string;
  hook: string;
  script: string;
  scriptUltraShort: string;
  scriptShort: string;
  scriptMedium: string;
  scriptLong: string;
  recommendedScript: string;
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

type GeneratedVariant = {
  id: string;
  title: string;
  hook: string;
  script: string;
  caption: string;
  hashtags: string[];
  mainEmotion: string;
  mainAngle: string;
  visualPrompts: string[];
  visualPrompt: string;
  voiceStyle: string;
  score: {
    emotionalImpact: number;
    clarity: number;
    shareability: number;
    total: number;
  };
};

type SelectedVariantEditorState = {
  visualPrompts: string[];
};

type ContentAsset = {
  id: string;
  createdAt: string;
  draftId: string | null;
  assetType: "image" | "audio" | "video" | "subtitle";
  bucket: string;
  fileName: string;
  storagePath: string;
  publicUrl: string;
  originalFilename: string | null;
  contentType: string | null;
  sizeBytes: number | null;
  status: string;
  source: string;
  metadata: Record<string, unknown>;
  usageCount: number;
};

type VisualAsset = {
  id: string;
  assetType: "image" | "audio" | "video" | "subtitle";
  fileName: string;
  bucketName: string;
  storagePath: string;
  publicUrl: string;
  source: string;
  status: string;
  metadata: Record<string, unknown>;
  usageCount: number;
  linkedDraftId: string | null;
  createdAt: string;
  score: number;
  scoreReason: string;
};

type SelectedDraftAsset = VisualAsset & {
  linkId: string;
  assetSource: "library" | "generated";
  usageOrder: number;
};

type VisualDecision = {
  mode: "reuse_existing" | "generate_new";
  reason: string;
  confidence: number;
  matched_assets: Array<{
    asset_id: string;
    file_name: string;
    score: number;
    reason: string;
  }>;
  missing_visual_needs: string[];
};

type MediaPipelineState = {
  mediaPipelineStatus:
    | "draft"
    | "validated"
    | "media_preparing"
    | "media_ready"
    | "ready_to_publish";
  visualDecision: VisualDecision | null;
  selectedAssets: SelectedDraftAsset[];
  suggestedAssets: VisualAsset[];
  assetsFound: number;
  assetsSelected: number;
  generationRequested: boolean;
  generationReason: string | null;
  lastRunAt: string | null;
};

type ApiErrorPayload = {
  error?: string;
  details?: Record<string, unknown>;
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

type StatusOption = {
  value: "draft" | "approved" | "rejected" | "ready_to_publish";
  label: string;
};

type FormatOption = {
  value: "ultra_short" | "short" | "medium" | "long";
  label: string;
  help: string;
};

type ScriptVariant = {
  key: "scriptUltraShort" | "scriptShort" | "scriptMedium" | "scriptLong";
  label: string;
  value: string;
};

type WorkshopSuggestions = {
  themes: string[];
  angles: string[];
  emotions: string[];
};

const platforms = [
  "Multi-plateforme",
  "YouTube Shorts",
  "TikTok",
  "Instagram Reels",
  "Pinterest",
];

const formatOptions: FormatOption[] = [
  { value: "ultra_short", label: "Ultra short", help: "10-15 secondes" },
  { value: "short", label: "Short", help: "20-30 secondes" },
  { value: "medium", label: "Medium", help: "35-45 secondes" },
  { value: "long", label: "Long", help: "50-60 secondes maximum" },
];

const generationStatusMessages = [
  "Analyse du sujet...",
  "Recherche de l'angle editorial...",
  "Construction du hook...",
  "Ecriture du script court...",
  "Creation des variantes...",
  "Preparation de la legende...",
  "Selection des hashtags...",
  "Construction des 7 scenes visuelles...",
  "Harmonisation du style...",
  "Finalisation du brouillon...",
];

function getGenerationStatus(progress: number) {
  if (progress >= 100) {
    return "Brouillon pret.";
  }
  if (progress >= 97) {
    return "Preparation de l'ouverture dans l'editeur...";
  }
  if (progress >= 94) {
    return "Assemblage du brouillon complet...";
  }
  if (progress >= 90) {
    return "Verification de la coherence editoriale...";
  }

  const messageIndex = Math.min(
    generationStatusMessages.length - 1,
    Math.floor((progress / 90) * generationStatusMessages.length),
  );

  return generationStatusMessages[Math.max(0, messageIndex)];
}

function getNextGenerationProgress(current: number) {
  if (current < 75) {
    return Math.min(current + 6, 75);
  }
  if (current < 92) {
    return Math.min(current + 3, 92);
  }
  if (current < 98) {
    return current + 1;
  }
  return 99;
}

function getGenerationProgressDelay(progress: number) {
  if (progress < 75) {
    return 850;
  }
  if (progress < 92) {
    return 900;
  }
  return 650;
}

const statusOptions: StatusOption[] = [
  { value: "draft", label: "Brouillon texte" },
  { value: "approved", label: "Texte valide" },
  { value: "rejected", label: "Rejete" },
  { value: "ready_to_publish", label: "Pret a publier" },
];

const statusFilters = ["all", ...statusOptions.map((status) => status.value)];

const presets = [
  "Pouvoir discret",
  "Solitude calme",
  "Respect perdu",
  "Froid emotionnel",
  "Verite tardive",
  "Force calme",
];

const defaultSuggestions: WorkshopSuggestions = {
  themes: [
    "Quand le silence devient une reponse",
    "La dignite apres une deception",
    "Pourquoi certaines absences changent tout",
    "Le respect qu'on ne reclame plus",
    "Ce que ton calme revele aux autres",
  ],
  angles: [
    "Montrer que la retenue peut devenir une force visible.",
    "Transformer une blessure discrete en clarification interieure.",
    "Expliquer pourquoi ne plus reagir change le rapport de force.",
    "Faire sentir le moment ou l'on cesse de convaincre.",
    "Raconter la difference entre fuir et se proteger.",
  ],
  emotions: [
    "Lucidite calme",
    "Fierte silencieuse",
    "Soulagement froid",
    "Detachement doux",
    "Respect retrouve",
  ],
};

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
  required = true,
}: {
  value: string;
  onChange: (value: string) => void;
  minHeight?: string;
  maxLength?: number;
  required?: boolean;
}) {
  return (
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={`mt-2 w-full rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-2.5 text-sm leading-6 text-[#F8FAFC] outline-none ${minHeight}`}
      maxLength={maxLength}
      required={required}
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

function getStatusLabel(status: string) {
  return statusOptions.find((option) => option.value === status)?.label ?? status;
}

function isDraftValidatedForMedia(status: string | null | undefined) {
  return status === "approved" || status === "validated" || status === "ready_to_publish";
}

function getMediaPipelineStatusLabel(status: MediaPipelineState["mediaPipelineStatus"]) {
  const labels: Record<MediaPipelineState["mediaPipelineStatus"], string> = {
    draft: "Brouillon",
    validated: "Valide",
    media_preparing: "Preparation media",
    media_ready: "Medias prets",
    ready_to_publish: "Pret a publier",
  };

  return labels[status];
}

function formatApiError(payload: ApiErrorPayload, fallback: string) {
  const details = payload.details ?? {};
  const detailParts = [
    typeof details.validation === "string" ? `validation=${details.validation}` : null,
    typeof details.draftId === "string" ? `draft_id=${details.draftId}` : null,
    typeof details.draftStatus === "string" ? `status=${details.draftStatus}` : null,
    typeof details.mediaPipelineStatus === "string"
      ? `media_pipeline_status=${details.mediaPipelineStatus}`
      : null,
    typeof details.visualDecisionMode === "string"
      ? `visual_decision=${details.visualDecisionMode}`
      : null,
  ].filter(Boolean);

  return [
    payload.error ?? fallback,
    detailParts.length > 0 ? `(${detailParts.join(" | ")})` : null,
  ]
    .filter(Boolean)
    .join(" ");
}

function formatDate(value: string | null) {
  if (!value) {
    return "Date inconnue";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function SuggestionChips({
  label,
  items,
  onSelect,
}: {
  label: string;
  items: string[];
  onSelect: (value: string) => void;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7DD3FC]">
        {label}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {items.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onSelect(item)}
            className="rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-1.5 text-sm font-semibold text-[#A7B0C0] transition hover:border-[#39E6D0]/50 hover:text-[#F8FAFC]"
          >
            {item}
          </button>
        ))}
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
  const [format, setFormat] = useState<FormatOption["value"]>("short");
  const [suggestions, setSuggestions] =
    useState<WorkshopSuggestions>(defaultSuggestions);
  const [drafts, setDrafts] = useState<ContentDraft[]>([]);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [editor, setEditor] = useState<DraftEditorState | null>(null);
  const [generatedVariants, setGeneratedVariants] = useState<GeneratedVariant[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [variantEditor, setVariantEditor] =
    useState<SelectedVariantEditorState | null>(null);
  const [assets, setAssets] = useState<ContentAsset[]>([]);
  const [mediaPipeline, setMediaPipeline] =
    useState<MediaPipelineState | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const [isLoadingDrafts, setIsLoadingDrafts] = useState(false);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);
  const [isPreparingMedia, setIsPreparingMedia] = useState(false);
  const [showGenerationConfirm, setShowGenerationConfirm] = useState(false);
  const [manualReadyToPublish, setManualReadyToPublish] = useState(false);
  const [isUploadingAsset, setIsUploadingAsset] = useState(false);
  const [isSavingVariant, setIsSavingVariant] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const selectedDraft = useMemo(
    () => drafts.find((draft) => draft.id === selectedDraftId) ?? null,
    [drafts, selectedDraftId],
  );

  const recommendedVariantId = useMemo(() => {
    if (generatedVariants.length === 0) {
      return null;
    }

    return generatedVariants.reduce((best, variant) =>
      variant.score.total > best.score.total ? variant : best,
    ).id;
  }, [generatedVariants]);

  const selectedVariant = useMemo(
    () => generatedVariants.find((variant) => variant.id === selectedVariantId) ?? null,
    [generatedVariants, selectedVariantId],
  );

  const canPrepareMedia = isDraftValidatedForMedia(selectedDraft?.status);
  const canRequestVisualGeneration =
    canPrepareMedia && Boolean(mediaPipeline?.visualDecision);
  const mediaReadyForPublishing =
    mediaPipeline?.mediaPipelineStatus === "media_ready" ||
    mediaPipeline?.mediaPipelineStatus === "ready_to_publish";
  const canMarkReadyToPublish = mediaReadyForPublishing || manualReadyToPublish;
  const showDraftVisualPromptEditor = Boolean(false);
  const showDraftMediaTools = Boolean(false);
  const selectedAverageScore = useMemo(() => {
    const selectedScores = mediaPipeline?.selectedAssets.map((asset) => asset.score) ?? [];
    const matchedScores =
      mediaPipeline?.visualDecision?.matched_assets.map((asset) => asset.score) ?? [];
    const scores = selectedScores.length > 0 ? selectedScores : matchedScores;

    if (scores.length === 0) {
      return 0;
    }

    return scores.reduce((total, score) => total + score, 0) / scores.length;
  }, [mediaPipeline]);

  const generationStatus = getGenerationStatus(generationProgress);

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

  const scriptVariants = useMemo<ScriptVariant[]>(() => {
    if (!selectedDraft) {
      return [];
    }

    const variants: ScriptVariant[] = [
      {
        key: "scriptUltraShort",
        label: "Ultra short - 10-15 secondes",
        value: selectedDraft.scriptUltraShort,
      },
      {
        key: "scriptShort",
        label: "Short - 20-30 secondes",
        value: selectedDraft.scriptShort,
      },
      {
        key: "scriptMedium",
        label: "Medium - 35-45 secondes",
        value: selectedDraft.scriptMedium,
      },
      {
        key: "scriptLong",
        label: "Long - 50-60 secondes maximum",
        value: selectedDraft.scriptLong,
      },
    ];

    return variants.filter((variant) => variant.value.trim().length > 0);
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
        setAssets([]);
        setMediaPipeline(null);
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

  useEffect(() => {
    if (!isGenerating || generationProgress >= 99) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setGenerationProgress((current) =>
        Math.max(current, getNextGenerationProgress(current)),
      );
    }, getGenerationProgressDelay(generationProgress));

    return () => window.clearTimeout(timeoutId);
  }, [generationProgress, isGenerating]);

  async function loadAssets(draftId: string) {
    setIsLoadingAssets(true);
    setError(null);

    try {
      const response = await fetch(`/api/content-workshop/drafts/${draftId}/assets`);
      const payload = await response.json() as {
        assets?: ContentAsset[];
        error?: string;
      };

      if (!response.ok || !payload.assets) {
        throw new Error(payload.error ?? "Lecture des assets indisponible.");
      }

      setAssets(payload.assets);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Lecture des assets indisponible.",
      );
    } finally {
      setIsLoadingAssets(false);
    }
  }

  async function loadMediaPipeline(draftId: string, includeSuggestions = false) {
    setIsLoadingMedia(true);
    setError(null);

    try {
      const suffix = includeSuggestions ? "?suggestions=1" : "";
      const response = await fetch(
        `/api/content-workshop/drafts/${draftId}/media${suffix}`,
      );
      const payload = await response.json() as {
        media?: MediaPipelineState;
      } & ApiErrorPayload;

      if (!response.ok || !payload.media) {
        throw new Error(formatApiError(payload, "Lecture du pipeline media indisponible."));
      }

      setMediaPipeline(payload.media);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Lecture du pipeline media indisponible.",
      );
    } finally {
      setIsLoadingMedia(false);
    }
  }

  function openDraft(draft: ContentDraft) {
    setSelectedDraftId(draft.id);
    setEditor(toEditorState(draft));
    setGeneratedVariants([]);
    setSelectedVariantId(null);
    setVariantEditor(null);
    setAssets([]);
    setMediaPipeline(null);
    setManualReadyToPublish(false);
    setNotice(null);
    setError(null);
    void loadAssets(draft.id);
    void loadMediaPipeline(draft.id);
  }

  function updateEditor<K extends keyof DraftEditorState>(
    key: K,
    value: DraftEditorState[K],
  ) {
    setEditor((current) => current ? { ...current, [key]: value } : current);
  }

  async function handleGenerateSuggestions() {
    setIsGeneratingSuggestions(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch("/api/content-workshop/suggestions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          theme,
          angle,
          emotion,
        }),
      });
      const payload = await response.json() as {
        suggestions?: WorkshopSuggestions;
        error?: string;
      };

      if (!response.ok || !payload.suggestions) {
        throw new Error(payload.error ?? "Suggestions indisponibles.");
      }

      setSuggestions(payload.suggestions);
      setNotice("Suggestions generees sans sauvegarde.");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Suggestions indisponibles.",
      );
    } finally {
      setIsGeneratingSuggestions(false);
    }
  }

  async function handleGenerate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setIsGenerating(true);
    setGenerationProgress(1);
    setGeneratedVariants([]);
    setSelectedVariantId(null);
    setVariantEditor(null);

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
          format,
        }),
      });
      const payload = await response.json() as {
        variants?: GeneratedVariant[];
        error?: string;
      };

      if (!response.ok || !payload.variants || payload.variants.length === 0) {
        throw new Error(payload.error ?? "Generation indisponible.");
      }

      setGenerationProgress(100);
      await new Promise((resolve) => window.setTimeout(resolve, 650));

      setGeneratedVariants(payload.variants);
      setSelectedVariantId(null);
      setVariantEditor(null);
      setSelectedDraftId(null);
      setEditor(null);
      setAssets([]);
      setMediaPipeline(null);
      setManualReadyToPublish(false);
      setNotice("3 variantes generees. Choisis une variante avant sauvegarde.");
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

  function handleSelectVariant(variant: GeneratedVariant) {
    const visualPrompts = normalizeVisualPrompts(
      variant.visualPrompts.length > 0
        ? variant.visualPrompts
        : variant.visualPrompt,
    );

    setSelectedVariantId(variant.id);
    setVariantEditor({
      visualPrompts,
    });
    setSelectedDraftId(null);
    setEditor(null);
    setAssets([]);
    setMediaPipeline(null);
    setNotice("Variante choisie. Les 7 prompts visuels peuvent etre ajustes avant sauvegarde.");
    setError(null);
  }

  function updateVariantScene(index: number, value: string) {
    setVariantEditor((current) => {
      if (!current) {
        return current;
      }

      const visualPrompts = [...current.visualPrompts];
      visualPrompts[index] = value;
      return { visualPrompts };
    });
  }

  async function handleCopyVisualPrompt(index: number, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setNotice(`Prompt ${index + 1} copie.`);
      setError(null);
    } catch {
      setError("Copie du prompt indisponible dans ce navigateur.");
    }
  }

  async function handleSaveSelectedVariant() {
    if (!selectedVariant || !variantEditor) {
      return;
    }

    setIsSavingVariant(true);
    setError(null);
    setNotice(null);

    try {
      const visualPrompts = variantEditor.visualPrompts.map((scene, index) => {
        const trimmed = scene.trim();
        return trimmed.length > 0 ? trimmed : `Prompt ${index + 1}:`;
      });
      const response = await fetch("/api/content-workshop/drafts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: {
            theme,
            angle: selectedVariant.mainAngle,
            emotion: selectedVariant.mainEmotion,
            objective,
            platform,
            format,
          },
          variant: {
            ...selectedVariant,
            visualPrompts,
            visualPrompt: formatVisualPrompts(visualPrompts),
          },
        }),
      });
      const payload = await response.json() as {
        draft?: ContentDraft;
        error?: string;
      };

      if (!response.ok || !payload.draft) {
        throw new Error(payload.error ?? "Sauvegarde indisponible.");
      }

      setDrafts((current) => [payload.draft as ContentDraft, ...current]);
      setGeneratedVariants([]);
      setSelectedVariantId(null);
      setVariantEditor(null);
      openDraft(payload.draft);
      setNotice("Variante sauvegardee en brouillon Supabase.");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Sauvegarde indisponible.",
      );
    } finally {
      setIsSavingVariant(false);
    }
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await saveEditorChanges();
  }

  async function saveEditorChanges(statusOverride?: string) {
    if (!selectedDraft || !editor) {
      return null;
    }

    const nextStatus = statusOverride ?? editor.status;

    if (nextStatus === "ready_to_publish" && !canMarkReadyToPublish) {
      setError(
        "Impossible de marquer pret a publier tant que les visuels et la voix requis ne sont pas prets. Active le mode manuel explicite si tu prends la responsabilite de ce passage.",
      );
      setNotice(null);
      return null;
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
        body: JSON.stringify({
          ...buildUpdatePayload(editor),
          status: nextStatus,
        }),
      });
      const payload = await response.json() as {
        draft?: ContentDraft;
      } & ApiErrorPayload;

      if (!response.ok || !payload.draft) {
        throw new Error(formatApiError(payload, "Mise a jour indisponible."));
      }

      const updatedDraft: ContentDraft = {
        ...payload.draft,
        scriptUltraShort: selectedDraft.scriptUltraShort,
        scriptShort: selectedDraft.scriptShort,
        scriptMedium: selectedDraft.scriptMedium,
        scriptLong: selectedDraft.scriptLong,
        recommendedScript: payload.draft.script,
      };

      setDrafts((current) =>
        current.map((draft) => draft.id === updatedDraft.id ? updatedDraft : draft),
      );
      setSelectedDraftId(updatedDraft.id);
      setEditor(toEditorState(updatedDraft));
      void loadMediaPipeline(updatedDraft.id);
      setNotice(
        statusOverride
          ? `Statut mis a jour: ${getStatusLabel(statusOverride)}.`
          : "Brouillon modifie.",
      );
      return updatedDraft;
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Mise a jour indisponible.",
      );
      return null;
    } finally {
      setIsSaving(false);
    }
  }

  async function handleStatusAction(status: StatusOption["value"]) {
    if (!selectedDraft) {
      return;
    }

    if (status === "ready_to_publish" && !canMarkReadyToPublish) {
      setError(
        "Impossible de marquer pret a publier tant que les visuels et la voix requis ne sont pas prets. Active le mode manuel explicite si tu prends la responsabilite de ce passage.",
      );
      setNotice(null);
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
        body: JSON.stringify({
          action: "update_status",
          status,
        }),
      });
      const payload = await response.json() as {
        draft?: ContentDraft;
      } & ApiErrorPayload;

      if (!response.ok || !payload.draft) {
        throw new Error(formatApiError(payload, "Mise a jour du statut indisponible."));
      }

      const updatedDraft: ContentDraft = {
        ...payload.draft,
        scriptUltraShort: selectedDraft.scriptUltraShort,
        scriptShort: selectedDraft.scriptShort,
        scriptMedium: selectedDraft.scriptMedium,
        scriptLong: selectedDraft.scriptLong,
        recommendedScript: payload.draft.script,
      };

      setDrafts((current) =>
        current.map((draft) => draft.id === updatedDraft.id ? updatedDraft : draft),
      );
      setSelectedDraftId(updatedDraft.id);
      setEditor((current) =>
        current ? { ...current, status: updatedDraft.status } : current,
      );
      void loadMediaPipeline(updatedDraft.id);
      setNotice(`Statut mis a jour: ${getStatusLabel(status)}.`);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Mise a jour du statut indisponible.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  function handleUseScriptVariant(variant: ScriptVariant) {
    updateEditor("script", variant.value);
    setNotice(`${variant.label} copiee dans le champ Script.`);
    setError(null);
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
      setAssets([]);
      setMediaPipeline(null);
      setManualReadyToPublish(false);
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

  async function handleAssetUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!selectedDraft || !file) {
      return;
    }

    setIsUploadingAsset(true);
    setError(null);
    setNotice(null);

    try {
      const formData = new FormData();
      formData.set("file", file);

      const response = await fetch(`/api/content-workshop/drafts/${selectedDraft.id}/assets`, {
        method: "POST",
        body: formData,
      });
      const payload = await response.json() as {
        asset?: ContentAsset;
        error?: string;
      };

      if (!response.ok || !payload.asset) {
        throw new Error(payload.error ?? "Upload asset indisponible.");
      }

      setAssets((current) => [payload.asset as ContentAsset, ...current]);
      setNotice("Asset stocke dans content-assets et trace dans Supabase.");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Upload asset indisponible.",
      );
    } finally {
      setIsUploadingAsset(false);
    }
  }

  async function runMediaAction(
    action:
      | "prepare_media"
      | "refresh_suggestions"
      | "request_visual_generation"
      | "select_asset"
      | "replace_asset",
    options?: {
      assetId?: string;
      draftId?: string;
      forceAllowed?: boolean;
      usageOrder?: number;
    },
  ) {
    const targetDraftId = options?.draftId ?? selectedDraft?.id;

    if (!targetDraftId) {
      return;
    }

    if (!options?.forceAllowed && !isDraftValidatedForMedia(selectedDraft?.status)) {
      setError("Valide le brouillon avant de preparer les medias.");
      setNotice(null);
      return;
    }

    setIsPreparingMedia(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(
        `/api/content-workshop/drafts/${targetDraftId}/media`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action,
            assetId: options?.assetId,
            usageOrder: options?.usageOrder,
          }),
        },
      );
      const payload = await response.json() as {
        media?: MediaPipelineState;
      } & ApiErrorPayload;

      if (!response.ok || !payload.media) {
        throw new Error(formatApiError(payload, "Preparation media indisponible."));
      }

      setMediaPipeline(payload.media);
      setNotice(
        action === "request_visual_generation"
          ? "Nouveaux visuels demandes. Le module de generation sera utilise lorsqu'il sera connecte."
          : action === "prepare_media"
            ? "Pipeline media preparee. Aucun media externe n'a ete genere."
            : "Bibliotheque visuelle mise a jour.",
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Preparation media indisponible.",
      );
    } finally {
      setIsPreparingMedia(false);
    }
  }

  function handleSelectSuggestedAsset(asset: VisualAsset) {
    const nextOrder = Math.min(
      7,
      (mediaPipeline?.selectedAssets.length ?? 0) + 1,
    );
    void runMediaAction("select_asset", {
      assetId: asset.id,
      usageOrder: nextOrder,
    });
  }

  function handleReplaceSuggestedAsset(asset: VisualAsset) {
    const firstSelectedOrder =
      mediaPipeline?.selectedAssets[0]?.usageOrder ?? 1;
    void runMediaAction("replace_asset", {
      assetId: asset.id,
      usageOrder: firstSelectedOrder,
    });
  }

  function confirmVisualGenerationRequest() {
    setShowGenerationConfirm(false);
    void runMediaAction("request_visual_generation");
  }

  return (
    <>
      {showGenerationConfirm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#03070B]/80 px-4">
          <div className="w-full max-w-md rounded-lg border border-[#1D2A44] bg-[#08111A] p-5 shadow-2xl shadow-black/40">
            <h2 className="text-lg font-semibold text-[#F8FAFC]">
              Generer de nouveaux visuels
            </h2>
            <p className="mt-3 text-sm leading-6 text-[#A7B0C0]">
              Cette action va generer de nouveaux visuels. Les visuels
              actuellement selectionnes seront conserves dans l&apos;historique mais
              remplaces dans la selection active.
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowGenerationConfirm(false)}
                className="rounded-md border border-[#1D2A44] bg-[#03070B] px-4 py-2.5 text-sm font-semibold text-[#A7B0C0] transition hover:border-[#39E6D0]/50 hover:text-[#F8FAFC]"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={isPreparingMedia}
                onClick={confirmVisualGenerationRequest}
                className="rounded-md border border-[#39E6D0]/50 bg-[#39E6D0]/10 px-4 py-2.5 text-sm font-semibold text-[#39E6D0] transition hover:bg-[#1D2A44] hover:text-[#F8FAFC] disabled:cursor-wait disabled:opacity-60"
              >
                Generer
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
      <div className="space-y-6">
        <SectionContainer>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#39E6D0]">
                Chambre d&apos;idee
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-[#F8FAFC]">
                Generer 3 variantes de brouillon
              </h2>
              <p className="mt-3 max-w-3xl leading-7 text-[#A7B0C0]">
                Cette brique prepare trois options editoriales. Une seule
                variante est choisie puis sauvegardee. Aucun montage, planning
                ou publication n&apos;est lance.
              </p>
            </div>
            <span className="rounded-md border border-[#39E6D0]/35 bg-[#39E6D0]/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#39E6D0]">
              Brouillons Supabase
            </span>
          </div>

          <div className="mt-6 rounded-lg border border-[#1D2A44] bg-[#08111A] p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#39E6D0]">
                  Ideation
                </p>
                <h3 className="mt-2 text-lg font-semibold text-[#F8FAFC]">
                  Suggestions avant generation
                </h3>
                <p className="mt-2 text-sm leading-6 text-[#A7B0C0]">
                  Les chips remplissent les champs de depart. Rien n&apos;est
                  sauvegarde tant que tu ne generes pas un brouillon.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleGenerateSuggestions()}
                disabled={isGeneratingSuggestions}
                className="rounded-md border border-[#39E6D0]/50 bg-[#39E6D0]/10 px-4 py-2.5 text-sm font-semibold text-[#39E6D0] transition hover:bg-[#1D2A44] hover:text-[#F8FAFC] disabled:cursor-wait disabled:opacity-60"
              >
                {isGeneratingSuggestions
                  ? "Generation des suggestions..."
                  : "✨ Generer des suggestions"}
              </button>
            </div>

            <div className="mt-4 grid gap-4">
              <SuggestionChips
                label="Suggestions de sujets"
                items={suggestions.themes}
                onSelect={setTheme}
              />
              <SuggestionChips
                label="Suggestions d'angles"
                items={suggestions.angles}
                onSelect={setAngle}
              />
              <SuggestionChips
                label="Suggestions d'emotions"
                items={suggestions.emotions}
                onSelect={setEmotion}
              />
            </div>
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
              <Field label="Format souhaite">
                <select
                  value={format}
                  onChange={(event) =>
                    setFormat(event.target.value as FormatOption["value"])
                  }
                  className="mt-2 w-full rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-2.5 text-sm text-[#F8FAFC] outline-none"
                >
                  {formatOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.value} - {option.help}
                    </option>
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
              {isGenerating ? "Generation en cours..." : "Generer 3 variantes"}
            </button>

            {isGenerating ? (
              <div
                className="rounded-lg border border-[#39E6D0]/25 bg-[#03070B] p-4 shadow-[0_0_28px_rgba(57,230,208,0.08)]"
                role="status"
                aria-live="polite"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-[#F8FAFC]">
                    Generation du brouillon
                  </p>
                  <span className="text-xs font-semibold tabular-nums text-[#39E6D0]">
                    {generationProgress}%
                  </span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full border border-[#1D2A44] bg-[#08111A]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#38BDF8] via-[#39E6D0] to-[#A7F3D0] shadow-[0_0_18px_rgba(57,230,208,0.55)] transition-all duration-700 ease-out"
                    style={{ width: `${generationProgress}%` }}
                  />
                </div>
                <p className="mt-3 text-sm text-[#A7B0C0]">
                  {generationStatus}
                </p>
              </div>
            ) : null}
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
                {getStatusLabel(selectedDraft.status)}
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

          {generatedVariants.length > 0 ? (
            <div className="mt-6 grid gap-6">
              <div className="rounded-lg border border-[#1D2A44] bg-[#08111A] p-4">
                <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#39E6D0]">
                      Variantes de brouillon
                    </p>
                    <h3 className="mt-2 text-lg font-semibold text-[#F8FAFC]">
                      Choisir une seule variante
                    </h3>
                  </div>
                  <span className="rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#A7B0C0]">
                    Aucune sauvegarde automatique
                  </span>
                </div>

                <div className="mt-4 grid gap-4">
                  {generatedVariants.map((variant) => {
                    const isRecommended = variant.id === recommendedVariantId;
                    const isSelected = variant.id === selectedVariantId;

                    return (
                      <article
                        key={variant.id}
                        className={`rounded-lg border p-4 transition ${
                          isSelected
                            ? "border-[#39E6D0]/60 bg-[#39E6D0]/10"
                            : "border-[#1D2A44] bg-[#03070B]"
                        }`}
                      >
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            {isRecommended ? (
                              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#FACC15]">
                                🥇 Variante recommandee
                              </p>
                            ) : null}
                            <h4 className="mt-2 text-lg font-semibold text-[#F8FAFC]">
                              {variant.title}
                            </h4>
                            <p className="mt-2 text-sm leading-6 text-[#A7B0C0]">
                              {variant.hook}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleSelectVariant(variant)}
                            className="shrink-0 rounded-md border border-[#39E6D0]/50 bg-[#39E6D0]/10 px-3 py-2 text-xs font-semibold text-[#39E6D0] transition hover:bg-[#1D2A44] hover:text-[#F8FAFC]"
                          >
                            {isSelected ? "Variante choisie" : "Utiliser cette variante"}
                          </button>
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          <div className="rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7DD3FC]">
                              Angle principal
                            </p>
                            <p className="mt-2 text-sm leading-6 text-[#F8FAFC]">
                              {variant.mainAngle}
                            </p>
                          </div>
                          <div className="rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7DD3FC]">
                              Emotion principale
                            </p>
                            <p className="mt-2 text-sm leading-6 text-[#F8FAFC]">
                              {variant.mainEmotion}
                            </p>
                          </div>
                        </div>

                        <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-[#A7B0C0]">
                          {variant.script}
                        </p>
                        <p className="mt-4 text-sm leading-6 text-[#F8FAFC]">
                          {variant.caption}
                        </p>
                        <p className="mt-2 text-sm font-semibold text-[#7DD3FC]">
                          {variant.hashtags.join(" ")}
                        </p>

                        <div className="mt-4 grid gap-2 sm:grid-cols-4">
                          {[
                            ["Impact emotionnel", variant.score.emotionalImpact],
                            ["Clarte", variant.score.clarity],
                            ["Partageabilite", variant.score.shareability],
                            ["Score global", variant.score.total],
                          ].map(([label, value]) => (
                            <div
                              key={label}
                              className="rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-2 text-sm"
                            >
                              <p className="text-xs uppercase tracking-[0.12em] text-[#64748B]">
                                {label}
                              </p>
                              <p className="mt-1 font-semibold text-[#F8FAFC]">
                                {Number(value).toFixed(1)}/10
                              </p>
                            </div>
                          ))}
                        </div>
                      </article>
                    );
                  })}
                </div>
                {selectedVariant && variantEditor ? (
                  <div className="mt-4 flex flex-col gap-3 rounded-md border border-[#1D2A44] bg-[#03070B] p-4 lg:flex-row lg:items-center lg:justify-between">
                    <p className="text-sm leading-6 text-[#A7B0C0]">
                      Variante choisie. Les prompts visuels sont conserves avec
                      le brouillon et se gerent ensuite dans Visuels.
                    </p>
                    <button
                      type="button"
                      disabled={isSavingVariant}
                      onClick={() => void handleSaveSelectedVariant()}
                      className="rounded-md border border-[#39E6D0]/50 bg-[#39E6D0]/10 px-4 py-2.5 text-sm font-semibold text-[#39E6D0] transition hover:bg-[#1D2A44] hover:text-[#F8FAFC] disabled:cursor-wait disabled:opacity-60"
                    >
                      {isSavingVariant ? "Sauvegarde..." : "Sauvegarder cette variante"}
                    </button>
                  </div>
                ) : null}
              </div>

              {showDraftVisualPromptEditor && selectedVariant && variantEditor ? (
                <div className="rounded-lg border border-[#1D2A44] bg-[#08111A] p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#39E6D0]">
                        Prompts visuels
                      </p>
                      <h3 className="mt-2 text-lg font-semibold text-[#F8FAFC]">
                        7 prompts narratifs pour le pipeline visuel
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-[#A7B0C0]">
                        Anglais, photorealiste, vertical 9:16, meme personnage,
                        meme decor et meme histoire. Rien ne genere d&apos;image ici.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={isSavingVariant}
                      onClick={() => void handleSaveSelectedVariant()}
                      className="rounded-md border border-[#39E6D0]/50 bg-[#39E6D0]/10 px-4 py-2.5 text-sm font-semibold text-[#39E6D0] transition hover:bg-[#1D2A44] hover:text-[#F8FAFC] disabled:cursor-wait disabled:opacity-60"
                    >
                      {isSavingVariant ? "Sauvegarde..." : "Sauvegarder cette variante"}
                    </button>
                  </div>

                  <div className="mt-4 grid gap-4">
                    {variantEditor.visualPrompts.map((scene, index) => (
                      <div
                        key={index}
                        className="rounded-md border border-[#1D2A44] bg-[#03070B] p-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-[#F8FAFC]">
                            Prompt {index + 1}
                          </p>
                          <button
                            type="button"
                            onClick={() => void handleCopyVisualPrompt(index, scene)}
                            className="rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-1.5 text-xs font-semibold text-[#7DD3FC] transition hover:border-[#39E6D0]/50 hover:text-[#F8FAFC]"
                          >
                            Copier
                          </button>
                        </div>
                        <TextArea
                          value={scene}
                          onChange={(value) => updateVariantScene(index, value)}
                          minHeight="min-h-40"
                          maxLength={1800}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {editor ? (
            <div className="mt-6 grid gap-6">
              {selectedDraft ? (
                <div className="rounded-lg border border-[#1D2A44] bg-[#08111A] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#39E6D0]">
                    Resultat sauvegarde
                  </p>
                  <div className="mt-4 grid gap-3">
                    {[
                      ["Titre", selectedDraft.title],
                      ["Idee", selectedDraft.theme],
                      ["Angle", selectedDraft.angle],
                      ["Hook", selectedDraft.hook],
                      ["Script", selectedDraft.script],
                      ["Legende", selectedDraft.caption],
                      ["Hashtags", selectedDraft.hashtags.join(" ")],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className="rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-3"
                      >
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7DD3FC]">
                          {label}
                        </p>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#F8FAFC]">
                          {value || "A completer"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {scriptVariants.length > 0 ? (
                <div className="rounded-lg border border-[#1D2A44] bg-[#08111A] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#39E6D0]">
                    Variantes de script
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[#A7B0C0]">
                    Les variantes ne creent aucune colonne Supabase. Choisis
                    celle qui doit alimenter le champ `script`, puis sauvegarde.
                  </p>
                  <div className="mt-4 grid gap-3">
                    {scriptVariants.map((variant) => (
                      <article
                        key={variant.key}
                        className="rounded-md border border-[#1D2A44] bg-[#03070B] p-3"
                      >
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-[#F8FAFC]">
                              {variant.label}
                            </p>
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#A7B0C0]">
                              {variant.value}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleUseScriptVariant(variant)}
                            className="shrink-0 rounded-md border border-[#39E6D0]/50 bg-[#39E6D0]/10 px-3 py-2 text-xs font-semibold text-[#39E6D0] transition hover:bg-[#1D2A44] hover:text-[#F8FAFC]"
                          >
                            Utiliser cette variante
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              ) : null}

              <form onSubmit={handleSave} className="grid gap-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Statut">
                    <select
                      value={editor.status}
                      onChange={(event) => updateEditor("status", event.target.value)}
                      className="mt-2 w-full rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-2.5 text-sm text-[#F8FAFC] outline-none"
                    >
                      {statusOptions.map((status) => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
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
                  <Field label="Idee / theme">
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
                <p className="rounded-md border border-[#1D2A44] bg-[#08111A] px-4 py-3 text-sm leading-6 text-[#A7B0C0]">
                  Les prompts visuels et la voix sont conserves avec le
                  brouillon, mais se gerent dans les sous-modules Visuels et Voix.
                </p>

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
                    disabled={isSaving}
                    onClick={() => void handleStatusAction("draft")}
                    className="rounded-md border border-[#1D2A44] bg-[#08111A] px-4 py-2.5 text-sm font-semibold text-[#A7B0C0] transition hover:border-[#39E6D0]/50 hover:text-[#F8FAFC] disabled:cursor-wait disabled:opacity-60"
                  >
                    Brouillon
                  </button>
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => void handleStatusAction("approved")}
                    className="rounded-md border border-[#22C55E]/45 bg-[#22C55E]/10 px-4 py-2.5 text-sm font-semibold text-[#86EFAC] transition hover:bg-[#14532D]/40 hover:text-[#F8FAFC] disabled:cursor-wait disabled:opacity-60"
                  >
                    Approuver
                  </button>
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => void handleStatusAction("rejected")}
                    className="rounded-md border border-[#F97316]/45 bg-[#F97316]/10 px-4 py-2.5 text-sm font-semibold text-[#FDBA74] transition hover:bg-[#7C2D12]/40 hover:text-[#F8FAFC] disabled:cursor-wait disabled:opacity-60"
                  >
                    Rejeter
                  </button>
                  <button
                    type="button"
                    disabled={isSaving || !canMarkReadyToPublish}
                    onClick={() => void handleStatusAction("ready_to_publish")}
                    className="rounded-md border border-[#38BDF8]/45 bg-[#38BDF8]/10 px-4 py-2.5 text-sm font-semibold text-[#7DD3FC] transition hover:bg-[#0C4A6E]/40 hover:text-[#F8FAFC] disabled:cursor-wait disabled:opacity-60"
                  >
                    Marquer pret a publier
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
                <label className="flex items-start gap-3 rounded-md border border-[#1D2A44] bg-[#08111A] px-4 py-3 text-sm leading-6 text-[#A7B0C0]">
                  <input
                    type="checkbox"
                    checked={manualReadyToPublish}
                    onChange={(event) => setManualReadyToPublish(event.target.checked)}
                    className="mt-1"
                  />
                  <span>
                    Mode manuel explicite: autoriser le passage en pret a publier
                    meme si les visuels ou la voix ne sont pas marques prets.
                  </span>
                </label>
              </form>

              {showDraftMediaTools ? (
              <>
              <div className="rounded-lg border border-[#1D2A44] bg-[#08111A] p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#39E6D0]">
                      Bibliotheque visuelle
                    </p>
                    <h3 className="mt-2 text-lg font-semibold text-[#F8FAFC]">
                      Visuels suggeres
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-[#A7B0C0]">
                      Le brouillon reste texte. Les medias sont prepares
                      uniquement apres validation explicite.
                    </p>
                  </div>
                  <span className="rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#A7B0C0]">
                    {mediaPipeline
                      ? getMediaPipelineStatusLabel(mediaPipeline.mediaPipelineStatus)
                      : "Non prepare"}
                  </span>
                </div>

                {!canPrepareMedia ? (
                  <p className="mt-4 rounded-md border border-[#F97316]/35 bg-[#F97316]/10 px-3 py-3 text-sm font-semibold text-[#FDBA74]">
                    Valide le brouillon avant de preparer les medias.
                  </p>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={isPreparingMedia || !canPrepareMedia}
                    onClick={() => void runMediaAction("prepare_media")}
                    className="rounded-md border border-[#39E6D0]/50 bg-[#39E6D0]/10 px-4 py-2.5 text-sm font-semibold text-[#39E6D0] transition hover:bg-[#1D2A44] hover:text-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    {isPreparingMedia ? "Preparation..." : "Preparer les medias"}
                  </button>
                  <button
                    type="button"
                    disabled={isPreparingMedia || !canPrepareMedia}
                    onClick={() => void runMediaAction("refresh_suggestions")}
                    className="rounded-md border border-[#1D2A44] bg-[#03070B] px-4 py-2.5 text-sm font-semibold text-[#A7B0C0] transition hover:border-[#39E6D0]/50 hover:text-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    Actualiser suggestions
                  </button>
                  {canRequestVisualGeneration ? (
                    <button
                      type="button"
                      disabled={isPreparingMedia}
                      onClick={() => setShowGenerationConfirm(true)}
                      className="rounded-md border border-[#7DD3FC]/45 bg-[#7DD3FC]/10 px-4 py-2.5 text-sm font-semibold text-[#7DD3FC] transition hover:bg-[#1D2A44] hover:text-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-55"
                    >
                      Generer de nouveaux visuels
                    </button>
                  ) : null}
                </div>

                {isLoadingMedia ? (
                  <p className="mt-4 rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-3 text-sm text-[#A7B0C0]">
                    Lecture du pipeline media...
                  </p>
                ) : null}

                {mediaPipeline?.visualDecision ? (
                  <div className="mt-4 rounded-md border border-[#1D2A44] bg-[#03070B] p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#64748B]">
                      Decision visuelle
                    </p>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7DD3FC]">
                      {mediaPipeline.generationRequested ||
                      mediaPipeline.visualDecision.mode === "generate_new"
                        ? "Generation demandee"
                        : "Bibliotheque reutilisee"}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[#F8FAFC]">
                      {mediaPipeline.visualDecision.reason}
                    </p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      <p className="rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-2 text-xs text-[#A7B0C0]">
                        Trouves:{" "}
                        <span className="font-semibold text-[#F8FAFC]">
                          {mediaPipeline.assetsFound}
                        </span>
                      </p>
                      <p className="rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-2 text-xs text-[#A7B0C0]">
                        Retenus:{" "}
                        <span className="font-semibold text-[#F8FAFC]">
                          {mediaPipeline.assetsSelected}
                        </span>
                      </p>
                      <p className="rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-2 text-xs text-[#A7B0C0]">
                        Score moyen:{" "}
                        <span className="font-semibold text-[#F8FAFC]">
                          {Math.round(selectedAverageScore)}
                        </span>
                      </p>
                    </div>
                    <p className="mt-2 text-xs text-[#A7B0C0]">
                      Confiance: {Math.round(mediaPipeline.visualDecision.confidence * 100)}%
                    </p>
                    {mediaPipeline.visualDecision.missing_visual_needs.length > 0 ? (
                      <div className="mt-3 grid gap-2">
                        {mediaPipeline.visualDecision.missing_visual_needs.map((need) => (
                          <p
                            key={need}
                            className="rounded-md border border-[#F97316]/30 bg-[#F97316]/10 px-3 py-2 text-xs text-[#FDBA74]"
                          >
                            {need}
                          </p>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {mediaPipeline?.selectedAssets.length ? (
                  <div className="mt-4">
                    <p className="text-sm font-semibold text-[#F8FAFC]">
                      Visuels selectionnes
                    </p>
                    <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {mediaPipeline.selectedAssets.map((asset) => (
                        <article
                          key={asset.linkId}
                          className="overflow-hidden rounded-md border border-[#1D2A44] bg-[#03070B]"
                        >
                          <div
                            aria-label={asset.fileName}
                            className="aspect-[9/16] w-full bg-[#08111A] bg-cover bg-center"
                            role="img"
                            style={{ backgroundImage: `url(${asset.publicUrl})` }}
                          />
                          <div className="p-3">
                            <p className="text-sm font-semibold text-[#F8FAFC]">
                              {asset.usageOrder}. {asset.fileName}
                            </p>
                            <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[#7DD3FC]">
                              {asset.assetSource} · score {Math.round(asset.score)}
                            </p>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                ) : null}

                {mediaPipeline?.suggestedAssets.length ? (
                  <div className="mt-5">
                    <p className="text-sm font-semibold text-[#F8FAFC]">
                      Suggestions de la bibliotheque
                    </p>
                    <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {mediaPipeline.suggestedAssets.slice(0, 9).map((asset) => (
                        <article
                          key={asset.id}
                          className="overflow-hidden rounded-md border border-[#1D2A44] bg-[#03070B]"
                        >
                          <div
                            aria-label={asset.fileName}
                            className="aspect-[9/16] w-full bg-[#08111A] bg-cover bg-center"
                            role="img"
                            style={{ backgroundImage: `url(${asset.publicUrl})` }}
                          />
                          <div className="p-3">
                            <p className="text-sm font-semibold text-[#F8FAFC]">
                              {asset.fileName}
                            </p>
                            <p className="mt-1 text-xs text-[#A7B0C0]">
                              Score {Math.round(asset.score)} · {asset.scoreReason}
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <button
                                type="button"
                                disabled={isPreparingMedia}
                                onClick={() => handleSelectSuggestedAsset(asset)}
                                className="rounded-md border border-[#39E6D0]/45 bg-[#39E6D0]/10 px-3 py-1.5 text-xs font-semibold text-[#39E6D0] transition hover:bg-[#1D2A44] hover:text-[#F8FAFC] disabled:cursor-wait disabled:opacity-60"
                              >
                                Selectionner
                              </button>
                              <button
                                type="button"
                                disabled={isPreparingMedia}
                                onClick={() => handleReplaceSuggestedAsset(asset)}
                                className="rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-1.5 text-xs font-semibold text-[#A7B0C0] transition hover:border-[#39E6D0]/50 hover:text-[#F8FAFC] disabled:cursor-wait disabled:opacity-60"
                              >
                                Remplacer
                              </button>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="rounded-lg border border-[#1D2A44] bg-[#08111A] p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#39E6D0]">
                      Assets stockes
                    </p>
                    <h3 className="mt-2 text-lg font-semibold text-[#F8FAFC]">
                      Images, audios et videos
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-[#A7B0C0]">
                      Upload automatique vers `content-assets`; les URLs
                      publiques sont tracees dans Supabase.
                    </p>
                  </div>
                  <label className="inline-flex cursor-pointer rounded-md border border-[#39E6D0]/50 bg-[#39E6D0]/10 px-4 py-2.5 text-sm font-semibold text-[#39E6D0] transition hover:bg-[#1D2A44] hover:text-[#F8FAFC]">
                    {isUploadingAsset ? "Upload..." : "Ajouter un asset"}
                    <input
                      type="file"
                      accept="image/*,audio/*,video/*"
                      onChange={handleAssetUpload}
                      disabled={isUploadingAsset}
                      className="sr-only"
                    />
                  </label>
                </div>

                <div className="mt-4 grid gap-3">
                  {isLoadingAssets ? (
                    <p className="rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-3 text-sm text-[#A7B0C0]">
                      Chargement des assets...
                    </p>
                  ) : null}
                  {!isLoadingAssets && assets.length === 0 ? (
                    <p className="rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-3 text-sm text-[#A7B0C0]">
                      Aucun asset stocke pour ce brouillon.
                    </p>
                  ) : null}
                  {assets.map((asset) => (
                    <article
                      key={asset.id}
                      className="rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-3"
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-[#F8FAFC]">
                            {asset.originalFilename ?? asset.storagePath}
                          </p>
                          <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[#7DD3FC]">
                            {asset.assetType} · {asset.status}
                          </p>
                          <p className="mt-2 break-all text-xs text-[#A7B0C0]">
                            {asset.storagePath}
                          </p>
                        </div>
                        <a
                          href={asset.publicUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-md border border-[#1D2A44] px-3 py-2 text-xs font-semibold text-[#39E6D0] transition hover:border-[#39E6D0]/50 hover:text-[#F8FAFC]"
                        >
                          URL publique
                        </a>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
              </>
              ) : null}
            </div>
          ) : generatedVariants.length === 0 ? (
            <p className="mt-6 rounded-md border border-[#1D2A44] bg-[#08111A] px-4 py-4 leading-7 text-[#A7B0C0]">
              Choisis un brouillon dans la liste pour l&apos;ouvrir et le
              modifier.
            </p>
          ) : null}
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
                  {status === "all" ? "Tous" : getStatusLabel(status)}
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
                <span className="mt-2 block text-xs font-semibold uppercase tracking-[0.12em] text-[#64748B]">
                  {formatDate(draft.createdAt)}
                </span>
                <span className="mt-3 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.12em]">
                  <span className="rounded-md border border-[#1D2A44] bg-[#03070B] px-2 py-1 text-[#7DD3FC]">
                    {getStatusLabel(draft.status)}
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
    </>
  );
}
