import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("../lib/short-workflow.ts", import.meta.url), "utf8");
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
});
const moduleUrl = `data:text/javascript;base64,${Buffer.from(transpiled.outputText).toString("base64")}`;
const { getShortWorkflowState } = await import(moduleUrl);

const workflow = getShortWorkflowState({
  draft: {
    script: "Texte valide pour une voix off courte.",
    status: "voix_prête",
    visualStatus: "visual_ready",
    visualsValidatedAt: "2026-06-19T10:00:00.000Z",
  },
  media: {
    mediaPipelineStatus: "voice_ready",
    selectedAssets: Array.from({ length: 7 }, (_, index) => ({ id: `asset-${index + 1}` })),
    visualScenes: Array.from({ length: 7 }, (_, index) => ({
      generationStatus: "retained",
      imageUrl: `https://example.test/${index + 1}.jpg`,
      locked: true,
    })),
    voice: {
      audioUrl: "https://example.test/voice.mp3",
      generatedAt: "2026-06-19T10:05:00.000Z",
      status: "ready",
    },
  },
  requiredVisualCount: 7,
});

assert.equal(workflow.text, "validated");
assert.equal(workflow.visuals, "validated");
assert.equal(workflow.voice, "ready");
assert.equal(workflow.subtitles, "pending");
assert.equal(workflow.video, "pending");
assert.notEqual(workflow.nextStep, "Valider le texte");

const validatedVoiceWorkflow = getShortWorkflowState({
  draft: {
    script: "Texte valide pour une voix off courte.",
    status: "voix_validée",
    visualStatus: "visual_ready",
    visualsValidatedAt: "2026-06-19T10:00:00.000Z",
  },
  media: {
    mediaPipelineStatus: "voix_validée",
    selectedAssets: Array.from({ length: 7 }, (_, index) => ({ id: `asset-${index + 1}` })),
    visualScenes: Array.from({ length: 7 }, (_, index) => ({
      generationStatus: "retained",
      imageUrl: `https://example.test/${index + 1}.jpg`,
      locked: true,
    })),
    voice: {
      audioUrl: "https://example.test/voice.mp3",
      generatedAt: "2026-06-19T10:05:00.000Z",
      status: "validated",
    },
  },
  requiredVisualCount: 7,
});

assert.equal(validatedVoiceWorkflow.text, "validated");
assert.equal(validatedVoiceWorkflow.visuals, "validated");
assert.equal(validatedVoiceWorkflow.voice, "validated");
assert.equal(validatedVoiceWorkflow.subtitles, "pending");
assert.equal(validatedVoiceWorkflow.video, "pending");
assert.equal(validatedVoiceWorkflow.nextStep, "Generer les sous-titres");

const subtitleReadyWorkflow = getShortWorkflowState({
  draft: {
    script: "Texte valide pour une voix off courte.",
    status: "sous_titres_prêts",
    visualStatus: "visual_ready",
    visualsValidatedAt: "2026-06-19T10:00:00.000Z",
  },
  media: {
    mediaPipelineStatus: "sous_titres_prêts",
    selectedAssets: Array.from({ length: 7 }, (_, index) => ({ id: `asset-${index + 1}` })),
    subtitles: {
      generatedAt: "2026-06-19T10:06:00.000Z",
      segmentsCount: 12,
      status: "ready",
    },
    visualScenes: Array.from({ length: 7 }, (_, index) => ({
      generationStatus: "retained",
      imageUrl: `https://example.test/${index + 1}.jpg`,
      locked: true,
    })),
    voice: {
      audioUrl: "https://example.test/voice.mp3",
      generatedAt: "2026-06-19T10:05:00.000Z",
      status: "validated",
    },
  },
  requiredVisualCount: 7,
});

assert.equal(subtitleReadyWorkflow.text, "validated");
assert.equal(subtitleReadyWorkflow.visuals, "validated");
assert.equal(subtitleReadyWorkflow.voice, "validated");
assert.equal(subtitleReadyWorkflow.subtitles, "ready");
assert.equal(subtitleReadyWorkflow.video, "pending");
assert.equal(subtitleReadyWorkflow.nextStep, "Valider les sous-titres");

const subtitleValidatedWorkflow = getShortWorkflowState({
  draft: {
    script: "Texte valide pour une voix off courte.",
    status: "video_en_attente",
    visualStatus: "visual_ready",
    visualsValidatedAt: "2026-06-19T10:00:00.000Z",
  },
  media: {
    mediaPipelineStatus: "video_en_attente",
    selectedAssets: Array.from({ length: 7 }, (_, index) => ({ id: `asset-${index + 1}` })),
    subtitles: {
      generatedAt: "2026-06-19T10:06:00.000Z",
      segmentsCount: 12,
      status: "validated",
    },
    visualScenes: Array.from({ length: 7 }, (_, index) => ({
      generationStatus: "retained",
      imageUrl: `https://example.test/${index + 1}.jpg`,
      locked: true,
    })),
    voice: {
      audioUrl: "https://example.test/voice.mp3",
      generatedAt: "2026-06-19T10:05:00.000Z",
      status: "validated",
    },
  },
  requiredVisualCount: 7,
});

assert.equal(subtitleValidatedWorkflow.text, "validated");
assert.equal(subtitleValidatedWorkflow.visuals, "validated");
assert.equal(subtitleValidatedWorkflow.voice, "validated");
assert.equal(subtitleValidatedWorkflow.subtitles, "validated");
assert.equal(subtitleValidatedWorkflow.video, "pending");
assert.equal(subtitleValidatedWorkflow.nextStep, "video_en_attente");

const videoPreparedWorkflow = getShortWorkflowState({
  draft: {
    script: "Texte valide pour une voix off courte.",
    status: "video_en_attente",
    visualStatus: "visual_ready",
    visualsValidatedAt: "2026-06-19T10:00:00.000Z",
  },
  media: {
    mediaPipelineStatus: "video_ready",
    selectedAssets: Array.from({ length: 7 }, (_, index) => ({ id: `asset-${index + 1}` })),
    subtitles: {
      generatedAt: "2026-06-19T10:06:00.000Z",
      segmentsCount: 12,
      status: "validated",
    },
    videoPreparation: {
      status: "ready",
    },
    visualScenes: Array.from({ length: 7 }, (_, index) => ({
      generationStatus: "retained",
      imageUrl: `https://example.test/${index + 1}.jpg`,
      locked: true,
    })),
    voice: {
      audioUrl: "https://example.test/voice.mp3",
      generatedAt: "2026-06-19T10:05:00.000Z",
      status: "validated",
    },
  },
  requiredVisualCount: 7,
});

assert.equal(videoPreparedWorkflow.text, "validated");
assert.equal(videoPreparedWorkflow.visuals, "validated");
assert.equal(videoPreparedWorkflow.voice, "validated");
assert.equal(videoPreparedWorkflow.subtitles, "validated");
assert.equal(videoPreparedWorkflow.video, "ready");
assert.equal(videoPreparedWorkflow.nextStep, "Valider la video");

const renderedButUnvalidatedWorkflow = getShortWorkflowState({
  draft: {
    script: "Texte valide pour une voix off courte.",
    status: "video_ready",
    visualStatus: "visual_ready",
    visualsValidatedAt: "2026-06-19T10:00:00.000Z",
  },
  media: videoPreparedWorkflow.raw ? {
    mediaPipelineStatus: "video_ready",
    selectedAssets: Array.from({ length: 7 }, (_, index) => ({ id: `asset-${index + 1}` })),
    subtitles: {
      generatedAt: "2026-06-19T10:06:00.000Z",
      segmentsCount: 12,
      status: "validated",
    },
    visualScenes: Array.from({ length: 7 }, (_, index) => ({
      generationStatus: "retained",
      imageUrl: `https://example.test/${index + 1}.jpg`,
      locked: true,
    })),
    voice: {
      audioUrl: "https://example.test/voice.mp3",
      generatedAt: "2026-06-19T10:05:00.000Z",
      status: "validated",
    },
  } : null,
  requiredVisualCount: 7,
  video: {
    status: "ready",
  },
});

assert.equal(renderedButUnvalidatedWorkflow.video, "ready");
assert.equal(renderedButUnvalidatedWorkflow.readyToPublish, "pending");
assert.equal(renderedButUnvalidatedWorkflow.nextStep, "Valider la video");

const videoValidatedWorkflow = getShortWorkflowState({
  draft: {
    script: "Texte valide pour une voix off courte.",
    status: "video_validated",
    visualStatus: "visual_ready",
    visualsValidatedAt: "2026-06-19T10:00:00.000Z",
  },
  media: {
    mediaPipelineStatus: "video_ready",
    selectedAssets: Array.from({ length: 7 }, (_, index) => ({ id: `asset-${index + 1}` })),
    subtitles: {
      generatedAt: "2026-06-19T10:06:00.000Z",
      segmentsCount: 12,
      status: "validated",
    },
    visualScenes: Array.from({ length: 7 }, (_, index) => ({
      generationStatus: "retained",
      imageUrl: `https://example.test/${index + 1}.jpg`,
      locked: true,
    })),
    voice: {
      audioUrl: "https://example.test/voice.mp3",
      generatedAt: "2026-06-19T10:05:00.000Z",
      status: "validated",
    },
  },
  requiredVisualCount: 7,
  video: {
    status: "validated",
  },
});

assert.equal(videoValidatedWorkflow.video, "validated");
assert.equal(videoValidatedWorkflow.readyToPublish, "pending");
assert.equal(videoValidatedWorkflow.nextStep, "Preparer la publication");

console.log("short workflow coherence ok");
