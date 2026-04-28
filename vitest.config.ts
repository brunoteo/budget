import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    setupFiles: [],
    coverage: { reporter: ["text", "html"], include: ["src/**/*.ts"] },
  },
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
});
