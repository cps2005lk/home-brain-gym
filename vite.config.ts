/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    // Tests run in plain Node by default (fast). A component test opts in to
    // a fake browser with a `// @vitest-environment jsdom` comment at its top.
    coverage: {
      provider: "v8",
      include: ["src/**"],
      exclude: ["src/**/*.test.*", "src/**/*-fake*", "src/data/database.types.ts"],
    },
  },
});
