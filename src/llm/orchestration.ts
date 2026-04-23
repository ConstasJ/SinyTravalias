import { config } from '@/config.js';
import { extractStatePatches, generateSceneText, summarizeSceneForPlotNode } from './tools.js';
import type {
    LLMOrchestrationMetric,
    LLMOrchestrationOptions,
    LLMTaskKind,
    PlotSummaryInput,
    SceneGenerationInput,
    StatePatchExtractionInput
} from './utils.js';

type TaskInputMap = {
    'scene-generate': SceneGenerationInput;
    'plot-summarize': PlotSummaryInput;
    'state-patch-extract': StatePatchExtractionInput;
};

const orchestrationMetrics: LLMOrchestrationMetric[] = [];

const TASK_MODEL_MAP: Record<LLMTaskKind, keyof typeof config.models> = {
    'scene-generate': 'scene_generate',
    'plot-summarize': 'summarize',
    'state-patch-extract': 'state_update'
};

function resolveModelId(taskKind: LLMTaskKind, options?: LLMOrchestrationOptions): string {
    return options?.modelOverride ?? config.models[TASK_MODEL_MAP[taskKind]];
}

function appendMetric(metric: LLMOrchestrationMetric) {
    orchestrationMetrics.push(metric);
}

async function executeWithPolicy<T>(
    taskKind: LLMTaskKind,
    modelId: string,
    options: LLMOrchestrationOptions | undefined,
    task: () => Promise<T>
): Promise<T> {
    const retryCount = Math.max(0, options?.retry ?? 0);
    let lastError: unknown;

    for (let attempt = 1; attempt <= retryCount + 1; attempt++) {
        const start = Date.now();
        try {
            const result = await task();
            appendMetric({
                taskKind,
                modelId,
                attempt,
                latencyMs: Date.now() - start,
                success: true
            });
            return result;
        } catch (error) {
            lastError = error;
            appendMetric({
                taskKind,
                modelId,
                attempt,
                latencyMs: Date.now() - start,
                success: false,
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }

    throw new Error(
        `LLM orchestration failed (${taskKind}) after ${retryCount + 1} attempt(s): ${
            lastError instanceof Error ? lastError.message : String(lastError)
        }`
    );
}

export async function orchestrateSceneGeneration(
    input: TaskInputMap['scene-generate'],
    options?: LLMOrchestrationOptions
) {
    const modelId = resolveModelId('scene-generate', options);
    return executeWithPolicy('scene-generate', modelId, options, async () =>
        generateSceneText(input, {
            modelId,
            runtime: options?.runtime ?? {}
        })
    );
}

export async function orchestratePlotSummary(
    input: TaskInputMap['plot-summarize'],
    options?: LLMOrchestrationOptions
) {
    const modelId = resolveModelId('plot-summarize', options);
    return executeWithPolicy('plot-summarize', modelId, options, async () =>
        summarizeSceneForPlotNode(input, {
            modelId,
            runtime: options?.runtime ?? {}
        })
    );
}

export async function orchestrateStatePatchExtraction(
    input: TaskInputMap['state-patch-extract'],
    options?: LLMOrchestrationOptions
) {
    const modelId = resolveModelId('state-patch-extract', options);
    return executeWithPolicy('state-patch-extract', modelId, options, async () =>
        extractStatePatches(input, {
            modelId,
            runtime: options?.runtime ?? {}
        })
    );
}

export function getLLMOrchestrationMetrics() {
    return [...orchestrationMetrics];
}

export function clearLLMOrchestrationMetrics() {
    orchestrationMetrics.length = 0;
}
