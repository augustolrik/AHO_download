import { cp, mkdir, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const siteRoot = path.join(projectRoot, ".site");
const outputRoot = path.join(projectRoot, ".site-dist");
const siteFiles = new Set(["app.js", "index.html", "styles.css"]);
const technicalNames = new Set([
  "desktop.ini", "files.json", "license", "license.md", "package-lock.json",
  "package.json", "project_status.md", "readme", "readme.md", "readme.txt",
  "robots.txt", "sitemap.xml", "thumbs.db",
]);
const technicalDirectories = new Set([
  ".folder-style", ".git", ".github", ".openai", ".site-dist", "node_modules", "scripts",
]);
const releaseOnlyDirectories = new Set(["tegne_spil", "tegne spil"]);
const maxFileSize = 95 * 1024 * 1024;
const maxTotalSize = 900 * 1024 * 1024;

function compareNames(left, right) {
  return left.localeCompare(right, "da", { sensitivity: "base" });
}

function isTechnical(entry) {
  const lower = entry.name.toLowerCase();
  return entry.name.startsWith(".") || technicalNames.has(lower) ||
    technicalDirectories.has(lower) || releaseOnlyDirectories.has(lower) || siteFiles.has(lower) ||
    entry.name.startsWith("~$") || /\.(?:tmp|temp|part|crdownload)$/i.test(entry.name);
}

function encodeRelativePath(relativePath) {
  return relativePath.split(path.sep).map(encodeURIComponent).join("/");
}

async function collectFiles(directory, relativeDirectory = "") {
  const entries = await readdir(directory, { withFileTypes: true });
  entries.sort((a, b) => compareNames(a.name, b.name));
  const files = [];
  for (const entry of entries) {
    if (isTechnical(entry)) continue;
    const relativePath = path.join(relativeDirectory, entry.name);
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectFiles(absolutePath, relativePath));
      continue;
    }
    if (!entry.isFile()) continue;
    const extension = path.extname(entry.name).toLowerCase();
    const details = await stat(absolutePath);
    if (details.size > maxFileSize) {
      throw new Error(`${relativePath} er over 95 MB og kan ikke udgives via denne side.`);
    }
    const normalizedPath = relativePath.split(path.sep).join("/");
    files.push({
      name: entry.name,
      path: normalizedPath,
      url: encodeRelativePath(relativePath),
      size: details.size,
      extension,
      source: absolutePath,
    });
  }
  return files;
}

const files = (await collectFiles(projectRoot)).sort((a, b) => compareNames(a.path, b.path));
const caseFoldedPaths = new Set();
for (const file of files) {
  const folded = file.path.toLocaleLowerCase("da-DK");
  if (caseFoldedPaths.has(folded)) {
    throw new Error(`To filer har samme navn, når store/små bogstaver ignoreres: ${file.path}`);
  }
  caseFoldedPaths.add(folded);
}
const totalSize = files.reduce((sum, file) => sum + file.size, 0);
if (totalSize > maxTotalSize) {
  throw new Error("De offentlige filer fylder over 900 MB. Del dem i flere arkiver eller skoleår.");
}

await rm(outputRoot, { recursive: true, force: true });
await mkdir(outputRoot, { recursive: true });
for (const fileName of siteFiles) {
  await cp(path.join(siteRoot, fileName), path.join(outputRoot, fileName));
}
for (const file of files) {
  const target = path.join(outputRoot, file.path);
  await mkdir(path.dirname(target), { recursive: true });
  await cp(file.source, target);
}
const publicFiles = files.map(({ source, ...file }) => file);
await writeFile(
  path.join(outputRoot, "files.json"),
  `${JSON.stringify({ files: publicFiles }, null, 2)}\n`,
  "utf8",
);
console.log(`Klar til udgivelse: ${files.length} fil${files.length === 1 ? "" : "er"}.`);
