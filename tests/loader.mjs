import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    if (
      err.code === "ERR_MODULE_NOT_FOUND" &&
      (specifier.startsWith("./") || specifier.startsWith("../") || specifier.startsWith("@/"))
    ) {
      const candidates = specifier.startsWith("@/")
        ? [specifier.replace(/^@\//, "./src/")]
        : [specifier];

      for (const base of candidates) {
        for (const ext of [".ts", ".tsx", ".js", ".mjs", "/index.ts", "/index.js"]) {
          try {
            return await nextResolve(base + ext, context);
          } catch {}
        }
      }
    }
    throw err;
  }
}
