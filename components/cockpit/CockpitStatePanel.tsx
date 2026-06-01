import type { CockpitReadOnlyState } from "@/types/cockpit";
import { SectionContainer } from "./SectionContainer";

function ListBlock({
  title,
  items,
  empty,
}: {
  title: string;
  items: string[];
  empty: string;
}) {
  return (
    <div className="rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7DD3FC]">
        {title}
      </p>
      <div className="mt-2 grid gap-2 text-sm leading-6 text-[#A7B0C0]">
        {items.length > 0 ? (
          items.map((item) => <p key={item}>{item}</p>)
        ) : (
          <p>{empty}</p>
        )}
      </div>
    </div>
  );
}

export function CockpitStatePanel({
  state,
}: {
  state: CockpitReadOnlyState;
}) {
  return (
    <SectionContainer>
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#39E6D0]">
        Etat du cockpit
      </p>
      <h2 className="mt-2 text-xl font-semibold text-[#F8FAFC]">
        Lecture reelle, sans action
      </h2>
      <p className="mt-3 text-sm leading-6 text-[#A7B0C0]">
        Connecteur lecture seule utilise par l&apos;Observatoire et
        l&apos;assistant global. Aucun token n&apos;est expose, aucune ecriture
        n&apos;est declenchee.
      </p>

      <div className="mt-5 grid gap-3">
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            ["Brouillons", String(state.contentDrafts.total)],
            ["Prets a publier", String(state.contentDrafts.readyToPublish.length)],
            ["En cours", String(state.contentDrafts.inProgress.length)],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-3"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#A7B0C0]">
                {label}
              </p>
              <p className="mt-2 text-2xl font-semibold text-[#F8FAFC]">
                {value}
              </p>
            </div>
          ))}
        </div>

        <ListBlock
          title="Brouillons prets"
          items={state.contentDrafts.readyToPublish.map(
            (draft) =>
              `${draft.title} - ${draft.platformTargets.join(", ") || "sans plateforme"}`,
          )}
          empty="Aucun brouillon ready_to_publish."
        />
        <ListBlock
          title="OAuth"
          items={state.oauthStatuses.map(
            (status) =>
              `${status.provider}: ${
                status.configured ? "configure" : "incomplet"
              }, token ${status.tokenPresent ? "present" : "absent"}`,
          )}
          empty="Aucun statut OAuth lisible."
        />
        <ListBlock
          title="Modules en migration"
          items={state.modules.migrating.map(
            (module) => `${module.title} (${module.status})`,
          )}
          empty="Aucun module en migration."
        />
        <ListBlock
          title="Reviews externes"
          items={state.externalReviews.map(
            (review) => `${review.name}: ${review.note}`,
          )}
          empty="Aucune review externe en attente."
        />
        <ListBlock
          title="Blocages"
          items={state.blockers}
          empty="Aucun blocage signale par le connecteur."
        />
      </div>
    </SectionContainer>
  );
}
