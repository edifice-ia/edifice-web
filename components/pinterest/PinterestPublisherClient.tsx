"use client";

import { useMemo, useState } from "react";
import type {
  PinterestBoard,
  PinterestEnvironment,
  PinterestPublisherDiagnostic,
  PinterestPublisherPin,
  PinterestTokenDiagnostic,
} from "@/lib/server/pinterest-publisher";

type PublishState =
  | { status: "idle"; message: string | null }
  | { status: "refreshing"; message: string | null }
  | { status: "checking_access"; message: string | null }
  | { status: "confirming"; message: string | null; pin: PinterestPublisherPin }
  | { status: "publishing"; message: string | null; pin: PinterestPublisherPin }
  | { status: "success"; message: string; pinId: string }
  | { status: "error"; message: string; pinId: string | null };

const accountLabels: Record<string, string> = {
  edifice_discipline: "Edifice Discipline",
  solution_sommeil: "Solution Sommeil",
};

const confidenceLabels = {
  eleve: "eleve",
  moyen: "moyen",
  faible: "faible",
} as const;

function uniqueValues(values: Array<string | null>) {
  return Array.from(new Set(values.filter(Boolean) as string[])).sort();
}

function PinImage({ pin }: { pin: PinterestPublisherPin }) {
  if (!pin.imageUrl) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-md border border-[#1D2A44] bg-[#03070B] text-xs text-[#64748B]">
        Image absente
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={pin.imageUrl}
      alt={pin.title ?? "Pin Pinterest"}
      className="aspect-square w-full rounded-md border border-[#1D2A44] object-cover"
    />
  );
}

export function PinterestPublisherClient({
  initialPins,
  boards,
  initialDiagnostic,
  tokenDiagnostics,
}: {
  initialPins: PinterestPublisherPin[];
  boards: PinterestBoard[];
  initialDiagnostic: PinterestPublisherDiagnostic;
  tokenDiagnostics: PinterestTokenDiagnostic[];
}) {
  const [pins, setPins] = useState(initialPins);
  const [diagnostic, setDiagnostic] = useState(initialDiagnostic);
  const [environment, setEnvironment] = useState<PinterestEnvironment>(
    initialDiagnostic.environment,
  );
  const [accountFilter, setAccountFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [boardFilter, setBoardFilter] = useState("all");
  const [boardStateFilter, setBoardStateFilter] = useState("all");
  const [selectedBoards, setSelectedBoards] = useState<Record<string, string>>({});
  const [publishState, setPublishState] = useState<PublishState>({
    status: "idle",
    message: null,
  });

  const statuses = useMemo(() => uniqueValues(pins.map((pin) => pin.status)), [pins]);
  const boardNames = useMemo(() => uniqueValues(pins.map((pin) => pin.boardName)), [pins]);
  const visibleTokenDiagnostics =
    accountFilter === "all"
      ? tokenDiagnostics
      : tokenDiagnostics.filter((token) => token.accountKey === accountFilter);

  const filteredPins = pins.filter((pin) => {
    const accountOk = accountFilter === "all" || pin.accountId === accountFilter;
    const statusOk = statusFilter === "all" || pin.status === statusFilter;
    const boardOk = boardFilter === "all" || pin.boardName === boardFilter;
    const boardStateOk =
      boardStateFilter === "all" ||
      (boardStateFilter === "without_board" && !pin.boardId) ||
      (boardStateFilter === "suggested_board" && !pin.boardId && Boolean(pin.suggestedBoardId)) ||
      (boardStateFilter === "confirmed_board" && Boolean(pin.boardId));
    return accountOk && statusOk && boardOk && boardStateOk;
  });

  function boardsForPin(pin: PinterestPublisherPin) {
    return boards.filter((board) => board.accountKey === pin.accountId);
  }

  function getSelectedBoard(pin: PinterestPublisherPin) {
    const boardId = selectedBoards[pin.id] ?? pin.boardId ?? pin.suggestedBoardId ?? "";
    return boardsForPin(pin).find((board) => board.id === boardId) ?? null;
  }

  async function checkAccessLevel(nextEnvironment = environment) {
    setPublishState({ status: "checking_access", message: null });

    try {
      const response = await fetch(
        `/api/pinterest/access-level?environment=${encodeURIComponent(nextEnvironment)}`,
        {
          method: "GET",
          cache: "no-store",
        },
      );
      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
        diagnostic?: PinterestPublisherDiagnostic;
      };

      if (!response.ok || !payload.ok || !payload.diagnostic) {
        throw new Error(payload.error ?? "Verification Pinterest impossible.");
      }

      setDiagnostic(payload.diagnostic);
      setPublishState({
        status: "success",
        message: `Niveau d'acces Pinterest verifie: ${payload.diagnostic.accessLabel}.`,
        pinId: "pinterest-access",
      });
    } catch (error) {
      setPublishState({
        status: "error",
        message: error instanceof Error ? error.message : "Verification Pinterest impossible.",
        pinId: null,
      });
    }
  }

  function changeEnvironment(nextEnvironment: PinterestEnvironment) {
    setEnvironment(nextEnvironment);
    setDiagnostic((current) => {
      const apiBaseUrl =
        nextEnvironment === "sandbox"
          ? "https://api-sandbox.pinterest.com/v5"
          : "https://api.pinterest.com/v5";
      const createPinsCompatible =
        current.accessLevel === "production" || nextEnvironment === "sandbox";

      return {
        ...current,
        environment: nextEnvironment,
        apiBaseUrl,
        createPinUrl: `${apiBaseUrl}/pins`,
        createPinsCompatible,
        compatibilityMessage: createPinsCompatible
          ? "Creation de pins compatible avec la configuration actuelle."
          : "Trial Access detecte: la creation de pins doit utiliser l'API Sandbox.",
      };
    });
  }

  function reconnectSandbox(accountKey: string) {
    window.location.assign(
      `/api/auth/pinterest/start?account_key=${encodeURIComponent(
        accountKey,
      )}&oauth_environment=sandbox`,
    );
  }

  async function refreshSuggestions() {
    setPublishState({ status: "refreshing", message: null });

    try {
      const response = await fetch("/api/pinterest/board-suggestions", {
        method: "POST",
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
        pins?: PinterestPublisherPin[];
        suggestionsUpdated?: number;
      };

      if (!response.ok || !payload.ok || !payload.pins) {
        throw new Error(payload.error ?? "Actualisation des suggestions impossible.");
      }

      setPins(payload.pins);
      setPublishState({
        status: "success",
        message: `${payload.suggestionsUpdated ?? 0} suggestion(s) de tableau actualisee(s).`,
        pinId: "suggestions",
      });
    } catch (error) {
      setPublishState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Actualisation des suggestions impossible.",
        pinId: null,
      });
    }
  }

  async function publishConfirmed(pin: PinterestPublisherPin) {
    const board = getSelectedBoard(pin);
    if (!board) {
      setPublishState({
        status: "error",
        message: "Choisis un board cible avant publication.",
        pinId: pin.id,
      });
      return;
    }

    setPublishState({ status: "publishing", message: null, pin });

    try {
      const response = await fetch("/api/pinterest/publish-test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pinId: pin.id,
          boardId: board.id,
          boardName: board.name,
          environment,
          confirmed: true,
        }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
        pinterestPinId?: string;
        pinUrl?: string;
        publishedAt?: string;
      };

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Publication Pinterest impossible.");
      }

      setPins((current) =>
        current.map((item) =>
          item.id === pin.id
            ? {
                ...item,
                status: "published",
                boardId: board.id,
                boardName: board.name,
                pinterestPinId: payload.pinterestPinId ?? item.pinterestPinId,
                pinUrl: payload.pinUrl ?? item.pinUrl,
                publishedAt: payload.publishedAt ?? new Date().toISOString(),
                lastError: null,
              }
            : item,
        ),
      );
      setPublishState({
        status: "success",
        message: "Pin test publie et enregistre dans Supabase.",
        pinId: pin.id,
      });
    } catch (error) {
      setPublishState({
        status: "error",
        message: error instanceof Error ? error.message : "Publication Pinterest impossible.",
        pinId: pin.id,
      });
    }
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 rounded-md border border-[#1D2A44] bg-[#08111A] p-4 xl:grid-cols-[minmax(0,1fr)_220px]">
        <div className="grid gap-3 text-sm leading-6 text-[#A7B0C0]">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${
                diagnostic.accessLevel === "production"
                  ? "border-[#39E6D0]/40 bg-[#39E6D0]/10 text-[#39E6D0]"
                  : "border-[#f59e0b]/40 bg-[#f59e0b]/10 text-[#fbbf24]"
              }`}
            >
              {diagnostic.accessLabel}
            </span>
            <span className="rounded-md border border-[#1D2A44] bg-[#03070B] px-2.5 py-1 text-xs font-semibold text-[#A7B0C0]">
              Environment actif: {diagnostic.environment}
            </span>
          </div>
          <p>
            Access Level detecte:{" "}
            <span className="font-semibold text-[#F8FAFC]">
              {diagnostic.accessLevel}
            </span>
          </p>
          <p className="break-all">
            API URL utilisee:{" "}
            <span className="font-semibold text-[#F8FAFC]">
              {diagnostic.apiBaseUrl}
            </span>
          </p>
          <p className="break-all">
            URL creation Pin:{" "}
            <span className="font-semibold text-[#F8FAFC]">
              {diagnostic.createPinUrl}
            </span>
          </p>
          <p
            className={
              diagnostic.createPinsCompatible ? "text-[#39E6D0]" : "text-[#fbbf24]"
            }
          >
            {diagnostic.compatibilityMessage}
          </p>
          <div className="grid gap-3 border-t border-[#1D2A44] pt-3">
            {visibleTokenDiagnostics.map((token) => (
              <div
                key={token.accountKey}
                className="grid gap-2 rounded-md border border-[#1D2A44] bg-[#03070B] p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-[#F8FAFC]">{token.accountLabel}</p>
                  <span
                    className={`rounded-md border px-2 py-0.5 text-xs font-semibold ${
                      token.tokenValid
                        ? "border-[#39E6D0]/40 bg-[#39E6D0]/10 text-[#39E6D0]"
                        : "border-[#ef4444]/40 bg-[#ef4444]/10 text-[#fecaca]"
                    }`}
                  >
                    Token valide: {token.tokenValid ? "oui" : "non"}
                  </span>
                </div>
                <p>
                  Source token:{" "}
                  <span className="font-semibold text-[#F8FAFC]">
                    {token.tokenSource}
                    {token.tokenSourceInferred ? " (inférée)" : ""}
                  </span>
                </p>
                <p>
                  Expiration token:{" "}
                  <span className="font-semibold text-[#F8FAFC]">
                    {token.expiresAt ?? "non renseignee"}
                  </span>
                </p>
                <p className="break-words">
                  Scopes token:{" "}
                  <span className="font-semibold text-[#F8FAFC]">
                    {token.scopes.length > 0 ? token.scopes.join(", ") : "non detectes"}
                  </span>
                </p>
                <button
                  type="button"
                  onClick={() => reconnectSandbox(token.accountKey)}
                  className="justify-self-start rounded-md border border-[#f59e0b]/50 bg-[#f59e0b]/10 px-3 py-1.5 text-xs font-semibold text-[#fbbf24] transition hover:bg-[#111D2E] hover:text-[#F8FAFC]"
                >
                  Reconnecter en Sandbox
                </button>
              </div>
            ))}
          </div>
        </div>
        <div className="grid content-start gap-3">
          <label className="grid gap-2 text-sm text-[#A7B0C0]">
            Environment Pinterest
            <select
              value={environment}
              onChange={(event) =>
                changeEnvironment(event.target.value as PinterestEnvironment)
              }
              className="rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2 text-[#F8FAFC]"
            >
              <option value="sandbox">sandbox</option>
              <option value="production">production</option>
            </select>
          </label>
          <button
            type="button"
            disabled={publishState.status === "checking_access"}
            onClick={() => checkAccessLevel()}
            className="rounded-md border border-[#39E6D0]/50 bg-[#39E6D0]/10 px-4 py-2 text-sm font-semibold text-[#39E6D0] transition hover:bg-[#111D2E] hover:text-[#F8FAFC] disabled:border-[#1D2A44] disabled:bg-[#03070B] disabled:text-[#64748B]"
          >
            {publishState.status === "checking_access"
              ? "Verification..."
              : "Vérifier le niveau d'accès Pinterest"}
          </button>
        </div>
      </div>

      <div className="grid gap-3 rounded-md border border-[#1D2A44] bg-[#08111A] p-4 md:grid-cols-2 xl:grid-cols-5">
        <label className="grid gap-2 text-sm text-[#A7B0C0]">
          Compte Pinterest
          <select
            value={accountFilter}
            onChange={(event) => setAccountFilter(event.target.value)}
            className="rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2 text-[#F8FAFC]"
          >
            <option value="all">Tous</option>
            <option value="edifice_discipline">Edifice Discipline</option>
            <option value="solution_sommeil">Solution Sommeil</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm text-[#A7B0C0]">
          Statut
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2 text-[#F8FAFC]"
          >
            <option value="all">Tous</option>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm text-[#A7B0C0]">
          Board cible
          <select
            value={boardFilter}
            onChange={(event) => setBoardFilter(event.target.value)}
            className="rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2 text-[#F8FAFC]"
          >
            <option value="all">Tous</option>
            {boardNames.map((boardName) => (
              <option key={boardName} value={boardName}>
                {boardName}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm text-[#A7B0C0]">
          Etat board
          <select
            value={boardStateFilter}
            onChange={(event) => setBoardStateFilter(event.target.value)}
            className="rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2 text-[#F8FAFC]"
          >
            <option value="all">Tous</option>
            <option value="without_board">Sans board</option>
            <option value="suggested_board">Board suggere</option>
            <option value="confirmed_board">Board confirme</option>
          </select>
        </label>
        <div className="grid content-end">
          <button
            type="button"
            disabled={publishState.status === "refreshing"}
            onClick={refreshSuggestions}
            className="rounded-md border border-[#39E6D0]/50 bg-[#39E6D0]/10 px-4 py-2 text-sm font-semibold text-[#39E6D0] transition hover:bg-[#111D2E] hover:text-[#F8FAFC] disabled:border-[#1D2A44] disabled:bg-[#03070B] disabled:text-[#64748B]"
          >
            {publishState.status === "refreshing"
              ? "Actualisation..."
              : "Actualiser les suggestions"}
          </button>
        </div>
      </div>

      {publishState.status === "success" || publishState.status === "error" ? (
        <div
          className={`rounded-md border px-4 py-3 text-sm ${
            publishState.status === "success"
              ? "border-[#39E6D0]/40 bg-[#39E6D0]/10 text-[#39E6D0]"
              : "border-[#ef4444]/40 bg-[#ef4444]/10 text-[#fecaca]"
          }`}
        >
          {publishState.message}
        </div>
      ) : null}

      <div className="grid gap-3">
        {filteredPins.map((pin) => {
          const pinBoards = boardsForPin(pin);
          const selectedBoard = getSelectedBoard(pin);
          const canPublish =
            pin.status !== "published" &&
            Boolean(pin.imageUrl && pin.title && pin.description && pin.targetUrl);

          return (
            <article
              key={pin.id}
              className="grid gap-4 rounded-md border border-[#1D2A44] bg-[#08111A] p-4 lg:grid-cols-[150px_minmax(0,1fr)_260px]"
            >
              <PinImage pin={pin} />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-md border border-[#1D2A44] bg-[#03070B] px-2 py-1 font-semibold text-[#7DD3FC]">
                    {accountLabels[pin.accountId] ?? pin.accountName ?? pin.accountId}
                  </span>
                  <span className="rounded-md border border-[#1D2A44] bg-[#03070B] px-2 py-1 font-semibold text-[#A7B0C0]">
                    {pin.status}
                  </span>
                </div>
                <h2 className="mt-3 text-lg font-semibold text-[#F8FAFC]">
                  {pin.title ?? "Pin sans titre"}
                </h2>
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-[#A7B0C0]">
                  {pin.description ?? "Description absente."}
                </p>
                <div className="mt-3 grid gap-2 text-sm text-[#A7B0C0] md:grid-cols-2">
                  <p>
                    target_url:{" "}
                    <span className="break-all font-semibold text-[#F8FAFC]">
                      {pin.targetUrl ?? "absent"}
                    </span>
                  </p>
                  <p>
                    board:{" "}
                    <span className="font-semibold text-[#F8FAFC]">
                      {pin.boardName ?? "non defini"}
                    </span>
                  </p>
                  <p className="md:col-span-2">
                    Tableau suggere:{" "}
                    <span className="font-semibold text-[#F8FAFC]">
                      {pin.suggestedBoardName ?? "aucune suggestion"}
                    </span>
                    {pin.boardSuggestionConfidence ? (
                      <span className="ml-2 rounded-md border border-[#39E6D0]/35 bg-[#39E6D0]/10 px-2 py-0.5 text-xs font-semibold text-[#39E6D0]">
                        confiance {confidenceLabels[pin.boardSuggestionConfidence]}
                      </span>
                    ) : null}
                  </p>
                  {pin.boardSuggestionReason ? (
                    <p className="md:col-span-2">
                      Raison:{" "}
                      <span className="text-[#D8DEE8]">{pin.boardSuggestionReason}</span>
                    </p>
                  ) : null}
                  {pin.lastError ? (
                    <p className="md:col-span-2 text-[#fecaca]">
                      Erreur: {pin.lastError}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="grid content-start gap-3">
                <label className="grid gap-2 text-sm text-[#A7B0C0]">
                  Board cible
                  <select
                    value={selectedBoards[pin.id] ?? pin.boardId ?? pin.suggestedBoardId ?? ""}
                    onChange={(event) =>
                      setSelectedBoards((current) => ({
                        ...current,
                        [pin.id]: event.target.value,
                      }))
                    }
                    className="rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2 text-[#F8FAFC]"
                  >
                    <option value="">Choisir un board</option>
                    {pinBoards.map((board) => (
                      <option key={board.id} value={board.id}>
                        {board.name}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  disabled={!canPublish || !selectedBoard}
                  onClick={() =>
                    setPublishState({
                      status: "confirming",
                      message: null,
                      pin,
                    })
                  }
                  className="rounded-md border border-[#f59e0b]/50 bg-[#f59e0b]/10 px-4 py-2 text-sm font-semibold text-[#fbbf24] transition hover:bg-[#111D2E] hover:text-[#F8FAFC] disabled:border-[#1D2A44] disabled:bg-[#03070B] disabled:text-[#64748B]"
                >
                  Publier 1 pin test
                </button>
              </div>
            </article>
          );
        })}
        {filteredPins.length === 0 ? (
          <div className="rounded-md border border-dashed border-[#1D2A44] bg-[#08111A] p-6 text-center text-[#A7B0C0]">
            Aucun pin ne correspond aux filtres.
          </div>
        ) : null}
      </div>

      {publishState.status === "confirming" || publishState.status === "publishing" ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#03070B]/80 px-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-lg border border-[#1D2A44] bg-[#0B1420] p-5 shadow-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#fbbf24]">
              Confirmation publication
            </p>
            <h2 className="mt-2 text-xl font-semibold text-[#F8FAFC]">
              Publier exactement 1 pin test
            </h2>
            <div className="mt-4 grid gap-4 md:grid-cols-[160px_minmax(0,1fr)]">
              <PinImage pin={publishState.pin} />
              <div className="grid gap-2 text-sm leading-6 text-[#A7B0C0]">
                <p>Compte utilise: {accountLabels[publishState.pin.accountId] ?? publishState.pin.accountId}</p>
                <p>Board utilise: {getSelectedBoard(publishState.pin)?.name ?? "non choisi"}</p>
                <p>Titre: {publishState.pin.title}</p>
                <p>Description: {publishState.pin.description}</p>
                <p className="break-all">target_url: {publishState.pin.targetUrl}</p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                disabled={publishState.status === "publishing"}
                onClick={() => setPublishState({ status: "idle", message: null })}
                className="rounded-md border border-[#1D2A44] px-4 py-2 text-sm font-semibold text-[#A7B0C0]"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={publishState.status === "publishing"}
                onClick={() => publishConfirmed(publishState.pin)}
                className="rounded-md border border-[#f59e0b]/50 bg-[#f59e0b]/10 px-4 py-2 text-sm font-semibold text-[#fbbf24] disabled:opacity-50"
              >
                {publishState.status === "publishing" ? "Publication..." : "Confirmer"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
