type OAuthResultNoticeProps = {
  provider?: string;
  status?: string;
  connected?: string;
};

const messages: Record<
  string,
  { title: string; description: string; className: string }
> = {
  meta_success: {
    title: "Connexion Meta réussie",
    description: "Meta a renvoyé un code valide et les permissions requises.",
    className: "border-[#39E6D0]/40 bg-[#39E6D0]/10 text-[#39E6D0]",
  },
  youtube_success: {
    title: "Connexion YouTube réussie",
    description:
      "Google a renvoyé un code valide. Le stockage des tokens reste désactivé.",
    className: "border-[#39E6D0]/40 bg-[#39E6D0]/10 text-[#39E6D0]",
  },
  refused: {
    title: "Connexion refusée",
    description: "La connexion Meta a été annulée ou refusée.",
    className: "border-[#f59e0b]/40 bg-[#f59e0b]/10 text-[#fbbf24]",
  },
  oauth_error: {
    title: "Erreur OAuth",
    description: "La connexion n'a pas pu être finalisée.",
    className: "border-[#ef4444]/40 bg-[#ef4444]/10 text-[#fecaca]",
  },
  insufficient_permissions: {
    title: "Permissions insuffisantes",
    description: "Meta n'a pas accordé toutes les permissions demandées.",
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
}: OAuthResultNoticeProps) {
  if (provider !== "meta" && provider !== "youtube") {
    return null;
  }

  const key =
    connected === "1" && provider === "youtube"
      ? "youtube_success"
      : connected === "1" && provider === "meta"
        ? "meta_success"
        : status;

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
