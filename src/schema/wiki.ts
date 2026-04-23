import { z } from 'zod';
import { _JSONPatchSchema } from './utils.js';

export const WikiReferenceSchema = z.object({
    name: z.string().describe('引用的名字，表示这个引用的含义或用途'),
    type: z.enum(['text', 'vector']).describe('引用的类型，表示这个引用是一个文本块还是一个向量块'),
    target: z
        .string()
        .describe('引用的目标，指向外部存储（文件，OSS，向量存储等）中的一个文本块或者向量块')
});

export const WikiHistoryEntrySchema = z.object({
    id: z.string().describe('历史记录的ID，计算target name、JSON patch和unidiff的hash生成'),
    timestamp: z.date().describe('历史记录的时间戳，表示这个历史记录发生的时间'),
    target: z.string().describe('历史记录的目标，指示这个历史记录是针对哪个条目进行的修改'),
    action: z
        .enum(['create', 'update', 'delete'])
        .describe('历史记录的操作类型，表示这个历史记录是创建、更新还是删除了一个条目'),
    diff: z.object({
        unidiff: z.string().optional().describe('使用unidiff记录的正文差异'),
        jsonPatch: z.array(_JSONPatchSchema).optional().describe('使用JSON Patch记录的元数据差异')
    })
});

export const WikiEntrySchema = z.object({
    name: z.string().describe('条目的名字，唯一标识一个条目'),
    contentRef: z.string().describe('条目的内容引用，指向外部存储（文件，OSS）中的一个文本块'),
    categories: z.array(z.string()).describe('条目的分类列表，包含这个条目所属的所有分类的名字'),
    navbox: z.string().describe('指示这个条目属于哪个导航框'),
    references: z.array(WikiReferenceSchema).describe('条目的引用列表'),
    history: z.array(z.string()).describe('条目的历史记录ID列表')
});

export const WikiNavboxSchema = z.object({
    name: z.string().describe('导航框的名字，唯一标识一个导航框'),
    description: z.string().describe('导航框的描述，说明这个导航框的用途和内容'),
    groups: z
        .array(
            z.object({
                name: z.string().describe('分组的名字，表示这个分组的含义或用途'),
                items: z
                    .array(z.string())
                    .describe('分组中的条目列表，包含这个分组中所有条目的名字')
            })
        )
        .describe('导航框的分组列表，包含这个导航框中的所有分组的信息'),
    metadata: z
        .object({
            createdAt: z.date().describe('导航框的创建时间'),
            updatedAt: z.date().describe('导航框的更新时间')
        })
        .describe('导航框的元数据，包含关于这个导航框的各种信息')
});

export const WikiCategorySchema = z.object({
    name: z.string().describe('分类的名字，唯一标识一个分类'),
    items: z
        .array(
            z.object({
                name: z.string().describe('项目名称，唯一标识符'),
                type: z
                    .enum(['entry', 'subcategory'])
                    .describe('项目类型，表示这个项目是一个条目还是一个子分类')
            })
        )
        .describe('分类中的项目列表，包含这个分类中的所有条目和子分类的信息')
});

export type WikiEntry = z.infer<typeof WikiEntrySchema>;
