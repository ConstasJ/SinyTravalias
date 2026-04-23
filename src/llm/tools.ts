import { z } from 'zod';
import { config } from '@/config.js';
import type { GlobalState } from '@/schema/state.js';
import { _JSONPatchSchema } from '@/schema/utils.js';
import { generateObject, generateText } from './service.js';

type ContextBlock = {
    coldSettings: string[];
    plotPathSummaries: string[];
    recentScenes: string[];
    globalState: GlobalState;
};

type GenerationConstraints = {
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
        `- styleProfile: ${constraints.styleProfile ?? '（无）'}`,
        `- tokenBudgetHint: ${constraints.tokenBudgetHint ?? '（无）'}`
    ].join('\n');
}

function buildSharedSystemPrompt(): string {
    return [
        '你是专业中文叙事协作者，熟悉日式轻小说、校园恋爱喜剧与 ACGN 语境。',
        '你必须优先保证逻辑一致、状态一致和可追溯性，再追求文采。',
        '你表达直接、诚实，不做违心夸赞，但语气不攻击。',
        '若输入信息不足或互相冲突，必须明确标注不确定点，不得擅自编造关键事实。'
    ].join('\n');
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
        `【补丁策略】${input.patchPolicy ?? '优先 add/remove/replace；不确定项写入 unresolved'}`,
        '',
        '请严格按照给定 schema 输出对象。'
    ].join('\n');

    return { systemPrompt, userPrompt };
}

export async function generateSceneText(input: SceneGenerationInput) {
    const { systemPrompt, userPrompt } = buildSceneGenerationPrompts(input);
    return generateText(config.models.scene_generate, [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
    ]);
}

export async function summarizeSceneForPlotNode(input: PlotSummaryInput) {
    const { systemPrompt, userPrompt } = buildPlotSummaryPrompts(input);
    return generateObject(
        config.models.summarize,
        [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ],
        PlotSummaryOutputSchema
    );
}

export async function extractStatePatches(input: StatePatchExtractionInput) {
    const { systemPrompt, userPrompt } = buildStatePatchPrompts(input);
    return generateObject(
        config.models.state_update,
        [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ],
        StatePatchExtractionOutputSchema
    );
}
