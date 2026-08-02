// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/tanstack/vite";
import { fileURLToPath } from "node:url";

const analysisReconcilerTask = fileURLToPath(
  new URL("./tasks/analysis/reconcile.ts", import.meta.url),
);

export default defineConfig({
  nitro: {
    // The Lovable wrapper forwards these Nitro options at runtime even though its
    // intentionally narrow public type currently omits the experimental task keys.
    // @ts-expect-error Nitro scheduled tasks are supported by the installed runtime.
    experimental: { tasks: true },
    tasks: {
      "analysis:reconcile": {
        handler: analysisReconcilerTask,
        description: "Reconcile completed assessments awaiting analysis",
      },
    },
    scheduledTasks: {
      "* * * * *": "analysis:reconcile",
    },
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [mcpPlugin()],
  },
});
