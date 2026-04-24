import { createHash } from "node:crypto";

const storage = new Map<string, string>();

export type StorageStat = {
    totalItems: number;
    totalSize: number; // in characters
};

function generateHash(content: string): string {
    return createHash("sha256").update(content).digest("hex");
}

export function putContent(content: string): string {
    const hash = generateHash(content);
    storage.set(hash, content);
    return hash;
}

export function getContent(hash: string): string | undefined {
    return storage.get(hash);
}

export function hasContent(hash: string): boolean {
    return storage.has(hash);
}

export function stat(): StorageStat {
    let totalSize = 0;
    for (const content of storage.values()) {
        totalSize += content.length;
    }
    return {
        totalItems: storage.size,
        totalSize
    };
}