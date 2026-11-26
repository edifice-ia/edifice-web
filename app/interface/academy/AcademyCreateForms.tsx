"use client";

import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import {
  ACADEMY_PROGRAM_KINDS,
  ACADEMY_TITLE_MAX_LENGTH,
  parseChildCreatePayload,
  parseProgramCreatePayload,
  type AcademyProgramKind,
} from "@/lib/academy/hierarchy";
import { ACADEMY_MESSAGES } from "@/lib/academy/http";

// Formulaires de création d'Academy — seuls éléments client de l'interface.
//
// Ils appellent les routes existantes (POST /api/academy/programs et
// POST /api/academy/subjects), sans route ni store nouveaux. La validation
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

// Messages exacts des parsers de lib/academy/hierarchy.ts, atteignables depuis
// ces formulaires. À tenir alignés si les parsers changent.
const LOCAL_VALIDATION_MESSAGES: Record<string, string> = {
  "title ne peut pas etre vide.": "Le titre ne peut pas être vide.",
  [`title depasse la longueur maximale de ${ACADEMY_TITLE_MAX_LENGTH} caracteres.`]:
    `Le titre ne doit pas dépasser ${ACADEMY_TITLE_MAX_LENGTH} caractères.`,
  "kind doit valoir curriculum ou formation.": "Choisis un type de programme dans la liste.",
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
