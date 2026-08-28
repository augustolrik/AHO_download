(() => {
  "use strict";

  const elements = {
    groups: document.querySelector("#file-groups"),
    empty: document.querySelector("#empty-state"),
    error: document.querySelector("#error-state"),
    retry: document.querySelector("#retry-button"),
    clear: document.querySelector("#clear-button"),
    search: document.querySelector("#search-input"),
    folder: document.querySelector("#folder-filter"),
    count: document.querySelector("#result-count"),
    updated: document.querySelector("#library-updated")
  };

  const state = {
    groups: [],
    query: "",
    folder: "all",
    hasLoaded: false
  };

  const typeLabels = {
    pdf: "PDF",
    doc: "DOC",
    docx: "DOC",
    xls: "XLS",
    xlsx: "XLS",
    ppt: "PPT",
    pptx: "PPT",
    zip: "ZIP",
    txt: "TXT",
    csv: "CSV",
    png: "IMG",
    jpg: "IMG",
    jpeg: "IMG"
  };

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function slugify(value) {
    return String(value || "mappe")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "mappe";
  }

  function folderFromPath(path) {
    const parts = String(path || "").replaceAll("\\", "/").split("/").filter(Boolean);
    return parts.length > 1 ? parts[0] : "Filer";
  }

  function fileExtension(name, declaredType) {
    const explicit = String(declaredType || "").toLowerCase().replace(/^\./, "");
    if (explicit) return explicit;
    const match = String(name || "").match(/\.([a-z0-9]+)$/i);
    return match ? match[1].toLowerCase() : "fil";
  }

  function normalizeFile(file, fallbackFolder) {
    const source = file && typeof file === "object" ? file : {};
    const path = String(source.url || source.path || source.href || "").trim();
    const name = String(source.name || source.title || (path.split(/[\\/]/).pop()) || "Unavngivet fil").trim();
    const folder = String(source.folder || folderFromPath(path) || fallbackFolder || "Andre filer").trim();
    const type = fileExtension(name, source.type);
    return {
      name,
      path,
      folder,
      type,
      description: String(source.description || source.note || "").trim(),
      size: source.size || "",
      updated: source.updated || source.date || ""
    };
  }

  function normalizePayload(payload) {
    const archiveByFolder = new Map((payload && Array.isArray(payload.archives) ? payload.archives : [])
      .filter((archive) => archive && archive.folder && archive.url)
      .map((archive) => [String(archive.folder), {
        path: String(archive.url),
        size: archive.size || "",
      }]));
    let sourceGroups;
    if (Array.isArray(payload)) {
      sourceGroups = [{ name: "Alle filer", files: payload }];
    } else if (payload && Array.isArray(payload.folders)) {
      sourceGroups = payload.folders;
    } else if (payload && Array.isArray(payload.files)) {
      sourceGroups = [{ name: "Alle filer", files: payload.files }];
    } else {
      throw new Error("files.json skal indeholde folders eller files");
    }

    const groups = sourceGroups.map((group, index) => {
      const source = group && typeof group === "object" ? group : {};
      const name = String(source.name || source.title || `Mappe ${index + 1}`).trim();
      const files = Array.isArray(source.files) ? source.files.map((file) => normalizeFile(file, name)).filter((file) => file.path) : [];
      return {
        id: String(source.id || slugify(name)),
        name,
        description: String(source.description || "").trim(),
        archive: archiveByFolder.get(name) || null,
        files
      };
    }).filter((group) => group.files.length > 0);

    // A flat files array can use each file's folder field instead of a wrapper folder.
    if (groups.length === 1 && groups[0].name === "Alle filer") {
      const byFolder = new Map();
      groups[0].files.forEach((file) => {
        if (!byFolder.has(file.folder)) byFolder.set(file.folder, []);
        byFolder.get(file.folder).push(file);
      });
      return [...byFolder.entries()].map(([name, files]) => ({
        id: slugify(name), name, description: "", archive: archiveByFolder.get(name) || null, files,
      }));
    }
    return groups;
  }

  function formatSize(size) {
    if (typeof size === "string" && size.trim()) return size.trim();
    const bytes = Number(size);
    if (!Number.isFinite(bytes) || bytes <= 0) return "";
    const units = ["B", "KB", "MB", "GB"];
    const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const value = bytes / (1024 ** unitIndex);
    return `${value < 10 && unitIndex > 0 ? value.toFixed(1) : Math.round(value)} ${units[unitIndex]}`;
  }

  function formatDate(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat("da-DK", { day: "numeric", month: "short", year: "numeric" }).format(date);
  }

  function safeHref(path) {
    const value = String(path || "").trim();
    if (/^javascript:/i.test(value) || /^data:/i.test(value)) return "#";
    return value || "#";
  }

  function fileMeta(file) {
    return [formatSize(file.size), formatDate(file.updated)].filter(Boolean).join(" · ");
  }

  function folderIcon() {
    return "📁";
  }

  function downloadIcon() {
    return "↓";
  }

  function fileGroupMarkup(group) {
    const description = group.description ? `<p class="group-description">${escapeHtml(group.description)}</p>` : "";
    const rows = group.files.map((file) => {
      const meta = fileMeta(file);
      return `<li class="file-row">
        <div class="file-info">
          <span class="file-type" aria-hidden="true">${escapeHtml(typeLabels[file.type] || file.type.toUpperCase().slice(0, 4))}</span>
          <div class="file-text">
            <span class="file-name" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</span>
            ${file.description ? `<p class="file-description">${escapeHtml(file.description)}</p>` : ""}
            ${meta ? `<div class="file-meta">${escapeHtml(meta)}</div>` : ""}
          </div>
        </div>
        <a class="download-button" href="${escapeHtml(safeHref(file.path))}" download aria-label="Hent ${escapeHtml(file.name)}">
          ${downloadIcon()}<span>Hent fil</span>
        </a>
      </li>`;
    }).join("");

    const archive = group.archive ? `<a class="folder-download-button" href="${escapeHtml(safeHref(group.archive.path))}" download aria-label="Hent hele mappen ${escapeHtml(group.name)} som ZIP">
          ${downloadIcon()}<span>Hent mappe (ZIP)</span>
        </a>` : "";
    const archiveSize = group.archive ? formatSize(group.archive.size) : "";
    return `<article class="file-group">
      <header class="group-header">
        <div class="group-title-wrap">
          <span class="folder-icon" aria-hidden="true">${folderIcon()}</span>
          <div><h3>${escapeHtml(group.name)}</h3>${description}</div>
        </div>
        <div class="group-actions">
          ${archive}
          <span class="group-count">${group.files.length} ${group.files.length === 1 ? "fil" : "filer"}${archiveSize ? ` · ZIP ${escapeHtml(archiveSize)}` : ""}</span>
        </div>
      </header>
      <ul class="file-list">${rows}</ul>
    </article>`;
  }

  function allFiles() {
    return state.groups.flatMap((group) => group.files);
  }

  function visibleGroups() {
    const query = state.query.trim().toLocaleLowerCase("da-DK");
    return state.groups.map((group) => {
      if (state.folder !== "all" && group.id !== state.folder) return null;
      const files = group.files.filter((file) => {
        if (!query) return true;
        return [file.name, file.description, file.type, group.name].join(" ").toLocaleLowerCase("da-DK").includes(query);
      });
      return files.length ? { ...group, files } : null;
    }).filter(Boolean);
  }

  function renderFolderOptions() {
    const options = state.groups.map((group) => `<option value="${escapeHtml(group.id)}">${escapeHtml(group.name)}</option>`).join("");
    elements.folder.innerHTML = `<option value="all">Alle mapper</option>${options}`;
    elements.folder.value = state.folder;
  }

  function render() {
    const groups = visibleGroups();
    const total = groups.reduce((sum, group) => sum + group.files.length, 0);
    const totalFiles = allFiles().length;
    elements.groups.innerHTML = groups.map(fileGroupMarkup).join("");
    elements.groups.hidden = groups.length === 0;
    elements.empty.hidden = !state.hasLoaded || groups.length > 0;
    elements.error.hidden = true;
    elements.count.textContent = `${total} ${total === 1 ? "fil" : "filer"}${total !== totalFiles ? ` vist af ${totalFiles}` : ""}`;
  }

  function showError() {
    state.hasLoaded = false;
    elements.groups.innerHTML = "";
    elements.groups.hidden = true;
    elements.empty.hidden = true;
    elements.error.hidden = false;
    elements.count.textContent = "Filoversigten er ikke tilgængelig";
    elements.updated.textContent = "Kunne ikke indlæse oversigt";
  }

  async function loadFiles() {
    elements.error.hidden = true;
    elements.empty.hidden = true;
    elements.groups.hidden = true;
    elements.count.textContent = "Indlæser filer…";
    elements.updated.textContent = "Indlæser oversigt…";
    try {
      const response = await fetch("files.json", { cache: "no-store" });
      if (!response.ok) throw new Error(`Kunne ikke hente files.json (${response.status})`);
      const payload = await response.json();
      state.groups = normalizePayload(payload);
      state.hasLoaded = true;
      state.folder = "all";
      renderFolderOptions();
      render();
      const updated = payload && typeof payload === "object" ? formatDate(payload.updated || payload.lastUpdated) : "";
      elements.updated.textContent = updated ? `Senest opdateret ${updated}` : `${allFiles().length} filer i biblioteket`;
    } catch (error) {
      console.error(error);
      showError();
    }
  }

  elements.search.addEventListener("input", (event) => {
    state.query = event.target.value;
    render();
  });

  elements.folder.addEventListener("change", (event) => {
    state.folder = event.target.value;
    render();
  });

  elements.clear.addEventListener("click", () => {
    state.query = "";
    state.folder = "all";
    elements.search.value = "";
    elements.folder.value = "all";
    render();
    elements.search.focus();
  });

  elements.retry.addEventListener("click", loadFiles);

  document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      elements.search.focus();
      elements.search.select();
    }
  });

  loadFiles();
})();
