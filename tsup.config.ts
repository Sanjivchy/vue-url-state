import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  dts: true,
  clean: true,
  external: ["vue", "vue-router"],
  splitting: false,
  sourcemap: true,
  minify: true,
  treeshake: true,
});
