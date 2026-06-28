import "server-only";

export type CostProvider = "openai" | "elevenlabs" | "railway" | "supabase" | "internal";
export type CostCategory =
  | "image_generation"
  | "image_analysis"
  | "voice_generation"
  | "subtitle_generation"
  | "video_render"
  | "storage"
  | "other";

export type CostEstimate = {
  category: CostCategory;
  estimatedCostEur: number | null;
  note: string;
  provider: CostProvider;
  quantity: number | null;
  unit: string | null;
};

function envNumber(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

const rates = {
  elevenlabsPerCharacterEur: envNumber("COST_ELEVENLABS_EUR_PER_CHARACTER"),
  imageGenerationPerImageEur: envNumber("COST_OPENAI_IMAGE_EUR_PER_IMAGE"),
  imageAnalysisPerSceneEur: envNumber("COST_OPENAI_VISION_EUR_PER_SCENE"),
  railwayRenderPerMinuteEur: envNumber("COST_RAILWAY_RENDER_EUR_PER_MINUTE"),
  storagePerGbMonthEur: envNumber("COST_SUPABASE_STORAGE_EUR_PER_GB_MONTH"),
  subtitlePerMinuteEur: envNumber("COST_SUBTITLE_EUR_PER_MINUTE"),
};

function roundCost(value: number | null) {
  return value === null ? null : Math.round(value * 1_000_000) / 1_000_000;
}

export function estimateVoiceCost(characterCount: number | null | undefined): CostEstimate {
  const quantity = typeof characterCount === "number" && Number.isFinite(characterCount)
    ? Math.max(0, characterCount)
    : null;
  return {
    category: "voice_generation",
    estimatedCostEur: quantity !== null && rates.elevenlabsPerCharacterEur !== null
      ? roundCost(quantity * rates.elevenlabsPerCharacterEur)
      : null,
    note: rates.elevenlabsPerCharacterEur === null
      ? "Tarif ElevenLabs non configure: cout non estime."
      : "Estimation basee sur le nombre de caracteres.",
    provider: "elevenlabs",
    quantity,
    unit: "character",
  };
}

export function estimateSubtitleCost(durationSeconds: number | null | undefined): CostEstimate {
  const minutes = typeof durationSeconds === "number" && Number.isFinite(durationSeconds)
    ? Math.max(0, durationSeconds) / 60
    : null;
  return {
    category: "subtitle_generation",
    estimatedCostEur: minutes !== null && rates.subtitlePerMinuteEur !== null
      ? roundCost(minutes * rates.subtitlePerMinuteEur)
      : null,
    note: rates.subtitlePerMinuteEur === null
      ? "Tarif sous-titres non configure: cout non estime."
      : "Estimation basee sur la duree audio.",
    provider: "elevenlabs",
    quantity: minutes,
    unit: "minute",
  };
}

export function estimateVideoRenderCost(durationSeconds: number | null | undefined): CostEstimate {
  const minutes = typeof durationSeconds === "number" && Number.isFinite(durationSeconds)
    ? Math.max(0, durationSeconds) / 60
    : null;
  return {
    category: "video_render",
    estimatedCostEur: minutes !== null && rates.railwayRenderPerMinuteEur !== null
      ? roundCost(minutes * rates.railwayRenderPerMinuteEur)
      : null,
    note: rates.railwayRenderPerMinuteEur === null
      ? "Tarif Railway non configure: cout non estime."
      : "Estimation basee sur la duree du rendu.",
    provider: "railway",
    quantity: minutes,
    unit: "minute",
  };
}

export function estimateImageGenerationCost(imageCount: number | null | undefined): CostEstimate {
  const quantity = typeof imageCount === "number" && Number.isFinite(imageCount)
    ? Math.max(0, imageCount)
    : null;
  return {
    category: "image_generation",
    estimatedCostEur: quantity !== null && rates.imageGenerationPerImageEur !== null
      ? roundCost(quantity * rates.imageGenerationPerImageEur)
      : null,
    note: rates.imageGenerationPerImageEur === null
      ? "Tarif generation image non configure: cout non estime."
      : "Estimation basee sur le nombre d'images.",
    provider: "openai",
    quantity,
    unit: "image",
  };
}

export function estimateImageAnalysisCost(sceneCount: number | null | undefined): CostEstimate {
  const quantity = typeof sceneCount === "number" && Number.isFinite(sceneCount)
    ? Math.max(0, sceneCount)
    : null;
  return {
    category: "image_analysis",
    estimatedCostEur: quantity !== null && rates.imageAnalysisPerSceneEur !== null
      ? roundCost(quantity * rates.imageAnalysisPerSceneEur)
      : null,
    note: rates.imageAnalysisPerSceneEur === null
      ? "Tarif analyse visuelle non configure: cout non estime."
      : "Estimation basee sur le nombre de scenes.",
    provider: "openai",
    quantity,
    unit: "scene",
  };
}

export function estimateStorageCost(sizeGbMonth: number | null | undefined): CostEstimate {
  const quantity = typeof sizeGbMonth === "number" && Number.isFinite(sizeGbMonth)
    ? Math.max(0, sizeGbMonth)
    : null;
  return {
    category: "storage",
    estimatedCostEur: quantity !== null && rates.storagePerGbMonthEur !== null
      ? roundCost(quantity * rates.storagePerGbMonthEur)
      : null,
    note: rates.storagePerGbMonthEur === null
      ? "Tarif stockage non configure: cout non estime."
      : "Estimation basee sur Go/mois.",
    provider: "supabase",
    quantity,
    unit: "gb_month",
  };
}
