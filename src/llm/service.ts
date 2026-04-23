import type { ModelMessage } from 'ai';
import { generateText as aiGenerateText, Output, streamText } from 'ai';
import type z from 'zod';
import type {
    LLMRuntimeOptions,
    ModelCallMeta,
    ObjectResponse,
    StreamObjectResponse,
    StreamTextResponse,
    TextResponse
} from './utils.js';
import { parseFullModelId } from './utils.js';

function createAbortSignal(timeoutMs?: number): AbortSignal | undefined {
    if (!timeoutMs || timeoutMs <= 0) {
        return undefined;
    }
    return AbortSignal.timeout(timeoutMs);
}

function buildRuntimeOptions(options?: LLMRuntimeOptions): Record<string, unknown> {
    if (!options) {
        return {};
    }
    const { timeoutMs: _timeoutMs, ...runtimeOptions } = options;
    return runtimeOptions;
}

export async function streamGenerateText(
    fullModelId: string,
    prompts: ModelMessage[],
    options?: LLMRuntimeOptions
): Promise<StreamTextResponse> {
    const { provider, modelId } = await parseFullModelId(fullModelId);
    const { promise: meta, resolve } = Promise.withResolvers<ModelCallMeta>();
    const runtimeOptions = buildRuntimeOptions(options);
    const abortSignal = createAbortSignal(options?.timeoutMs);
    const res = streamText({
        model: provider(modelId),
        messages: prompts,
        ...(abortSignal ? { abortSignal } : {}),
        ...runtimeOptions,
        onFinish: ({ reasoning, finishReason, usage, providerMetadata }) => {
            resolve({
                model: modelId,
                reasoning: reasoning.map((chunk) => chunk.text),
                finishReason,
                usage,
                providerMeta: providerMetadata
            });
        }
    });
    return {
        meta,
        textStream: res.textStream
    };
}

export async function generateText(
    fullModelId: string,
    prompts: ModelMessage[],
    options?: LLMRuntimeOptions
): Promise<TextResponse> {
    const { provider, modelId } = await parseFullModelId(fullModelId);
    const runtimeOptions = buildRuntimeOptions(options);
    const abortSignal = createAbortSignal(options?.timeoutMs);
    const res = await aiGenerateText({
        model: provider(modelId),
        messages: prompts,
        ...(abortSignal ? { abortSignal } : {}),
        ...runtimeOptions
    });
    return {
        meta: {
            model: modelId,
            reasoning: res.reasoning.map((chunk) => chunk.text),
            finishReason: res.finishReason,
            usage: res.usage,
            providerMeta: res.providerMetadata
        },
        text: res.text
    };
}

export async function generateObject<T>(
    fullModelId: string,
    prompts: ModelMessage[],
    schema: z.ZodType<T>,
    options?: LLMRuntimeOptions
): Promise<ObjectResponse<T>> {
    const { provider, modelId } = await parseFullModelId(fullModelId);
    const runtimeOptions = buildRuntimeOptions(options);
    const abortSignal = createAbortSignal(options?.timeoutMs);
    const res = await aiGenerateText({
        model: provider(modelId),
        messages: prompts,
        ...(abortSignal ? { abortSignal } : {}),
        ...runtimeOptions,
        output: Output.object({
            schema
        })
    });
    return {
        meta: {
            model: modelId,
            reasoning: res.reasoning.map((chunk) => chunk.text),
            finishReason: res.finishReason,
            usage: res.usage,
            providerMeta: res.providerMetadata
        },
        object: res.output
    };
}

export async function streamGenerateObject<T>(
    fullModelId: string,
    prompts: ModelMessage[],
    schema: z.ZodType<T>,
    options?: LLMRuntimeOptions
): Promise<StreamObjectResponse<T>> {
    const { provider, modelId } = await parseFullModelId(fullModelId);
    const { promise: meta, resolve } = Promise.withResolvers<ModelCallMeta>();
    const runtimeOptions = buildRuntimeOptions(options);
    const abortSignal = createAbortSignal(options?.timeoutMs);
    const res = streamText({
        model: provider(modelId),
        messages: prompts,
        ...(abortSignal ? { abortSignal } : {}),
        ...runtimeOptions,
        output: Output.object({
            schema
        }),
        onFinish: ({ reasoning, finishReason, usage, providerMetadata }) => {
            resolve({
                model: modelId,
                reasoning: reasoning.map((chunk) => chunk.text),
                finishReason,
                usage,
                providerMeta: providerMetadata
            });
        }
    });
    return {
        meta,
        objectStream: res.partialOutputStream
    };
}
