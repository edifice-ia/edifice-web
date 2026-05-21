type OAuthResultNoticeProps = {
  provider?: string;
  status?: string;
  connected?: string;
};

const messages: Record<
  string,
  { title: string; description: string; className: string }
> = {
  success: {
    title: "Connexion réussie",
    description: "Meta a renvoye un code valide et les permissions requises.",
    className: "border-[#39E6D0]/40 bg-[#39E6D0]/10 text-[#39E6D0]",
  },
  refused: {
    title: "Connexion refusée",
    description: "La connexion Meta a ete annulee ou refusee.",
    className: "border-[#f59e0b]/40 bg-[#f59e0b]/10 text-[#fbbf24]",
  },
  oauth_error: {
    title: "Erreur OAuth",
    description: "La connexion Meta n'a pas pu etre finalisee.",
    className: "border-[#ef4444]/40 bg-[#ef4444]/10 text-[#fecaca]",
  },
  insufficient_permissions: {
    title: "Permissions insuffisantes",
    description: "Meta n'a pas accorde toutes les permissions demandees.",
    className: "border-[#f59e0b]/40 bg-[#f59e0b]/10 text-[#fbbf24]",
  },
  missing_env: {
    title: "Erreur OAuth",
    description: "Des variables d'environnement Meta sont manquantes.",
    className: "border-[#f59e0b]/40 bg-[#f59e0b]/10 text-[#fbbf24]",
  },
  callback_inaccessible: {
    title: "Erreur OAuth",
    description: "Le callback Meta n'est pas accessible depuis l'application.",
    className: "border-[#ef4444]/40 bg-[#ef4444]/10 text-[#fecaca]",
  },
};

export function OAuthResultNotice({
  provider,
  status,
  connected,
}: OAuthResultNoticeProps) {
  if (provider !== "meta") {
    return null;
  }

  const key = connected === "1" ? "success" : status;

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
