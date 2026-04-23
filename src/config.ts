import { z } from 'zod';
import dotenv from 'dotenv';
import { resolve } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import YAML from 'js-yaml';
import { deepmerge } from 'deepmerge-ts';

const ModelConfigSchema = z.stringFormat("modelId", /^([a-z0-9-]+):([a-z0-9.-]+)$/)

export const ConfigSchema = z.object({
    env: z.enum(['development', 'production', 'test']).default('development'),
    models: z.object({
        scene_generate: ModelConfigSchema,
        summorize: ModelConfigSchema,
        state_update: ModelConfigSchema,
    }),
});

export type Config = z.infer<typeof ConfigSchema>;

dotenv.config();

function loadConfig(): Config {
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
                summorize: process.env.SUMMORIZE_MODEL,
                state_update: process.env.STATE_UPDATE_MODEL,
            },
        };
        const mergedRaw = deepmerge(fileConfig, envConfig);
        const config = ConfigSchema.safeParse(mergedRaw);
        if (!config.success) {
            console.error('❌ Invalid configuration:');
            console.error(z.treeifyError(config.error));
            process.exit(1);
        }
        return Object.freeze(config.data);
    } catch(error) {
        console.error(`Failed to load config from ${configPath}:`, error);
        throw error;
    }
}

export const config = loadConfig();