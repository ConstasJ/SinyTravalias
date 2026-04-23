import { readFile } from 'node:fs/promises';
import { isAbsolute, resolve } from 'node:path';
import type { AlibabaProvider } from '@ai-sdk/alibaba';
import { createAlibaba } from '@ai-sdk/alibaba';
import { createVertex } from '@ai-sdk/google-vertex';
import type { OpenRouterProvider } from '@openrouter/ai-sdk-provider';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { JWT } from 'google-auth-library';
import type { RequestInfo, RequestInit as uRequestInit } from 'undici';
import { ProxyAgent, fetch as uFetch } from 'undici';
import { config } from '@/config.js';

const PROXY_URL = process.env.HTTP_PROXY ?? process.env.http_proxy;
const globalDispatcher = PROXY_URL ? new ProxyAgent(PROXY_URL) : undefined;

const customFetch: typeof fetch = (url, init) => {
    if (globalDispatcher) {
        return uFetch(
            url as RequestInfo,
            {
                ...init,
                dispatcher: globalDispatcher
            } as uRequestInit
        );
    }
    return fetch(url, init);
};

let vertexPromise: ReturnType<typeof initVertex> | undefined;
let openRouterInstance: OpenRouterProvider | undefined;
let alibabaInstance: AlibabaProvider | undefined;

async function initVertex() {
    try {
        const filename = config.credentials.vertexAI?.keyFile;
        if (!filename) {
            throw new Error('Google Vertex AI key file path is not set in config');
        }
        const filePath = isAbsolute(filename) ? filename : resolve(process.cwd(), filename);
        const credentials = JSON.parse(await readFile(filePath, 'utf-8'));

        const authClient = new JWT({
            scopes: ['https://www.googleapis.com/auth/cloud-platform']
        });
        authClient.fromJSON(credentials);

        return createVertex({
            project: config.credentials.vertexAI?.projectId ?? authClient.projectId ?? '',
            location: config.credentials.vertexAI?.location ?? 'global',
            googleAuthOptions: { authClient },
            fetch: customFetch
        });
    } catch (err) {
        vertexPromise = undefined;
        throw new Error(
            `Vertex AI Init Failed: ${err instanceof Error ? err.message : String(err)}`
        );
    }
}

export function getVertex() {
    vertexPromise ??= initVertex();
    return vertexPromise;
}

export function getOpenRouter() {
    const apiKey = config.credentials.openRouter;
    if (!apiKey) {
        throw new Error('OPENROUTER_API_KEY is not set in config');
    }
    openRouterInstance ??= createOpenRouter({
        apiKey,
        fetch: customFetch
    });
    return openRouterInstance;
}

export function getAlibaba() {
    const apiKey = config.credentials.alibaba;
    if (!apiKey) {
        throw new Error('ALIBABA_API_KEY is not set in config');
    }
    alibabaInstance ??= createAlibaba({
        baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        apiKey,
        fetch: customFetch
    });
    return alibabaInstance;
}
