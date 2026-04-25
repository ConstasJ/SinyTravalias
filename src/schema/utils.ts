import type { Operation } from 'fast-json-patch';
import { z, ZodType } from 'zod';

export const _DynamicValueSchema: z.ZodType<unknown> = z.lazy(() =>
    z.union([
        z.string(),
        z.number(),
        z.boolean(),
        z.null(),
        z.array(z.lazy(() => _DynamicValueSchema)),
        z.record(
            z.string(),
            z.lazy(() => _DynamicValueSchema)
        )
    ])
);

export const _JSONPatchSchema = z.discriminatedUnion('op', [
    z.object({
        op: z.literal('add').describe('JSON Patch操作的类型，此处固定为add'),
        path: z.string().describe('JSON Patch操作的路径，表示这个补丁作用于哪个字段'),
        value: _DynamicValueSchema.describe('JSON Patch操作的值，表示这个补丁要添加的值')
    }),
    z.object({
        op: z.literal('remove').describe('JSON Patch操作的类型，此处固定为remove'),
        path: z.string().describe('JSON Patch操作的路径，表示这个补丁要删除哪个字段')
    }),
    z.object({
        op: z.literal('replace').describe('JSON Patch操作的类型，此处固定为replace'),
        path: z.string().describe('JSON Patch操作的路径，表示这个补丁作用于哪个字段'),
        value: _DynamicValueSchema.describe('JSON Patch操作的值，表示这个补丁要替换的值')
    }),
    z.object({
        op: z.literal('move').describe('JSON Patch操作的类型，此处固定为move'),
        path: z.string().describe('JSON Patch操作的路径，表示这个补丁作用于哪个字段'),
        from: z.string().describe('JSON Patch操作的来源路径')
    }),
    z.object({
        op: z.literal('copy').describe('JSON Patch操作的类型，此处固定为copy'),
        path: z.string().describe('JSON Patch操作的路径，表示这个补丁作用于哪个字段'),
        from: z.string().describe('JSON Patch操作的来源路径')
    }),
    z.object({
        op: z.literal('test').describe('JSON Patch操作的类型，此处固定为test'),
        path: z.string().describe('JSON Patch操作的路径，表示这个补丁作用于哪个字段'),
        value: _DynamicValueSchema.describe('JSON Patch操作的值，表示这个补丁要测试的值')
    })
]) satisfies ZodType<Operation>;
