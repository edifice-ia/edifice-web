type OAuthResultNoticeProps = {
  provider?: string;
  status?: string;
  connected?: string;
  error?: string;
};

const messages: Record<
  string,
  { title: string; description: string; className: string }
> = {
  meta_success: {
    title: "Connexion Meta reussie",
    description: "Meta a renvoye un code valide et les permissions requises.",
    className: "border-[#39E6D0]/40 bg-[#39E6D0]/10 text-[#39E6D0]",
  },
  youtube_success: {
    title: "Connexion YouTube reussie",
    description:
      "Google a renvoye un code valide. Le stockage des tokens reste desactive.",
    className: "border-[#39E6D0]/40 bg-[#39E6D0]/10 text-[#39E6D0]",
  },
  tiktok_success: {
    title: "Connexion TikTok Sandbox reussie",
    description:
      "TikTok a renvoye un token valide, stocke uniquement cote serveur.",
    className: "border-[#39E6D0]/40 bg-[#39E6D0]/10 text-[#39E6D0]",
  },
  tiktok_error: {
    title: "Erreur OAuth TikTok",
    description: "La connexion TikTok Sandbox n'a pas pu etre finalisee.",
    className: "border-[#ef4444]/40 bg-[#ef4444]/10 text-[#fecaca]",
  },
  refused: {
    title: "Connexion refusee",
    description: "La connexion Meta a ete annulee ou refusee.",
    className: "border-[#f59e0b]/40 bg-[#f59e0b]/10 text-[#fbbf24]",
  },
  oauth_error: {
    title: "Erreur OAuth",
    description: "La connexion n'a pas pu etre finalisee.",
    className: "border-[#ef4444]/40 bg-[#ef4444]/10 text-[#fecaca]",
  },
  insufficient_permissions: {
    title: "Permissions insuffisantes",
    description: "Meta n'a pas accorde toutes les permissions demandees.",
    className: "border-[#f59e0b]/40 bg-[#f59e0b]/10 text-[#fbbf24]",
  },
  missing_env: {
    title: "Erreur OAuth",
    description: "Des variables d'environnement sont manquantes.",
    className: "border-[#f59e0b]/40 bg-[#f59e0b]/10 text-[#fbbf24]",
  },
  callback_inaccessible: {
    title: "Erreur OAuth",
    description: "Le callback n'est pas accessible depuis l'application.",
    className: "border-[#ef4444]/40 bg-[#ef4444]/10 text-[#fecaca]",
  },
};

export function OAuthResultNotice({
  provider,
  status,
  connected,
  error,
}: OAuthResultNoticeProps) {
  if (!provider) {
    return null;
  }

  const normalizedProvider = provider.charAt(0).toUpperCase() + provider.slice(1);

  if (connected === "1") {
    return (
      <div className="mb-6 rounded-lg border border-[#39E6D0]/40 bg-[#39E6D0]/10 p-4 text-[#39E6D0]">
        <p className="font-semibold">Connexion {normalizedProvider} reussie</p>
        <p className="mt-1 text-sm text-[#A7B0C0]">
          Le retour OAuth a ete finalise sur la page Connexions.
        </p>
      </div>
    );
  }

  if (connected === "0") {
    return (
      <div className="mb-6 rounded-lg border border-[#ef4444]/40 bg-[#ef4444]/10 p-4 text-[#fecaca]">
        <p className="font-semibold">Erreur OAuth {normalizedProvider}</p>
        <p className="mt-1 text-sm text-[#A7B0C0]">
          La connexion n&apos;a pas pu etre finalisee{error ? ` (${error})` : ""}.
        </p>
      </div>
    );
  }

  const key = status;

  if (!key || !messages[key]) {
    return null;
  }

  const message = messages[key];

  return (
    <div className={`mb-6 rounded-lg border p-4 ${message.className}`}>
      <p className="font-semibold">{message.title}</p>
      <p className="mt-1 text-sm text-[#A7B0C0]">{message.description}</p>
    </div>
  );
}
