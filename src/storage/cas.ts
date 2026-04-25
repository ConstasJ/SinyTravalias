import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { stat as fsStat, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { zstdCompress, zstdDecompress } from 'node:zlib';

const storageDir = resolve(process.cwd(), './data/cas');

export type StorageStat = {
    totalItems: number;
    totalSize: number; // in bytes
};

function generateHash(content: string): string {
    return createHash('sha256').update(content).digest('hex');
}

export async function putContent(content: string): Promise<string> {
    const hash = generateHash(content);
    const prefix = hash.slice(0, 2);
    if (!existsSync(resolve(storageDir, prefix))) {
        await mkdir(resolve(storageDir, prefix), { recursive: true });
    }
    const filePath = resolve(storageDir, `./${prefix}/${hash}.zst`);
    const compressedContent = await promisify(zstdCompress)(Buffer.from(content, 'utf8'));
    await writeFile(filePath, compressedContent);
    return hash;
}

export async function getContent(hash: string): Promise<string | undefined> {
    const prefix = hash.slice(0, 2);
    const filePath = resolve(storageDir, `./${prefix}/${hash}.zst`);
    if (!existsSync(filePath)) {
        return undefined;
    }
    const compressedContent = await readFile(filePath);
    return (await promisify(zstdDecompress)(compressedContent)).toString('utf8');
}

export async function hasContent(hash: string): Promise<boolean> {
    const prefix = hash.slice(0, 2);
    const filePath = resolve(storageDir, `./${prefix}/${hash}.zst`);
    return existsSync(filePath);
}

export async function stat(): Promise<StorageStat> {
    let totalItems = 0;
    let totalSize = 0;

    if (!existsSync(storageDir)) {
        return { totalItems, totalSize };
    }

    const prefixes = await readdir(storageDir);
    for (const prefix of prefixes) {
        const prefixPath = resolve(storageDir, `./${prefix}`);
        if (existsSync(prefixPath)) {
            const files = await readdir(prefixPath);
            totalItems += files.length;
            for (const file of files) {
                const filePath = resolve(prefixPath, file);
                const stats = await fsStat(filePath);
                totalSize += stats.size;
            }
        }
    }

    return { totalItems, totalSize };
}
