import { z } from 'zod';
import { _DynamicValueSchema, _JSONPatchSchema } from './utils.js';

export const PlotNodeMetadataSchema = z.object({
    userPrompt: z.string().describe("触发这个情节节点的用户输入"),
    snapshot: z.object({
        stateHash: z.string().describe("这个情节节点对应的状态快照的Hash值"),
        patches: z.array(_JSONPatchSchema).describe("当前情节节点的JSON Patch列表，记录从父节点到当前节点的状态机变化"),
        activeReferences: z.array(z.string()).describe("这个情节节点引用的Wiki条目ID列表"),
        branch: z.string().describe("这个情节节点创建时所在的分支名字"),
    }),
    generation: z.object({
        model: z.string().describe("生成这个情节节点的语言模型的名字"),
        params: z.record(z.string(), _DynamicValueSchema).describe("生成这个情节节点的语言模型的参数，键为参数的名字，值为参数的值，可以根据需要添加任意的合法JSON数据结构"),
        metrics: z.object({
            inputTokens: z.number().describe("生成这个情节节点的输入文本的Token数量"),
            outputTokens: z.number().describe("生成这个情节节点的输出文本的Token数量"),
            latency: z.number().describe("生成这个情节节点的时间，单位为毫秒"),
        })
    }),
    semantic: z.object({
        mainCharacters: z.array(z.string()).describe("这个情节节点的主要角色列表，包含在这个节点中出现的主要角色的名字"),
        locationId: z.string().optional().describe("这个情节节点发生的地点ID，指向Wiki中的一个地点条目"),
        keyEvents: z.array(z.string()).describe("这个情节节点的关键事件列表，包含在这个节点中发生的主要事件的描述"),
    }),
});

export const PlotNodeSchema = z.object({
    id: z.string().describe("情节节点的Hash值"),
    parent: z.string().nullable().describe("父节点的Hash值，如果没有父节点则为null"),
    doltHash: z.string().describe("当前节点对应的Dolt Commit Hash值"),
    summary: z.string().describe("当前情节节点的总结，简要描述这个节点的主要内容"),
    sceneTextRef: z.string().describe("当前情节节点对应的场景文本的Hash值，指向外部存储（文件，OSS）中的一个文本块"),
    milestone: z.string().nullable().describe("当前情节节点的里程碑，描述这个节点发生了什么影响后续剧情的事件，如果没有里程碑则为null"),
    metadata: PlotNodeMetadataSchema.describe("当前情节节点的元数据"),
    depth: z.number().describe("当前情节节点在情节树中的深度，根节点的深度为0，子节点的深度为父节点的深度加1"),
    createdAt: z.date().describe("当前情节节点的创建时间"),
});

export const PlotRefSchema = z.object({
    name: z.string().describe("情节引用的名字"),
    type: z.enum(["branch", "tag"]).describe("情节引用的类型，表示这个引用是一个分支还是一个标签"),
    target: z.string().describe("情节引用的目标Hash值"),
});

export type PlotNode = z.infer<typeof PlotNodeSchema>;
export type PlotRef = z.infer<typeof PlotRefSchema>;