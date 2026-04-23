import type { ModelMessage } from 'ai';
import { generateText as aiGenerateText, Output, streamText } from 'ai';
import type z from 'zod';
import type {
    ModelCallMeta,
    ObjectResponse,
    StreamObjectResponse,
    StreamTextResponse,
    TextResponse
} from './utils.js';
import { parseFullModelId } from './utils.js';

export async function streamGenerateText(
    fullModelId: string,
    prompts: ModelMessage[]
): Promise<StreamTextResponse> {
    const { provider, modelId } = await parseFullModelId(fullModelId);
    const { promise: meta, resolve } = Promise.withResolvers<ModelCallMeta>();
    const res = streamText({
        model: provider(modelId),
        messages: prompts,
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
    prompts: ModelMessage[]
): Promise<TextResponse> {
    const { provider, modelId } = await parseFullModelId(fullModelId);
    const res = await aiGenerateText({
        model: provider(modelId),
        messages: prompts
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
    schema: z.ZodType<T>
): Promise<ObjectResponse<T>> {
    const { provider, modelId } = await parseFullModelId(fullModelId);
    const res = await aiGenerateText({
        model: provider(modelId),
        messages: prompts,
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
    schema: z.ZodType<T>
): Promise<StreamObjectResponse<T>> {
    const { provider, modelId } = await parseFullModelId(fullModelId);
    const { promise: meta, resolve } = Promise.withResolvers<ModelCallMeta>();
    const res = streamText({
        model: provider(modelId),
        messages: prompts,
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
