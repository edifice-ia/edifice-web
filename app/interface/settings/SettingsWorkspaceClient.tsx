"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  DEFAULT_PROGRAMMING_SLOTS,
  SETTINGS_TABS,
  type ContentAccountSettings,
  type GlobalSettingsPreferences,
  type KnownContentAccount,
  type SettingsPreferencesState,
  type SettingsTab,
} from "@/lib/settings-preferences";
import { SHORTS_SCHEDULE_PLATFORM_LABELS, type ShortsSchedulePlatform } from "@/lib/shorts-scheduling";
import { subtitleModeLabel } from "@/lib/subtitles";

type SavePayload = SettingsPreferencesState & {
  error?: string;
};

const platformOptions: Array<ShortsSchedulePlatform | "pinterest"> = ["tiktok", "instagram", "youtube", "pinterest"];
const platformLabels: Record<ShortsSchedulePlatform | "pinterest", string> = {
  ...SHORTS_SCHEDULE_PLATFORM_LABELS,
  pinterest: "Pinterest",
};

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#A7B0C0]">
      {children}
    </span>
  );
}

function TextInput({
  onChange,
  value,
}: {
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="mt-2 w-full rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-2.5 text-sm text-[#F8FAFC] outline-none"
    />
  );
}

function SelectInput({
  children,
  onChange,
  value,
}: {
  children: ReactNode;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="mt-2 w-full rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-2.5 text-sm text-[#F8FAFC] outline-none"
    >
      {children}
    </select>
  );
}

function Toggle({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-3 text-sm text-[#A7B0C0]">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 accent-[#39E6D0]"
      />
    </label>
  );
}

function fallbackBadge(value: unknown) {
  return value ? null : (
    <span className="ml-2 rounded-md border border-[#1D2A44] bg-[#03070B] px-2 py-0.5 text-[11px] font-semibold text-[#A7B0C0]">
      global
    </span>
  );
}

export function SettingsWorkspaceClient({
  connectionsPanel,
  initialState,
  userEmail,
}: {
  connectionsPanel: ReactNode;
  initialState: SettingsPreferencesState;
  userEmail: string | null;
}) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  const [globalPreferences, setGlobalPreferences] = useState(initialState.globalPreferences);
  const [accountPreferences, setAccountPreferences] = useState(initialState.accountPreferences);
  const [storageAvailable, setStorageAvailable] = useState(initialState.storageAvailable);
  const [updatedAt, setUpdatedAt] = useState(initialState.updatedAt);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const accountsByKey = useMemo(
    () => new Map(initialState.accounts.map((account) => [account.accountKey, account])),
    [initialState.accounts],
  );

  function updateGlobal(patch: Partial<GlobalSettingsPreferences>) {
    setGlobalPreferences((current) => ({ ...current, ...patch }));
  }

  function updateAccount(accountKey: string, patch: Partial<ContentAccountSettings>) {
    setAccountPreferences((current) => ({
      ...current,
      [accountKey]: {
        ...current[accountKey],
        ...patch,
      },
    }));
  }

  function toggleGlobalPlatform(platform: ShortsSchedulePlatform) {
    updateGlobal({
      enabledPlatforms: globalPreferences.enabledPlatforms.includes(platform)
        ? globalPreferences.enabledPlatforms.filter((item) => item !== platform)
        : [...globalPreferences.enabledPlatforms, platform],
    });
  }

  function toggleAccountPlatform(accountKey: string, platform: ShortsSchedulePlatform | "pinterest") {
    const account = accountPreferences[accountKey] ?? {};
    const platforms = account.platforms ?? [];
    updateAccount(accountKey, {
      platforms: platforms.includes(platform)
        ? platforms.filter((item) => item !== platform)
        : [...platforms, platform],
    });
  }

  async function persist(action: "save" | "reset") {
    setIsSaving(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch("/api/settings/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          action === "reset"
            ? { action: "reset" }
            : { accountPreferences, globalPreferences },
        ),
      });
      const payload = (await response.json()) as SavePayload;

      if (!response.ok || payload.error) {
        throw new Error(payload.error ?? "Enregistrement indisponible.");
      }

      setGlobalPreferences(payload.globalPreferences);
      setAccountPreferences(payload.accountPreferences);
      setStorageAvailable(payload.storageAvailable);
      setUpdatedAt(payload.updatedAt);
      setConfirmReset(false);
      setNotice(action === "reset" ? "Valeurs par defaut restaurees." : "Reglages enregistres.");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Enregistrement indisponible.");
    } finally {
      setIsSaving(false);
    }
  }

  function accountValue(account: ContentAccountSettings, key: keyof ContentAccountSettings, fallback: string | number | boolean) {
    return account[key] ?? fallback;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 rounded-md border border-[#1D2A44] bg-[#03070B] p-2">
        {SETTINGS_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
              activeTab === tab.id
                ? "bg-[#39E6D0]/12 text-[#39E6D0]"
                : "text-[#A7B0C0] hover:bg-[#08111A] hover:text-[#F8FAFC]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 rounded-md border border-[#1D2A44] bg-[#08111A] p-4 text-sm text-[#A7B0C0] lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p>
            Connecte avec : <span className="font-semibold text-[#F8FAFC]">{userEmail ?? "non detecte"}</span>
          </p>
          <p className="mt-1">
            Stockage preferences : <span className="font-semibold text-[#F8FAFC]">{storageAvailable ? "Supabase user_preferences" : "fallback local lecture seule"}</span>
            {updatedAt ? ` - maj ${new Date(updatedAt).toLocaleString("fr-FR")}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void persist("save")}
            disabled={isSaving}
            className="rounded-md border border-[#39E6D0]/50 bg-[#39E6D0]/10 px-4 py-2 text-sm font-semibold text-[#39E6D0] transition hover:bg-[#1D2A44] hover:text-[#F8FAFC] disabled:opacity-55"
          >
            {isSaving ? "Enregistrement..." : "Enregistrer les reglages"}
          </button>
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            disabled={isSaving}
            className="rounded-md border border-[#1D2A44] bg-[#03070B] px-4 py-2 text-sm font-semibold text-[#A7B0C0] transition hover:border-[#F97316]/50 hover:text-[#F8FAFC] disabled:opacity-55"
          >
            Reinitialiser les valeurs par defaut
          </button>
        </div>
      </div>

      {confirmReset ? (
        <div className="rounded-md border border-[#F97316]/40 bg-[#F97316]/10 p-4 text-sm text-[#FDBA74]">
          <p className="font-semibold text-[#F8FAFC]">Reinitialiser les reglages ?</p>
          <p className="mt-1">Les preferences globales et les overrides compte reviendront aux valeurs par defaut. Les brouillons, videos, tokens et programmations existants ne seront pas modifies.</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <button type="button" onClick={() => setConfirmReset(false)} className="rounded-md border border-[#1D2A44] px-3 py-2 text-[#A7B0C0]">Annuler</button>
            <button type="button" onClick={() => void persist("reset")} className="rounded-md border border-[#F97316]/50 bg-[#F97316]/10 px-3 py-2 font-semibold text-[#FDBA74]">Reinitialiser</button>
          </div>
        </div>
      ) : null}

      {error ? <p className="rounded-md border border-[#F97316]/40 bg-[#F97316]/10 px-4 py-3 text-sm font-semibold text-[#FDBA74]">{error}</p> : null}
      {notice ? <p className="rounded-md border border-[#39E6D0]/35 bg-[#39E6D0]/10 px-4 py-3 text-sm font-semibold text-[#39E6D0]">{notice}</p> : null}

      {activeTab === "general" ? (
        <section className="grid gap-4 rounded-md border border-[#1D2A44] bg-[#0B1420] p-5 md:grid-cols-2">
          <label><FieldLabel>Fuseau horaire par defaut</FieldLabel><TextInput value={globalPreferences.defaultTimezone} onChange={(value) => updateGlobal({ defaultTimezone: value })} /></label>
          <label><FieldLabel>Langue d&apos;interface</FieldLabel><SelectInput value={globalPreferences.defaultInterfaceLanguage} onChange={(value) => updateGlobal({ defaultInterfaceLanguage: value === "en" ? "en" : "fr" })}><option value="fr">Francais</option><option value="en">English</option></SelectInput></label>
          <label><FieldLabel>Preference d&apos;interface</FieldLabel><SelectInput value={globalPreferences.interfaceDensity} onChange={(value) => updateGlobal({ interfaceDensity: value === "compact" ? "compact" : "comfortable" })}><option value="comfortable">Confortable</option><option value="compact">Compact</option></SelectInput></label>
          <div className="rounded-md border border-[#1D2A44] bg-[#08111A] p-4 text-sm text-[#A7B0C0]">
            Priorite active : reglage specifique du compte, puis reglage global, puis valeur par defaut existante.
          </div>
        </section>
      ) : null}

      {activeTab === "accounts" ? (
        <section className="space-y-4 rounded-md border border-[#1D2A44] bg-[#0B1420] p-5">
          <p className="rounded-md border border-[#39E6D0]/30 bg-[#39E6D0]/10 px-4 py-3 text-sm text-[#39E6D0]">
            Les reglages specifiques au compte remplacent les reglages globaux lorsqu&apos;ils sont definis.
          </p>
          {initialState.accounts.map((knownAccount: KnownContentAccount) => {
            const account = accountPreferences[knownAccount.accountKey] ?? {};
            return (
              <article key={knownAccount.accountKey} className="rounded-md border border-[#1D2A44] bg-[#08111A] p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-lg font-semibold text-[#F8FAFC]">{account.displayName ?? knownAccount.displayName}</p>
                    <p className="text-sm text-[#A7B0C0]">{knownAccount.source === "pinterest_oauth" ? "Compte OAuth Pinterest connu" : "Compte Shorts existant"}</p>
                  </div>
                  <Toggle checked={account.active !== false} label="Compte actif" onChange={(checked) => updateAccount(knownAccount.accountKey, { active: checked })} />
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <label><FieldLabel>Nom affiche</FieldLabel><TextInput value={String(accountValue(account, "displayName", knownAccount.displayName))} onChange={(value) => updateAccount(knownAccount.accountKey, { displayName: value })} /></label>
                  <label><FieldLabel>Type de contenu / marque</FieldLabel><TextInput value={String(account.brandType ?? "")} onChange={(value) => updateAccount(knownAccount.accountKey, { brandType: value })} /></label>
                  <label><FieldLabel>Plateforme principale {fallbackBadge(account.platformPrimary)}</FieldLabel><SelectInput value={String(account.platformPrimary ?? "tiktok")} onChange={(value) => updateAccount(knownAccount.accountKey, { platformPrimary: value as ContentAccountSettings["platformPrimary"] })}>{platformOptions.map((platform) => <option key={platform} value={platform}>{platformLabels[platform]}</option>)}</SelectInput></label>
                  <label><FieldLabel>Fuseau compte {fallbackBadge(account.timezone)}</FieldLabel><TextInput value={account.timezone ?? globalPreferences.defaultTimezone} onChange={(value) => updateAccount(knownAccount.accountKey, { timezone: value || undefined })} /></label>
                  <label><FieldLabel>Frequence par defaut {fallbackBadge(account.postingFrequency)}</FieldLabel><SelectInput value={String(account.postingFrequency ?? globalPreferences.weeklyPostingFrequency)} onChange={(value) => updateAccount(knownAccount.accountKey, { postingFrequency: Number(value) as 1 | 2 | 3 })}><option value="1">1 post / jour</option><option value="2">2 posts / jour</option><option value="3">3 posts / jour</option></SelectInput></label>
                  <label><FieldLabel>Jours de programmation {fallbackBadge(account.defaultScheduleDays)}</FieldLabel><TextInput value={String(account.defaultScheduleDays ?? globalPreferences.defaultScheduleDays)} onChange={(value) => updateAccount(knownAccount.accountKey, { defaultScheduleDays: Number(value) || undefined })} /></label>
                  <label><FieldLabel>Style sous-titres {fallbackBadge(account.defaultSubtitleStyle)}</FieldLabel><SelectInput value={account.defaultSubtitleStyle ?? globalPreferences.defaultSubtitleStyle} onChange={(value) => updateAccount(knownAccount.accountKey, { defaultSubtitleStyle: value as ContentAccountSettings["defaultSubtitleStyle"] })}><option value="karaoke">Karaoke</option><option value="classic">Classique</option></SelectInput></label>
                  <label><FieldLabel>Ton vocal {fallbackBadge(account.defaultVoiceStyle)}</FieldLabel><TextInput value={account.defaultVoiceStyle ?? globalPreferences.defaultVoiceStyle} onChange={(value) => updateAccount(knownAccount.accountKey, { defaultVoiceStyle: value || undefined })} /></label>
                  <label><FieldLabel>Destination principale</FieldLabel><TextInput value={account.destinationUrl ?? ""} onChange={(value) => updateAccount(knownAccount.accountKey, { destinationUrl: value || undefined })} /></label>
                </div>
                <div className="mt-4">
                  <FieldLabel>Plateformes associees</FieldLabel>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {platformOptions.map((platform) => (
                      <button
                        key={platform}
                        type="button"
                        onClick={() => toggleAccountPlatform(knownAccount.accountKey, platform)}
                        className={`rounded-md border px-3 py-2 text-xs font-semibold ${account.platforms?.includes(platform) ? "border-[#39E6D0]/50 bg-[#39E6D0]/10 text-[#39E6D0]" : "border-[#1D2A44] bg-[#03070B] text-[#A7B0C0]"}`}
                      >
                        {platformLabels[platform]}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="mt-4 text-xs text-[#A7B0C0]">Compte source : {accountsByKey.get(knownAccount.accountKey)?.source}. Les anciennes videos et programmations restent inchangees.</p>
              </article>
            );
          })}
        </section>
      ) : null}

      {activeTab === "shorts" ? (
        <section className="grid gap-4 rounded-md border border-[#1D2A44] bg-[#0B1420] p-5 md:grid-cols-2">
          <label><FieldLabel>Duree par defaut des brouillons</FieldLabel><TextInput value={String(globalPreferences.shortsDefaultDurationSeconds)} onChange={(value) => updateGlobal({ shortsDefaultDurationSeconds: Number(value) || 30 })} /></label>
          <label><FieldLabel>Style de sous-titres par defaut</FieldLabel><SelectInput value={globalPreferences.defaultSubtitleStyle} onChange={(value) => updateGlobal({ defaultSubtitleStyle: value === "classic" ? "classic" : "karaoke" })}><option value="karaoke">Karaoke</option><option value="classic">Classique</option></SelectInput></label>
          <label><FieldLabel>Position verticale des sous-titres</FieldLabel><SelectInput value={globalPreferences.subtitleVerticalPosition} onChange={(value) => updateGlobal({ subtitleVerticalPosition: value as GlobalSettingsPreferences["subtitleVerticalPosition"] })}><option value="safe_low">Basse securisee</option><option value="standard">Standard</option><option value="high">Haute</option></SelectInput></label>
          <label><FieldLabel>Profil de rendu</FieldLabel><SelectInput value={globalPreferences.renderProfile} onChange={(value) => updateGlobal({ renderProfile: value === "web_high" ? "web_high" : "web_standard" })}><option value="web_standard">web_standard actif</option><option value="web_high">web_high a venir</option></SelectInput></label>
          <div className="md:col-span-2 grid gap-2 text-sm text-[#A7B0C0]">
            {Object.entries(globalPreferences.visualCountByDuration).map(([range, count]) => (
              <p key={range} className="rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-2">{range.replace("_", "-")} s : <span className="font-semibold text-[#F8FAFC]">{count}</span> visuels</p>
            ))}
          </div>
        </section>
      ) : null}

      {activeTab === "voice" ? (
        <section className="grid gap-4 rounded-md border border-[#1D2A44] bg-[#0B1420] p-5 md:grid-cols-2">
          <label><FieldLabel>Voix ElevenLabs par defaut</FieldLabel><TextInput value={globalPreferences.defaultVoiceId} onChange={(value) => updateGlobal({ defaultVoiceId: value })} /></label>
          <label><FieldLabel>Ton / style vocal par defaut</FieldLabel><TextInput value={globalPreferences.defaultVoiceStyle} onChange={(value) => updateGlobal({ defaultVoiceStyle: value })} /></label>
          <Toggle checked label="Generation manuelle obligatoire active" onChange={() => undefined} />
          <Toggle checked={globalPreferences.showVoiceCostEstimate} label="Afficher l'estimation de cout si disponible" onChange={(checked) => updateGlobal({ showVoiceCostEstimate: checked })} />
          <p className="md:col-span-2 rounded-md border border-[#1D2A44] bg-[#08111A] px-4 py-3 text-sm text-[#A7B0C0]">La cle API ElevenLabs n&apos;est jamais affichee ni stockee dans ces reglages.</p>
        </section>
      ) : null}

      {activeTab === "programming" ? (
        <section className="space-y-4 rounded-md border border-[#1D2A44] bg-[#0B1420] p-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <label><FieldLabel>Frequence globale par defaut</FieldLabel><SelectInput value={String(globalPreferences.weeklyPostingFrequency)} onChange={(value) => updateGlobal({ weeklyPostingFrequency: Number(value) as 1 | 2 | 3 })}><option value="1">1 post / jour</option><option value="2">2 posts / jour</option><option value="3">3 posts / jour</option></SelectInput></label>
            <label><FieldLabel>Nombre de jours a planifier</FieldLabel><TextInput value={String(globalPreferences.defaultScheduleDays)} onChange={(value) => updateGlobal({ defaultScheduleDays: Number(value) || 7 })} /></label>
            <div><FieldLabel>Plateformes activees par defaut</FieldLabel><div className="mt-2 flex flex-wrap gap-2">{(["tiktok", "instagram", "youtube"] as ShortsSchedulePlatform[]).map((platform) => <button key={platform} type="button" onClick={() => toggleGlobalPlatform(platform)} className={`rounded-md border px-3 py-2 text-xs font-semibold ${globalPreferences.enabledPlatforms.includes(platform) ? "border-[#39E6D0]/50 bg-[#39E6D0]/10 text-[#39E6D0]" : "border-[#1D2A44] bg-[#03070B] text-[#A7B0C0]"}`}>{SHORTS_SCHEDULE_PLATFORM_LABELS[platform]}</button>)}</div></div>
          </div>
          <p className="rounded-md border border-[#39E6D0]/30 bg-[#39E6D0]/10 px-4 py-3 text-sm text-[#39E6D0]">Les creneaux sont actuellement bases sur des recommandations par defaut. Les analytics de compte seront ajoutees plus tard.</p>
          <div className="grid gap-3 md:grid-cols-3">
            {Object.entries(DEFAULT_PROGRAMMING_SLOTS).map(([platform, slots]) => (
              <div key={platform} className="rounded-md border border-[#1D2A44] bg-[#08111A] p-4">
                <p className="font-semibold text-[#F8FAFC]">{SHORTS_SCHEDULE_PLATFORM_LABELS[platform as ShortsSchedulePlatform]}</p>
                <div className="mt-3 grid gap-2">{slots.map((slot) => <p key={slot.time} className="text-sm text-[#A7B0C0]">{slot.label} - <span className="font-semibold text-[#F8FAFC]">{slot.time}</span></p>)}</div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {activeTab === "connections" ? connectionsPanel : null}

      {activeTab === "security" ? (
        <section className="grid gap-4 rounded-md border border-[#1D2A44] bg-[#0B1420] p-5 md:grid-cols-2">
          <Toggle checked={globalPreferences.requireVoiceRegenerationConfirmation} label="Confirmation avant regeneration voix" onChange={(checked) => updateGlobal({ requireVoiceRegenerationConfirmation: checked })} />
          <Toggle checked={globalPreferences.requireSubtitleRegenerationConfirmation} label="Confirmation avant regeneration sous-titres" onChange={(checked) => updateGlobal({ requireSubtitleRegenerationConfirmation: checked })} />
          <Toggle checked={globalPreferences.requireVideoRegenerationConfirmation} label="Confirmation avant regeneration video" onChange={(checked) => updateGlobal({ requireVideoRegenerationConfirmation: checked })} />
          <Toggle checked={globalPreferences.requirePublishConfirmation} label="Confirmation avant publication future" onChange={(checked) => updateGlobal({ requirePublishConfirmation: checked })} />
          <p className="rounded-md border border-[#1D2A44] bg-[#08111A] px-4 py-3 text-sm text-[#A7B0C0] md:col-span-2">Limite de rendus video simultanes : <span className="font-semibold text-[#F8FAFC]">{globalPreferences.videoConcurrentRenderLimit}</span> en lecture seule.</p>
        </section>
      ) : null}

      <div className="rounded-md border border-[#1D2A44] bg-[#03070B] p-4 text-sm text-[#A7B0C0]">
        Reglages actifs globaux : fuseau {globalPreferences.defaultTimezone}, sous-titres {subtitleModeLabel(globalPreferences.defaultSubtitleStyle)}, programmation {globalPreferences.weeklyPostingFrequency} post/jour sur {globalPreferences.defaultScheduleDays} jours.
      </div>
    </div>
  );
}
