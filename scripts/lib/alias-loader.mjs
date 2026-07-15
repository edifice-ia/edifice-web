// Minimal ESM loader for plain `node` execution of verification scripts
// against TypeScript sources that use the project's "@/*" -> "./*" tsconfig
// path alias (tsconfig.json) and extensionless relative imports. Node's
// native TypeScript support strips types but does not resolve tsconfig path
// aliases or add missing extensions, so scripts importing such modules must
// register this loader first via node:module's register().
const projectRoot = new URL("../../", import.meta.url);

export async function resolve(specifier, context, nextResolve) {
  const rewritten = specifier.startsWith("@/")
    ? new URL(`${specifier.slice(2)}.ts`, projectRoot).href
    : specifier;

  try {
    return await nextResolve(rewritten, context);
  } catch (error) {
    const isRelative = specifier.startsWith("./") || specifier.startsWith("../");
    if (!isRelative || rewritten.endsWith(".ts")) {
      throw error;
    }

    return nextResolve(`${rewritten}.ts`, context);
  }
}
