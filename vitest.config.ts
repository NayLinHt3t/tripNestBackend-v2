import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: [
        "src/modules/**/*.service.ts",
        "src/modules/**/*.entity.ts",
      ],
      exclude: ["src/modules/database/**", "src/modules/utils/**"],
    },
  },
});
