import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { deepmerge } from 'deepmerge-ts';
import dotenv from 'dotenv';
import YAML from 'js-yaml';
import { z } from 'zod';

const ModelConfigSchema = z.stringFormat('modelId', /^([a-z0-9-]+):([a-z0-9.-]+)$/);

export const ConfigSchema = z.object({
    env: z.enum(['development', 'production', 'test']).default('development'),
    models: z.object({
        scene_generate: ModelConfigSchema,
        summarize: ModelConfigSchema,
        state_update: ModelConfigSchema
    }),
    credentials: z.object({
        vertexAI: z
            .object({
                projectId: z.string(),
                location: z.string(),
                keyFile: z.string()
            })
            .optional(),
        openRouter: z.string().optional(),
        alibaba: z.string().optional()
    })
});

export type Config = z.infer<typeof ConfigSchema>;

export function getConfig(): Config {
    dotenv.config();

    const env = process.env.NODE_ENV ?? 'development';

    const configPath = resolve(process.cwd(), 'data/config.yaml');
    try {
        let fileConfig = {};
        if (existsSync(configPath)) {
            fileConfig = YAML.load(readFileSync(configPath, 'utf8')) as Record<string, unknown>;
        }
        const envConfig = {
            env,
            models: {
                scene_generate: process.env.SCENE_GENERATE_MODEL,
                summarize: process.env.SUMMARIZE_MODEL,
                state_update: process.env.STATE_UPDATE_MODEL
            },
            credentials: {
                vertexAI: {
                    projectId: process.env.GOOGLE_VERTEX_PROJECT,
                    location: process.env.GOOGLE_VERTEX_LOCATION,
                    keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS
                },
                openRouter: process.env.OPENROUTER_API_KEY,
                alibaba: process.env.ALIBABA_API_KEY
            }
        };
        const mergedRaw = deepmerge(fileConfig, envConfig);
        const config = ConfigSchema.safeParse(mergedRaw);
        if (!config.success) {
            console.error('❌ Invalid configuration:');
            console.error(z.treeifyError(config.error));
            process.exit(1);
        }
        return Object.freeze(config.data);
    } catch (error) {
        console.error(`Failed to load config from ${configPath}:`, error);
        throw error;
    }
}

export const config = getConfig();
