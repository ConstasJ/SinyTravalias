import { z } from 'zod';

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

export const _JSONPatchSchema = z.object({
    op: z
        .enum(['add', 'remove', 'replace', 'move', 'copy', 'test'])
        .describe('JSON Patch操作的类型，表示这个补丁是添加、删除、替换、移动、复制还是测试'),
    path: z.string().describe('JSON Patch操作的路径，表示这个补丁作用于哪个字段'),
    value: _DynamicValueSchema
        .optional()
        .describe('JSON Patch操作的值，表示这个补丁要设置或替换的值')
});
