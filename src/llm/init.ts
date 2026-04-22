import { JWT } from "google-auth-library";
import { resolve, isAbsolute } from "node:path";
import { readFile } from "node:fs/promises";
import { createVertex } from "@ai-sdk/google-vertex";

const auth = new JWT({
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
})
const filename = process.env.GOOGLE_APPLICATION_CREDENTIALS ?? "./credentials.json";
const filepath = isAbsolute(filename) ? filename : resolve(process.cwd(), filename);
const jsonCredentials = JSON.parse(await readFile(filepath, "utf-8"));
auth.fromJSON(jsonCredentials);
await auth.authorize();

export const vertex = createVertex({
    project: jsonCredentials.project_id,
    location: 'global',
    googleAuthOptions: {
        authClient: auth,
    }
})