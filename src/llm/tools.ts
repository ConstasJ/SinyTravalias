import { config } from '@/config.js';
import { generateObject, streamGenerateText } from './service.js';
import {
    type ContextBlock,
    type GenerationConstraints,
    type LLMRuntimeOptions,
    type PlotSummaryInput,
    PlotSummaryOutputSchema,
    type SceneGenerationInput,
    type StatePatchExtractionInput,
    StatePatchExtractionOutputSchema
} from './utils.js';

type ToolCallOptions = {
    modelId?: string;
    runtime?: LLMRuntimeOptions;
};

function renderContextBlock(context: ContextBlock): string {
    return [
        '【冷设定片段】',
        context.coldSettings.length > 0 ? context.coldSettings.join('\n---\n') : '（无）',
        '',
        '【情节路径摘要】',
        context.plotPathSummaries.length > 0 ? context.plotPathSummaries.join('\n') : '（无）',
        '',
        '【最近场景】',
        context.recentScenes.length > 0 ? context.recentScenes.join('\n---\n') : '（无）',
        '',
        '【当前结构化状态 JSON】',
        JSON.stringify(context.globalState, null, 2)
    ].join('\n');
}

function renderConstraints(constraints?: GenerationConstraints): string {
    if (!constraints) {
        return '【约束】无额外约束';
    }
    return [
        '【约束】',
        `- mustKeepFacts: ${constraints.mustKeepFacts?.join(' | ') ?? '（无）'}`,
        `- forbiddenEvents: ${constraints.forbiddenEvents?.join(' | ') ?? '（无）'}`,
        `- styleProfile: ${constraints.styleProfile ?? '（无）'}`
    ].join('\n');
}

function buildSharedSystemPrompt(): string {
    return `你是专业中文叙事协作者，熟悉日式轻小说、校园恋爱喜剧与 ACGN 术语。
你与作者协作时风格直接、诚实、不过度恭维；能明确指出问题并给出可执行改进建议；语气不攻击。
你必须先保证剧情逻辑、状态一致性与可追溯性，再追求文采。
当任务是写作时，输出具有可读性的场景文本。
当任务是压缩或补丁提取时，禁止文学化发挥，必须输出结构化、可机器消费的结果。
如输入存在冲突或信息不足，先显式标注不确定点，不得擅自编造关键事实。`;
}

function buildSceneGenerationPrompts(input: SceneGenerationInput) {
    const systemPrompt = [
        buildSharedSystemPrompt(),
        '',
        '当前任务类型：场景生成。',
        '输出必须是纯场景正文文本，不要输出 JSON、标题、注释、分析、列表。',
        '只专注写场景 text，不承担摘要和状态补丁提取任务。'
    ].join('\n');

    const userPrompt = [
        renderContextBlock(input.context),
        '',
        renderConstraints(input.constraints),
        '',
        '【当前写作任务】',
        input.currentTask,
        '',
        '请直接输出场景正文。'
    ].join('\n');

    return { systemPrompt, userPrompt };
}

function buildPlotSummaryPrompts(input: PlotSummaryInput) {
    const systemPrompt = [
        buildSharedSystemPrompt(),
        '',
        '当前任务类型：摘要压缩（plot node 专用）。',
        '只输出和 plot node 相关的结构化摘要，不要输出场景正文。',
        '删除文采性细节，保留后续生成所需的连续性信息。'
    ].join('\n');

    const userPrompt = [
        renderContextBlock(input.context),
        '',
        '【需要压缩的场景正文】',
        input.sceneText,
        '',
        `【摘要目标】${input.summaryGoal ?? '压缩为可用于 plot node 的稳定摘要'}`,
        '',
        '请严格按照给定 schema 输出对象。'
    ].join('\n');

    return { systemPrompt, userPrompt };
}

function buildStatePatchPrompts(input: StatePatchExtractionInput) {
    const systemPrompt = [
        buildSharedSystemPrompt(),
        '',
        '当前任务类型：状态补丁提取（state 专用）。',
        '你只负责生成状态层 JSON Patch，不要输出剧情文本或摘要。',
        '补丁只允许作用于一级固定节点：/storyMeta /world /characters /plot_flags /style。',
        '只输出有证据支持的最小必要补丁。无证据变化不要改。'
    ].join('\n');

    const userPrompt = [
        renderContextBlock(input.context),
        '',
        '【本次场景正文】',
        input.sceneText,
        '',
        `【补丁策略】${input.patchPolicy ?? '不确定项写入 unresolved'}`,
        '',
        '请严格按照给定 schema 输出对象。'
    ].join('\n');

    return { systemPrompt, userPrompt };
}

export async function generateSceneText(input: SceneGenerationInput, options?: ToolCallOptions) {
    const { systemPrompt, userPrompt } = buildSceneGenerationPrompts(input);
    return streamGenerateText(
        options?.modelId ?? config.models.scene_generate,
        [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ],
        options?.runtime
    );
}

export async function summarizeSceneForPlotNode(
    input: PlotSummaryInput,
    options?: ToolCallOptions
) {
    const { systemPrompt, userPrompt } = buildPlotSummaryPrompts(input);
    return generateObject(
        options?.modelId ?? config.models.summarize,
        [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ],
        PlotSummaryOutputSchema,
        options?.runtime
    );
}

export async function extractStatePatches(
    input: StatePatchExtractionInput,
    options?: ToolCallOptions
) {
    const { systemPrompt, userPrompt } = buildStatePatchPrompts(input);
    return generateObject(
        options?.modelId ?? config.models.state_update,
        [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ],
        StatePatchExtractionOutputSchema,
        options?.runtime
    );
}
