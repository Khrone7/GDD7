/* ==============================
   ÉLÉMENTS DOM
================================*/
const sidebar         = document.getElementById("sidebar");
const toggleMenu       = document.getElementById("toggleMenu");
const addTextBtn       = document.getElementById("addText");
const addShapeBtn      = document.getElementById("addShape");
const shapeMenu        = document.getElementById("shapeMenu");
const addImageBtn      = document.getElementById("addImage");
const addChecklistBtn  = document.getElementById("addChecklist");
const selectModeBtn    = document.getElementById("selectMode");
const linkModeBtn      = document.getElementById("linkMode");
const tagModeBtn       = document.getElementById("tagMode");
const undoBtn          = document.getElementById("undoBtn");
const redoBtn          = document.getElementById("redoBtn");
const newPageBtn       = document.getElementById("newPage");
const exportPdfBtn     = document.getElementById("exportPdf");
const toggleDark       = document.getElementById("toggleDark");
const fileInput        = document.getElementById("fileInput");
const pageList         = document.getElementById("pageList");
const viewport         = document.getElementById("viewport");
const canvas           = document.getElementById("canvas");
const linksLayer       = document.getElementById("linksLayer");
const colorPanel       = document.getElementById("colorPanel");
const tagPanel         = document.getElementById("tagPanel");
const tagInput         = document.getElementById("tagInput");
const modeBanner       = document.getElementById("modeBanner");
const modeBannerText   = document.getElementById("modeBannerText");
const modeBannerCancel = document.getElementById("modeBannerCancel");
const selectionBar     = document.getElementById("selectionBar");
const selectionCount   = document.getElementById("selectionCount");
const groupBtn         = document.getElementById("groupBtn");
const addToGroupBtn    = document.getElementById("addToGroupBtn");
const removeFromGroupBtn = document.getElementById("removeFromGroupBtn");
const checklistStylePanel = document.getElementById("checklistStylePanel");
const groupStylePanel  = document.getElementById("groupStylePanel");
const groupRenameBtn   = document.getElementById("groupRename");
const projectScreen    = document.getElementById("projectScreen");
const projectList      = document.getElementById("projectList");
const newProjectBtn    = document.getElementById("newProjectBtn");
const backToProjectsBtn= document.getElementById("backToProjects");
const saveNowBtn       = document.getElementById("saveNowBtn");

/* ==============================
   MULTI-PROJETS — stockage
   Clé "gdd_projects_list" : tableau de { id, name, updatedAt }
   Clé "gdd_project_<id>"  : { pages, order }
================================*/
const PROJECTS_KEY = "gdd_projects_list";

function loadProjectsList() {
  try { return JSON.parse(localStorage.getItem(PROJECTS_KEY) || "[]"); } catch(e) { return []; }
}
function saveProjectsList(list) {
  try { localStorage.setItem(PROJECTS_KEY, JSON.stringify(list)); } catch(e) {}
}
function projectStorageKey(id) { return "gdd_project_" + id; }

let currentProjectId = null;

/* ==============================
   ÉTAT GLOBAL (projet courant)
================================*/
let pages = {};
let pageOrder = [];
let currentPage = null;
let selectedEl  = null;
let elIdCounter = 1;

let activeMode = null; // null | 'select' | 'link' | 'tag'
let multiSelection = new Set();
let linkFirstEl = null;
let tagTargetEl = null;
let checklistStyleTarget = null;
let groupStyleTarget = null;

let undoStack = [];
let redoStack = [];
let suppressHistory = false;

/* ==============================
   HELPER TAP (anti-délai iOS)
================================*/
function tap(el, fn) {
  el.addEventListener("click", fn);
  el.addEventListener("touchstart", e => { e.stopPropagation(); e.preventDefault(); fn(e); }, { passive: false });
}

/* ==============================
   SAUVEGARDE / SÉRIALISATION
================================*/
function savePages() {
  if (!currentProjectId) return;
  try {
    localStorage.setItem(projectStorageKey(currentProjectId), JSON.stringify({ pages, order: pageOrder }));
    touchProjectTimestamp(currentProjectId);
  } catch(e) {}
}

function touchProjectTimestamp(id) {
  const list = loadProjectsList();
  const entry = list.find(p => p.id === id);
  if (entry) { entry.updatedAt = Date.now(); saveProjectsList(list); }
}

/* ==============================
   GESTION DES PROJETS
================================*/
function uidProject() { return "p" + Date.now().toString(36) + Math.random().toString(36).slice(2,6); }

function renderProjectScreen() {
  const list = loadProjectsList().sort((a,b) => (b.updatedAt||0) - (a.updatedAt||0));
  projectList.innerHTML = "";
  if (!list.length) {
    const empty = document.createElement("div");
    empty.id = "projectScreenEmpty";
    empty.textContent = "Aucun projet pour l'instant. Crée le premier !";
    projectList.appendChild(empty);
    return;
  }
  list.forEach(p => {
    const row = document.createElement("div");
    row.className = "project-row";
    const left = document.createElement("div");
    const name = document.createElement("div");
    name.className = "project-row-name";
    name.textContent = p.name;
    const meta = document.createElement("div");
    meta.className = "project-row-meta";
    meta.textContent = p.updatedAt ? "Modifié le " + new Date(p.updatedAt).toLocaleDateString() : "";
    left.appendChild(name); left.appendChild(meta);

    const del = document.createElement("button");
    del.className = "project-row-del";
    del.textContent = "✕";
    tap(del, e => {
      e && e.stopPropagation && e.stopPropagation();
      if (!confirm("Supprimer le projet \"" + p.name + "\" ? Cette action est irréversible.")) return;
      localStorage.removeItem(projectStorageKey(p.id));
      saveProjectsList(loadProjectsList().filter(x => x.id !== p.id));
      renderProjectScreen();
    });

    tap(row, () => openProject(p.id));
    row.appendChild(left);
    row.appendChild(del);
    projectList.appendChild(row);
  });
}

function openProject(id) {
  currentProjectId = id;
  let data = { pages: {}, order: [] };
  try { data = JSON.parse(localStorage.getItem(projectStorageKey(id))) || data; } catch(e) {}
  pages = data.pages || {};
  pageOrder = data.order || [];
  document.body.classList.remove("no-project");
  if (!Object.keys(pages).length) { createPage(); } else { loadPage((pageOrder.length?pageOrder:Object.keys(pages))[0]); }
}

function createNewProject() {
  const name = prompt("Nom du projet :", "Mon jeu");
  if (!name) return;
  const id = uidProject();
  const list = loadProjectsList();
  list.push({ id, name, updatedAt: Date.now() });
  saveProjectsList(list);
  localStorage.setItem(projectStorageKey(id), JSON.stringify({ pages: {}, order: [] }));
  openProject(id);
}

function backToProjectsScreen() {
  currentProjectId = null;
  document.body.classList.add("no-project");
  renderProjectScreen();
}

tap(newProjectBtn, () => createNewProject());
tap(backToProjectsBtn, () => backToProjectsScreen());
tap(saveNowBtn, () => {
  saveCurrentPage(false);
  saveNowBtn.textContent = "✅";
  setTimeout(() => { saveNowBtn.textContent = "💾"; }, 900);
});

function nextElId() { return "el" + (elIdCounter++); }

function serializeCanvas() {
  const items = [...canvas.querySelectorAll(":scope > .node, :scope > .shape-el, :scope > .img-wrapper, :scope > .checklist-el")]
    .map(el => serializeEl(el));
  const links = [...linksLayer.querySelectorAll("g[data-from]")].map(g => ({ from: g.dataset.from, to: g.dataset.to }));
  const groups = [...canvas.querySelectorAll(":scope > .group-frame")].map(g => ({
    id: g.dataset.id, label: g.dataset.label || "Groupe", color: g.dataset.color || "#9b9bdc",
    x: parseFloat(g.style.left)||0, y: parseFloat(g.style.top)||0,
    w: parseFloat(g.style.width)||0, h: parseFloat(g.style.height)||0,
    members: (g.dataset.members||"").split(",").filter(Boolean)
  }));
  return { items, links, groups };
}

function serializeEl(el) {
  const type = el.dataset.type;
  const item = {
    id: el.dataset.id, type,
    x: parseFloat(el.style.left)||0, y: parseFloat(el.style.top)||0,
    tag: el.dataset.tag || "", tagColor: el.dataset.tagColor || ""
  };
  if (type === "text") {
    const clone = el.cloneNode(true);
    clone.querySelector(".el-delete") && clone.querySelector(".el-delete").remove();
    clone.querySelector(".elem-tag")  && clone.querySelector(".elem-tag").remove();
    clone.querySelector(".link-anchor") && clone.querySelector(".link-anchor").remove();
    item.text     = clone.innerHTML;
    item.fontSize = el.dataset.fontSize || "16";
  }
  if (type === "shape") {
    item.shape    = el.dataset.shape;
    item.color    = el.dataset.color || "#E8E8FF";
    item.w        = parseFloat(el.style.width)  || 140;
    item.h        = parseFloat(el.style.height) || 80;
    item.rotation = parseFloat(el.dataset.rotation) || 0;
  }
  if (type === "image") {
    item.src = el.dataset.src || "";
    item.w   = parseFloat(el.style.width)  || 200;
    item.h   = parseFloat(el.style.height) || 200;
  }
  if (type === "checklist") {
    item.title = el.querySelector(".checklist-title")?.value || "Checklist";
    item.bg     = el.dataset.bg || "#fffdf2";
    item.border = el.dataset.border || "#f0e6c0";
    item.checkItems = [...el.querySelectorAll(":scope > .checklist-items > .checklist-item")].map(row => serializeChecklistRow(row));
  }
  return item;
}

function serializeChecklistRow(row) {
  const subRows = row.querySelector(".checklist-sub");
  return {
    text: row.querySelector(".ci-text")?.innerText || "",
    note: row.querySelector(".ci-note")?.innerText || "",
    done: row.querySelector(":scope > input[type=checkbox]")?.checked || false,
    sub: subRows ? [...subRows.querySelectorAll(".checklist-item")].map(r => ({
      text: r.querySelector(".ci-text")?.innerText || "",
      done: r.querySelector("input[type=checkbox]")?.checked || false
    })) : []
  };
}

function saveCurrentPage(pushHistory) {
  if (!currentPage) return;
  const snap = serializeCanvas();
  pages[currentPage] = snap;
  savePages();
  if (pushHistory !== false && !suppressHistory) pushUndo(snap);
  scheduleLinksRedraw();
  scheduleMM();
}

/* ==============================
   UNDO / REDO
================================*/
function pushUndo(snap) {
  undoStack.push(JSON.stringify(snap));
  if (undoStack.length > 50) undoStack.shift();
  redoStack = [];
  updateUndoRedoButtons();
}
function updateUndoRedoButtons() {
  undoBtn.style.opacity = undoStack.length > 1 ? "1" : "0.35";
  redoBtn.style.opacity = redoStack.length > 0 ? "1" : "0.35";
}
function doUndo() {
  if (undoStack.length <= 1) return;
  const current = undoStack.pop();
  redoStack.push(current);
  const prev = undoStack[undoStack.length - 1];
  suppressHistory = true; restoreSnapshot(JSON.parse(prev)); suppressHistory = false;
  updateUndoRedoButtons();
}
function doRedo() {
  if (!redoStack.length) return;
  const snap = redoStack.pop();
  undoStack.push(snap);
  suppressHistory = true; restoreSnapshot(JSON.parse(snap)); suppressHistory = false;
  updateUndoRedoButtons();
}
function restoreSnapshot(snap) {
  canvas.innerHTML = ""; linksLayer.innerHTML = "";
  deselectAll();
  (snap.items||[]).forEach(data => restoreElement(data));
  (snap.groups||[]).forEach(g => restoreGroup(g));
  (snap.links||[]).forEach(l => drawLink(l.from, l.to));
  pages[currentPage] = snap;
  savePages();
  scheduleMM();
}

/* ==============================
   RESTAURATION D'ÉLÉMENTS
================================*/
function restoreElement(data) {
  let el = null;
  if (data.type === "text")      el = createText(data.x, data.y, data.text, data.fontSize, data.id);
  if (data.type === "shape")     el = createShape(data.shape, data.x, data.y, data.color, data.w, data.h, data.rotation, data.id);
  if (data.type === "image" && data.src) el = createImage(data.x, data.y, data.src, data.w, data.h, data.id);
  if (data.type === "checklist") el = createChecklist(data.x, data.y, data.title, data.checkItems, data.id, data.bg, data.border);
  if (el && data.tag) applyTag(el, data.tag, data.tagColor);
  return el;
}

function restoreGroup(g) {
  const frame = document.createElement("div");
  frame.className = "group-frame";
  frame.dataset.id = g.id;
  frame.dataset.label = g.label;
  frame.dataset.color = g.color || "#9b9bdc";
  frame.dataset.members = g.members.join(",");
  frame.style.left = g.x + "px"; frame.style.top = g.y + "px";
  frame.style.width = g.w + "px"; frame.style.height = g.h + "px";
  applyGroupColor(frame, g.color || "#9b9bdc");

  const label = document.createElement("div");
  label.className = "group-label";
  label.textContent = g.label;
  frame.appendChild(label);

  const hResize = document.createElement("div");
  hResize.className = "handle handle-resize";
  hResize.textContent = "↘";
  frame.appendChild(hResize);

  canvas.insertBefore(frame, canvas.firstChild);
  makeGroupInteractive(frame, hResize);
  return frame;
}

function applyGroupColor(frame, color) {
  frame.dataset.color = color;
  frame.style.borderColor = color;
  frame.style.background = color + "0A";
  const label = frame.querySelector(".group-label");
  if (label) { label.style.color = color; label.style.borderColor = color + "55"; }
}

/* ==============================
   PAGES — ordonnées
================================*/
function orderedPages() {
  const keys = Object.keys(pages);
  const ordered = pageOrder.filter(n => keys.includes(n));
  keys.forEach(k => { if (!ordered.includes(k)) ordered.push(k); });
  pageOrder = ordered;
  return ordered;
}

function loadPage(name) {
  currentPage = name;
  canvas.innerHTML = "";
  linksLayer.innerHTML = "";
  deselectAll();
  exitAllModes();
  if (!pages[name]) pages[name] = { items: [], links: [], groups: [] };
  const data = pages[name];
  (data.items||[]).forEach(d => restoreElement(d));
  (data.groups||[]).forEach(g => restoreGroup(g));
  (data.links||[]).forEach(l => drawLink(l.from, l.to));
  refreshPageList();
  savePages();
  undoStack = [JSON.stringify(serializeCanvas())];
  redoStack = [];
  updateUndoRedoButtons();
  scheduleLinksRedraw();
  scheduleMM();
}

function createPage() {
  let n = 1;
  while (pages["Page " + n]) n++;
  const name = "Page " + n;
  pages[name] = { items: [], links: [], groups: [] };
  pageOrder.push(name);
  loadPage(name);
}

/* ==============================
   LISTE DES PAGES
================================*/
let touchDragName = null, touchDragRow = null, touchDragActive = false, touchDragLongTm = null;

function refreshPageList() {
  pageList.innerHTML = "";
  orderedPages().forEach(name => {
    const row = document.createElement("div");
    row.className   = "page-row" + (name === currentPage ? " active" : "");
    row.dataset.page = name;
    row.draggable    = true;

    const grip = document.createElement("span");
    grip.className = "page-drag-handle";
    grip.textContent = "⠿";

    const label = document.createElement("span");
    label.className = "page-label";
    label.textContent = name;

    const renBtn = document.createElement("button");
    renBtn.style.cssText = "background:none;border:none;cursor:pointer;padding:2px 4px;font-size:13px;color:#aaa;flex-shrink:0;touch-action:manipulation;";
    renBtn.textContent = "✎";

    const del = document.createElement("button");
    del.className = "page-del";
    del.textContent = "✕";

    label.addEventListener("click", () => loadPage(name));
    label.addEventListener("touchend", e => { e.preventDefault(); loadPage(name); }, { passive: false });

    const startRename = e => {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      const newName = prompt("Renommer :", name);
      if (!newName || newName === name || pages[newName]) return;
      pages[newName] = pages[name];
      delete pages[name];
      pageOrder = pageOrder.map(n2 => n2 === name ? newName : n2);
      if (currentPage === name) currentPage = newName;
      savePages(); refreshPageList();
    };
    renBtn.addEventListener("click", startRename);
    renBtn.addEventListener("touchend", startRename, { passive: false });

    const doDelete = e => {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      if (orderedPages().length <= 1) return;
      if (!confirm("Supprimer \"" + name + "\" ?")) return;
      delete pages[name];
      pageOrder = pageOrder.filter(n2 => n2 !== name);
      savePages();
      if (currentPage === name) loadPage(orderedPages()[0]);
      else refreshPageList();
    };
    del.addEventListener("click", doDelete);
    del.addEventListener("touchend", doDelete, { passive: false });

    row.addEventListener("dragstart", e => { e.dataTransfer.setData("text/plain", name); setTimeout(()=>row.classList.add("dragging"),0); });
    row.addEventListener("dragend", () => row.classList.remove("dragging"));
    row.addEventListener("dragover", e => { e.preventDefault(); row.classList.add("drag-over"); });
    row.addEventListener("dragleave", () => row.classList.remove("drag-over"));
    row.addEventListener("drop", e => {
      e.preventDefault(); row.classList.remove("drag-over");
      const fromName = e.dataTransfer.getData("text/plain");
      if (!fromName || fromName === name) return;
      const order = orderedPages();
      const fi = order.indexOf(fromName), ti = order.indexOf(name);
      if (fi<0||ti<0) return;
      order.splice(fi,1); order.splice(ti,0,fromName);
      pageOrder = order; savePages(); refreshPageList();
    });

    grip.addEventListener("touchstart", e => {
      e.stopPropagation();
      touchDragLongTm = setTimeout(() => {
        touchDragName = name; touchDragRow = row; touchDragActive = true;
        row.classList.add("dragging");
        if (navigator.vibrate) navigator.vibrate(40);
      }, 300);
    }, { passive: true });
    grip.addEventListener("touchmove", e => {
      if (!touchDragActive) { clearTimeout(touchDragLongTm); return; }
      e.stopPropagation();
      const touch = e.touches[0];
      const els = document.elementsFromPoint(touch.clientX, touch.clientY);
      const target = els.find(el => el.classList && el.classList.contains("page-row") && el !== touchDragRow);
      if (target) {
        const tName = target.dataset.page;
        const order = orderedPages();
        const fi = order.indexOf(touchDragName), ti = order.indexOf(tName);
        if (fi>=0 && ti>=0 && fi!==ti) {
          order.splice(fi,1); order.splice(ti,0,touchDragName);
          pageOrder = [...order]; savePages(); refreshPageList();
          touchDragRow = pageList.querySelector('[data-page="'+touchDragName+'"]');
          if (touchDragRow) touchDragRow.classList.add("dragging");
        }
      }
    }, { passive: false });
    grip.addEventListener("touchend", () => {
      clearTimeout(touchDragLongTm);
      if (touchDragActive) { touchDragActive=false; touchDragName=null; touchDragRow=null; refreshPageList(); }
    }, { passive: true });

    row.appendChild(grip);
    row.appendChild(label);
    row.appendChild(renBtn);
    row.appendChild(del);
    pageList.appendChild(row);
  });
}

/* ==============================
   SIDEBAR TOGGLE
================================*/
tap(toggleMenu, () => {
  sidebar.classList.toggle("expanded");
  document.body.classList.toggle("sidebar-expanded");
  scheduleMM();
});
const sidebarOverlay = document.getElementById("sidebarOverlay");
tap(sidebarOverlay, () => {
  sidebar.classList.remove("expanded");
  document.body.classList.remove("sidebar-expanded");
});

/* ==============================
   CANVAS — PAN + PINCH + DOUBLE TAP
================================*/
let offsetX = -24000, offsetY = -24000, scale = 1;
let isPanning = false, panSX = 0, panSY = 0;
let lastPinchDist = 0, touchWasPinch = false, lastBgTap = 0;

function updateTransform() {
  canvas.style.transform = "translate("+offsetX+"px,"+offsetY+"px) scale("+scale+")";
  linksLayer.style.transform = canvas.style.transform;
  scheduleMM();
}

viewport.addEventListener("touchstart", e => {
  if (e.touches.length === 2) {
    touchWasPinch = true; isPanning = false;
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    lastPinchDist = Math.sqrt(dx*dx+dy*dy);
  } else if (e.touches.length === 1) {
    isPanning = true;
    panSX = e.touches[0].clientX - offsetX;
    panSY = e.touches[0].clientY - offsetY;
  }
}, { passive: true });

viewport.addEventListener("touchmove", e => {
  e.preventDefault();
  if (e.touches.length === 1 && isPanning && !touchWasPinch) {
    offsetX = e.touches[0].clientX - panSX;
    offsetY = e.touches[0].clientY - panSY;
    updateTransform();
  }
  if (e.touches.length === 2) {
    touchWasPinch = true;
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    const dist = Math.sqrt(dx*dx+dy*dy);
    if (lastPinchDist !== 0) {
      const rect = viewport.getBoundingClientRect();
      // midX/midY doivent être relatifs au viewport (pas à l'écran entier),
      // sinon le pivot du zoom est décalé de la largeur de la sidebar et le zoom dérive vers le centre.
      const midX = (e.touches[0].clientX + e.touches[1].clientX)/2 - rect.left;
      const midY = (e.touches[0].clientY + e.touches[1].clientY)/2 - rect.top;
      const wX=(midX-offsetX)/scale, wY=(midY-offsetY)/scale;
      scale = Math.min(3, Math.max(0.2, scale*(dist/lastPinchDist)));
      offsetX = midX - wX*scale; offsetY = midY - wY*scale;
      updateTransform();
    }
    lastPinchDist = dist;
  }
}, { passive: false });

viewport.addEventListener("touchend", e => {
  isPanning = false;
  if (e.touches.length === 0) {
    if (!touchWasPinch && (e.target === viewport || e.target === canvas)) {
      const now = Date.now();
      if (now - lastBgTap < 300) recenterOnContent();
      else handleBackgroundTap();
      lastBgTap = now;
    }
    lastPinchDist = 0;
    setTimeout(() => { touchWasPinch = false; }, 100);
  }
});

function recenterOnContent() {
  const items = [...canvas.querySelectorAll(".node,.shape-el,.img-wrapper,.checklist-el,.group-frame")];
  if (!items.length) { offsetX=-24000; offsetY=-24000; scale=1; updateTransform(); return; }
  let mnX=Infinity,mnY=Infinity,mxX=-Infinity,mxY=-Infinity;
  items.forEach(el => {
    const x=parseFloat(el.style.left)||0, y=parseFloat(el.style.top)||0;
    const w=parseFloat(el.style.width)||el.offsetWidth||150, h=parseFloat(el.style.height)||el.offsetHeight||80;
    if(x<mnX)mnX=x; if(y<mnY)mnY=y; if(x+w>mxX)mxX=x+w; if(y+h>mxY)mxY=y+h;
  });
  const cW=mxX-mnX, cH=mxY-mnY, vw=viewport.clientWidth, vh=viewport.clientHeight, pad=60;
  scale = Math.min(3, Math.max(0.2, Math.min((vw-pad*2)/cW, (vh-pad*2)/cH)));
  offsetX = vw/2-(mnX+cW/2)*scale; offsetY = vh/2-(mnY+cH/2)*scale;
  updateTransform();
}

function viewCenter() {
  return { x:(viewport.clientWidth/2-offsetX)/scale, y:(viewport.clientHeight/2-offsetY)/scale };
}

function handleBackgroundTap() {
  if (activeMode === "link" && linkFirstEl) { linkFirstEl.classList.remove("selected"); linkFirstEl = null; updateModeBanner(); return; }
  deselectAll();
  hideColorPanel(); hideTagPanel(); hideChecklistStylePanel(); hideGroupStylePanel(); hideLayerBtn();
}

/* ==============================
   MODES (select / link / tag)
================================*/
function setMode(mode) {
  if (activeMode === mode) { exitAllModes(); return; }
  exitAllModes(false);
  activeMode = mode;
  document.body.classList.toggle("mode-link", mode === "link");
  [selectModeBtn, linkModeBtn, tagModeBtn].forEach(b => b.classList.remove("active-mode"));
  if (mode === "select") selectModeBtn.classList.add("active-mode");
  if (mode === "link")   linkModeBtn.classList.add("active-mode");
  if (mode === "tag")    tagModeBtn.classList.add("active-mode");
  updateModeBanner();
}
function exitAllModes(updateUI) {
  activeMode = null;
  linkFirstEl = null;
  document.body.classList.remove("mode-link");
  [selectModeBtn, linkModeBtn, tagModeBtn].forEach(b => b.classList.remove("active-mode"));
  clearMultiSelection();
  if (updateUI !== false) updateModeBanner();
}
function updateModeBanner() {
  if (activeMode === "select") {
    modeBannerText.textContent = "Sélectionne les éléments";
    modeBanner.classList.add("visible");
  } else if (activeMode === "link") {
    modeBannerText.textContent = linkFirstEl ? "Tape le 2ᵉ élément à relier" : "Tape un premier élément";
    modeBanner.classList.add("visible");
  } else if (activeMode === "tag") {
    modeBannerText.textContent = "Tape un élément pour l'étiqueter";
    modeBanner.classList.add("visible");
  } else {
    modeBanner.classList.remove("visible");
  }
  updateSelectionBar();
}
tap(selectModeBtn, () => setMode("select"));
tap(linkModeBtn,   () => setMode("link"));
tap(tagModeBtn,    () => setMode("tag"));
tap(modeBannerCancel, () => exitAllModes());

/* ==============================
   SÉLECTION MULTIPLE + GROUPES
================================*/
function toggleMultiSelect(el) {
  const id = el.dataset.id;
  if (multiSelection.has(id)) { multiSelection.delete(id); el.classList.remove("multi-selected"); }
  else { multiSelection.add(id); el.classList.add("multi-selected"); }
  updateSelectionBar();
}
function clearMultiSelection() {
  multiSelection.forEach(id => {
    const el = canvas.querySelector('[data-id="'+id+'"]');
    if (el) el.classList.remove("multi-selected");
  });
  multiSelection.clear();
  updateSelectionBar();
}
function selectedIsSingleGroup() {
  if (multiSelection.size !== 1) return null;
  const id = [...multiSelection][0];
  const g = canvas.querySelector('.group-frame[data-id="'+id+'"]');
  return g || null;
}
function updateSelectionBar() {
  if (activeMode === "select" && multiSelection.size > 0) {
    selectionCount.textContent = multiSelection.size + " sélectionné(s)";
    selectionBar.classList.add("visible");
    const soloGroup = selectedIsSingleGroup();
    groupBtn.style.display = multiSelection.size >= 2 ? "inline-block" : "none";
    addToGroupBtn.style.display = (multiSelection.size >= 2 && existingGroupAmongSelection()) ? "inline-block" : "none";
    removeFromGroupBtn.style.display = soloGroup ? "none" : (memberOfAnyGroup() ? "inline-block" : "none");
  } else {
    selectionBar.classList.remove("visible");
  }
}
function existingGroupAmongSelection() {
  return [...multiSelection].some(id => canvas.querySelector('.group-frame[data-id="'+id+'"]'));
}
function memberOfAnyGroup() {
  return [...multiSelection].some(id => canvas.querySelector('.group-frame[data-members*="'+id+'"]'));
}

tap(groupBtn, () => {
  if (multiSelection.size < 2) return;
  // Si une sélection contient déjà un groupe + d'autres éléments → fusion / ajout
  const groupId = [...multiSelection].find(id => canvas.querySelector('.group-frame[data-id="'+id+'"]'));
  const newMemberIds = [...multiSelection].filter(id => id !== groupId);

  if (groupId) {
    const g = canvas.querySelector('.group-frame[data-id="'+groupId+'"]');
    const members = new Set((g.dataset.members||"").split(",").filter(Boolean));
    newMemberIds.forEach(id => members.add(id));
    g.dataset.members = [...members].join(",");
    resizeGroupToMembers(g);
  } else {
    const ids = [...multiSelection];
    const els = ids.map(id => canvas.querySelector('[data-id="'+id+'"]')).filter(Boolean);
    if (els.length < 2) return;
    let mnX=Infinity,mnY=Infinity,mxX=-Infinity,mxY=-Infinity;
    els.forEach(el => {
      const x=parseFloat(el.style.left)||0, y=parseFloat(el.style.top)||0;
      const w=parseFloat(el.style.width)||el.offsetWidth||140, h=parseFloat(el.style.height)||el.offsetHeight||80;
      if(x-12<mnX)mnX=x-12; if(y-28<mnY)mnY=y-28; if(x+w+12>mxX)mxX=x+w+12; if(y+h+12>mxY)mxY=y+h+12;
    });
    const label = prompt("Nom du groupe :", "Groupe") || "Groupe";
    restoreGroup({ id: "grp"+nextElId(), label, color:"#9b9bdc", x:mnX, y:mnY, w:mxX-mnX, h:mxY-mnY, members: ids });
  }
  clearMultiSelection();
  exitAllModes();
  saveCurrentPage();
});

tap(addToGroupBtn, () => {
  const groupId = [...multiSelection].find(id => canvas.querySelector('.group-frame[data-id="'+id+'"]'));
  if (!groupId) return;
  const g = canvas.querySelector('.group-frame[data-id="'+groupId+'"]');
  const members = new Set((g.dataset.members||"").split(",").filter(Boolean));
  [...multiSelection].filter(id => id !== groupId).forEach(id => members.add(id));
  g.dataset.members = [...members].join(",");
  resizeGroupToMembers(g);
  clearMultiSelection(); exitAllModes(); saveCurrentPage();
});

tap(removeFromGroupBtn, () => {
  [...multiSelection].forEach(id => {
    canvas.querySelectorAll(".group-frame").forEach(g => {
      const members = (g.dataset.members||"").split(",").filter(Boolean).filter(m => m !== id);
      g.dataset.members = members.join(",");
      if (members.length) resizeGroupToMembers(g);
    });
  });
  // supprimer les groupes vides
  canvas.querySelectorAll(".group-frame").forEach(g => { if (!(g.dataset.members||"").trim()) g.remove(); });
  clearMultiSelection(); exitAllModes(); saveCurrentPage();
});

function resizeGroupToMembers(g) {
  const members = (g.dataset.members||"").split(",").filter(Boolean);
  let mnX=Infinity,mnY=Infinity,mxX=-Infinity,mxY=-Infinity;
  members.forEach(id => {
    const el = canvas.querySelector('[data-id="'+id+'"]');
    if (!el) return;
    const x=parseFloat(el.style.left)||0, y=parseFloat(el.style.top)||0;
    const w=parseFloat(el.style.width)||el.offsetWidth||140, h=parseFloat(el.style.height)||el.offsetHeight||80;
    if(x-12<mnX)mnX=x-12; if(y-28<mnY)mnY=y-28; if(x+w+12>mxX)mxX=x+w+12; if(y+h+12>mxY)mxY=y+h+12;
  });
  if (mnX === Infinity) return;
  g.style.left = mnX+"px"; g.style.top = mnY+"px";
  g.style.width = (mxX-mnX)+"px"; g.style.height = (mxY-mnY)+"px";
}

/* ==============================
   GROUPE — drag, resize manuel, style, renommage
================================*/
function makeGroupInteractive(frame, hResize) {
  let active=false, sx=0, sy=0, ex=0, ey=0;
  let resizing=false, rsx=0, rsy=0, rw0=0, rh0=0;
  let longTm=null;

  frame.addEventListener("touchstart", e => {
    if (e.target === hResize) return; // géré séparément
    if (e.target.classList.contains("group-label")) {
      e.stopPropagation();
      longTm = setTimeout(() => openGroupStylePanel(frame), 450);
      return;
    }
    if (activeMode === "select") { e.stopPropagation(); e.preventDefault(); toggleGroupMultiSelect(frame); return; }
    if (e.touches.length !== 1) return;
    active = true;
    sx = e.touches[0].clientX; sy = e.touches[0].clientY;
    ex = parseFloat(frame.style.left)||0; ey = parseFloat(frame.style.top)||0;
    const members = (frame.dataset.members||"").split(",").filter(Boolean);
    members.forEach(id => {
      const el = canvas.querySelector('[data-id="'+id+'"]');
      if (el) el._groupBase = { x: parseFloat(el.style.left)||0, y: parseFloat(el.style.top)||0 };
    });
    e.stopPropagation();
  }, { passive: false });

  frame.addEventListener("touchmove", e => {
    clearTimeout(longTm);
    if (!active || e.touches.length !== 1) return;
    const dx = (e.touches[0].clientX-sx)/scale, dy = (e.touches[0].clientY-sy)/scale;
    frame.style.left = (ex+dx)+"px"; frame.style.top = (ey+dy)+"px";
    const members = (frame.dataset.members||"").split(",").filter(Boolean);
    members.forEach(id => {
      const el = canvas.querySelector('[data-id="'+id+'"]');
      if (el && el._groupBase) {
        el.style.left = (el._groupBase.x + dx) + "px";
        el.style.top  = (el._groupBase.y + dy) + "px";
      }
    });
    scheduleLinksRedraw();
    e.stopPropagation();
  }, { passive: true });

  frame.addEventListener("touchend", () => { clearTimeout(longTm); if(active){active=false; saveCurrentPage();} });

  // Resize manuel via la poignée
  hResize.addEventListener("touchstart", e => {
    resizing = true;
    rsx=e.touches[0].clientX; rsy=e.touches[0].clientY;
    rw0=parseFloat(frame.style.width)||100; rh0=parseFloat(frame.style.height)||100;
    e.stopPropagation(); e.preventDefault();
  }, { passive:false });
  hResize.addEventListener("touchmove", e => {
    if (!resizing) return;
    const nw = Math.max(60, rw0+(e.touches[0].clientX-rsx)/scale);
    const nh = Math.max(50, rh0+(e.touches[0].clientY-rsy)/scale);
    frame.style.width = nw+"px"; frame.style.height = nh+"px";
    e.stopPropagation(); e.preventDefault();
  }, { passive:false });
  hResize.addEventListener("touchend", () => { resizing=false; saveCurrentPage(); });

  // Tap rapide sur le label = ouvrir panneau style (sans le délai du long press si tap court)
  let lastLabelTap = 0;
  const label = frame.querySelector(".group-label");
  if (label) {
    label.addEventListener("touchend", e => {
      const now = Date.now();
      if (now - lastLabelTap < 350) { e.stopPropagation(); openGroupStylePanel(frame); }
      lastLabelTap = now;
    });
  }
}

function toggleGroupMultiSelect(frame) {
  const id = frame.dataset.id;
  if (multiSelection.has(id)) { multiSelection.delete(id); frame.classList.remove("multi-selected"); }
  else { multiSelection.add(id); frame.classList.add("multi-selected"); }
  updateSelectionBar();
}

function openGroupStylePanel(frame) {
  groupStyleTarget = frame;
  document.querySelectorAll(".grp-color").forEach(sw => sw.classList.toggle("grp-selected", sw.dataset.color === frame.dataset.color));
  const rect = frame.getBoundingClientRect();
  groupStylePanel.style.top  = Math.min(window.innerHeight - 160, Math.max(8, rect.top)) + "px";
  groupStylePanel.style.left = Math.max(58, Math.min(window.innerWidth - 230, rect.right + 10)) + "px";
  groupStylePanel.classList.add("open");
}
function hideGroupStylePanel() { groupStylePanel.classList.remove("open"); groupStyleTarget = null; }

document.querySelectorAll(".grp-color").forEach(sw => {
  tap(sw, () => {
    if (!groupStyleTarget) return;
    document.querySelectorAll(".grp-color").forEach(s2 => s2.classList.remove("grp-selected"));
    sw.classList.add("grp-selected");
    applyGroupColor(groupStyleTarget, sw.dataset.color);
    saveCurrentPage();
  });
});
tap(groupRenameBtn, () => {
  if (!groupStyleTarget) return;
  const newLabel = prompt("Nom du groupe :", groupStyleTarget.dataset.label);
  if (newLabel) {
    groupStyleTarget.dataset.label = newLabel;
    const label = groupStyleTarget.querySelector(".group-label");
    if (label) label.textContent = newLabel;
    saveCurrentPage();
  }
});
tap(document.getElementById("groupStyleDone"), () => hideGroupStylePanel());

/* ==============================
   DRAG GÉNÉRIQUE (éléments simples)
================================*/
function makeDraggable(el) {
  let active=false, sx=0, sy=0, ex=0, ey=0, moved=false;

  el.addEventListener("touchstart", e => {
    if (e.target.classList.contains("handle") || e.target.classList.contains("el-delete") ||
        e.target.classList.contains("link-anchor") || e.target.classList.contains("elem-tag") ||
        e.target.closest(".checklist-items") || e.target.classList.contains("checklist-palette-btn")) {
      // laisser les sous-interactions de la checklist gérer leur propre tap
      if (activeMode === "select" && !e.target.closest(".checklist-items")) { e.stopPropagation(); e.preventDefault(); toggleMultiSelect(el); }
      return;
    }

    if (activeMode === "select") { e.stopPropagation(); e.preventDefault(); toggleMultiSelect(el); return; }
    if (activeMode === "link")   { e.stopPropagation(); e.preventDefault(); handleLinkTap(el); return; }
    if (activeMode === "tag")    { e.stopPropagation(); e.preventDefault(); openTagPanel(el); return; }

    if (e.touches.length !== 1) return;
    active = true; moved = false;
    sx = e.touches[0].clientX; sy = e.touches[0].clientY;
    ex = parseFloat(el.style.left)||0; ey = parseFloat(el.style.top)||0;
    e.stopPropagation();
  }, { passive: false });

  el.addEventListener("touchmove", e => {
    if (!active || e.touches.length !== 1) return;
    moved = true;
    el.style.left = (ex+(e.touches[0].clientX-sx)/scale)+"px";
    el.style.top  = (ey+(e.touches[0].clientY-sy)/scale)+"px";
    if (layerTarget === el) positionLayerBtn(el);
    scheduleLinksRedraw();
    e.stopPropagation();
  }, { passive: true });

  el.addEventListener("touchend", () => {
    if (active && !moved) {
      if (el.dataset.type === "shape") selectShape(el);
      showLayerBtn(el);
    }
    active = false;
    if (moved) { saveCurrentPage(); if (layerTarget === el) positionLayerBtn(el); }
  });
}

/* ==============================
   ÉTIQUETTE
================================*/
function applyTag(el, text, color) {
  let tagEl = el.querySelector(".elem-tag");
  if (!text) { if (tagEl) tagEl.remove(); el.dataset.tag=""; el.dataset.tagColor=""; return; }
  if (!tagEl) { tagEl = document.createElement("div"); tagEl.className = "elem-tag"; el.appendChild(tagEl); }
  tagEl.textContent = text;
  tagEl.style.background = color || "#888888";
  el.dataset.tag = text;
  el.dataset.tagColor = color || "#888888";
}
function openTagPanel(el) {
  tagTargetEl = el;
  tagInput.value = el.dataset.tag || "";
  document.querySelectorAll(".tag-color").forEach(sw => sw.classList.toggle("tag-selected", sw.dataset.color === el.dataset.tagColor));
  const rect = el.getBoundingClientRect();
  tagPanel.style.top  = Math.min(window.innerHeight - 160, rect.bottom + 10) + "px";
  tagPanel.style.left = Math.max(58, Math.min(window.innerWidth - 230, rect.left)) + "px";
  tagPanel.classList.add("open");
  tagInput.focus();
}
function hideTagPanel() { tagPanel.classList.remove("open"); tagTargetEl = null; }

document.querySelectorAll(".tag-color").forEach(sw => {
  tap(sw, () => {
    document.querySelectorAll(".tag-color").forEach(s2 => s2.classList.remove("tag-selected"));
    sw.classList.add("tag-selected");
    if (tagTargetEl) applyTag(tagTargetEl, tagInput.value || tagTargetEl.dataset.tag || "Étiquette", sw.dataset.color);
  });
});
tagInput.addEventListener("input", () => { if (tagTargetEl && tagTargetEl.dataset.tagColor) applyTag(tagTargetEl, tagInput.value, tagTargetEl.dataset.tagColor); });
tap(document.getElementById("tagRemove"), () => { if (tagTargetEl) applyTag(tagTargetEl, "", ""); hideTagPanel(); exitAllModes(); saveCurrentPage(); });
tap(document.getElementById("tagDone"), () => {
  if (tagTargetEl && tagInput.value.trim()) applyTag(tagTargetEl, tagInput.value.trim(), tagTargetEl.dataset.tagColor || "#888888");
  hideTagPanel(); exitAllModes(); saveCurrentPage();
});

/* ==============================
   CONNECTEURS
================================*/
function ensureAnchor(el) {
  if (el.querySelector(".link-anchor")) return;
  const a = document.createElement("div");
  a.className = "link-anchor";
  el.appendChild(a);
}
function handleLinkTap(el) {
  if (!linkFirstEl) { linkFirstEl = el; el.classList.add("selected"); updateModeBanner(); return; }
  if (linkFirstEl === el) { el.classList.remove("selected"); linkFirstEl = null; updateModeBanner(); return; }
  drawLink(linkFirstEl.dataset.id, el.dataset.id);
  linkFirstEl.classList.remove("selected");
  linkFirstEl = null;
  updateModeBanner();
  saveCurrentPage();
}
function elRect(el) {
  return {
    x: parseFloat(el.style.left)||0,
    y: parseFloat(el.style.top)||0,
    w: parseFloat(el.style.width)||el.offsetWidth||100,
    h: parseFloat(el.style.height)||el.offsetHeight||40
  };
}
function elCenter(el) {
  const r = elRect(el);
  return { x: r.x + r.w/2, y: r.y + r.h/2 };
}
// Point d'intersection entre le segment [centre -> versPoint] et le bord du rectangle de el.
// Permet à la ligne de partir/arriver sur le contour de la forme plutôt que sur son centre.
function edgePoint(el, towardX, towardY) {
  const r = elRect(el);
  const cx = r.x + r.w/2, cy = r.y + r.h/2;
  const dx = towardX - cx, dy = towardY - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };
  const halfW = r.w/2, halfH = r.h/2;
  // Facteur d'échelle pour atteindre le bord vertical ou horizontal du rectangle, le plus petit l'emporte
  const scaleX = halfW / Math.abs(dx || 1e-6);
  const scaleY = halfH / Math.abs(dy || 1e-6);
  const t = Math.min(scaleX, scaleY);
  return { x: cx + dx*t, y: cy + dy*t };
}
function drawLink(fromId, toId) {
  const fromEl = canvas.querySelector('[data-id="'+fromId+'"]');
  const toEl   = canvas.querySelector('[data-id="'+toId+'"]');
  if (!fromEl || !toEl) return;
  const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
  group.dataset.from = fromId; group.dataset.to = toId;

  const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
  line.setAttribute("stroke", "#9b9bdc");
  line.setAttribute("stroke-width", "2.5");

  const head = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
  head.setAttribute("fill", "#9b9bdc");

  group.appendChild(line);
  group.appendChild(head);
  linksLayer.appendChild(group);
  updateLinkLine(group);
}
function updateLinkLine(group) {
  const fromEl = canvas.querySelector('[data-id="'+group.dataset.from+'"]');
  const toEl   = canvas.querySelector('[data-id="'+group.dataset.to+'"]');
  if (!fromEl || !toEl) { group.remove(); return; }

  const c1 = elCenter(fromEl), c2 = elCenter(toEl);
  // Bord de départ : vers le centre de l'élément d'arrivée
  const p1 = edgePoint(fromEl, c2.x, c2.y);
  // Bord d'arrivée : vers le centre de l'élément de départ (donc côté tourné vers la source)
  const p2 = edgePoint(toEl, c1.x, c1.y);

  const line = group.querySelector("line");
  line.setAttribute("x1", p1.x); line.setAttribute("y1", p1.y);
  line.setAttribute("x2", p2.x); line.setAttribute("y2", p2.y);

  // Pointe de flèche orientée selon la direction d'arrivée réelle (p1 -> p2)
  const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
  const headLen = 11, headWidth = 7;
  const bx = p2.x - Math.cos(angle)*headLen, by = p2.y - Math.sin(angle)*headLen;
  const leftX  = bx + Math.cos(angle + Math.PI/2)*headWidth;
  const leftY  = by + Math.sin(angle + Math.PI/2)*headWidth;
  const rightX = bx + Math.cos(angle - Math.PI/2)*headWidth;
  const rightY = by + Math.sin(angle - Math.PI/2)*headWidth;
  const head = group.querySelector("polygon");
  head.setAttribute("points", p2.x+","+p2.y+" "+leftX+","+leftY+" "+rightX+","+rightY);
}
let linksRaf = null;
function scheduleLinksRedraw() {
  if (linksRaf) return;
  linksRaf = requestAnimationFrame(() => { linksRaf = null; linksLayer.querySelectorAll("g[data-from]").forEach(updateLinkLine); });
}

/* ==============================
   SUPPRIMER UN ÉLÉMENT
================================*/
function addDeleteButton(wrapper) {
  const btn = document.createElement("button");
  btn.className = "el-delete";
  btn.textContent = "✕";
  tap(btn, e => {
    e && e.stopPropagation && e.stopPropagation();
    const id = wrapper.dataset.id;
    linksLayer.querySelectorAll('g[data-from="'+id+'"], g[data-to="'+id+'"]').forEach(l => l.remove());
    if (layerTarget === wrapper) hideLayerBtn();
    canvas.querySelectorAll(".group-frame").forEach(g => {
      const members = (g.dataset.members||"").split(",").filter(Boolean).filter(m => m !== id);
      g.dataset.members = members.join(",");
      if (!members.length) g.remove();
    });
    if (wrapper === selectedEl) { selectedEl=null; hideColorPanel(); }
    multiSelection.delete(id);
    wrapper.remove();
    saveCurrentPage();
  });
  wrapper.appendChild(btn);
}

function deselectAll() {
  if (selectedEl) { selectedEl.classList.remove("selected"); selectedEl = null; }
  hideColorPanel();
}

/* ==============================
   CALQUES — bouton flottant monter/descendre
================================*/
const layerBtn = document.createElement("div");
layerBtn.id = "layerBtn";
layerBtn.innerHTML = `
  <button id="layerUp" title="Passer au-dessus">↑</button>
  <button id="layerDown" title="Passer en-dessous">↓</button>
`;
document.body.appendChild(layerBtn);
let layerTarget = null;

function showLayerBtn(el) {
  layerTarget = el;
  positionLayerBtn(el);
  layerBtn.classList.add("visible");
}
function hideLayerBtn() { layerBtn.classList.remove("visible"); layerTarget = null; }
function positionLayerBtn(el) {
  const rect = el.getBoundingClientRect();
  let left = rect.left - 42;
  if (left < 58) left = rect.right + 6;
  let top = rect.top + rect.height/2 - 30;
  if (top < 8) top = 8;
  if (top + 62 > window.innerHeight) top = window.innerHeight - 70;
  layerBtn.style.left = left + "px";
  layerBtn.style.top  = top + "px";
}
function layerMove(el, dir) {
  if (!el || !el.parentNode) return;
  if (dir > 0) { const next = el.nextElementSibling; if (next) el.parentNode.insertBefore(next, el); }
  else { const prev = el.previousElementSibling; if (prev) el.parentNode.insertBefore(el, prev); }
  saveCurrentPage();
  scheduleMM();
  if (layerTarget) positionLayerBtn(layerTarget);
}
tap(document.getElementById("layerUp"),   () => layerMove(layerTarget, +1));
tap(document.getElementById("layerDown"), () => layerMove(layerTarget, -1));

/* ==============================
   BARRE DE FORMATAGE TEXTE
================================*/
const textToolbar = document.createElement("div");
textToolbar.id = "textToolbar";
textToolbar.innerHTML = `
  <button data-cmd="bold" title="Gras"><b>G</b></button>
  <button data-cmd="italic" title="Italique"><i>I</i></button>
  <button data-cmd="underline" title="Souligné"><u>S</u></button>
  <div class="tb-sep"></div>
  <button data-cmd="fontSize-" title="Réduire">A-</button>
  <span id="tbFontSize">16</span>
  <button data-cmd="fontSize+" title="Agrandir">A+</button>
  <div class="tb-sep"></div>
  <button data-cmd="justifyLeft" title="Gauche">⬅</button>
  <button data-cmd="justifyCenter" title="Centre">↔</button>
  <button data-cmd="justifyRight" title="Droite">➡</button>
  <div class="tb-sep"></div>
  <button data-cmd="color-#1a1a1a" style="background:#1a1a1a" class="tb-color" title="Noir"></button>
  <button data-cmd="color-#E74C3C" style="background:#E74C3C" class="tb-color" title="Rouge"></button>
  <button data-cmd="color-#4A90D9" style="background:#4A90D9" class="tb-color" title="Bleu"></button>
  <button data-cmd="color-#2ECC71" style="background:#2ECC71" class="tb-color" title="Vert"></button>
  <button data-cmd="color-#F39C12" style="background:#F39C12" class="tb-color" title="Orange"></button>
  <button data-cmd="color-#9B59B6" style="background:#9B59B6" class="tb-color" title="Violet"></button>
`;
document.body.appendChild(textToolbar);

let activeTextNode = null;

function positionTextToolbar(el) {
  const rect = el.getBoundingClientRect();
  const tbH  = 50;
  let top  = rect.top - tbH - 8;
  if (top < 8) top = rect.bottom + 8;
  let left = rect.left;
  const maxLeft = window.innerWidth - textToolbar.offsetWidth - 8;
  if (left > maxLeft) left = maxLeft;
  if (left < 58) left = 58;
  textToolbar.style.top  = top + "px";
  textToolbar.style.left = left + "px";
}
function showTextToolbar(el) {
  activeTextNode = el;
  textToolbar.classList.add("visible");
  updateToolbarState(el);
  positionTextToolbar(el);
}
function hideTextToolbar() { textToolbar.classList.remove("visible"); activeTextNode = null; }
function updateToolbarState(el) {
  const size = parseInt(el.dataset.fontSize) || 16;
  const fsEl = document.getElementById("tbFontSize");
  if (fsEl) fsEl.textContent = size;
}
textToolbar.addEventListener("mousedown", e => e.preventDefault());
textToolbar.querySelectorAll("button[data-cmd]").forEach(btn => {
  const handler = e => {
    e.preventDefault(); e.stopPropagation();
    if (!activeTextNode) return;
    const cmd = btn.dataset.cmd;
    if (cmd === "bold")        document.execCommand("bold");
    if (cmd === "italic")      document.execCommand("italic");
    if (cmd === "underline")   document.execCommand("underline");
    if (cmd === "justifyLeft")   document.execCommand("justifyLeft");
    if (cmd === "justifyCenter") document.execCommand("justifyCenter");
    if (cmd === "justifyRight")  document.execCommand("justifyRight");
    if (cmd === "fontSize+") {
      const s = Math.min(72, (parseInt(activeTextNode.dataset.fontSize)||16) + 2);
      activeTextNode.style.fontSize = s+"px"; activeTextNode.dataset.fontSize = s; updateToolbarState(activeTextNode);
    }
    if (cmd === "fontSize-") {
      const s = Math.max(8, (parseInt(activeTextNode.dataset.fontSize)||16) - 2);
      activeTextNode.style.fontSize = s+"px"; activeTextNode.dataset.fontSize = s; updateToolbarState(activeTextNode);
    }
    if (cmd.startsWith("color-")) document.execCommand("foreColor", false, cmd.replace("color-",""));
    saveCurrentPage();
  };
  btn.addEventListener("mousedown", handler);
  btn.addEventListener("touchstart", handler, { passive: false });
});

/* ==============================
   TEXTE
================================*/
function createText(x, y, content, fontSize, id) {
  if (content === undefined) content = "Double-tap pour écrire";
  if (!fontSize) fontSize = "16";
  const el = document.createElement("div");
  el.className        = "node";
  el.dataset.type      = "text";
  el.dataset.id        = id || nextElId();
  el.dataset.fontSize  = fontSize;
  el.style.left        = x + "px"; el.style.top = y + "px"; el.style.fontSize = fontSize + "px";
  el.innerHTML          = content;

  const enterEdit = () => { el.contentEditable = "true"; el.focus(); showTextToolbar(el); };

  let lastTap = 0;
  el.addEventListener("touchend", e => {
    if (activeMode) return;
    if (el.contentEditable === "true") return;
    const now = Date.now();
    if (now - lastTap < 350) enterEdit();
    lastTap = now;
  });
  el.addEventListener("dblclick", () => { if(!activeMode) enterEdit(); });
  el.addEventListener("blur", () => {
    el.contentEditable = "false";
    setTimeout(() => { if (document.activeElement !== el) hideTextToolbar(); }, 200);
    saveCurrentPage();
  });
  el.addEventListener("focus", () => { if (el.contentEditable === "true") showTextToolbar(el); });
  el.addEventListener("input", () => { updateToolbarState(el); saveCurrentPage(); });
  el.addEventListener("keyup", () => updateToolbarState(el));

  let pinchDist0=0, pinchSize0=0;
  el.addEventListener("touchstart", e => {
    if (e.touches.length===2 && !activeMode) {
      const dx=e.touches[0].clientX-e.touches[1].clientX, dy=e.touches[0].clientY-e.touches[1].clientY;
      pinchDist0=Math.sqrt(dx*dx+dy*dy); pinchSize0=parseFloat(el.dataset.fontSize)||16;
      e.stopPropagation(); e.preventDefault();
    }
  }, { passive: false });
  el.addEventListener("touchmove", e => {
    if (e.touches.length===2 && pinchDist0>0) {
      const dx=e.touches[0].clientX-e.touches[1].clientX, dy=e.touches[0].clientY-e.touches[1].clientY;
      const s=Math.min(72,Math.max(8,pinchSize0*(Math.sqrt(dx*dx+dy*dy)/pinchDist0)));
      el.style.fontSize=s+"px"; el.dataset.fontSize=Math.round(s); updateToolbarState(el);
      e.stopPropagation(); e.preventDefault();
    }
  }, { passive: false });
  el.addEventListener("touchend", () => { if(pinchDist0>0){pinchDist0=0;saveCurrentPage();} });

  ensureAnchor(el);
  addDeleteButton(el);
  canvas.appendChild(el);
  makeDraggable(el);
  return el;
}

/* ==============================
   FORMES
================================*/
function applyShape(el, shape, color, w, h, rotation) {
  el.style.width=w+"px"; el.style.height=h+"px";
  el.style.background=color; el.style.transform="rotate("+rotation+"deg)";
  el.dataset.color=color; el.dataset.rotation=rotation;
  if (shape==="circle") { el.style.borderRadius="50%"; }
  else if (shape==="triangle") {
    el.style.background="transparent";
    el.style.borderLeft=(w/2)+"px solid transparent";
    el.style.borderRight=(w/2)+"px solid transparent";
    el.style.borderBottom=h+"px solid "+color;
    el.style.borderRadius="0"; el.style.width="0"; el.style.height="0";
  } else if (shape==="diamond") {
    el.style.borderRadius="0"; el.style.transform="rotate("+(rotation+45)+"deg)";
  } else if (shape==="arrow") {
    el.style.background="transparent"; el.style.borderRadius="0";
    const old = el.querySelector("svg"); if (old) old.remove();
    const svg=document.createElementNS("http://www.w3.org/2000/svg","svg");
    svg.setAttribute("width","100%"); svg.setAttribute("height","100%");
    svg.setAttribute("viewBox","0 0 100 40"); svg.setAttribute("preserveAspectRatio","none");
    svg.innerHTML='<line x1="5" y1="20" x2="80" y2="20" stroke="'+color+'" stroke-width="5" stroke-linecap="round"/><polygon points="72,8 100,20 72,32" fill="'+color+'"/>';
    el.insertBefore(svg, el.firstChild);
  } else { el.style.borderRadius="10px"; }
}

function createShape(shape, x, y, color, w, h, rotation, id) {
  if (!color) color="#4A90D9"; if (!w) w=140; if (!h) h=80; if (!rotation) rotation=0;
  const el=document.createElement("div");
  el.className="shape-el"; el.dataset.type="shape"; el.dataset.shape=shape; el.dataset.id = id || nextElId();
  el.style.left=x+"px"; el.style.top=y+"px";
  applyShape(el, shape, color, w, h, rotation);

  const hR=document.createElement("div"); hR.className="handle handle-resize"; hR.textContent="↘";
  let rsx=0,rsy=0,rw0=0,rh0=0;
  hR.addEventListener("touchstart",e=>{rsx=e.touches[0].clientX;rsy=e.touches[0].clientY;rw0=parseFloat(el.style.width)||w;rh0=parseFloat(el.style.height)||h;e.stopPropagation();e.preventDefault();},{passive:false});
  hR.addEventListener("touchmove",e=>{const nw=Math.max(40,rw0+(e.touches[0].clientX-rsx)/scale),nh=Math.max(30,rh0+(e.touches[0].clientY-rsy)/scale);applyShape(el,shape,el.dataset.color||color,nw,nh,parseFloat(el.dataset.rotation)||0);scheduleLinksRedraw();e.stopPropagation();e.preventDefault();},{passive:false});
  hR.addEventListener("touchend",()=>saveCurrentPage());

  const hRot=document.createElement("div"); hRot.className="handle handle-rotate"; hRot.textContent="↺";
  let ra=0,rr=0;
  hRot.addEventListener("touchstart",e=>{const rect=el.getBoundingClientRect(),cx=rect.left+rect.width/2,cy=rect.top+rect.height/2;ra=Math.atan2(e.touches[0].clientY-cy,e.touches[0].clientX-cx)*180/Math.PI;rr=parseFloat(el.dataset.rotation)||0;e.stopPropagation();e.preventDefault();},{passive:false});
  hRot.addEventListener("touchmove",e=>{const rect=el.getBoundingClientRect(),cx=rect.left+rect.width/2,cy=rect.top+rect.height/2;const a=Math.atan2(e.touches[0].clientY-cy,e.touches[0].clientX-cx)*180/Math.PI;applyShape(el,shape,el.dataset.color||color,parseFloat(el.style.width)||w,parseFloat(el.style.height)||h,rr+(a-ra));e.stopPropagation();e.preventDefault();},{passive:false});
  hRot.addEventListener("touchend",()=>saveCurrentPage());

  el.appendChild(hR); el.appendChild(hRot);
  ensureAnchor(el);
  addDeleteButton(el); canvas.appendChild(el); makeDraggable(el);
  return el;
}

function selectShape(el) {
  if (selectedEl) selectedEl.classList.remove("selected");
  selectedEl = el; el.classList.add("selected");
  const rect = el.getBoundingClientRect();
  colorPanel.style.top  = Math.min(window.innerHeight - 120, rect.bottom + 10) + "px";
  colorPanel.style.left = Math.max(58, Math.min(window.innerWidth - 200, rect.left)) + "px";
  colorPanel.classList.add("open");
}
function hideColorPanel() { colorPanel.classList.remove("open"); }

document.querySelectorAll(".color-swatch:not(.tag-color):not(.cl-color):not(.grp-color)").forEach(sw=>{
  tap(sw,()=>{
    if(!selectedEl)return;
    applyShape(selectedEl,selectedEl.dataset.shape,sw.dataset.color,parseFloat(selectedEl.style.width)||140,parseFloat(selectedEl.style.height)||80,parseFloat(selectedEl.dataset.rotation)||0);
    saveCurrentPage();
  });
});

/* ==============================
   IMAGE
================================*/
function createImage(x, y, src, w, h, id) {
  const wrapper=document.createElement("div");
  wrapper.className="img-wrapper"; wrapper.dataset.type="image"; wrapper.dataset.src=src; wrapper.dataset.id = id || nextElId();
  wrapper.style.left=x+"px"; wrapper.style.top=y+"px";
  const img=document.createElement("img"); img.src=src; img.draggable=false;
  if(w){img.style.maxWidth=w+"px"; wrapper.style.width=w+"px";}
  if(h){img.style.maxHeight=h+"px"; wrapper.style.height=h+"px";}
  wrapper.appendChild(img);
  ensureAnchor(wrapper);
  addDeleteButton(wrapper); canvas.appendChild(wrapper); makeDraggable(wrapper);
  return wrapper;
}
// iOS Safari exige un déclenchement synchrone et direct pour input.click().
// Un seul listener "click" suffit : sur mobile, un tap génère aussi un événement
// click natif après le touchend, donc dupliquer sur touchend appelait .click() deux fois
// et la deuxième ouverture annulait silencieusement le résultat de la première.
addImageBtn.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", e => {
  const file=e.target.files&&e.target.files[0]; if(!file)return;
  const reader=new FileReader();
  reader.onload=ev=>{ const c=viewCenter(); createImage(c.x-100,c.y-80,ev.target.result); saveCurrentPage(); };
  reader.readAsDataURL(file); fileInput.value="";
});

/* ==============================
   CHECKLIST — couleur, note, drag, sous-tâches
================================*/
function createChecklist(x, y, title, checkItems, id, bg, border) {
  if (!title) title = "Checklist";
  if (!checkItems) checkItems = [{ text: "Première tâche", done: false, note: "", sub: [] }];
  bg = bg || "#fffdf2"; border = border || "#f0e6c0";

  const el = document.createElement("div");
  el.className = "checklist-el";
  el.dataset.type = "checklist";
  el.dataset.id = id || nextElId();
  el.dataset.bg = bg; el.dataset.border = border;
  el.style.left = x + "px"; el.style.top = y + "px";
  el.style.background = bg; el.style.borderColor = border;

  const titleInput = document.createElement("input");
  titleInput.className = "checklist-title";
  titleInput.value = title;
  titleInput.addEventListener("touchstart", e => e.stopPropagation(), {passive:true});
  titleInput.addEventListener("input", () => saveCurrentPage());
  titleInput.addEventListener("blur", () => saveCurrentPage());

  const paletteBtn = document.createElement("button");
  paletteBtn.className = "checklist-palette-btn";
  tap(paletteBtn, e => { e&&e.stopPropagation&&e.stopPropagation(); openChecklistStylePanel(el); });

  const itemsWrap = document.createElement("div");
  itemsWrap.className = "checklist-items";

  let dragRow = null, dragFromContainer = null;

  function addRow(text, done, note, subItems, container) {
    container = container || itemsWrap;
    const row = document.createElement("div");
    row.className = "checklist-item" + (done ? " done" : "");

    const grip = document.createElement("span");
    grip.className = "ci-grip";
    grip.textContent = "⠿";

    const cb = document.createElement("input");
    cb.type = "checkbox"; cb.checked = !!done;
    cb.addEventListener("touchstart", e => e.stopPropagation(), {passive:true});
    cb.addEventListener("change", () => { row.classList.toggle("done", cb.checked); saveCurrentPage(); });

    const body = document.createElement("div");
    body.className = "ci-body";
    const txt = document.createElement("div");
    txt.className = "ci-text"; txt.contentEditable = "true"; txt.innerText = text || "";
    txt.addEventListener("touchstart", e => e.stopPropagation(), {passive:true});
    txt.addEventListener("input", () => saveCurrentPage());
    txt.addEventListener("blur", () => saveCurrentPage());
    const note_ = document.createElement("div");
    note_.className = "ci-note"; note_.contentEditable = "true"; note_.innerText = note || "";
    note_.addEventListener("touchstart", e => e.stopPropagation(), {passive:true});
    note_.addEventListener("input", () => saveCurrentPage());
    note_.addEventListener("blur", () => saveCurrentPage());
    body.appendChild(txt); body.appendChild(note_);

    // Sous-tâches (1 niveau uniquement)
    let subWrap = null;
    if (container === itemsWrap) {
      subWrap = document.createElement("div");
      subWrap.className = "checklist-sub";
      (subItems||[]).forEach(s => addRow(s.text, s.done, "", null, subWrap));
      body.appendChild(subWrap);
    }

    const actions = document.createElement("div");
    actions.className = "ci-actions";
    const del = document.createElement("button");
    del.className = "ci-del"; del.textContent = "✕";
    tap(del, e => { e&&e.stopPropagation&&e.stopPropagation(); row.remove(); saveCurrentPage(); });
    actions.appendChild(del);

    if (container === itemsWrap) {
      const subAdd = document.createElement("button");
      subAdd.className = "ci-sub-add"; subAdd.textContent = "↳+";
      subAdd.title = "Ajouter une sous-tâche";
      tap(subAdd, e => { e&&e.stopPropagation&&e.stopPropagation(); addRow("", false, "", null, subWrap); saveCurrentPage(); });
      actions.appendChild(subAdd);
    }

    row.appendChild(grip);
    row.appendChild(cb);
    row.appendChild(body);
    row.appendChild(actions);
    container.appendChild(row);

    // Drag pour réordonner (appui long sur la poignée)
    let longTm = null, dragging = false;
    grip.addEventListener("touchstart", e => {
      e.stopPropagation();
      longTm = setTimeout(() => {
        dragging = true; dragRow = row; dragFromContainer = container;
        row.classList.add("dragging-item");
        if (navigator.vibrate) navigator.vibrate(30);
      }, 280);
    }, { passive: true });
    grip.addEventListener("touchmove", e => {
      e.stopPropagation();
      if (!dragging) { clearTimeout(longTm); return; }
      e.preventDefault();
      const touch = e.touches[0];
      const els = document.elementsFromPoint(touch.clientX, touch.clientY);
      const overRow = els.find(x2 => x2.classList && x2.classList.contains("checklist-item") && x2 !== row);
      container.querySelectorAll(".checklist-item").forEach(r => r.classList.remove("drag-over-item"));
      if (overRow && overRow.parentElement === container) {
        overRow.classList.add("drag-over-item");
      }
    }, { passive: false });
    grip.addEventListener("touchend", e => {
      e.stopPropagation();
      clearTimeout(longTm);
      if (dragging) {
        const touch = e.changedTouches[0];
        const els = document.elementsFromPoint(touch.clientX, touch.clientY);
        const overRow = els.find(x2 => x2.classList && x2.classList.contains("checklist-item") && x2 !== row);
        container.querySelectorAll(".checklist-item").forEach(r => r.classList.remove("drag-over-item"));
        if (overRow && overRow.parentElement === container) {
          container.insertBefore(row, overRow);
        }
        row.classList.remove("dragging-item");
        dragging = false; dragRow = null;
        saveCurrentPage();
      }
    });

    return row;
  }

  checkItems.forEach(it => addRow(it.text, it.done, it.note, it.sub));

  const addLine = document.createElement("div");
  addLine.className = "checklist-add";
  addLine.textContent = "+ ajouter une ligne";
  tap(addLine, e => { e&&e.stopPropagation&&e.stopPropagation(); addRow("", false, "", null); saveCurrentPage(); });

  el.appendChild(titleInput);
  el.appendChild(paletteBtn);
  el.appendChild(itemsWrap);
  el.appendChild(addLine);

  ensureAnchor(el);
  addDeleteButton(el);
  canvas.appendChild(el);
  makeDraggable(el);
  return el;
}

function openChecklistStylePanel(el) {
  checklistStyleTarget = el;
  document.querySelectorAll(".cl-color").forEach(sw => sw.classList.toggle("cl-selected", sw.dataset.color === el.dataset.bg));
  const rect = el.getBoundingClientRect();
  checklistStylePanel.style.top  = Math.min(window.innerHeight - 160, rect.bottom + 8) + "px";
  checklistStylePanel.style.left = Math.max(58, Math.min(window.innerWidth - 230, rect.left)) + "px";
  checklistStylePanel.classList.add("open");
}
function hideChecklistStylePanel() { checklistStylePanel.classList.remove("open"); checklistStyleTarget = null; }
document.querySelectorAll(".cl-color").forEach(sw => {
  tap(sw, () => {
    if (!checklistStyleTarget) return;
    document.querySelectorAll(".cl-color").forEach(s2 => s2.classList.remove("cl-selected"));
    sw.classList.add("cl-selected");
    const bg = sw.dataset.color, border = sw.dataset.border;
    checklistStyleTarget.dataset.bg = bg; checklistStyleTarget.dataset.border = border;
    checklistStyleTarget.style.background = bg; checklistStyleTarget.style.borderColor = border;
    saveCurrentPage();
  });
});
tap(document.getElementById("checklistStyleDone"), () => hideChecklistStylePanel());

tap(addChecklistBtn, () => {
  const c = viewCenter();
  createChecklist(c.x - 95, c.y - 40);
  saveCurrentPage();
});

/* ==============================
   SOUS-MENU FORMES
================================*/
let shapeMenuOpen=false;
tap(addShapeBtn, e=>{
  shapeMenuOpen=!shapeMenuOpen;
  shapeMenu.classList.toggle("open",shapeMenuOpen);
  e&&e.stopPropagation&&e.stopPropagation();
});
document.querySelectorAll(".shape-opt").forEach(opt=>{
  tap(opt,e=>{
    e&&e.stopPropagation&&e.stopPropagation();
    const c=viewCenter();
    createShape(opt.dataset.shape,c.x-70,c.y-40);
    shapeMenuOpen=false; shapeMenu.classList.remove("open");
    saveCurrentPage();
  });
});

/* ==============================
   TEXTE / PAGES / DARK / UNDO-REDO
================================*/
tap(addTextBtn, ()=>{ const c=viewCenter(); createText(c.x-80,c.y-20); saveCurrentPage(); });
tap(newPageBtn,  ()=>createPage());
tap(toggleDark,  ()=>{ document.body.classList.toggle("dark"); scheduleMM(); });
tap(undoBtn, () => doUndo());
tap(redoBtn, () => doRedo());

/* ==============================
   MINIMAP
================================*/
const minimapEl = document.createElement("div");
minimapEl.id = "minimap";
const mmCvs = document.createElement("canvas");
mmCvs.width = 260; mmCvs.height = 180;
const mmVP = document.createElement("div");
mmVP.id = "minimapViewport";
minimapEl.appendChild(mmCvs);
minimapEl.appendChild(mmVP);
document.body.appendChild(minimapEl);

const MM_W = 4000, MM_H = 3000;

function getMMOrigin() {
  const cx = -offsetX / scale + viewport.clientWidth  / 2 / scale;
  const cy = -offsetY / scale + viewport.clientHeight / 2 / scale;
  return { x: cx - MM_W / 2, y: cy - MM_H / 2 };
}

function updateMinimap() {
  const ctx = mmCvs.getContext("2d");
  const mw = mmCvs.width, mh = mmCvs.height;
  const dark = document.body.classList.contains("dark");
  ctx.clearRect(0,0,mw,mh);
  ctx.fillStyle = dark ? "#1e1e1e" : "#f5f4f2";
  ctx.fillRect(0,0,mw,mh);

  const origin = getMMOrigin();
  const sx = mw / MM_W, sy = mh / MM_H;

  canvas.querySelectorAll(".group-frame").forEach(g => {
    const wx=(parseFloat(g.style.left)||0)-origin.x, wy=(parseFloat(g.style.top)||0)-origin.y;
    const ww=parseFloat(g.style.width)||100, wh=parseFloat(g.style.height)||60;
    const mx=wx*sx, my=wy*sy, mew=ww*sx, meh=wh*sy;
    ctx.save();
    ctx.strokeStyle = g.dataset.color || "#9b9bdc";
    ctx.setLineDash([3,2]); ctx.lineWidth = 1;
    ctx.strokeRect(mx,my,mew,meh);
    ctx.restore();
  });

  canvas.querySelectorAll(".node,.shape-el,.img-wrapper,.checklist-el").forEach(el => {
    const wx=(parseFloat(el.style.left)||0)-origin.x, wy=(parseFloat(el.style.top)||0)-origin.y;
    const ww=parseFloat(el.style.width)||el.offsetWidth||140, wh=parseFloat(el.style.height)||el.offsetHeight||60;
    const mx=wx*sx, my=wy*sy, mew=Math.max(4,ww*sx), meh=Math.max(3,wh*sy);
    if (mx+mew<0||my+meh<0||mx>mw||my>mh) return;
    const type = el.dataset.type, shape = el.dataset.shape;
    ctx.save();
    if (type === "text") {
      ctx.fillStyle = dark?"#2e2e2e":"#ffffff"; ctx.strokeStyle = dark?"#444":"#e0e0e0"; ctx.lineWidth=1;
      ctx.beginPath(); ctx.roundRect(mx,my,mew,meh,3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = dark?"#666":"#d0d0d0";
      const lh=Math.max(2,meh*0.18), gap=lh*1.7;
      for (let l=0; l*gap+lh<meh-4; l++) { const lw = l===0?mew*0.7:mew*(0.4+Math.random()*0.3); ctx.fillRect(mx+3,my+3+l*gap,Math.min(lw,mew-6),lh); }
    } else if (type === "image") {
      ctx.fillStyle = dark?"#333":"#e0e0e0"; ctx.strokeStyle = dark?"#444":"#ccc"; ctx.lineWidth=1;
      ctx.beginPath(); ctx.roundRect(mx,my,mew,meh,3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = dark?"#555":"#b0b0b0";
      ctx.beginPath(); ctx.arc(mx+mew/2,my+meh/2,Math.min(mew,meh)*0.22,0,Math.PI*2); ctx.fill();
    } else if (type === "checklist") {
      ctx.fillStyle = el.dataset.bg || "#fffdf2"; ctx.strokeStyle = el.dataset.border || "#f0e6c0"; ctx.lineWidth=1;
      ctx.beginPath(); ctx.roundRect(mx,my,mew,meh,3); ctx.fill(); ctx.stroke();
    } else if (type === "shape") {
      ctx.fillStyle = el.dataset.color || "#4A90D9"; ctx.globalAlpha = 0.85;
      if (shape === "circle") { ctx.beginPath(); ctx.ellipse(mx+mew/2,my+meh/2,mew/2,meh/2,0,0,Math.PI*2); ctx.fill(); }
      else if (shape === "arrow") {
        ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = Math.max(1.5, meh*0.15);
        ctx.beginPath(); ctx.moveTo(mx,my+meh/2); ctx.lineTo(mx+mew*0.8,my+meh/2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(mx+mew,my+meh/2); ctx.lineTo(mx+mew*0.7,my+meh*0.15); ctx.lineTo(mx+mew*0.7,my+meh*0.85); ctx.closePath(); ctx.fill();
      } else { ctx.beginPath(); ctx.roundRect(mx,my,mew,meh,2); ctx.fill(); }
    }
    ctx.restore();
  });

  const vpX = (-offsetX/scale - origin.x) * sx;
  const vpY = (-offsetY/scale - origin.y) * sy;
  const vpW = (viewport.clientWidth/scale) * sx;
  const vpH = (viewport.clientHeight/scale) * sy;
  mmVP.style.left   = (vpX/mw*100).toFixed(1)+"%";
  mmVP.style.top    = (vpY/mh*100).toFixed(1)+"%";
  mmVP.style.width  = (vpW/mw*100).toFixed(1)+"%";
  mmVP.style.height = (vpH/mh*100).toFixed(1)+"%";
}

minimapEl.addEventListener("click", e => {
  const r = minimapEl.getBoundingClientRect();
  const org = getMMOrigin();
  const wx = org.x + (e.clientX-r.left)/r.width*MM_W;
  const wy = org.y + (e.clientY-r.top)/r.height*MM_H;
  offsetX = viewport.clientWidth/2 - wx*scale;
  offsetY = viewport.clientHeight/2 - wy*scale;
  updateTransform();
});

let mmRaf = null;
function scheduleMM() {
  if (mmRaf) return;
  mmRaf = requestAnimationFrame(() => { mmRaf = null; updateMinimap(); });
}
new MutationObserver(scheduleMM).observe(canvas, { childList:true, subtree:true, attributes:true, attributeFilter:["style"] });

/* ==============================
   EXPORT PDF
================================*/
tap(exportPdfBtn, async () => {
  if (!window.jspdf) { alert("Le module d'export n'a pas pu se charger (connexion internet ?)."); return; }
  const items = [...canvas.querySelectorAll(".node,.shape-el,.img-wrapper,.checklist-el,.group-frame")];
  if (!items.length) { alert("Cette page est vide."); return; }

  let mnX=Infinity,mnY=Infinity,mxX=-Infinity,mxY=-Infinity;
  items.forEach(el => {
    const x=parseFloat(el.style.left)||0, y=parseFloat(el.style.top)||0;
    const w=parseFloat(el.style.width)||el.offsetWidth||140, h=parseFloat(el.style.height)||el.offsetHeight||80;
    if(x<mnX)mnX=x; if(y<mnY)mnY=y; if(x+w>mxX)mxX=x+w; if(y+h>mxY)mxY=y+h;
  });
  const pad = 40;
  mnX-=pad; mnY-=pad; mxX+=pad; mxY+=pad;
  const contentW = mxX-mnX, contentH = mxY-mnY;

  const scaleExport = 2;
  const exportCanvas = document.createElement("canvas");
  exportCanvas.width = contentW*scaleExport; exportCanvas.height = contentH*scaleExport;
  const ctx = exportCanvas.getContext("2d");
  ctx.scale(scaleExport, scaleExport);
  ctx.fillStyle = document.body.classList.contains("dark") ? "#1e1e1e" : "#ffffff";
  ctx.fillRect(0,0,contentW,contentH);

  ctx.strokeStyle = "#9b9bdc"; ctx.fillStyle = "#9b9bdc"; ctx.lineWidth = 2;
  linksLayer.querySelectorAll("g[data-from] line").forEach(line => {
    const x1=parseFloat(line.getAttribute("x1"))-mnX, y1=parseFloat(line.getAttribute("y1"))-mnY;
    const x2=parseFloat(line.getAttribute("x2"))-mnX, y2=parseFloat(line.getAttribute("y2"))-mnY;
    ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
    const angle = Math.atan2(y2-y1, x2-x1);
    const hl=9, hw=5.5;
    const bx=x2-Math.cos(angle)*hl, by=y2-Math.sin(angle)*hl;
    ctx.beginPath();
    ctx.moveTo(x2,y2);
    ctx.lineTo(bx+Math.cos(angle+Math.PI/2)*hw, by+Math.sin(angle+Math.PI/2)*hw);
    ctx.lineTo(bx+Math.cos(angle-Math.PI/2)*hw, by+Math.sin(angle-Math.PI/2)*hw);
    ctx.closePath(); ctx.fill();
  });

  for (const el of items) {
    const x=(parseFloat(el.style.left)||0)-mnX, y=(parseFloat(el.style.top)||0)-mnY;
    const w=parseFloat(el.style.width)||el.offsetWidth||140, h=parseFloat(el.style.height)||el.offsetHeight||60;
    const type = el.dataset.type;

    if (el.classList.contains("group-frame")) {
      ctx.save();
      ctx.strokeStyle = el.dataset.color || "#9b9bdc"; ctx.setLineDash([5,4]); ctx.lineWidth = 1.5;
      ctx.strokeRect(x,y,w,h); ctx.setLineDash([]);
      ctx.fillStyle = el.dataset.color || "#6a6ad9"; ctx.font = "bold 11px Arial";
      ctx.fillText(el.dataset.label || "Groupe", x, y-8);
      ctx.restore();
      continue;
    }
    if (type === "text") {
      ctx.save();
      ctx.fillStyle="#ffffff"; ctx.strokeStyle="#e8e8e8"; ctx.lineWidth=1;
      roundRectPath(ctx,x,y,w,h,10); ctx.fill(); ctx.stroke();
      ctx.fillStyle="#1a1a1a";
      const fs = parseInt(el.dataset.fontSize)||16;
      ctx.font = fs+"px Arial";
      wrapCanvasText(ctx, el.innerText||"", x+12, y+fs+6, w-24, fs*1.3);
      ctx.restore();
    } else if (type === "shape") {
      ctx.save();
      const color = el.dataset.color || "#4A90D9", shape = el.dataset.shape;
      const cx=x+w/2, cy=y+h/2, rot=(parseFloat(el.dataset.rotation)||0)*Math.PI/180;
      ctx.translate(cx,cy); ctx.rotate(rot); ctx.translate(-cx,-cy);
      ctx.fillStyle = color;
      if (shape==="circle") { ctx.beginPath(); ctx.ellipse(cx,cy,w/2,h/2,0,0,Math.PI*2); ctx.fill(); }
      else if (shape==="triangle") { ctx.beginPath(); ctx.moveTo(x+w/2,y); ctx.lineTo(x+w,y+h); ctx.lineTo(x,y+h); ctx.closePath(); ctx.fill(); }
      else if (shape==="arrow") { ctx.strokeStyle=color; ctx.lineWidth=Math.max(2,h*0.15); ctx.beginPath(); ctx.moveTo(x,cy); ctx.lineTo(x+w*0.75,cy); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x+w,cy); ctx.lineTo(x+w*0.65,y); ctx.lineTo(x+w*0.65,y+h); ctx.closePath(); ctx.fill(); }
      else { roundRectPath(ctx,x,y,w,h,shape==="diamond"?0:8); ctx.fill(); }
      ctx.restore();
    } else if (type === "image") {
      try { ctx.drawImage(el.querySelector("img"), x, y, w, h); } catch(e) {}
    } else if (type === "checklist") {
      ctx.save();
      ctx.fillStyle = el.dataset.bg||"#fffdf2"; ctx.strokeStyle = el.dataset.border||"#f0e6c0"; ctx.lineWidth=1;
      roundRectPath(ctx,x,y,w,h,10); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#8a7a3a"; ctx.font = "bold 11px Arial";
      const title = el.querySelector(".checklist-title")?.value || "Checklist";
      ctx.fillText(title.toUpperCase(), x+12, y+18);
      let cy2 = y+36;
      el.querySelectorAll(":scope > .checklist-items > .checklist-item").forEach(row => {
        const done = row.classList.contains("done");
        const txt  = row.querySelector(".ci-text")?.innerText || "";
        ctx.strokeStyle="#999"; ctx.lineWidth=1.3; ctx.strokeRect(x+12,cy2-9,12,12);
        if (done) { ctx.beginPath(); ctx.moveTo(x+14,cy2-3); ctx.lineTo(x+17,cy2); ctx.lineTo(x+23,cy2-8); ctx.stroke(); }
        ctx.fillStyle = done?"#aaa":"#333"; ctx.font = (done?"italic ":"")+"12px Arial";
        ctx.fillText(txt.slice(0,40), x+30, cy2+1);
        cy2 += 18;
        const note = row.querySelector(".ci-note")?.innerText || "";
        if (note) { ctx.fillStyle="#aaa"; ctx.font="italic 10px Arial"; ctx.fillText(note.slice(0,46), x+30, cy2); cy2 += 14; }
        row.querySelectorAll(".checklist-sub .checklist-item").forEach(sub => {
          const sdone = sub.classList.contains("done");
          const stxt = sub.querySelector(".ci-text")?.innerText || "";
          ctx.strokeStyle="#aaa"; ctx.lineWidth=1; ctx.strokeRect(x+34,cy2-8,10,10);
          ctx.fillStyle = sdone?"#bbb":"#555"; ctx.font = "11px Arial";
          ctx.fillText(stxt.slice(0,36), x+50, cy2+1);
          cy2 += 16;
        });
      });
      ctx.restore();
    }
    if (el.dataset.tag) {
      ctx.save();
      ctx.fillStyle = el.dataset.tagColor || "#888";
      ctx.font = "bold 10px Arial";
      const tagW = ctx.measureText(el.dataset.tag).width + 16;
      roundRectPath(ctx,x+6,y-10,tagW,16,8); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.fillText(el.dataset.tag, x+14, y+1);
      ctx.restore();
    }
  }

  const imgData = exportCanvas.toDataURL("image/png");
  const { jsPDF } = window.jspdf;
  const orientation = contentW > contentH ? "landscape" : "portrait";
  const pdf = new jsPDF({ orientation, unit:"pt", format:[contentW, contentH] });
  pdf.addImage(imgData, "PNG", 0, 0, contentW, contentH);
  pdf.save((currentPage||"page").replace(/[^a-z0-9_\- ]/gi,"")+".pdf");
});

function roundRectPath(ctx,x,y,w,h,r) {
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath();
}
function wrapCanvasText(ctx,text,x,y,maxWidth,lineHeight) {
  const words = text.split(/\s+/); let line="", yy=y;
  words.forEach(word => {
    const test = line ? line+" "+word : word;
    if (ctx.measureText(test).width > maxWidth && line) { ctx.fillText(line,x,yy); line=word; yy+=lineHeight; }
    else line = test;
  });
  if (line) ctx.fillText(line,x,yy);
}

/* ==============================
   INIT
================================*/
document.body.classList.add("no-project");
renderProjectScreen();
updateTransform();
