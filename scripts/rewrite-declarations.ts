const root = new URL("../dist/", import.meta.url);

await rewriteDirectory(root);

async function rewriteDirectory(directory: URL): Promise<void> {
  for await (const entry of Deno.readDir(directory)) {
    const url = new URL(entry.name, directory);
    if (entry.isDirectory) {
      await rewriteDirectory(new URL(`${url.href}/`));
    } else if (entry.isFile && entry.name.endsWith(".d.ts")) {
      const declaration = await Deno.readTextFile(url);
      const rewritten = declaration.replaceAll(
        /(["'])(\.\.?\/[^"']+)\.ts\1/g,
        (_match, quote: string, specifier: string) => `${quote}${specifier}.js${quote}`,
      );
      if (rewritten !== declaration) await Deno.writeTextFile(url, rewritten);
    }
  }
}
