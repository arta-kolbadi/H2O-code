import path from "node:path";
try { process.loadEnvFile(path.resolve(process.cwd(), ".env")); } catch (error) { if (error.code !== "ENOENT") throw error; }
