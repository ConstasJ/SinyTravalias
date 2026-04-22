import { z } from 'zod';

const _DynamicValueSchema: z.ZodType<any> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(z.lazy(() => _DynamicValueSchema)),
    z.record(z.string(), z.lazy(() => _DynamicValueSchema)),
  ])
);

const _StoryMetaSchema = z.object({
    storyline: z.string().describe("故事线，指示故事发生的世界线（如果有多个世界线的话）"),
    setting: z.string().describe("故事的设定，描述故事发生的背景和环境"),
    metaKnowledge: z.record(z.string(), _DynamicValueSchema).describe("元知识，包含关于故事世界的各种信息，如历史、文化、科技水平等，可以根据需要添加任意的合法JSON数据结构"),
})
// 由于角色的属性可能会随着剧情发展而变化，或者不同的角色可能有不同的属性，因此我们使用 catchall 来允许任意的额外属性。
.catchall(_DynamicValueSchema);

const _WorldStateSchema = z.object({
    time: z.string().describe("当前的时间，可以是具体的日期时间，也可以是相对的时间描述，如“故事开始后的第三天”"),
    weather: z.string().describe("当前的天气状况，如晴天、雨天、暴风雪等"),
    environment: z.record(z.string(), _DynamicValueSchema).describe("环境状态，包含关于场景环境的各种信息，如地点、氛围、重要物品等，可以根据需要添加任意的合法JSON数据结构"),
})
.catchall(_DynamicValueSchema);

const _CharacterSkillSchema = z.object({
    description: z.string().describe("技能的描述，说明这个技能是什么以及它的效果"),
    level: z.number().describe("技能的等级，表示角色在这个技能上的熟练程度，可以根据需要使用不同的数值范围"),
})
.catchall(_DynamicValueSchema);

const _CharacterSchema = z.object({
    location: z.string().describe("上一个场景结束时角色所在的位置或环境"),
    psychologicalState: z.string().describe("上一个场景结束时角色的心理状态"),
    relationships: z.record(z.string(), z.string()).describe("角色与其他角色的关系，键为其他角色的名字，值为关系的描述"),
    skills: z.record(z.string(), _CharacterSkillSchema).describe("角色的技能，键为技能的名字，值为技能的详细信息"),
    hobbies: z.record(z.string(), z.string()).describe("角色的爱好，键为爱好的名字，值为爱好的描述"),
    languageStyle: z.record(z.string(), _DynamicValueSchema).describe("角色的语言风格，包含关于角色说话方式的各种信息，如是否使用方言、常用的词汇和句子结构等，可以根据需要添加任意的JSON合法数据结构"),
})
.catchall(_DynamicValueSchema);

const _PlotFlagSchema = z.record(z.string(), z.object({
    description: z.string().describe("情节标志的描述，说明这个标志代表什么"),
    value: z.union([z.string(), z.number(), z.boolean()]).describe("情节标志的值，可以是字符串、数字或布尔值，具体取决于标志的类型和用途"),
}).catchall(_DynamicValueSchema));

const _StyleSchema = z.object({
    narrativeStyle: z.string().describe("叙事风格，描述故事的叙述方式，如第一人称、第三人称全知视角等"),
    tone: z.string().describe("故事的基调，如幽默、严肃、浪漫等"),
    languageStyle: z.record(z.string(), _DynamicValueSchema).describe("整个场景的语言风格，包含关于故事整体说话方式的各种信息，如是否使用方言、常用的词汇和句子结构等，可以根据需要添加任意的JSON合法数据结构"),
})
.catchall(_DynamicValueSchema);

const _StateSchema = z.object({
    storyMeta: _StoryMetaSchema,
    world: _WorldStateSchema,
    characters: z.record(z.string(), _CharacterSchema).describe("角色状态，键为角色的名字，值为角色的状态信息"),
    plot_flags: _PlotFlagSchema,
    style: _StyleSchema,
});

export type GlobalState = z.infer<typeof _StateSchema>;