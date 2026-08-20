import { defineConfig } from "tsdown";

const libraryBuild = {
  entry: ["src/index.ts"],
  dts: true,
  sourcemap: true,
  treeshake: true,
  target: "es2020",
  platform: "neutral"
} as const;

export default defineConfig([
  {
    ...libraryBuild,
    format: ["esm"],
    clean: true
  },
  {
    ...libraryBuild,
    format: ["cjs"],
    clean: false,
    deps: {
      alwaysBundle: ["@jvmr/pptx-to-html"]
    }
  },
  {
    entry: ["src/cli.ts"],
    format: ["esm"],
    dts: false,
    clean: false,
    platform: "node"
  }
]);
