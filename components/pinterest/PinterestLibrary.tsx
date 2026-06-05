"use client";

import { useMemo, useState } from "react";
import type {
  PinterestAccountWorkshop,
  PinterestReviewStatus,
  PinterestWorkshopItem,
  PinterestWorkshopStatus,
} from "@/lib/pinterestLocalIndexes";

type StatusFilter = "all" | "generated" | "visual_ready" | "ready_to_publish" | "published";
type ReviewFilter = "all" | PinterestReviewStatus;

const pageSize = 24;

const statusLabels: Record<PinterestWorkshopStatus, string> = {
  generated: "Généré",
  visual_ready: "Visuel prêt",
  ready_to_publish: "Prêt à publier",
  dry_run: "Dry-run",
  published: "Publié",
  error: "Erreur",
};

const statusFilterLabels: Record<StatusFilter, string> = {
  all: "Tous",
  generated: "Généré",
  visual_ready: "Visuel prêt",
  ready_to_publish: "Prêt à publier",
  published: "Publié",
};

const reviewLabels: Record<PinterestReviewStatus, string> = {
  pending: "En attente",
  approved: "Validé",
  needs_revision: "À revoir",
  rejected: "Rejeté",
};

const reviewFilterLabels: Record<ReviewFilter, string> = {
  all: "Tous",
  ...reviewLabels,
};

const reviewBadgeClasses: Record<PinterestReviewStatus, string> = {
  pending: "border-[#64748B]/45 bg-[#64748B]/10 text-[#CBD5E1]",
  approved: "border-[#22C55E]/40 bg-[#22C55E]/10 text-[#86EFAC]",
  needs_revision: "border-[#FACC15]/40 bg-[#FACC15]/10 text-[#FDE68A]",
  rejected: "border-[#F97316]/40 bg-[#F97316]/10 text-[#FDBA74]",
};

const badgeClasses: Record<PinterestWorkshopStatus, string> = {
  generated: "border-[#7DD3FC]/35 bg-[#7DD3FC]/10 text-[#7DD3FC]",
  visual_ready: "border-[#39E6D0]/35 bg-[#39E6D0]/10 text-[#39E6D0]",
  ready_to_publish: "border-[#22C55E]/35 bg-[#22C55E]/10 text-[#86EFAC]",
  dry_run: "border-[#FACC15]/35 bg-[#FACC15]/10 text-[#FDE68A]",
  published: "border-[#A78BFA]/35 bg-[#A78BFA]/10 text-[#C4B5FD]",
  error: "border-[#F97316]/35 bg-[#F97316]/10 text-[#FDBA74]",
};

type LibraryPin = PinterestWorkshopItem & {
  accountId: string;
  accountLabel: string;
  niche: string;
};

function buildImageSrc(item: PinterestWorkshopItem) {
  if (item.imageUrl) {
    return item.imageUrl;
  }

  if (item.imageId) {
    return `/api/pinterest/local-image?id=${encodeURIComponent(item.imageId)}`;
  }

  if (item.accountId && item.postId) {
    return `/api/pinterest/local-image?id=${encodeURIComponent(
      `${item.accountId}:${item.postId}`,
    )}`;
  }

  if (!item.imagePath || !/\.(png|jpe?g|webp)$/i.test(item.imagePath)) {
    return "";
  }

  return `/api/pinterest/local-image?path=${encodeURIComponent(item.imagePath)}`;
}

function formatDate(value: string) {
  if (!value) {
    return "Date absente";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function PinBadges({ badges }: { badges: PinterestWorkshopStatus[] }) {
  if (badges.length === 0) {
    return (
      <span className="rounded-md border border-[#1D2A44] bg-[#03070B] px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#A7B0C0]">
        En attente
      </span>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {badges.map((badge) => (
        <span
          key={badge}
          className={`rounded-md border px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${badgeClasses[badge]}`}
        >
          {statusLabels[badge]}
        </span>
      ))}
    </div>
  );
}

function ReviewBadge({ status }: { status: PinterestReviewStatus }) {
  return (
    <span
      className={`rounded-md border px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${reviewBadgeClasses[status]}`}
    >
      {reviewLabels[status]}
    </span>
  );
}

function PinImage({ item, large = false }: { item: PinterestWorkshopItem; large?: boolean }) {
  const imageSrc = buildImageSrc(item);
  const [failedSrc, setFailedSrc] = useState("");
  const hasImageRequest = Boolean(imageSrc);
  const hasImageError = Boolean(imageSrc && failedSrc === imageSrc);

  if (!hasImageRequest || hasImageError) {
    return (
      <div
        className={`flex aspect-[2/3] items-center justify-center rounded-md border border-[#1D2A44] bg-[#08111A] text-center text-xs uppercase tracking-[0.14em] text-[#64748B] ${
          large ? "min-h-[420px]" : ""
        }`}
      >
        Visuel absent
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imageSrc}
      alt={item.title || "Pin Pinterest"}
      loading="lazy"
      onError={() => setFailedSrc(imageSrc)}
      className={`aspect-[2/3] w-full rounded-md border border-[#1D2A44] bg-[#08111A] object-cover ${
        large ? "max-h-[72vh]" : ""
      }`}
    />
  );
}

export function PinterestLibrary({
  accounts,
  initialAccountId,
}: {
  accounts: PinterestAccountWorkshop[];
  initialAccountId: string | null;
}) {
  const [accountFilter, setAccountFilter] = useState(initialAccountId ?? "all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>("all");
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const [selectedPin, setSelectedPin] = useState<LibraryPin | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [reviewSaving, setReviewSaving] = useState(false);
  const [reviewMessage, setReviewMessage] = useState("");
  const [reviewError, setReviewError] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);
  const [reviewOverrides, setReviewOverrides] = useState<
    Record<string, Pick<LibraryPin, "reviewStatus" | "reviewedAt" | "reviewedBy" | "reviewNotes">>
  >({});

  const pins = useMemo(
    () =>
      accounts.flatMap((account) =>
        account.publicationQueue.map((item) => {
          const override = reviewOverrides[`${account.id}:${item.id}`];

          return {
            ...item,
            ...override,
            accountId: account.id,
            accountLabel: account.name,
            niche: account.niche,
          };
        }),
      ),
    [accounts, reviewOverrides],
  );

  const filteredPins = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return pins.filter((pin) => {
      const matchesAccount = accountFilter === "all" || pin.accountId === accountFilter;
      const matchesStatus =
        statusFilter === "all" || pin.badges.includes(statusFilter as PinterestWorkshopStatus);
      const matchesReview = reviewFilter === "all" || pin.reviewStatus === reviewFilter;
      const haystack = `${pin.title} ${pin.keywords} ${pin.description}`.toLowerCase();
      const matchesQuery = !normalizedQuery || haystack.includes(normalizedQuery);

      return matchesAccount && matchesStatus && matchesReview && matchesQuery;
    });
  }, [accountFilter, pins, query, reviewFilter, statusFilter]);

  const visiblePins = filteredPins.slice(0, visibleCount);
  const detectedVisuals = pins.filter((pin) => buildImageSrc(pin)).length;
  const imageFields = [...new Set(pins.map((pin) => pin.imageSourceField).filter(Boolean))];

  function updateAccountFilter(value: string) {
    setAccountFilter(value);
    setVisibleCount(pageSize);
  }

  function updateStatusFilter(value: StatusFilter) {
    setStatusFilter(value);
    setVisibleCount(pageSize);
  }

  function updateQuery(value: string) {
    setQuery(value);
    setVisibleCount(pageSize);
  }

  function openPin(pin: LibraryPin) {
    setSelectedPin(pin);
    setReviewNote(pin.reviewNotes);
    setReviewMessage("");
    setReviewError("");
    setLinkCopied(false);
  }

  async function copyTargetUrl() {
    if (!selectedPin?.targetUrl) {
      return;
    }

    await navigator.clipboard.writeText(selectedPin.targetUrl);
    setLinkCopied(true);
  }

  async function submitReview(reviewStatus: PinterestReviewStatus) {
    if (!selectedPin?.reviewWritable) {
      return;
    }

    setReviewSaving(true);
    setReviewMessage("");
    setReviewError("");

    try {
      const response = await fetch("/api/pinterest/review", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: selectedPin.accountId,
          localId: selectedPin.id,
          reviewStatus,
          reviewNotes: reviewNote,
        }),
      });
      const payload = await response.json() as {
        error?: string;
        review?: Pick<
          LibraryPin,
          "reviewStatus" | "reviewedAt" | "reviewedBy" | "reviewNotes"
        >;
      };

      if (!response.ok || !payload.review) {
        throw new Error(payload.error ?? "Validation Pinterest impossible.");
      }

      const key = `${selectedPin.accountId}:${selectedPin.id}`;
      setReviewOverrides((current) => ({ ...current, [key]: payload.review! }));
      setSelectedPin((current) => current ? { ...current, ...payload.review } : current);
      setReviewNote(payload.review.reviewNotes);
      setReviewMessage(`Validation enregistrée : ${reviewLabels[payload.review.reviewStatus]}.`);
    } catch (error) {
      setReviewError(error instanceof Error ? error.message : "Validation Pinterest impossible.");
    } finally {
      setReviewSaving(false);
    }
  }

  return (
    <section id="bibliotheque-pinterest" className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#39E6D0]">
            Bibliothèque Pinterest
          </p>
          <h2 className="mt-2 text-xl font-semibold text-[#F8FAFC]">
            Galerie des pins existants
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#A7B0C0]">
            {detectedVisuals} visuels détectés dans le snapshot local. Lecture seule.
          </p>
        </div>
        <div className="rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#A7B0C0]">
          {filteredPins.length} pins affichables
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[180px_180px_180px_minmax(0,1fr)]">
        <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#64748B]">
          Compte
          <select
            value={accountFilter}
            onChange={(event) => updateAccountFilter(event.target.value)}
            className="rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2 text-sm font-medium normal-case tracking-normal text-[#F8FAFC]"
          >
            <option value="all">Tous</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#64748B]">
          Validation
          <select
            value={reviewFilter}
            onChange={(event) => {
              setReviewFilter(event.target.value as ReviewFilter);
              setVisibleCount(pageSize);
            }}
            className="rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2 text-sm font-medium normal-case tracking-normal text-[#F8FAFC]"
          >
            {Object.entries(reviewFilterLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#64748B]">
          Statut
          <select
            value={statusFilter}
            onChange={(event) => updateStatusFilter(event.target.value as StatusFilter)}
            className="rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2 text-sm font-medium normal-case tracking-normal text-[#F8FAFC]"
          >
            {Object.entries(statusFilterLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#64748B]">
          Recherche
          <input
            type="search"
            value={query}
            onChange={(event) => updateQuery(event.target.value)}
            placeholder="Titre, mots-clés..."
            className="rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2 text-sm font-medium normal-case tracking-normal text-[#F8FAFC] placeholder:text-[#64748B]"
          />
        </label>
      </div>

      {imageFields.length > 0 ? (
        <p className="text-xs leading-5 text-[#64748B]">
          Champs image utilisés : {imageFields.join(", ")}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {visiblePins.map((pin) => (
          <button
            key={`${pin.accountId}-${pin.id}`}
            type="button"
            onClick={() => openPin(pin)}
            className="group rounded-lg border border-[#1D2A44] bg-[#03070B] p-3 text-left transition hover:border-[#39E6D0]/50 hover:bg-[#08111A]"
          >
            <PinImage item={pin} />
            <div className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#64748B]">
                {pin.accountLabel}
              </p>
              <h3 className="mt-2 line-clamp-2 min-h-[44px] text-sm font-semibold leading-5 text-[#F8FAFC]">
                {pin.title || "Pin sans titre"}
              </h3>
              <p className="mt-2 line-clamp-2 text-xs leading-5 text-[#A7B0C0]">
                {pin.niche}
              </p>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <ReviewBadge status={pin.reviewStatus} />
              <PinBadges badges={pin.badges} />
            </div>
            <p className="mt-3 text-xs text-[#64748B]">{formatDate(pin.createdAt)}</p>
          </button>
        ))}
      </div>

      {visiblePins.length === 0 ? (
        <div className="rounded-lg border border-[#1D2A44] bg-[#03070B] p-8 text-center">
          <p className="text-sm font-semibold text-[#F8FAFC]">Aucun pin trouvé</p>
          <p className="mt-2 text-sm leading-6 text-[#A7B0C0]">
            Ajuste le filtre compte, statut ou recherche.
          </p>
        </div>
      ) : null}

      {visibleCount < filteredPins.length ? (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setVisibleCount((current) => current + pageSize)}
            className="rounded-md border border-[#1D2A44] bg-[#08111A] px-4 py-2 text-sm font-semibold text-[#F8FAFC] hover:border-[#39E6D0]/50"
          >
            Charger plus
          </button>
        </div>
      ) : null}

      {selectedPin ? (
        <div
          className="fixed inset-0 z-50 bg-[#03070B]/80 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            aria-label="Fermer"
            onClick={() => setSelectedPin(null)}
            className="absolute inset-0 cursor-default"
          />
          <aside className="absolute right-0 top-0 h-full w-full max-w-2xl overflow-y-auto border-l border-[#1D2A44] bg-[#06101A] p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#39E6D0]">
                  {selectedPin.accountLabel}
                </p>
                <h3 className="mt-2 text-2xl font-semibold text-[#F8FAFC]">
                  {selectedPin.title || "Pin sans titre"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPin(null)}
                className="rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2 text-sm font-semibold text-[#A7B0C0]"
              >
                Fermer
              </button>
            </div>

            <div className="mt-5 grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
              <PinImage item={selectedPin} large />
              <div className="space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-[#64748B]">
                    Description SEO
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[#A7B0C0]">
                    {selectedPin.description || "Description absente."}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-[#64748B]">
                    Mots-clés
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[#A7B0C0]">
                    {selectedPin.keywords || "Mots-clés absents."}
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-[#64748B]">
                      Tableau cible
                    </p>
                    <p className="mt-2 text-sm font-semibold text-[#F8FAFC]">
                      {selectedPin.boardName || "Non renseigné"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-[#64748B]">
                      Date
                    </p>
                    <p className="mt-2 text-sm font-semibold text-[#F8FAFC]">
                      {formatDate(selectedPin.createdAt)}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-[#64748B]">
                    Statut
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <ReviewBadge status={selectedPin.reviewStatus} />
                    <PinBadges badges={selectedPin.badges} />
                  </div>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-[#64748B]">
                    Identifiant
                  </p>
                  <p className="mt-2 break-all font-mono text-xs leading-5 text-[#A7B0C0]">
                    {selectedPin.postId}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-[#64748B]">
                    Source image
                  </p>
                  <p className="mt-2 break-all font-mono text-xs leading-5 text-[#A7B0C0]">
                    {selectedPin.imageSourceField || "aucun"} :{" "}
                    {selectedPin.imagePath || selectedPin.imageUrl || "absent"}
                  </p>
                </div>
                <div className="border-t border-[#1D2A44] pt-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#39E6D0]">
                    Lien cible
                  </p>
                  <p className="mt-2 break-all text-sm leading-6 text-[#A7B0C0]">
                    {selectedPin.targetUrl || "Aucun lien cible configuré pour ce compte."}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedPin.targetUrl ? (
                      <a
                        href={selectedPin.targetUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-md border border-[#39E6D0]/40 bg-[#39E6D0]/10 px-3 py-2 text-sm font-semibold text-[#7DD3FC]"
                      >
                        Ouvrir le lien
                      </a>
                    ) : null}
                    <button
                      type="button"
                      disabled={!selectedPin.targetUrl}
                      onClick={copyTargetUrl}
                      className="rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2 text-sm font-semibold text-[#A7B0C0] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {linkCopied ? "Lien copié" : "Copier le lien"}
                    </button>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-[#64748B]">
                    Destination préparée pour la future publication Pinterest.
                  </p>
                </div>
                <div className="border-t border-[#1D2A44] pt-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#39E6D0]">
                    Validation
                  </p>
                  <label className="mt-3 grid gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#64748B]">
                    Note de validation
                    <textarea
                      value={reviewNote}
                      onChange={(event) => setReviewNote(event.target.value)}
                      disabled={!selectedPin.reviewWritable || reviewSaving}
                      rows={4}
                      maxLength={2000}
                      className="resize-y rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2 text-sm font-medium normal-case leading-6 tracking-normal text-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </label>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={!selectedPin.reviewWritable || reviewSaving}
                      onClick={() => submitReview("approved")}
                      className="rounded-md border border-[#22C55E]/40 bg-[#22C55E]/10 px-3 py-2 text-sm font-semibold text-[#86EFAC] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Valider
                    </button>
                    <button
                      type="button"
                      disabled={!selectedPin.reviewWritable || reviewSaving}
                      onClick={() => submitReview("needs_revision")}
                      className="rounded-md border border-[#FACC15]/40 bg-[#FACC15]/10 px-3 py-2 text-sm font-semibold text-[#FDE68A] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      À revoir
                    </button>
                    <button
                      type="button"
                      disabled={!selectedPin.reviewWritable || reviewSaving}
                      onClick={() => submitReview("rejected")}
                      className="rounded-md border border-[#F97316]/40 bg-[#F97316]/10 px-3 py-2 text-sm font-semibold text-[#FDBA74] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Rejeter
                    </button>
                  </div>
                  {!selectedPin.reviewWritable ? (
                    <p className="mt-3 text-xs leading-5 text-[#64748B]">
                      Validation indisponible avec le snapshot local. Synchronise le pin vers
                      Supabase pour enregistrer une décision.
                    </p>
                  ) : null}
                  {selectedPin.reviewedAt ? (
                    <p className="mt-3 text-xs leading-5 text-[#64748B]">
                      Dernière validation : {formatDate(selectedPin.reviewedAt)}
                      {selectedPin.reviewedBy ? ` par ${selectedPin.reviewedBy}` : ""}
                    </p>
                  ) : null}
                  {reviewMessage ? (
                    <p className="mt-3 rounded-md border border-[#22C55E]/30 bg-[#22C55E]/10 px-3 py-2 text-xs text-[#86EFAC]">
                      {reviewMessage}
                    </p>
                  ) : null}
                  {reviewError ? (
                    <p className="mt-3 rounded-md border border-[#F97316]/30 bg-[#F97316]/10 px-3 py-2 text-xs text-[#FDBA74]">
                      {reviewError}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </section>
  );
}
