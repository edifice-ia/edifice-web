"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { CockpitHeader } from "@/components/cockpit/CockpitHeader";
import { SectionContainer } from "@/components/cockpit/SectionContainer";
import { StatusBadge } from "@/components/cockpit/StatusBadge";

type ProjectCategory =
  | "L'Edifice"
  | "Projets perso"
  | "Sport"
  | "Ecriture"
  | "Alternance / travail"
  | "Administratif"
  | "Sante"
  | "Autre";
type ProjectStatus = "actif" | "pause" | "termine" | "archive";
type ObjectiveStatus =
  | "non commence"
  | "en cours"
  | "bloque"
  | "reporte"
  | "termine";
type ActionStatus = "a faire" | "en cours" | "fait";
type Priority = "basse" | "moyenne" | "haute";
type EntityType = "project" | "objective" | "action";

type TrajectoireAction = {
  id: string;
  objectiveId: string;
  title: string;
  status: ActionStatus;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
};

type TrajectoireObjective = {
  id: string;
  projectId: string;
  title: string;
  description: string;
  deadline: string | null;
  status: ObjectiveStatus;
  priority: Priority;
  progress: number;
  createdAt: string;
  updatedAt: string;
  actions: TrajectoireAction[];
};

type TrajectoireProject = {
  id: string;
  title: string;
  description: string;
  category: ProjectCategory;
  status: ProjectStatus;
  priority: Priority;
  deadline: string | null;
  progress: number;
  createdAt: string;
  updatedAt: string;
  objectives: TrajectoireObjective[];
};

type ProjectForm = {
  title: string;
  description: string;
  category: ProjectCategory;
  status: ProjectStatus;
  priority: Priority;
  deadline: string;
  progress: string;
};

type ObjectiveForm = {
  projectId: string;
  title: string;
  description: string;
  deadline: string;
  status: ObjectiveStatus;
  priority: Priority;
  progress: string;
};

type ActionForm = {
  objectiveId: string;
  title: string;
  status: ActionStatus;
  dueDate: string;
};

type EditorState =
  | { type: "project"; mode: "create"; values: ProjectForm }
  | { type: "project"; mode: "edit"; id: string; values: ProjectForm }
  | { type: "objective"; mode: "create"; values: ObjectiveForm }
  | { type: "objective"; mode: "edit"; id: string; values: ObjectiveForm }
  | { type: "action"; mode: "create"; values: ActionForm }
  | { type: "action"; mode: "edit"; id: string; values: ActionForm };

type ApiPayload = {
  projects?: TrajectoireProject[];
  error?: string;
};

const projectCategories: ProjectCategory[] = [
  "L'Edifice",
  "Projets perso",
  "Sport",
  "Ecriture",
  "Alternance / travail",
  "Administratif",
  "Sante",
  "Autre",
];
const projectStatuses: ProjectStatus[] = ["actif", "pause", "termine", "archive"];
const objectiveStatuses: ObjectiveStatus[] = [
  "non commence",
  "en cours",
  "bloque",
  "reporte",
  "termine",
];
const actionStatuses: ActionStatus[] = ["a faire", "en cours", "fait"];
const priorities: Priority[] = ["basse", "moyenne", "haute"];

const projectStatusClasses: Record<ProjectStatus, string> = {
  actif: "border-[#39E6D0]/40 bg-[#39E6D0]/10 text-[#39E6D0]",
  pause: "border-[#f59e0b]/40 bg-[#f59e0b]/10 text-[#fbbf24]",
  termine: "border-[#38BDF8]/40 bg-[#38BDF8]/10 text-[#7DD3FC]",
  archive: "border-[#64748b]/40 bg-[#64748b]/10 text-[#cbd5e1]",
};

const objectiveStatusClasses: Record<ObjectiveStatus, string> = {
  "non commence": "border-[#64748b]/40 bg-[#64748b]/10 text-[#cbd5e1]",
  "en cours": "border-[#38BDF8]/40 bg-[#38BDF8]/10 text-[#7DD3FC]",
  bloque: "border-[#f87171]/40 bg-[#f87171]/10 text-[#fecaca]",
  reporte: "border-[#64748b]/40 bg-[#64748b]/10 text-[#cbd5e1]",
  termine: "border-[#39E6D0]/40 bg-[#39E6D0]/10 text-[#39E6D0]",
};

const actionStatusClasses: Record<ActionStatus, string> = {
  "a faire": "border-[#64748b]/40 bg-[#64748b]/10 text-[#cbd5e1]",
  "en cours": "border-[#38BDF8]/40 bg-[#38BDF8]/10 text-[#7DD3FC]",
  fait: "border-[#39E6D0]/40 bg-[#39E6D0]/10 text-[#39E6D0]",
};

function emptyProjectForm(): ProjectForm {
  return {
    title: "",
    description: "",
    category: "L'Edifice",
    status: "actif",
    priority: "moyenne",
    deadline: "",
    progress: "0",
  };
}

function emptyObjectiveForm(projectId = ""): ObjectiveForm {
  return {
    projectId,
    title: "",
    description: "",
    deadline: "",
    status: "non commence",
    priority: "moyenne",
    progress: "0",
  };
}

function emptyActionForm(objectiveId = ""): ActionForm {
  return {
    objectiveId,
    title: "",
    status: "a faire",
    dueDate: "",
  };
}

function projectToForm(project: TrajectoireProject): ProjectForm {
  return {
    title: project.title,
    description: project.description,
    category: project.category,
    status: project.status,
    priority: project.priority,
    deadline: project.deadline ?? "",
    progress: String(project.progress),
  };
}

function objectiveToForm(objective: TrajectoireObjective): ObjectiveForm {
  return {
    projectId: objective.projectId,
    title: objective.title,
    description: objective.description,
    deadline: objective.deadline ?? "",
    status: objective.status,
    priority: objective.priority,
    progress: String(objective.progress),
  };
}

function actionToForm(action: TrajectoireAction): ActionForm {
  return {
    objectiveId: action.objectiveId,
    title: action.title,
    status: action.status,
    dueDate: action.dueDate ?? "",
  };
}

function normalizedProgress(value: string | number) {
  const number = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(number)));
}

function toProjectPayload(values: ProjectForm) {
  return {
    title: values.title,
    description: values.description,
    category: values.category,
    status: values.status,
    priority: values.priority,
    deadline: values.deadline || null,
    progress: normalizedProgress(values.progress),
  };
}

function toObjectivePayload(values: ObjectiveForm) {
  return {
    projectId: values.projectId,
    title: values.title,
    description: values.description,
    deadline: values.deadline || null,
    status: values.status,
    priority: values.priority,
    progress: normalizedProgress(values.progress),
  };
}

function toActionPayload(values: ActionForm) {
  return {
    objectiveId: values.objectiveId,
    title: values.title,
    status: values.status,
    dueDate: values.dueDate || null,
  };
}

function formatDate(value: string | null) {
  if (!value) {
    return "Sans deadline";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function daysUntil(value: string | null) {
  if (!value) {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${value}T00:00:00`);

  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
}

function isObjectiveLate(objective: TrajectoireObjective) {
  const remaining = daysUntil(objective.deadline);

  return (
    remaining !== null &&
    remaining < 0 &&
    objective.status !== "termine" &&
    objective.status !== "reporte"
  );
}

function isActionLate(action: TrajectoireAction) {
  const remaining = daysUntil(action.dueDate);

  return remaining !== null && remaining < 0 && action.status !== "fait";
}

function deadlineLabel(
  value: string | null,
  done: boolean,
  postponed = false,
) {
  const remaining = daysUntil(value);

  if (done) {
    return "termine";
  }

  if (postponed) {
    return "reporte";
  }

  if (remaining === null) {
    return "aucune deadline";
  }

  if (remaining < 0) {
    return `${Math.abs(remaining)} jour(s) de retard`;
  }

  if (remaining === 0) {
    return "aujourd'hui";
  }

  return `${remaining} jour(s) restants`;
}

function calculatedProjectProgress(project: TrajectoireProject) {
  const objectiveScores = project.objectives.map((objective) => {
    if (!objective.actions.length) {
      return objective.progress;
    }

    const doneActions = objective.actions.filter((action) => action.status === "fait");
    return Math.round((doneActions.length / objective.actions.length) * 100);
  });

  if (!objectiveScores.length) {
    return project.progress;
  }

  return Math.round(
    objectiveScores.reduce((sum, value) => sum + value, 0) / objectiveScores.length,
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 overflow-hidden rounded-full border border-[#1D2A44] bg-[#03070B]">
      <div
        className="h-full rounded-full bg-gradient-to-r from-[#38BDF8] via-[#39E6D0] to-[#A7F3D0]"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

function StatusPill({
  children,
  className,
}: {
  children: string;
  className: string;
}) {
  return (
    <span className={`w-fit rounded-md border px-2.5 py-1 text-xs font-semibold ${className}`}>
      {children}
    </span>
  );
}

function DashboardMetric({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number | string;
  tone?: "neutral" | "good" | "warning";
}) {
  const toneClass =
    tone === "good"
      ? "text-[#39E6D0]"
      : tone === "warning"
        ? "text-[#fbbf24]"
        : "text-[#F8FAFC]";

  return (
    <SectionContainer>
      <p className="text-sm text-[#A7B0C0]">{label}</p>
      <p className={`mt-2 text-3xl font-semibold ${toneClass}`}>{value}</p>
    </SectionContainer>
  );
}

function TextInput({
  label,
  value,
  onChange,
  required = false,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: "text" | "date" | "number";
}) {
  return (
    <label className="grid gap-1.5 text-sm text-[#A7B0C0]">
      <span>{label}</span>
      <input
        className="rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2 text-[#F8FAFC] outline-none transition focus:border-[#39E6D0]"
        min={type === "number" ? 0 : undefined}
        max={type === "number" ? 100 : undefined}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        type={type}
        value={value}
      />
    </label>
  );
}

function SelectInput<T extends string>({
  label,
  value,
  values,
  onChange,
}: {
  label: string;
  value: T;
  values: T[];
  onChange: (value: T) => void;
}) {
  return (
    <label className="grid gap-1.5 text-sm text-[#A7B0C0]">
      <span>{label}</span>
      <select
        className="rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2 text-[#F8FAFC] outline-none transition focus:border-[#39E6D0]"
        onChange={(event) => onChange(event.target.value as T)}
        value={value}
      >
        {values.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
    </label>
  );
}

function OptionSelectInput<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Array<{ label: string; value: T }>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <label className="grid gap-1.5 text-sm text-[#A7B0C0]">
      <span>{label}</span>
      <select
        className="rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2 text-[#F8FAFC] outline-none transition focus:border-[#39E6D0]"
        onChange={(event) => onChange(event.target.value as T)}
        value={value}
      >
        {options.length ? (
          options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))
        ) : (
          <option value="">Aucun element disponible</option>
        )}
      </select>
    </label>
  );
}

function TextAreaInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1.5 text-sm text-[#A7B0C0] md:col-span-2">
      <span>{label}</span>
      <textarea
        className="min-h-24 rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2 text-[#F8FAFC] outline-none transition focus:border-[#39E6D0]"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
  );
}

export function TrajectoireClient() {
  const [projects, setProjects] = useState<TrajectoireProject[]>([]);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const objectives = useMemo(
    () => projects.flatMap((project) => project.objectives),
    [projects],
  );
  const actions = useMemo(
    () => objectives.flatMap((objective) => objective.actions),
    [objectives],
  );
  const activeProjects = useMemo(
    () => projects.filter((project) => project.status === "actif"),
    [projects],
  );
  const completedObjectives = useMemo(
    () => objectives.filter((objective) => objective.status === "termine"),
    [objectives],
  );
  const lateObjectives = useMemo(
    () => objectives.filter(isObjectiveLate),
    [objectives],
  );
  const lateActions = useMemo(() => actions.filter(isActionLate), [actions]);
  const blockers = useMemo(
    () => objectives.filter((objective) => objective.status === "bloque"),
    [objectives],
  );
  const upcomingObjectives = useMemo(
    () =>
      objectives
        .filter((objective) => {
          const remaining = daysUntil(objective.deadline);
          return (
            remaining !== null &&
            remaining >= 0 &&
            objective.status !== "termine" &&
            objective.status !== "reporte"
          );
        })
        .sort((left, right) => {
          const leftDays = daysUntil(left.deadline) ?? 9999;
          const rightDays = daysUntil(right.deadline) ?? 9999;
          return leftDays - rightDays;
        })
        .slice(0, 5),
    [objectives],
  );
  const todayActions = useMemo(
    () =>
      actions.filter((action) => {
        const remaining = daysUntil(action.dueDate);
        return remaining === 0 && action.status !== "fait";
      }),
    [actions],
  );
  const averageProgress = useMemo(() => {
    if (!projects.length) {
      return 0;
    }

    return Math.round(
      projects.reduce((sum, project) => sum + calculatedProjectProgress(project), 0) /
        projects.length,
    );
  }, [projects]);
  const popam = useMemo(
    () => ({
      projets: projects
        .filter((project) => project.status !== "archive")
        .map((project) => project.title),
      objectifs: objectives
        .filter((objective) => objective.status !== "termine")
        .map((objective) => objective.title),
      planAction: upcomingObjectives.map((objective) => objective.title),
      actions: actions
        .filter((action) => action.status !== "fait")
        .map((action) => action.title),
      moyens: Array.from(
        new Set(projects.map((project) => project.category).filter(Boolean)),
      ),
    }),
    [actions, objectives, projects, upcomingObjectives],
  );

  useEffect(() => {
    let isMounted = true;

    fetch("/api/trajectoire")
      .then(async (response) => {
        const payload = await response.json() as ApiPayload;

        if (!response.ok || !payload.projects) {
          throw new Error(payload.error ?? "Lecture Trajectoire indisponible.");
        }

        return payload.projects;
      })
      .then((nextProjects) => {
        if (isMounted) {
          setProjects(nextProjects);
        }
      })
      .catch((caughtError) => {
        if (isMounted) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Lecture Trajectoire indisponible.",
          );
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  function applyPayload(payload: ApiPayload, fallbackNotice: string) {
    if (!payload.projects) {
      throw new Error(payload.error ?? fallbackNotice);
    }

    setProjects(payload.projects);
    setNotice(fallbackNotice);
    setEditor(null);
  }

  async function submitEditor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editor) {
      return;
    }

    setIsSaving(true);
    setError(null);
    setNotice(null);

    const data =
      editor.type === "project"
        ? toProjectPayload(editor.values)
        : editor.type === "objective"
          ? toObjectivePayload(editor.values)
          : toActionPayload(editor.values);

    try {
      const response =
        editor.mode === "create"
          ? await fetch("/api/trajectoire", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ type: editor.type, data }),
            })
          : await fetch(`/api/trajectoire/${editor.type}/${editor.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ data }),
            });
      const payload = await response.json() as ApiPayload;

      if (!response.ok) {
        throw new Error(payload.error ?? "Sauvegarde indisponible.");
      }

      applyPayload(payload, "Trajectoire mise a jour.");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Sauvegarde indisponible.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function archiveProject(projectId: string) {
    if (!window.confirm("Archiver ce projet ?")) {
      return;
    }

    await runMutation(
      `/api/trajectoire/project/${projectId}`,
      "PATCH",
      { action: "archive" },
      "Projet archive.",
    );
  }

  async function deleteEntity(type: EntityType, id: string) {
    if (!window.confirm("Supprimer cet element ?")) {
      return;
    }

    await runMutation(
      `/api/trajectoire/${type}/${id}`,
      "DELETE",
      undefined,
      "Element supprime.",
    );
  }

  async function runMutation(
    url: string,
    method: "PATCH" | "DELETE",
    body: Record<string, unknown> | undefined,
    successNotice: string,
  ) {
    setIsSaving(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const payload = await response.json() as ApiPayload;

      if (!response.ok) {
        throw new Error(payload.error ?? "Action indisponible.");
      }

      applyPayload(payload, successNotice);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Action indisponible.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  const popamSections = [
    ["P", "Projets", popam.projets],
    ["O", "Objectifs", popam.objectifs],
    ["P", "Plan d'action", popam.planAction],
    ["A", "Actions", popam.actions],
    ["M", "Moyens", popam.moyens],
  ] as const;

  return (
    <div>
      <CockpitHeader
        eyebrow="Trajectoire"
        title="Trajectoire"
        description="Objectifs personnels et professionnels, projets lies, echeances et progression. Les donnees sont maintenant editables et preparees pour les rapports quotidiens de l'Assistant Edifice."
        status="Experimental"
      />

      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-md border border-[#39E6D0]/50 bg-[#39E6D0]/10 px-4 py-2 text-sm font-semibold text-[#39E6D0] transition hover:bg-[#39E6D0]/20"
            onClick={() =>
              setEditor({ type: "project", mode: "create", values: emptyProjectForm() })
            }
            type="button"
          >
            Ajouter un projet
          </button>
          <button
            className="rounded-md border border-[#1D2A44] bg-[#08111A] px-4 py-2 text-sm font-semibold text-[#F8FAFC] transition hover:border-[#38BDF8]"
            onClick={() =>
              setEditor({
                type: "objective",
                mode: "create",
                values: emptyObjectiveForm(projects[0]?.id ?? ""),
              })
            }
            type="button"
          >
            Ajouter un objectif
          </button>
          <button
            className="rounded-md border border-[#1D2A44] bg-[#08111A] px-4 py-2 text-sm font-semibold text-[#F8FAFC] transition hover:border-[#38BDF8]"
            onClick={() =>
              setEditor({
                type: "action",
                mode: "create",
                values: emptyActionForm(objectives[0]?.id ?? ""),
              })
            }
            type="button"
          >
            Ajouter une action
          </button>
        </div>
        <StatusBadge status="Experimental" />
      </div>

      {error ? (
        <div className="mb-6 rounded-md border border-[#f87171]/40 bg-[#f87171]/10 px-4 py-3 text-sm text-[#fecaca]">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="mb-6 rounded-md border border-[#39E6D0]/40 bg-[#39E6D0]/10 px-4 py-3 text-sm text-[#39E6D0]">
          {notice}
        </div>
      ) : null}

      {editor ? (
        <SectionContainer className="mb-6">
          <form onSubmit={submitEditor}>
            <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#39E6D0]">
                  Edition
                </p>
                <h2 className="mt-2 text-xl font-semibold text-[#F8FAFC]">
                  {editor.mode === "create" ? "Ajouter" : "Modifier"}{" "}
                  {editor.type === "project"
                    ? "un projet"
                    : editor.type === "objective"
                      ? "un objectif"
                      : "une action"}
                </h2>
              </div>
              <button
                className="rounded-md border border-[#1D2A44] px-3 py-2 text-sm text-[#A7B0C0] transition hover:text-[#F8FAFC]"
                onClick={() => setEditor(null)}
                type="button"
              >
                Fermer
              </button>
            </div>

            {editor.type === "project" ? (
              <ProjectEditor editor={editor} setEditor={setEditor} />
            ) : editor.type === "objective" ? (
              <ObjectiveEditor
                editor={editor}
                projects={projects}
                setEditor={setEditor}
              />
            ) : (
              <ActionEditor
                editor={editor}
                objectives={objectives}
                setEditor={setEditor}
              />
            )}

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                className="rounded-md border border-[#39E6D0]/50 bg-[#39E6D0]/10 px-4 py-2 text-sm font-semibold text-[#39E6D0] transition hover:bg-[#39E6D0]/20 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isSaving}
                type="submit"
              >
                {isSaving ? "Sauvegarde..." : "Sauvegarder"}
              </button>
              <button
                className="rounded-md border border-[#1D2A44] px-4 py-2 text-sm text-[#A7B0C0] transition hover:text-[#F8FAFC]"
                onClick={() => setEditor(null)}
                type="button"
              >
                Annuler
              </button>
            </div>
          </form>
        </SectionContainer>
      ) : null}

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardMetric label="Projets actifs" value={activeProjects.length} />
        <DashboardMetric
          label="Objectifs termines"
          value={completedObjectives.length}
          tone="good"
        />
        <DashboardMetric
          label="Retards reels"
          value={lateObjectives.length + lateActions.length}
          tone={lateObjectives.length + lateActions.length > 0 ? "warning" : "good"}
        />
        <DashboardMetric label="Progression moyenne" value={`${averageProgress}%`} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <SectionContainer>
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#39E6D0]">
                  Vision
                </p>
                <h2 className="mt-3 text-2xl font-semibold text-[#F8FAFC]">
                  Piloter ce qui avance vraiment
                </h2>
                <p className="mt-3 leading-7 text-[#A7B0C0]">
                  Trajectoire centralise les projets, objectifs et actions avec
                  deadlines reelles. Les retards ne remontent que lorsqu&apos;une
                  echeance est passee et que l&apos;element n&apos;est pas termine.
                </p>
              </div>
              <div className="rounded-md border border-[#1D2A44] bg-[#08111A] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7DD3FC]">
                  Assistant Edifice
                </p>
                <p className="mt-2 text-sm leading-6 text-[#A7B0C0]">
                  Donnees preparees: projets actifs, objectifs proches, actions
                  du jour, retards reels et blocages reels.
                </p>
              </div>
            </div>
          </SectionContainer>

          <SectionContainer>
            <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#39E6D0]">
                  Projets et objectifs
                </p>
                <h2 className="mt-3 text-2xl font-semibold text-[#F8FAFC]">
                  Suivi editable
                </h2>
              </div>
              <StatusBadge status={isLoading ? "Review" : "Operationnel"} />
            </div>

            {isLoading ? (
              <p className="rounded-md border border-[#1D2A44] bg-[#08111A] px-4 py-5 text-sm text-[#A7B0C0]">
                Chargement de Trajectoire...
              </p>
            ) : projects.length ? (
              <div className="grid gap-4">
                {projects.map((project) => (
                  <ProjectCard
                    archiveProject={archiveProject}
                    deleteEntity={deleteEntity}
                    key={project.id}
                    project={project}
                    setEditor={setEditor}
                  />
                ))}
              </div>
            ) : (
              <p className="rounded-md border border-[#1D2A44] bg-[#08111A] px-4 py-5 text-sm text-[#A7B0C0]">
                Aucun projet pour l&apos;instant. Ajoute un premier projet pour
                construire ta trajectoire.
              </p>
            )}
          </SectionContainer>
        </div>

        <aside className="space-y-6">
          <SectionContainer>
            <h2 className="text-xl font-semibold text-[#F8FAFC]">
              Assistant
            </h2>
            <div className="mt-4 grid gap-3 text-sm text-[#A7B0C0]">
              <AssistantList
                empty="Aucun projet actif."
                items={activeProjects.map((project) => project.title)}
                title="Projets actifs"
              />
              <AssistantList
                empty="Aucun objectif proche."
                items={upcomingObjectives.map((objective) => objective.title)}
                title="Objectifs proches"
              />
              <AssistantList
                empty="Aucune action aujourd'hui."
                items={todayActions.map((action) => action.title)}
                title="Actions du jour"
              />
              <AssistantList
                empty="Aucun retard reel."
                items={[
                  ...lateObjectives.map((objective) => objective.title),
                  ...lateActions.map((action) => action.title),
                ]}
                title="Retards reels"
              />
              <AssistantList
                empty="Aucun blocage reel."
                items={blockers.map((objective) => objective.title)}
                title="Blocages reels"
              />
            </div>
          </SectionContainer>

          <SectionContainer>
            <h2 className="text-xl font-semibold text-[#F8FAFC]">
              Deadlines
            </h2>
            <div className="mt-4 grid gap-3">
              {upcomingObjectives.length ? (
                upcomingObjectives.map((objective) => (
                  <div
                    className="rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-3"
                    key={objective.id}
                  >
                    <p className="text-sm font-semibold text-[#F8FAFC]">
                      {objective.title}
                    </p>
                    <p className="mt-1 text-xs text-[#A7B0C0]">
                      {deadlineLabel(objective.deadline, false)} /{" "}
                      {formatDate(objective.deadline)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-[#A7B0C0]">Aucune deadline proche.</p>
              )}
            </div>
          </SectionContainer>

          <SectionContainer>
            <h2 className="text-xl font-semibold text-[#F8FAFC]">Vue POPAM</h2>
            <div className="mt-4 grid gap-3 text-sm text-[#A7B0C0]">
              {popamSections.map(([letter, label, items]) => (
                <div
                  className="rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-3"
                  key={`${letter}-${label}`}
                >
                  <p className="font-semibold text-[#F8FAFC]">
                    {letter} / {label}
                  </p>
                  <div className="mt-2 grid gap-1.5">
                    {items.length ? (
                      items.slice(0, 7).map((item) => <p key={item}>{item}</p>)
                    ) : (
                      <p>Non renseigne</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </SectionContainer>
        </aside>
      </div>
    </div>
  );
}

function ProjectEditor({
  editor,
  setEditor,
}: {
  editor: Extract<EditorState, { type: "project" }>;
  setEditor: (editor: EditorState | null) => void;
}) {
  const values = editor.values;
  const update = (next: Partial<ProjectForm>) =>
    setEditor({ ...editor, values: { ...values, ...next } } as EditorState);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <TextInput label="Titre" onChange={(title) => update({ title })} required value={values.title} />
      <SelectInput label="Categorie" onChange={(category) => update({ category })} value={values.category} values={projectCategories} />
      <SelectInput label="Statut" onChange={(status) => update({ status })} value={values.status} values={projectStatuses} />
      <SelectInput label="Priorite" onChange={(priority) => update({ priority })} value={values.priority} values={priorities} />
      <TextInput label="Deadline" onChange={(deadline) => update({ deadline })} type="date" value={values.deadline} />
      <TextInput label="Progression %" onChange={(progress) => update({ progress })} type="number" value={values.progress} />
      <TextAreaInput label="Description" onChange={(description) => update({ description })} value={values.description} />
    </div>
  );
}

function ObjectiveEditor({
  editor,
  projects,
  setEditor,
}: {
  editor: Extract<EditorState, { type: "objective" }>;
  projects: TrajectoireProject[];
  setEditor: (editor: EditorState | null) => void;
}) {
  const values = editor.values;
  const update = (next: Partial<ObjectiveForm>) =>
    setEditor({ ...editor, values: { ...values, ...next } } as EditorState);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <OptionSelectInput
        label="Projet lie"
        onChange={(projectId) => update({ projectId })}
        options={projects.map((project) => ({
          label: project.title,
          value: project.id,
        }))}
        value={values.projectId}
      />
      <TextInput label="Titre" onChange={(title) => update({ title })} required value={values.title} />
      <SelectInput label="Statut" onChange={(status) => update({ status })} value={values.status} values={objectiveStatuses} />
      <SelectInput label="Priorite" onChange={(priority) => update({ priority })} value={values.priority} values={priorities} />
      <TextInput label="Deadline" onChange={(deadline) => update({ deadline })} type="date" value={values.deadline} />
      <TextInput label="Progression %" onChange={(progress) => update({ progress })} type="number" value={values.progress} />
      <TextAreaInput label="Description" onChange={(description) => update({ description })} value={values.description} />
    </div>
  );
}

function ActionEditor({
  editor,
  objectives,
  setEditor,
}: {
  editor: Extract<EditorState, { type: "action" }>;
  objectives: TrajectoireObjective[];
  setEditor: (editor: EditorState | null) => void;
}) {
  const values = editor.values;
  const update = (next: Partial<ActionForm>) =>
    setEditor({ ...editor, values: { ...values, ...next } } as EditorState);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <OptionSelectInput
        label="Objectif lie"
        onChange={(objectiveId) => update({ objectiveId })}
        options={objectives.map((objective) => ({
          label: objective.title,
          value: objective.id,
        }))}
        value={values.objectiveId}
      />
      <TextInput label="Titre" onChange={(title) => update({ title })} required value={values.title} />
      <SelectInput label="Statut" onChange={(status) => update({ status })} value={values.status} values={actionStatuses} />
      <TextInput label="Date cible" onChange={(dueDate) => update({ dueDate })} type="date" value={values.dueDate} />
    </div>
  );
}

function ProjectCard({
  archiveProject,
  deleteEntity,
  project,
  setEditor,
}: {
  archiveProject: (projectId: string) => Promise<void>;
  deleteEntity: (type: EntityType, id: string) => Promise<void>;
  project: TrajectoireProject;
  setEditor: (editor: EditorState | null) => void;
}) {
  const calculatedProgress = calculatedProjectProgress(project);

  return (
    <article className="rounded-md border border-[#1D2A44] bg-[#08111A] p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7DD3FC]">
            {project.category} / {project.priority}
          </p>
          <h3 className="mt-2 text-lg font-semibold text-[#F8FAFC]">
            {project.title}
          </h3>
          {project.description ? (
            <p className="mt-2 text-sm leading-6 text-[#A7B0C0]">
              {project.description}
            </p>
          ) : null}
        </div>
        <StatusPill className={projectStatusClasses[project.status]}>
          {project.status}
        </StatusPill>
      </div>

      <div className="mt-4 grid gap-3 text-sm md:grid-cols-4">
        <InfoBox label="Deadline" value={formatDate(project.deadline)} />
        <InfoBox
          label="Temps"
          value={deadlineLabel(project.deadline, project.status === "termine")}
        />
        <InfoBox label="Manuel" value={`${project.progress}%`} />
        <InfoBox label="Calcule" value={`${calculatedProgress}%`} />
      </div>

      <div className="mt-4">
        <ProgressBar value={calculatedProgress} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <SmallButton
          onClick={() =>
            setEditor({
              type: "project",
              mode: "edit",
              id: project.id,
              values: projectToForm(project),
            })
          }
        >
          Modifier
        </SmallButton>
        <SmallButton
          onClick={() =>
            setEditor({
              type: "objective",
              mode: "create",
              values: emptyObjectiveForm(project.id),
            })
          }
        >
          Ajouter un objectif
        </SmallButton>
        <SmallButton onClick={() => archiveProject(project.id)}>
          Archiver
        </SmallButton>
        <SmallButton danger onClick={() => deleteEntity("project", project.id)}>
          Supprimer
        </SmallButton>
      </div>

      <div className="mt-5 grid gap-3">
        {project.objectives.length ? (
          project.objectives.map((objective) => (
            <ObjectiveCard
              deleteEntity={deleteEntity}
              key={objective.id}
              objective={objective}
              setEditor={setEditor}
            />
          ))
        ) : (
          <p className="rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-3 text-sm text-[#A7B0C0]">
            Aucun objectif pour ce projet.
          </p>
        )}
      </div>
    </article>
  );
}

function ObjectiveCard({
  deleteEntity,
  objective,
  setEditor,
}: {
  deleteEntity: (type: EntityType, id: string) => Promise<void>;
  objective: TrajectoireObjective;
  setEditor: (editor: EditorState | null) => void;
}) {
  const late = isObjectiveLate(objective);

  return (
    <div className="rounded-md border border-[#1D2A44] bg-[#03070B] p-3">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h4 className="font-semibold text-[#F8FAFC]">{objective.title}</h4>
          {objective.description ? (
            <p className="mt-1 text-sm leading-6 text-[#A7B0C0]">
              {objective.description}
            </p>
          ) : null}
        </div>
        <StatusPill className={objectiveStatusClasses[objective.status]}>
          {objective.status}
        </StatusPill>
      </div>

      <div className="mt-3 grid gap-3 text-sm md:grid-cols-4">
        <InfoBox label="Deadline" value={formatDate(objective.deadline)} />
        <InfoBox
          label={late ? "Retard" : "Temps"}
          value={deadlineLabel(
            objective.deadline,
            objective.status === "termine",
            objective.status === "reporte",
          )}
          warning={late}
        />
        <InfoBox label="Priorite" value={objective.priority} />
        <InfoBox label="Progression" value={`${objective.progress}%`} />
      </div>

      <div className="mt-3">
        <ProgressBar value={objective.progress} />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <SmallButton
          onClick={() =>
            setEditor({
              type: "objective",
              mode: "edit",
              id: objective.id,
              values: objectiveToForm(objective),
            })
          }
        >
          Modifier
        </SmallButton>
        <SmallButton
          onClick={() =>
            setEditor({
              type: "action",
              mode: "create",
              values: emptyActionForm(objective.id),
            })
          }
        >
          Ajouter une action
        </SmallButton>
        <SmallButton danger onClick={() => deleteEntity("objective", objective.id)}>
          Supprimer
        </SmallButton>
      </div>

      <div className="mt-3 grid gap-2">
        {objective.actions.map((action) => {
          const actionLate = isActionLate(action);

          return (
            <div
              className="flex flex-col gap-2 rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-2 text-sm md:flex-row md:items-center md:justify-between"
              key={action.id}
            >
              <div>
                <p className="font-semibold text-[#F8FAFC]">{action.title}</p>
                <p className={actionLate ? "text-[#fecaca]" : "text-[#A7B0C0]"}>
                  {deadlineLabel(action.dueDate, action.status === "fait")}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill className={actionStatusClasses[action.status]}>
                  {action.status}
                </StatusPill>
                <SmallButton
                  onClick={() =>
                    setEditor({
                      type: "action",
                      mode: "edit",
                      id: action.id,
                      values: actionToForm(action),
                    })
                  }
                >
                  Modifier
                </SmallButton>
                <SmallButton danger onClick={() => deleteEntity("action", action.id)}>
                  Supprimer
                </SmallButton>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function InfoBox({
  label,
  value,
  warning = false,
}: {
  label: string;
  value: string;
  warning?: boolean;
}) {
  return (
    <p className="rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2 text-[#A7B0C0]">
      {label}:{" "}
      <span className={warning ? "text-[#fecaca]" : "text-[#F8FAFC]"}>
        {value}
      </span>
    </p>
  );
}

function SmallButton({
  children,
  danger = false,
  onClick,
}: {
  children: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`rounded-md border px-3 py-1.5 text-xs font-semibold transition ${
        danger
          ? "border-[#f87171]/40 bg-[#f87171]/10 text-[#fecaca] hover:bg-[#f87171]/20"
          : "border-[#1D2A44] bg-[#03070B] text-[#A7B0C0] hover:border-[#38BDF8] hover:text-[#F8FAFC]"
      }`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function AssistantList({
  empty,
  items,
  title,
}: {
  empty: string;
  items: string[];
  title: string;
}) {
  return (
    <div className="rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-3">
      <p className="font-semibold text-[#F8FAFC]">{title}</p>
      <div className="mt-2 grid gap-1.5">
        {items.length ? (
          items.slice(0, 5).map((item) => <p key={item}>{item}</p>)
        ) : (
          <p>{empty}</p>
        )}
      </div>
    </div>
  );
}
