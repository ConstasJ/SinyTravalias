import type { AlibabaProvider } from '@ai-sdk/alibaba';
import type { GoogleVertexProvider } from '@ai-sdk/google-vertex';
import type { OpenRouterProvider } from '@openrouter/ai-sdk-provider';
import type {
    AsyncIterableStream,
    DeepPartial,
    FinishReason,
    LanguageModelUsage,
    ProviderMetadata
} from 'ai';
import { z } from 'zod';
import type { GlobalState } from '@/schema/state.js';
import { _JSONPatchSchema } from '@/schema/utils.js';
import { getAlibaba, getOpenRouter, getVertex } from './init.js';

export type ModelConfig = {
    provider: GoogleVertexProvider | OpenRouterProvider | AlibabaProvider;
    modelId: string;
};

export type ModelCallMeta = {
    model: string;
    reasoning: string[];
    finishReason: FinishReason;
    usage: LanguageModelUsage;
    providerMeta: ProviderMetadata | undefined;
};

export type StreamTextResponse = {
    meta: Promise<ModelCallMeta>;
    textStream: ReadableStream<string>;
};

export type TextResponse = {
    meta: ModelCallMeta;
    text: string;
};

export type ObjectResponse<T> = {
    meta: ModelCallMeta;
    object: T;
};

export type StreamObjectResponse<T> = {
    meta: Promise<ModelCallMeta>;
    objectStream: AsyncIterableStream<DeepPartial<T>>;
};

export type ContextBlock = {
    coldSettings: string[];
    plotPathSummaries: string[];
    recentScenes: string[];
    globalState: GlobalState;
};
export type GenerationConstraints = {
    mustKeepFacts?: string[];
    forbiddenEvents?: string[];
    styleProfile?: string;
    tokenBudgetHint?: number;
};

export type SceneGenerationInput = {
    context: ContextBlock;
    currentTask: string;
    constraints?: GenerationConstraints;
};

export type PlotSummaryInput = {
    context: ContextBlock;
    sceneText: string;
    summaryGoal?: string;
};

export type StatePatchExtractionInput = {
    context: ContextBlock;
    sceneText: string;
    patchPolicy?: string;
};

export const PlotSummaryOutputSchema = z.object({
    nodeSummary: z.string().describe('用于 plot node 的摘要文本，建议短而信息密集'),
    milestone: z.string().nullable().describe('若本场景存在关键转折则填写一句话，否则为 null'),
    continuityFacts: z.array(z.string()).describe('后续场景必须保持一致的事实清单'),
    mainCharacters: z.array(z.string()).describe('本场景主要角色列表'),
    keyEvents: z.array(z.string()).describe('本场景关键事件列表'),
    locationHint: z.string().nullable().describe('本场景核心地点提示，未知时为 null'),
    retrievalTags: z.array(z.string()).describe('用于后续检索注入的标签')
});

export type PlotSummaryOutput = z.infer<typeof PlotSummaryOutputSchema>;

export const StatePatchExtractionOutputSchema = z.object({
    patches: z
        .array(_JSONPatchSchema)
        .describe('仅包含可验证且必要的 JSON Patch，优先使用 add/remove/replace'),
    unresolved: z.array(z.string()).describe('有变更迹象但证据不足的项目'),
    riskFlags: z.array(z.string()).describe('可能导致状态冲突或校验失败的风险点')
});

export type StatePatchExtractionOutput = z.infer<typeof StatePatchExtractionOutputSchema>;

export async function parseFullModelId(fullModelId: string): Promise<ModelConfig> {
    const match = fullModelId.match(/^([a-z0-9-]+):([a-z0-9.-]+)$/);
    if (!match) {
        throw new Error(
            `Invalid model ID format: ${fullModelId}. Expected format is "provider:modelId"`
        );
    }
    const [, providerName, modelId] = match;
    let provider: GoogleVertexProvider | OpenRouterProvider | AlibabaProvider;
    switch (providerName) {
        case 'vertex-ai':
            provider = await getVertex();
            break;
        case 'openrouter':
            provider = getOpenRouter();
            break;
        case 'alibaba':
            provider = getAlibaba();
            break;
        default:
            throw new Error(`Unsupported provider: ${providerName}`);
    }
    return { provider, modelId: modelId ?? '' };
}
