import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const outputRoot = path.join(projectRoot, ".site-dist");
const indexPath = path.join(outputRoot, "files.json");
const archiveDirectory = "mappe-downloads";

function encodeRelativePath(relativePath) {
  return relativePath.split(path.sep).map(encodeURIComponent).join("/");
}

if (process.platform === "win32") {
  console.log("ZIP-filer til mapper laves ved GitHub-udgivelsen.");
  process.exit(0);
}

const index = JSON.parse(await readFile(indexPath, "utf8"));
const folders = [...new Set((index.files || [])
  .map((file) => String(file.path || "").split("/").filter(Boolean))
  .filter((parts) => parts.length > 1)
  .map(([folder]) => folder))]
  .sort((a, b) => a.localeCompare(b, "da", { sensitivity: "base" }));

await mkdir(path.join(outputRoot, archiveDirectory), { recursive: true });
const archives = [];
for (const folder of folders) {
  const archiveName = `${folder}.zip`;
  const archivePath = path.join(outputRoot, archiveDirectory, archiveName);
  const result = spawnSync("zip", ["-r", "-q", archivePath, folder], {
    cwd: outputRoot,
    encoding: "utf8",
  });
  if (result.error || result.status !== 0) {
    throw new Error(`Kunne ikke lave ZIP til mappen ${folder}: ${result.error?.message || result.stderr || "ukendt fejl"}`);
  }
  archives.push({
    folder,
    url: encodeRelativePath(path.join(archiveDirectory, archiveName)),
    size: (await stat(archivePath)).size,
  });
}

index.archives = archives;
await writeFile(indexPath, `${JSON.stringify(index, null, 2)}\n`, "utf8");
console.log(`Klar: ${archives.length} mappe-ZIP-fil${archives.length === 1 ? "" : "er"}.`);
