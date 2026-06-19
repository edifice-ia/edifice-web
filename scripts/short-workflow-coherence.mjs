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
assert.equal(validatedVoiceWorkflow.video, "pending");
assert.equal(validatedVoiceWorkflow.nextStep, "video_en_attente");

console.log("short workflow coherence ok");
