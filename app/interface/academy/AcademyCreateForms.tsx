"use client";

import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import {
  ACADEMY_CONTENT_MAX_LENGTH,
  ACADEMY_DESCRIPTION_MAX_LENGTH,
  ACADEMY_OBJECTIVE_PARENT_FIELD,
  ACADEMY_PARENT_FIELD,
  ACADEMY_PROGRAM_KINDS,
  ACADEMY_RESOURCE_BODY_MAX_LENGTH,
  ACADEMY_RESOURCE_PARENT_FIELD,
  ACADEMY_RESOURCE_URL_MAX_LENGTH,
  ACADEMY_TITLE_MAX_LENGTH,
  parseChildCreatePayload,
  parseObjectiveCreatePayload,
  parseProgramCreatePayload,
  parseResourceCreatePayload,
  type AcademyObjectiveParentLevel,
  type AcademyProgramKind,
  type AcademyResourceKind,
  type AcademyResourceParentLevel,
} from "@/lib/academy/hierarchy";
import { ACADEMY_MESSAGES } from "@/lib/academy/http";

// Formulaires de création d'Academy — composants client, comme AcademyNav.tsx ;
// les pages qui les accueillent restent des Server Components.
//
// Ils appellent les routes existantes (POST /api/academy/programs, subjects,
// units, chapters, lessons et, depuis l'étape 2b-1, objectives). La validation
// avant envoi réutilise les parsers purs de lib/academy/hierarchy.ts, ceux que
// les routes appliquent : le refus local et le refus du serveur ne peuvent pas
// diverger, et le serveur reste la référence. Un 400 du serveur affiche son
// message ; toute autre réponse, ou une panne réseau, affiche le message
// générique, sans détail technique. Après création : formulaire vidé, puis
// router.refresh() relit les Server Components de la page.
//
// Les refus de la validation locale sont traduits en français par
// LOCAL_VALIDATION_MESSAGES, sans toucher aux parsers : leurs messages restent
// ceux de l'API (réponses 400). Seuls les refus atteignables depuis ces deux
// formulaires sont traduits ; un refus inattendu garde le message du parser.

const KIND_LABELS: Record<AcademyProgramKind, string> = {
  curriculum: "Curriculum",
  formation: "Formation",
};

// Limites écrites à la française (« 100 000 », « 2 000 »), avec une espace
// insécable. Formatées à la main plutôt que par toLocaleString, dont le résultat
// peut différer entre le serveur et le navigateur et casser l'hydratation.
function frenchNumber(value: number) {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0");
}

const CONTENT_MAX_LABEL = frenchNumber(ACADEMY_CONTENT_MAX_LENGTH);
const DESCRIPTION_MAX_LABEL = frenchNumber(ACADEMY_DESCRIPTION_MAX_LENGTH);
const URL_MAX_LABEL = frenchNumber(ACADEMY_RESOURCE_URL_MAX_LENGTH);
const BODY_MAX_LABEL = frenchNumber(ACADEMY_RESOURCE_BODY_MAX_LENGTH);

// Messages exacts des parsers de lib/academy/hierarchy.ts, atteignables depuis
// ces formulaires. À tenir alignés si les parsers changent.
const LOCAL_VALIDATION_MESSAGES: Record<string, string> = {
  "title ne peut pas etre vide.": "Le titre ne peut pas être vide.",
  [`title depasse la longueur maximale de ${ACADEMY_TITLE_MAX_LENGTH} caracteres.`]:
    `Le titre ne doit pas dépasser ${ACADEMY_TITLE_MAX_LENGTH} caractères.`,
  "kind doit valoir curriculum ou formation.": "Choisis un type de programme dans la liste.",
  [`content depasse la longueur maximale de ${ACADEMY_CONTENT_MAX_LENGTH} caracteres.`]:
    `Le contenu ne doit pas dépasser ${CONTENT_MAX_LABEL} caractères.`,
  [`description depasse la longueur maximale de ${ACADEMY_DESCRIPTION_MAX_LENGTH} caracteres.`]:
    `La description ne doit pas dépasser ${DESCRIPTION_MAX_LABEL} caractères.`,
  // Ressources pédagogiques (étape 2b-2).
  "kind doit valoir link ou text.": "Choisis Lien ou Texte.",
  "url est obligatoire pour un lien.": "L'adresse du lien est obligatoire.",
  [`url depasse la longueur maximale de ${ACADEMY_RESOURCE_URL_MAX_LENGTH} caracteres.`]:
    `L'adresse ne doit pas dépasser ${URL_MAX_LABEL} caractères.`,
  "url ne doit pas contenir d'espace.": "L'adresse ne doit pas contenir d'espace.",
  "url doit etre une adresse http ou https valide.":
    "L'adresse doit être une adresse web valide, commençant par http:// ou https://.",
  "url ne doit pas contenir d'identifiants.":
    "L'adresse ne doit contenir ni identifiant ni mot de passe.",
  "body est obligatoire pour un texte.": "Le texte est obligatoire.",
  "body ne peut pas etre vide.": "Le texte ne peut pas être vide.",
  [`body depasse la longueur maximale de ${ACADEMY_RESOURCE_BODY_MAX_LENGTH} caracteres.`]:
    `Le texte ne doit pas dépasser ${BODY_MAX_LABEL} caractères.`,
};

function localValidationMessage(parserError: string) {
  return LOCAL_VALIDATION_MESSAGES[parserError] ?? parserError;
}

type SubmitResult = { ok: true } | { ok: false; error: string };

async function postJson(url: string, body: unknown): Promise<SubmitResult> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (response.ok) {
      return { ok: true };
    }

    if (response.status === 400) {
      const data: unknown = await response.json().catch(() => null);
      const error =
        data && typeof data === "object" && typeof (data as { error?: unknown }).error === "string"
          ? (data as { error: string }).error
          : ACADEMY_MESSAGES.unavailable;

      return { ok: false, error };
    }

    return { ok: false, error: ACADEMY_MESSAGES.unavailable };
  } catch {
    return { ok: false, error: ACADEMY_MESSAGES.unavailable };
  }
}

function FormError({ id, error }: { id: string; error: string | null }) {
  if (!error) {
    return null;
  }

  return (
    <p
      id={id}
      role="alert"
      className="mt-3 rounded-md border border-[#F87171]/40 bg-[#F87171]/10 px-3 py-2 text-sm text-[#FCA5A5]"
    >
      {error}
    </p>
  );
}

const inputClass =
  "mt-1 w-full rounded-md border border-[#1D2A44] bg-[#0B1420] px-3 py-2 text-[#F8FAFC] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";
const buttonClass =
  "rounded-md border border-[#39E6D0]/40 bg-[#39E6D0]/10 px-4 py-2 text-sm font-semibold text-[#39E6D0] hover:bg-[#39E6D0]/20 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";

export function AcademyProgramCreateForm() {
  const router = useRouter();
  const ids = useId();
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<AcademyProgramKind>("curriculum");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const parsed = parseProgramCreatePayload({ kind, title });

    if (!parsed.ok) {
      setError(localValidationMessage(parsed.error));
      return;
    }

    setPending(true);
    const result = await postJson("/api/academy/programs", {
      kind: parsed.kind,
      title: parsed.title,
    });
    setPending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setTitle("");
    setKind("curriculum");
    router.refresh();
  }

  const errorId = `${ids}-error`;

  return (
    <form
      onSubmit={onSubmit}
      aria-labelledby={`${ids}-legend`}
      className="mt-6 rounded-md border border-[#1D2A44] bg-[#0B1420]/60 p-4"
      noValidate
    >
      <h3 id={`${ids}-legend`} className="text-lg font-semibold text-[#F8FAFC]">
        Nouveau programme
      </h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_12rem]">
        <label className="block text-sm text-[#D8DEE8]">
          Titre
          <input
            type="text"
            name="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className={inputClass}
          />
          <span className="mt-1 block text-xs text-[#A7B0C0]">
            {`Obligatoire, ${ACADEMY_TITLE_MAX_LENGTH} caractères au plus.`}
          </span>
        </label>
        <label className="block text-sm text-[#D8DEE8]">
          Type
          <select
            name="kind"
            value={kind}
            onChange={(event) => setKind(event.target.value as AcademyProgramKind)}
            className={inputClass}
          >
            {ACADEMY_PROGRAM_KINDS.map((value) => (
              <option key={value} value={value}>
                {KIND_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <button type="submit" disabled={pending} className={`mt-4 ${buttonClass}`}>
        {pending ? "Création en cours…" : "Créer le programme"}
      </button>
      <FormError id={errorId} error={error} />
    </form>
  );
}

export function AcademySubjectCreateForm({ programId }: { programId: string }) {
  const router = useRouter();
  const ids = useId();
  const [title, setTitle] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const parsed = parseChildCreatePayload("subject", { programId, title });

    if (!parsed.ok) {
      setError(localValidationMessage(parsed.error));
      return;
    }

    setPending(true);
    const result = await postJson("/api/academy/subjects", {
      programId,
      title: parsed.title,
    });
    setPending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setTitle("");
    router.refresh();
  }

  const errorId = `${ids}-error`;

  return (
    <form
      onSubmit={onSubmit}
      aria-labelledby={`${ids}-legend`}
      className="mt-6 rounded-md border border-[#1D2A44] bg-[#0B1420]/60 p-4"
      noValidate
    >
      <h3 id={`${ids}-legend`} className="text-lg font-semibold text-[#F8FAFC]">
        Nouvelle matière
      </h3>
      <label className="mt-3 block text-sm text-[#D8DEE8]">
        Titre
        <input
          type="text"
          name="title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={inputClass}
        />
        <span className="mt-1 block text-xs text-[#A7B0C0]">
          {`Obligatoire, ${ACADEMY_TITLE_MAX_LENGTH} caractères au plus.`}
        </span>
      </label>
      <button type="submit" disabled={pending} className={`mt-4 ${buttonClass}`}>
        {pending ? "Création en cours…" : "Ajouter la matière"}
      </button>
      <FormError id={errorId} error={error} />
    </form>
  );
}

// --- Module, chapitre, leçon -----------------------------------------------------

type ChildFormLevel = "unit" | "chapter" | "lesson";

const CHILD_FORM_CONFIG: Record<
  ChildFormLevel,
  { endpoint: string; summary: string; submit: string }
> = {
  unit: { endpoint: "/api/academy/units", summary: "Nouveau module", submit: "Ajouter le module" },
  chapter: {
    endpoint: "/api/academy/chapters",
    summary: "Nouveau chapitre",
    submit: "Ajouter le chapitre",
  },
  lesson: {
    endpoint: "/api/academy/lessons",
    summary: "Nouvelle leçon",
    submit: "Ajouter la leçon",
  },
};

// Formulaire replié (<details>) placé sous un nœud de l'arbre : module sous une
// matière, chapitre sous un module, leçon sous un chapitre. La leçon reçoit en
// plus un contenu facultatif, rendu en texte brut sur la page Leçon.
export function AcademyChildCreateForm({
  level,
  parentId,
}: {
  level: ChildFormLevel;
  parentId: string;
}) {
  const router = useRouter();
  const ids = useId();
  const config = CHILD_FORM_CONFIG[level];
  const parentField = ACADEMY_PARENT_FIELD[level];
  const withContent = level === "lesson";
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const payload: Record<string, unknown> = { [parentField]: parentId, title };

    if (withContent) {
      payload.content = content;
    }

    const parsed = parseChildCreatePayload(level, payload);

    if (!parsed.ok) {
      setError(localValidationMessage(parsed.error));
      return;
    }

    const body: Record<string, unknown> = { [parentField]: parentId, title: parsed.title };

    if (withContent) {
      body.content = parsed.text;
    }

    setPending(true);
    const result = await postJson(config.endpoint, body);
    setPending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setTitle("");
    setContent("");
    router.refresh();
  }

  const errorId = `${ids}-error`;

  return (
    <details className="mt-2 text-sm">
      <summary className="cursor-pointer text-[#7DD3FC] hover:text-[#F8FAFC] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
        {config.summary}
      </summary>
      <form
        onSubmit={onSubmit}
        aria-label={config.summary}
        className="mt-2 rounded-md border border-[#1D2A44] bg-[#0B1420]/60 p-3"
        noValidate
      >
        <label className="block text-sm text-[#D8DEE8]">
          Titre
          <input
            type="text"
            name="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className={inputClass}
          />
          <span className="mt-1 block text-xs text-[#A7B0C0]">
            {`Obligatoire, ${ACADEMY_TITLE_MAX_LENGTH} caractères au plus.`}
          </span>
        </label>
        {withContent ? (
          <label className="mt-3 block text-sm text-[#D8DEE8]">
            Contenu
            <textarea
              name="content"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              rows={6}
              className={inputClass}
            />
            <span className="mt-1 block text-xs text-[#A7B0C0]">
              {`Facultatif, en texte brut, ${CONTENT_MAX_LABEL} caractères au plus.`}
            </span>
          </label>
        ) : null}
        <button type="submit" disabled={pending} className={`mt-3 ${buttonClass}`}>
          {pending ? "Création en cours…" : config.submit}
        </button>
        <FormError id={errorId} error={error} />
      </form>
    </details>
  );
}

// --- Objectif pédagogique (étape 2b-1) ------------------------------------------------

// Formulaire replié (<details>) placé sous le programme, une matière, un module
// ou un chapitre de l'arbre. Titre obligatoire, description facultative. Pas de
// modification ensuite : un objectif se crée, s'archive et se restaure.
export function AcademyObjectiveCreateForm({
  parentLevel,
  parentId,
}: {
  parentLevel: AcademyObjectiveParentLevel;
  parentId: string;
}) {
  const router = useRouter();
  const ids = useId();
  const parentField = ACADEMY_OBJECTIVE_PARENT_FIELD[parentLevel];
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const parsed = parseObjectiveCreatePayload({ [parentField]: parentId, title, description });

    if (!parsed.ok) {
      setError(localValidationMessage(parsed.error));
      return;
    }

    setPending(true);
    const result = await postJson("/api/academy/objectives", {
      [parentField]: parentId,
      title: parsed.title,
      description: parsed.description,
    });
    setPending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setTitle("");
    setDescription("");
    router.refresh();
  }

  const errorId = `${ids}-error`;

  return (
    <details className="mt-1 text-sm">
      <summary className="cursor-pointer text-[#7DD3FC] hover:text-[#F8FAFC] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
        Nouvel objectif
      </summary>
      <form
        onSubmit={onSubmit}
        aria-label="Nouvel objectif"
        className="mt-2 rounded-md border border-[#1D2A44] bg-[#0B1420]/60 p-3"
        noValidate
      >
        <label className="block text-sm text-[#D8DEE8]">
          Titre
          <input
            type="text"
            name="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className={inputClass}
          />
          <span className="mt-1 block text-xs text-[#A7B0C0]">
            {`Obligatoire, ${ACADEMY_TITLE_MAX_LENGTH} caractères au plus.`}
          </span>
        </label>
        <label className="mt-3 block text-sm text-[#D8DEE8]">
          Description
          <textarea
            name="description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            className={inputClass}
          />
          <span className="mt-1 block text-xs text-[#A7B0C0]">
            {`Facultative, ${DESCRIPTION_MAX_LABEL} caractères au plus.`}
          </span>
        </label>
        <button type="submit" disabled={pending} className={`mt-3 ${buttonClass}`}>
          {pending ? "Création en cours…" : "Ajouter l'objectif"}
        </button>
        <FormError id={errorId} error={error} />
      </form>
    </details>
  );
}

// --- Ressource pédagogique (étape 2b-2) ------------------------------------------------

const RESOURCE_KIND_LABELS: Record<AcademyResourceKind, string> = {
  link: "Lien",
  text: "Texte",
};

// Formulaire replié (<details>) placé sous le titre d'un programme (arbre) ou
// sous le contenu d'une leçon (page Leçon). Choix Lien ou Texte, titre, puis
// l'adresse ou le texte. Seul le champ du type choisi est envoyé.
export function AcademyResourceCreateForm({
  parentLevel,
  parentId,
}: {
  parentLevel: AcademyResourceParentLevel;
  parentId: string;
}) {
  const router = useRouter();
  const ids = useId();
  const parentField = ACADEMY_RESOURCE_PARENT_FIELD[parentLevel];
  const [kind, setKind] = useState<AcademyResourceKind>("link");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const payload: Record<string, unknown> = { [parentField]: parentId, kind, title };

    if (kind === "link") {
      payload.url = url;
    } else {
      payload.body = body;
    }

    const parsed = parseResourceCreatePayload(payload);

    if (!parsed.ok) {
      setError(localValidationMessage(parsed.error));
      return;
    }

    const request: Record<string, unknown> = {
      [parentField]: parentId,
      kind: parsed.kind,
      title: parsed.title,
    };

    if (parsed.kind === "link") {
      request.url = parsed.url;
    } else {
      request.body = parsed.body;
    }

    setPending(true);
    const result = await postJson("/api/academy/resources", request);
    setPending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setTitle("");
    setUrl("");
    setBody("");
    router.refresh();
  }

  const errorId = `${ids}-error`;

  return (
    <details className="mt-1 text-sm">
      <summary className="cursor-pointer text-[#7DD3FC] hover:text-[#F8FAFC] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
        Nouvelle ressource
      </summary>
      <form
        onSubmit={onSubmit}
        aria-label="Nouvelle ressource"
        className="mt-2 rounded-md border border-[#1D2A44] bg-[#0B1420]/60 p-3"
        noValidate
      >
        <fieldset>
          <legend className="text-sm text-[#D8DEE8]">Type</legend>
          <div className="mt-1 flex gap-4">
            {(["link", "text"] as const).map((value) => (
              <label key={value} className="flex items-center gap-2 text-sm text-[#D8DEE8]">
                <input
                  type="radio"
                  name={`${ids}-kind`}
                  value={value}
                  checked={kind === value}
                  onChange={() => setKind(value)}
                />
                {RESOURCE_KIND_LABELS[value]}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="mt-3 block text-sm text-[#D8DEE8]">
          Titre
          <input
            type="text"
            name="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className={inputClass}
          />
          <span className="mt-1 block text-xs text-[#A7B0C0]">
            {`Obligatoire, ${ACADEMY_TITLE_MAX_LENGTH} caractères au plus.`}
          </span>
        </label>
        {kind === "link" ? (
          <label className="mt-3 block text-sm text-[#D8DEE8]">
            Adresse
            <input
              type="url"
              name="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              required
              placeholder="https://"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
              className={inputClass}
            />
            <span className="mt-1 block text-xs text-[#A7B0C0]">
              {`Obligatoire, http:// ou https://, sans identifiant, ${URL_MAX_LABEL} caractères au plus.`}
            </span>
          </label>
        ) : (
          <label className="mt-3 block text-sm text-[#D8DEE8]">
            Texte
            <textarea
              name="body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={5}
              required
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
              className={inputClass}
            />
            <span className="mt-1 block text-xs text-[#A7B0C0]">
              {`Obligatoire, en texte brut, ${BODY_MAX_LABEL} caractères au plus.`}
            </span>
          </label>
        )}
        <button type="submit" disabled={pending} className={`mt-3 ${buttonClass}`}>
          {pending ? "Création en cours…" : "Ajouter la ressource"}
        </button>
        <FormError id={errorId} error={error} />
      </form>
    </details>
  );
}
