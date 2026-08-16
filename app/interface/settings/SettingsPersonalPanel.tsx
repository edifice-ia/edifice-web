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
  // Une seule cible a la fois. Remplace la selection multiple : un geste
  // d'effacement vise un module et un seul, et la confirmation qui suit ne
  // parle que de lui. Il n'y a donc plus de selection a deduire ni a
  // dedupliquer — l'identifiant est soit nul, soit exactement un.
  const [targetId, setTargetId] = useState<ErasableModuleId | null>(null);
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

  const target = modules.find((module) => module.id === targetId) ?? null;
  const canConfirm = confirmationInput === ERASURE_CONFIRMATION_WORD && !isErasing;

  // Le mot de confirmation est vide a chaque ouverture : sans cela, confirmer un
  // module puis en viser un autre trouverait le champ deja rempli, et le second
  // effacement se ferait sans avoir rien retape.
  function startErase(id: ErasableModuleId) {
    setTargetId(id);
    setConfirmationInput("");
    setStep("confirm");
    setError(null);
  }

  function backToSelection() {
    setStep("select");
    setTargetId(null);
    setConfirmationInput("");
    setError(null);
  }

  async function erase() {
    if (!targetId) {
      return;
    }

    setIsErasing(true);

    try {
      const response = await fetch("/api/personal/settings/erase", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          // Forme de requete inchangee a ce stade : la route attend encore une
          // liste. Elle passe a `module` unique au checkpoint suivant.
          modules: [targetId],
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
      setTargetId(null);
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
          {/* Une ligne, un bouton, un module. Plus de case a cocher ni de bouton
              "Continuer" commun : il n'existe aucun geste capable d'emporter
              plusieurs modules a la fois, et chaque bouton nomme sa cible. */}
          <ul className="grid gap-2">
            {modules.map((module) => (
              <li
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-[#1D2A44] bg-[#08111A] px-4 py-3"
                key={module.id}
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#F8FAFC]">{module.label}</p>
                  <p className="mt-1 text-sm text-[#A7B0C0]">
                    {module.count} élément{module.count > 1 ? "s" : ""}
                    {module.cascadeLabel ? (
                      <span className="text-[#64748b]"> + {module.cascadeLabel}</span>
                    ) : null}
                  </p>
                </div>

                {/* Jamais desactive, meme a zero element. Un module annonce a 0
                    peut conserver des lignes dependantes orphelines si la
                    cascade a manque en base (voir DEC-013) — desactiver le
                    bouton fermerait le seul chemin qui les nettoie. */}
                <button
                  className="rounded-md border border-[#f59e0b]/50 bg-[#f59e0b]/15 px-4 py-2 text-sm font-semibold text-[#fbbf24] transition hover:bg-[#f59e0b]/25"
                  onClick={() => startErase(module.id)}
                  type="button"
                >
                  Vider {module.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : step === "confirm" && target ? (
        <div className="grid gap-3">
          <div className="rounded-md border border-[#f87171]/40 bg-[#f87171]/10 p-4">
            {/* Le nom du module est le point de lecture obligatoire de cet
                ecran. Il est sorti du corps du texte et rendu en grand, sur sa
                propre ligne : le mot a taper etant generique, c'est le seul
                element qui distingue cette confirmation d'une autre. */}
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#fecaca]/70">
              Module ciblé
            </p>
            <p className="mt-1 text-xl font-semibold text-[#fecaca]">{target.label}</p>

            <p className="mt-3 text-sm leading-6 text-[#fecaca]">
              Vous allez supprimer définitivement{" "}
              <strong>
                {target.count} élément{target.count > 1 ? "s" : ""}
              </strong>{" "}
              de {target.label}
              {target.cascadeLabel ? `, et toutes les ${target.cascadeLabel} associées` : null}.
              Cette action est irréversible. Les éléments archivés sont inclus. Aucune
              sauvegarde n&apos;existe.
            </p>

            {/* Le compte ci-dessus est exprime dans l'unite affichee — des
                habitudes, pas des lignes. Les realisations partent avec elles
                sans y figurer, et elles sont de loin les plus nombreuses. Le
                taire ferait passer une suppression de plusieurs centaines de
                lignes pour une suppression de trois. */}
            {target.cascadeLabel ? (
              <p className="mt-2 text-sm leading-6 text-[#fecaca]">
                Ce compte ne comprend pas les {target.cascadeLabel} : elles sont supprimées
                aussi, et elles sont bien plus nombreuses.
              </p>
            ) : null}

            <p className="mt-3 text-sm leading-6 text-[#fecaca]">
              Les autres modules du pôle ne sont pas touchés.
            </p>
          </div>

          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#A7B0C0]">
              Tapez {ERASURE_CONFIRMATION_WORD} pour vider {target.label}
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
              {isErasing ? "Suppression..." : `Supprimer définitivement ${target.label}`}
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
      ) : step === "done" ? (
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
      ) : null}
    </section>
  );
}
