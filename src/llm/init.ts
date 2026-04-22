import {
    ProxyAgent,
    fetch as uFetch,
    type RequestInfo,
    type RequestInit as uRequestInit,
} from "undici";
import { JWT } from "google-auth-library";
import { resolve, isAbsolute } from "node:path";
import { readFile } from "node:fs/promises";
import { createVertex } from "@ai-sdk/google-vertex";
import { createOpenRouter, type OpenRouterProvider } from "@openrouter/ai-sdk-provider";
import { createAlibaba, type AlibabaProvider } from "@ai-sdk/alibaba";

const PROXY_URL = process.env.HTTP_PROXY ?? process.env.http_proxy;
const globalDispatcher = PROXY_URL ? new ProxyAgent(PROXY_URL) : undefined;

const customFetch: typeof fetch = (url, init) => {
    if (globalDispatcher) {
        return uFetch(url as RequestInfo, {
            ...init,
            dispatcher: globalDispatcher,
        } as uRequestInit);
    }
    return fetch(url, init);
}

let vertexPromise: ReturnType<typeof initVertex> | undefined;
let openRouterInstance: OpenRouterProvider | undefined;
let alibabaInstance: AlibabaProvider | undefined;

async function initVertex() {
    try {
        const filename = process.env.GOOGLE_APPLICATION_CREDENTIALS ?? "./credentials.json";
        const filePath = isAbsolute(filename) ? filename : resolve(process.cwd(), filename);
        const credentials = JSON.parse(await readFile(filePath, "utf-8"));
        
        const authClient = new JWT({
            scopes: ["https://www.googleapis.com/auth/cloud-platform"],
        });
        authClient.fromJSON(credentials);

        return createVertex({
            project: credentials.project_id,
            location: "global",
            googleAuthOptions: { authClient },
            fetch: customFetch,
        });
    } catch (err) {
        vertexPromise = undefined;
        throw new Error(`Vertex AI Init Failed: ${err instanceof Error ? err.message : String(err)}`);
    }
}

export function getVertex() {
    return (vertexPromise ??= initVertex());
}

export function getOpenRouter() {
    if (!process.env.OPENROUTER_API_KEY) {
        throw new Error("OPENROUTER_API_KEY is not set");
    }
    return (openRouterInstance ??= createOpenRouter({
        apiKey: process.env.OPENROUTER_API_KEY,
        fetch: customFetch,
    }));
}

export function getAlibaba() {
    if (!process.env.BAILIAN_API_KEY) {
        throw new Error("BAILIAN_API_KEY is not set");
    }
    return (alibabaInstance ??= createAlibaba({
        baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
        apiKey: process.env.BAILIAN_API_KEY,
        fetch: customFetch,
    }));
}