"use client";

import { useEffect, useState } from "react";
import {
  ERASURE_CONFIRMATION_WORD,
  type ErasableModuleId,
  type ErasableModuleSummary,
  type ErasureModuleResult,
} from "@/lib/personal/data-erasure";

type Step = "select" | "confirm" | "done";

// Section Reglages > Personnel.
//
// C'est la SEULE section de cet ecran dont les actions ont un effet reel. Les
// sept autres onglets enregistrent des preferences que personne ne relit —
// voir 06_Modules.md. Ce contraste est un piege de conception : un bouton qui
// supprime vraiment, dans un ecran ou rien d'autre ne fait rien, sera actionne
// avec la meme legerete que les bascules inertes d'a cote.
//
// Le bandeau ambre ci-dessous nomme ce contraste explicitement, plutot que
// d'afficher un avertissement generique. C'est une exigence de conception, pas
// un element decoratif.
export function SettingsPersonalPanel() {
  const [step, setStep] = useState<Step>("select");
  const [modules, setModules] = useState<ErasableModuleSummary[]>([]);
  const [selected, setSelected] = useState<ErasableModuleId[]>([]);
  const [confirmationInput, setConfirmationInput] = useState("");
  const [results, setResults] = useState<ErasureModuleResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isErasing, setIsErasing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    fetch("/api/personal/settings/erase", { cache: "no-store" })
      .then(async (response) => {
        const payload = (await response.json()) as {
          modules?: ErasableModuleSummary[];
          error?: string;
        };

        if (!response.ok || !payload.modules) {
          throw new Error(payload.error ?? "Lecture des volumes indisponible.");
        }

        return payload.modules;
      })
      .then((next) => {
        if (isMounted) {
          setModules(next);
          setError(null);
        }
      })
      .catch((caughtError) => {
        if (isMounted) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Lecture des volumes indisponible.",
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

  const selectedSummaries = modules.filter((module) => selected.includes(module.id));
  const totalSelected = selectedSummaries.reduce((sum, module) => sum + module.count, 0);
  const cascadingSummaries = selectedSummaries.filter((module) => module.cascadeLabel);
  const canConfirm = confirmationInput === ERASURE_CONFIRMATION_WORD && !isErasing;

  function toggleModule(id: ErasableModuleId) {
    setSelected((current) =>
      current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id],
    );
  }

  function backToSelection() {
    setStep("select");
    setConfirmationInput("");
    setError(null);
  }

  async function erase() {
    setIsErasing(true);

    try {
      const response = await fetch("/api/personal/settings/erase", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          modules: selected,
          confirmation: confirmationInput,
        }),
      });
      const payload = (await response.json()) as {
        results?: ErasureModuleResult[];
        error?: string;
      };

      if (!response.ok || !payload.results) {
        throw new Error(payload.error ?? "Suppression definitive indisponible.");
      }

      setResults(payload.results);
      setStep("done");
      setSelected([]);
      setConfirmationInput("");
      setModules((current) =>
        current.map((module) =>
          payload.results?.some((result) => result.id === module.id)
            ? { ...module, count: 0 }
            : module,
        ),
      );
      setError(null);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Suppression definitive indisponible.",
      );
    } finally {
      setIsErasing(false);
    }
  }

  return (
    <section className="grid gap-4 rounded-md border-2 border-[#f59e0b]/50 bg-[#0B1420] p-5">
      <div className="rounded-md border border-[#f59e0b]/40 bg-[#f59e0b]/10 px-4 py-3">
        <p className="text-sm font-semibold text-[#fbbf24]">
          Cette section agit réellement, contrairement au reste de cet écran.
        </p>
        <p className="mt-2 text-sm leading-6 text-[#fbbf24]">
          Les autres onglets de Réglages enregistrent des préférences qui ne sont
          aujourd&apos;hui appliquées nulle part. Ici, l&apos;action supprime définitivement des
          données en base, immédiatement et sans sauvegarde. Il n&apos;y a pas de corbeille,
          pas d&apos;annulation, pas de restauration possible.
        </p>
      </div>

      <div>
        <h3 className="text-base font-semibold text-[#F8FAFC]">Vider l&apos;historique</h3>
        <p className="mt-2 text-sm leading-6 text-[#A7B0C0]">
          Efface tout le contenu des modules choisis, <strong className="text-[#F8FAFC]">y compris
          les éléments archivés</strong>. Ce geste ne supprime pas votre compte, ne touche ni aux
          connexions, ni aux autres pôles.
        </p>
      </div>

      {error ? (
        <div className="rounded-md border border-[#f87171]/40 bg-[#f87171]/10 p-4">
          <p className="text-sm text-[#fecaca]">{error}</p>
        </div>
      ) : null}

      {isLoading ? (
        <p className="text-sm text-[#A7B0C0]">Chargement des volumes...</p>
      ) : step === "select" ? (
        <div className="grid gap-3">
          <ul className="grid gap-2">
            {modules.map((module) => (
              <li key={module.id}>
                <label className="flex cursor-pointer items-center justify-between gap-3 rounded-md border border-[#1D2A44] bg-[#08111A] px-4 py-3">
                  <span className="flex items-center gap-3">
                    <input
                      checked={selected.includes(module.id)}
                      className="h-4 w-4 accent-[#f59e0b]"
                      onChange={() => toggleModule(module.id)}
                      type="checkbox"
                    />
                    <span className="text-sm font-semibold text-[#F8FAFC]">{module.label}</span>
                  </span>
                  <span className="text-sm text-[#A7B0C0]">
                    {module.count} élément{module.count > 1 ? "s" : ""}
                    {module.cascadeLabel ? (
                      <span className="text-[#64748b]"> + {module.cascadeLabel}</span>
                    ) : null}
                  </span>
                </label>
              </li>
            ))}
          </ul>

          <button
            className="justify-self-start rounded-md border border-[#f59e0b]/50 bg-[#f59e0b]/15 px-4 py-2 text-sm font-semibold text-[#fbbf24] transition hover:bg-[#f59e0b]/25 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={selected.length === 0}
            onClick={() => setStep("confirm")}
            type="button"
          >
            Continuer
          </button>
        </div>
      ) : step === "confirm" ? (
        <div className="grid gap-3">
          <div className="rounded-md border border-[#f87171]/40 bg-[#f87171]/10 p-4">
            <p className="text-sm font-semibold text-[#fecaca]">
              Vous allez supprimer définitivement :
            </p>
            <ul className="mt-2 grid gap-1">
              {selectedSummaries.map((module) => (
                <li className="text-sm text-[#fecaca]" key={module.id}>
                  — {module.label} : {module.count} élément{module.count > 1 ? "s" : ""}
                  {module.cascadeLabel
                    ? `, et toutes les ${module.cascadeLabel} associées`
                    : null}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm leading-6 text-[#fecaca]">
              <strong>{totalSelected} élément{totalSelected > 1 ? "s" : ""} au total.</strong>{" "}
              Cette action est irréversible. Les éléments archivés sont inclus. Aucune
              sauvegarde n&apos;existe.
            </p>

            {/* Le total ci-dessus compte les elements dans l'unite affichee —
                des habitudes, pas des lignes. Les realisations partent avec
                elles sans y figurer, et elles sont de loin les plus nombreuses.
                Le taire ferait passer une suppression de plusieurs centaines de
                lignes pour une suppression de trois. */}
            {cascadingSummaries.length > 0 ? (
              <p className="mt-2 text-sm leading-6 text-[#fecaca]">
                Ce total ne compte pas les{" "}
                {cascadingSummaries
                  .map((module) => `${module.cascadeLabel} de ${module.label}`)
                  .join(", ")}{" "}
                : elles sont supprimées aussi, et elles sont bien plus nombreuses.
              </p>
            ) : null}
          </div>

          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#A7B0C0]">
              Tapez {ERASURE_CONFIRMATION_WORD} pour confirmer
            </span>
            <input
              autoComplete="off"
              className="w-full max-w-xs rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2 text-sm text-[#F8FAFC] outline-none transition focus:border-[#f59e0b]/60"
              onChange={(event) => setConfirmationInput(event.target.value)}
              type="text"
              value={confirmationInput}
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-md border border-[#f87171]/50 bg-[#f87171]/15 px-4 py-2 text-sm font-semibold text-[#fecaca] transition hover:bg-[#f87171]/25 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={!canConfirm}
              onClick={erase}
              type="button"
            >
              {isErasing ? "Suppression..." : "Supprimer définitivement"}
            </button>
            <button
              className="rounded-md border border-[#1D2A44] bg-[#08111A] px-4 py-2 text-sm font-semibold text-[#A7B0C0] transition hover:text-[#F8FAFC]"
              disabled={isErasing}
              onClick={backToSelection}
              type="button"
            >
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-3">
          {/* Comptes reellement supprimes, renvoyes par le serveur — pas les
              comptes annonces a l'etape de confirmation. Un ecart entre les deux
              est donc visible. */}
          <div className="rounded-md border border-[#1D2A44] bg-[#08111A] p-4">
            <p className="text-sm font-semibold text-[#F8FAFC]">Suppression effectuée.</p>
            <ul className="mt-2 grid gap-1">
              {results.map((result) => (
                <li className="text-sm text-[#A7B0C0]" key={result.id}>
                  — {result.label} : {result.deletedCount} élément
                  {result.deletedCount > 1 ? "s" : ""} supprimé
                  {result.deletedCount > 1 ? "s" : ""}
                  {/* Volume reellement supprime dans les tables dependantes,
                      renvoye par le serveur. Affiche meme a zero une fois le
                      module concerne : "0 realisation" apres suppression est
                      une information, pas du bruit. */}
                  {result.relatedDeletedCount !== undefined
                    ? `, et ${result.relatedDeletedCount} réalisation${
                        result.relatedDeletedCount > 1 ? "s" : ""
                      }`
                    : null}
                </li>
              ))}
            </ul>
          </div>

          <button
            className="justify-self-start rounded-md border border-[#1D2A44] bg-[#08111A] px-4 py-2 text-sm font-semibold text-[#A7B0C0] transition hover:text-[#F8FAFC]"
            onClick={() => {
              setResults([]);
              setStep("select");
            }}
            type="button"
          >
            Retour
          </button>
        </div>
      )}
    </section>
  );
}
