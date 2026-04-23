import { streamText, generateText as aiGenerateText,type ModelMessage } from "ai";
import { parseFullModelId, type ModelCallMeta, type ModelResponse, type StreamingResponse } from "./utils.js";

export async function streamGenerateText(fullModelId: string, prompts: ModelMessage[]): Promise<StreamingResponse> {
    const { provider, modelId } = await parseFullModelId(fullModelId);
    const { promise: meta, resolve } = Promise.withResolvers<ModelCallMeta>();
    const res = streamText({
        model: provider(modelId),
        messages: prompts,
        onFinish: ({ reasoning, finishReason, usage, providerMetadata }) => {
            resolve({ model: modelId, reasoning: reasoning.map((chunk)=>chunk.text), finishReason, usage, providerMeta: providerMetadata });
        },
    });
    return {
        meta,
        textStream: res.textStream,
    };
}

export async function generateText(fullModelId: string, prompts: ModelMessage[]): Promise<ModelResponse> {
    const { provider, modelId } = await parseFullModelId(fullModelId);
    const res = await aiGenerateText({
        model: provider(modelId),
        messages: prompts
    });
    return {
        meta: {
            model: modelId,
            reasoning: res.reasoning.map((chunk)=>chunk.text),
            finishReason: res.finishReason,
            usage: res.usage,
            providerMeta: res.providerMetadata
        },
        text: res.text
    }
}