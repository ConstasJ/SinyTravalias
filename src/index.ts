import { type ModelMessage, streamText } from "ai";
import { getVertex } from './llm/index.js';
import 'dotenv/config';
import * as readline from 'node:readline/promises';

const terminal = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

const messages: ModelMessage[] = [];

async function main() {
    const vertex = await getVertex();

    while (true) {
        const input = await terminal.question("You: ");
        messages.push({ role: "user", content: input });
        
        const result = streamText({
            model: vertex("gemini-3-flash-preview"),
            messages,
        })

        let fullResponse = "";
        process.stdout.write("\nAssistant: ");
        for await (const chunk of result.textStream) {
            process.stdout.write(chunk);
            fullResponse += chunk;
        }
        process.stdout.write("\n\n");
        messages.push({ role: "assistant", content: fullResponse });
    }
}

main().catch(console.error);