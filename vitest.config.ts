import "dotenv/config";
import { config as dotenvConfig } from "dotenv";
import { defineConfig } from "vitest/config";
import path from "node:path";

dotenvConfig({ path: ".env.local", override: true });

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    setupFiles: [],
    coverage: { reporter: ["text", "html"], include: ["src/**/*.ts"] },
    testTimeout: 15000,
  },
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
});
