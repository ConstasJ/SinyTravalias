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
