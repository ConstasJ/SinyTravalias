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
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { createAlibaba } from "@ai-sdk/alibaba";

let globalDispatcher: ProxyAgent | undefined;

const customFetch = (url: string | URL | Request, init?: RequestInit) => {
    const proxy = process.env.HTTP_PROXY ?? process.env.http_proxy;
    if (proxy) {
        globalDispatcher ??= new ProxyAgent(proxy);
        const uInit = init as unknown as uRequestInit;
        return uFetch(url as RequestInfo, {
            ...uInit,
            dispatcher: globalDispatcher,
        });
    } else {
        return fetch(url, init);
    }
}

async function initVertex() {
    try {
        const filename =
            process.env.GOOGLE_APPLICATION_CREDENTIALS ?? "./credentials.json";
        const filePath = isAbsolute(filename)
            ? filename
            : resolve(process.cwd(), filename);
        const credentials = JSON.parse(await readFile(filePath, "utf-8"));
        const projectId = credentials.project_id;

        const authClient = new JWT({
            scopes: ["https://www.googleapis.com/auth/cloud-platform"],
        });
        authClient.fromJSON(credentials);

        return createVertex({
            project: projectId,
            location: "global",
            googleAuthOptions: { authClient },
            fetch: customFetch,
        });
    } catch (err) {
        // 确保单例 Promise 在失败时能被清理，或者至少记录清晰的日志
        vertexPromise = undefined;
        throw new Error(
            `Vertex AI Init Failed: ${err instanceof Error ? err.message : String(err)}`,
        );
    }
}

let vertexPromise: ReturnType<typeof initVertex> | undefined;

export function getVertex() {
    vertexPromise ??= initVertex();
    return vertexPromise;
}

export const openRouter = createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY ?? "",
    fetch: customFetch,
});

export const alibaba = createAlibaba({
    baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    apiKey: process.env.ALIBABA_API_KEY ?? "",
    fetch: customFetch,
});