/* ==============================
   ÉLÉMENTS DOM
================================*/
const sidebar      = document.getElementById("sidebar");
const toggleMenu    = document.getElementById("toggleMenu");
const addTextBtn    = document.getElementById("addText");
const addShapeBtn    = document.getElementById("addShape");
const shapeMenu      = document.getElementById("shapeMenu");
const addImageBtn    = document.getElementById("addImage");
const addChecklistBtn= document.getElementById("addChecklist");
const selectModeBtn  = document.getElementById("selectMode");
const linkModeBtn    = document.getElementById("linkMode");
const tagModeBtn     = document.getElementById("tagMode");
const undoBtn        = document.getElementById("undoBtn");
const redoBtn         = document.getElementById("redoBtn");
const newPageBtn     = document.getElementById("newPage");
const exportPdfBtn   = document.getElementById("exportPdf");
const toggleDark     = document.getElementById("toggleDark");
const fileInput      = document.getElementById("fileInput");
const pageList       = document.getElementById("pageList");
const viewport       = document.getElementById("viewport");
const canvas         = document.getElementById("canvas");
const linksLayer     = document.getElementById("linksLayer");
const colorPanel     = document.getElementById("colorPanel");
const tagPanel       = document.getElementById("tagPanel");
const tagInput       = document.getElementById("tagInput");
const modeBanner     = document.getElementById("modeBanner");
const modeBannerText = document.getElementById("modeBannerText");
const modeBannerCancel = document.getElementById("modeBannerCancel");
const selectionBar   = document.getElementById("selectionBar");
const selectionCount = document.getElementById("selectionCount");
const groupBtn       = document.getElementById("groupBtn");
const ungroupBtn     = document.getElementById("ungroupBtn");

/* ==============================
   ÉTAT GLOBAL
================================*/
let pages = {};
try { pages = JSON.parse(localStorage.getItem("gdd_pages") || "{}"); } catch(e) { pages = {}; }
let pageOrder = [];
try { pageOrder = JSON.parse(localStorage.getItem("gdd_order") || "[]"); } catch(e) { pageOrder = []; }
let currentPage = null;
let selectedEl  = null;     // élément simple sélectionné (forme/texte/image -> couleur)
let elIdCounter = 1;        // pour donner un id stable à chaque élément du DOM

// Modes exclusifs
let activeMode = null; // null | 'select' | 'link' | 'tag'
let multiSelection = new Set(); // ids d'éléments sélectionnés en mode select
let linkFirstEl = null;         // premier élément tapé en mode link
let tagTargetEl = null;         // élément ciblé par le panneau étiquette

// Historique undo/redo (par page, pile de snapshots JSON)
let undoStack = [];
let redoStack = [];
let suppressHistory = false; // évite d'empiler pendant une restauration

/* ==============================
   SAUVEGARDE / SÉRIALISATION
================================*/
function savePages() {
  try {
    localStorage.setItem("gdd_pages", JSON.stringify(pages));
    localStorage.setItem("gdd_order", JSON.stringify(pageOrder));
  } catch(e) {}
}

function nextElId() { return "el" + (elIdCounter++); }

function serializeCanvas() {
  // éléments simples (hors group-frame, recalculé à la restauration)
  const items = [...canvas.querySelectorAll(":scope > .node, :scope > .shape-el, :scope > .img-wrapper, :scope > .checklist-el")]
    .map(el => serializeEl(el));
  const links = [...linksLayer.querySelectorAll("line[data-from]")].map(line => ({
    from: line.dataset.from, to: line.dataset.to
  }));
  const groups = [...canvas.querySelectorAll(":scope > .group-frame")].map(g => ({
    id: g.dataset.id, label: g.dataset.label || "Groupe",
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
    item.checkItems = [...el.querySelectorAll(".checklist-item")].map(row => ({
      text: row.querySelector(".ci-text")?.innerText || "",
      done: row.querySelector("input[type=checkbox]")?.checked || false
    }));
  }
  return item;
}

function saveCurrentPage(pushHistory) {
  if (!currentPage) return;
  const snap = serializeCanvas();
  pages[currentPage] = snap;
  savePages();
  if (pushHistory !== false && !suppressHistory) pushUndo(snap);
  scheduleLinksRedraw();
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
  if (undoStack.length <= 1) return; // garder l'état initial
  const current = undoStack.pop();
  redoStack.push(current);
  const prev = undoStack[undoStack.length - 1];
  suppressHistory = true;
  restoreSnapshot(JSON.parse(prev));
  suppressHistory = false;
  updateUndoRedoButtons();
}

function doRedo() {
  if (!redoStack.length) return;
  const snap = redoStack.pop();
  undoStack.push(snap);
  suppressHistory = true;
  restoreSnapshot(JSON.parse(snap));
  suppressHistory = false;
  updateUndoRedoButtons();
}

function restoreSnapshot(snap) {
  canvas.innerHTML = "";
  linksLayer.innerHTML = "";
  deselectAll();
  (snap.items||[]).forEach(data => restoreElement(data));
  (snap.groups||[]).forEach(g => restoreGroup(g));
  (snap.links||[]).forEach(l => drawLink(l.from, l.to));
  pages[currentPage] = snap;
  savePages();
}

/* ==============================
   RESTAURATION D'ÉLÉMENTS
================================*/
function restoreElement(data) {
  let el = null;
  if (data.type === "text")      el = createText(data.x, data.y, data.text, data.fontSize, data.id);
  if (data.type === "shape")     el = createShape(data.shape, data.x, data.y, data.color, data.w, data.h, data.rotation, data.id);
  if (data.type === "image" && data.src) el = createImage(data.x, data.y, data.src, data.w, data.h, data.id);
  if (data.type === "checklist") el = createChecklist(data.x, data.y, data.title, data.checkItems, data.id);
  if (el && data.tag) applyTag(el, data.tag, data.tagColor);
  return el;
}

function restoreGroup(g) {
  const frame = document.createElement("div");
  frame.className = "group-frame";
  frame.dataset.id = g.id;
  frame.dataset.label = g.label;
  frame.dataset.members = g.members.join(",");
  frame.style.left = g.x + "px"; frame.style.top = g.y + "px";
  frame.style.width = g.w + "px"; frame.style.height = g.h + "px";

  const label = document.createElement("div");
  label.className = "group-label";
  label.textContent = g.label;
  frame.appendChild(label);

  canvas.insertBefore(frame, canvas.firstChild);
  makeGroupDraggable(frame);
  return frame;
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
   LISTE DES PAGES (avec drag, renommage)
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
      savePages();
      refreshPageList();
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
});

/* ==============================
   CANVAS — PAN + PINCH + DOUBLE TAP RECENTRAGE
================================*/
let offsetX = -24000, offsetY = -24000, scale = 1;
let isPanning = false, panSX = 0, panSY = 0;
let lastPinchDist = 0, touchWasPinch = false, lastBgTap = 0;

function updateTransform() {
  canvas.style.transform = "translate("+offsetX+"px,"+offsetY+"px) scale("+scale+")";
  linksLayer.style.transform = canvas.style.transform;
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
      const midX=(e.touches[0].clientX+e.touches[1].clientX)/2, midY=(e.touches[0].clientY+e.touches[1].clientY)/2;
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
      else handleBackgroundTap(e);
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

// Tap simple sur fond : désélection, ou annulation du mode lien en cours
function handleBackgroundTap() {
  if (activeMode === "link" && linkFirstEl) { linkFirstEl.classList.remove("selected"); linkFirstEl = null; updateModeBanner(); return; }
  deselectAll();
  hideColorPanel(); hideTagPanel();
}

/* ==============================
   HELPER TAP
================================*/
function tap(el, fn) {
  el.addEventListener("click", fn);
  el.addEventListener("touchstart", e => { e.stopPropagation(); e.preventDefault(); fn(e); }, { passive: false });
}

/* ==============================
   MODES (select / link / tag) — exclusifs
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
    modeBannerText.textContent = "Sélectionne les éléments à grouper";
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
   SÉLECTION MULTIPLE (mode select)
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
function updateSelectionBar() {
  if (activeMode === "select" && multiSelection.size > 0) {
    selectionCount.textContent = multiSelection.size + " sélectionné(s)";
    selectionBar.classList.add("visible");
    ungroupBtn.style.display = multiSelection.size === 1 && canvas.querySelector('[data-id="'+[...multiSelection][0]+'"].group-frame') ? "inline-block" : "none";
  } else {
    selectionBar.classList.remove("visible");
  }
}

tap(groupBtn, () => {
  if (multiSelection.size < 2) return;
  const ids = [...multiSelection];
  const els = ids.map(id => canvas.querySelector('[data-id="'+id+'"]')).filter(Boolean);
  if (els.length < 2) return;
  let mnX=Infinity,mnY=Infinity,mxX=-Infinity,mxY=-Infinity;
  els.forEach(el => {
    const x=parseFloat(el.style.left)||0, y=parseFloat(el.style.top)||0;
    const w=parseFloat(el.style.width)||el.offsetWidth||140, h=parseFloat(el.style.height)||el.offsetHeight||80;
    if(x-10<mnX)mnX=x-10; if(y-26<mnY)mnY=y-26; if(x+w+10>mxX)mxX=x+w+10; if(y+h+10>mxY)mxY=y+h+10;
  });
  const label = prompt("Nom du groupe :", "Groupe") || "Groupe";
  const g = restoreGroup({ id: "grp"+nextElId(), label, x:mnX, y:mnY, w:mxX-mnX, h:mxY-mnY, members: ids });
  canvas.insertBefore(g, canvas.firstChild);
  clearMultiSelection();
  exitAllModes();
  saveCurrentPage();
});

tap(ungroupBtn, () => {
  const id = [...multiSelection][0];
  const g = canvas.querySelector('[data-id="'+id+'"].group-frame') || canvas.querySelector('.group-frame[data-id="'+id+'"]');
  if (g) { g.remove(); }
  clearMultiSelection();
  saveCurrentPage();
});

/* Dégroupement direct : taper le label d'un groupe avec un long press */
function makeGroupDraggable(frame) {
  let active=false, sx=0, sy=0, ex=0, ey=0, longTm=null;

  frame.addEventListener("touchstart", e => {
    if (e.target.classList.contains("group-label")) {
      longTm = setTimeout(() => {
        if (confirm("Dégrouper \"" + frame.dataset.label + "\" ?")) {
          frame.remove();
          saveCurrentPage();
        }
      }, 600);
      e.stopPropagation();
      return;
    }
    if (e.touches.length !== 1) return;
    active = true;
    sx = e.touches[0].clientX; sy = e.touches[0].clientY;
    ex = parseFloat(frame.style.left)||0; ey = parseFloat(frame.style.top)||0;
    e.stopPropagation();
  }, { passive: true });

  frame.addEventListener("touchmove", e => {
    clearTimeout(longTm);
    if (!active || e.touches.length !== 1) return;
    const dx = (e.touches[0].clientX-sx)/scale, dy = (e.touches[0].clientY-sy)/scale;
    frame.style.left = (ex+dx)+"px"; frame.style.top = (ey+dy)+"px";
    // déplacer les membres avec le groupe
    const members = (frame.dataset.members||"").split(",").filter(Boolean);
    members.forEach(id => {
      const el = canvas.querySelector('[data-id="'+id+'"]');
      if (el && el._groupBase) {
        el.style.left = (el._groupBase.x + dx) + "px";
        el.style.top  = (el._groupBase.y + dy) + "px";
      }
    });
    e.stopPropagation();
  }, { passive: true });

  frame.addEventListener("touchstart", e => {
    const members = (frame.dataset.members||"").split(",").filter(Boolean);
    members.forEach(id => {
      const el = canvas.querySelector('[data-id="'+id+'"]');
      if (el) el._groupBase = { x: parseFloat(el.style.left)||0, y: parseFloat(el.style.top)||0 };
    });
  }, { passive: true });

  frame.addEventListener("touchend", () => { clearTimeout(longTm); active=false; saveCurrentPage(); });
}

/* ==============================
   DRAG GÉNÉRIQUE (éléments simples)
================================*/
function makeDraggable(el) {
  let active=false, sx=0, sy=0, ex=0, ey=0, moved=false;

  el.addEventListener("touchstart", e => {
    if (e.target.classList.contains("handle") || e.target.classList.contains("el-delete") ||
        e.target.classList.contains("link-anchor") || e.target.classList.contains("elem-tag")) return;

    // Modes spéciaux interceptent le tap avant le drag normal
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
    scheduleLinksRedraw();
    e.stopPropagation();
  }, { passive: true });

  el.addEventListener("touchend", () => {
    if (active && !moved && el.dataset.type === "shape") selectShape(el);
    active = false;
    if (moved) saveCurrentPage();
  });
}

/* ==============================
   ÉTIQUETTE — pose sur n'importe quel élément
================================*/
function applyTag(el, text, color) {
  let tagEl = el.querySelector(".elem-tag");
  if (!text) { if (tagEl) tagEl.remove(); el.dataset.tag=""; el.dataset.tagColor=""; return; }
  if (!tagEl) {
    tagEl = document.createElement("div");
    tagEl.className = "elem-tag";
    el.appendChild(tagEl);
  }
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
  tagPanel.style.left = Math.max(70, Math.min(window.innerWidth - 230, rect.left)) + "px";
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
   CONNECTEURS (mode link)
================================*/
function ensureAnchor(el) {
  if (el.querySelector(".link-anchor")) return;
  const a = document.createElement("div");
  a.className = "link-anchor";
  el.appendChild(a);
}
// Ajoute une ancre visuelle à tout élément créé (visible seulement en mode lien)
function addAnchorsToAll() { canvas.querySelectorAll(".node,.shape-el,.img-wrapper,.checklist-el").forEach(ensureAnchor); }

function handleLinkTap(el) {
  if (!linkFirstEl) {
    linkFirstEl = el; el.classList.add("selected"); updateModeBanner(); return;
  }
  if (linkFirstEl === el) { el.classList.remove("selected"); linkFirstEl = null; updateModeBanner(); return; }
  drawLink(linkFirstEl.dataset.id, el.dataset.id);
  linkFirstEl.classList.remove("selected");
  linkFirstEl = null;
  updateModeBanner();
  saveCurrentPage();
}

function elCenter(el) {
  return {
    x: (parseFloat(el.style.left)||0) + (parseFloat(el.style.width)||el.offsetWidth||100)/2,
    y: (parseFloat(el.style.top)||0)  + (parseFloat(el.style.height)||el.offsetHeight||40)/2
  };
}

function drawLink(fromId, toId) {
  const fromEl = canvas.querySelector('[data-id="'+fromId+'"]');
  const toEl   = canvas.querySelector('[data-id="'+toId+'"]');
  if (!fromEl || !toEl) return;
  const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
  line.setAttribute("stroke", "#9b9bdc");
  line.setAttribute("stroke-width", "2.5");
  line.setAttribute("stroke-dasharray", "0");
  line.dataset.from = fromId; line.dataset.to = toId;
  linksLayer.appendChild(line);
  updateLinkLine(line);
}

function updateLinkLine(line) {
  const fromEl = canvas.querySelector('[data-id="'+line.dataset.from+'"]');
  const toEl   = canvas.querySelector('[data-id="'+line.dataset.to+'"]');
  if (!fromEl || !toEl) { line.remove(); return; }
  const c1 = elCenter(fromEl), c2 = elCenter(toEl);
  line.setAttribute("x1", c1.x); line.setAttribute("y1", c1.y);
  line.setAttribute("x2", c2.x); line.setAttribute("y2", c2.y);
}

let linksRaf = null;
function scheduleLinksRedraw() {
  if (linksRaf) return;
  linksRaf = requestAnimationFrame(() => {
    linksRaf = null;
    linksLayer.querySelectorAll("line[data-from]").forEach(updateLinkLine);
  });
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
    linksLayer.querySelectorAll('line[data-from="'+id+'"], line[data-to="'+id+'"]').forEach(l => l.remove());
    if (wrapper === selectedEl) { selectedEl=null; hideColorPanel(); }
    multiSelection.delete(id);
    wrapper.remove();
    saveCurrentPage();
  });
  wrapper.appendChild(btn);
}

/* ==============================
   DÉSÉLECTION GLOBALE
================================*/
function deselectAll() {
  if (selectedEl) { selectedEl.classList.remove("selected"); selectedEl = null; }
  hideColorPanel();
}

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

  let lastTap = 0;
  el.addEventListener("touchend", e => {
    if (activeMode) return;
    if (el.contentEditable === "true") return;
    const now = Date.now();
    if (now - lastTap < 350) { el.contentEditable = "true"; el.focus(); }
    lastTap = now;
  });
  el.addEventListener("dblclick", () => { if(!activeMode){ el.contentEditable = "true"; el.focus(); } });
  el.addEventListener("blur", () => { el.contentEditable = "false"; saveCurrentPage(); });
  el.addEventListener("input", saveCurrentPage);

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
      el.style.fontSize=s+"px"; el.dataset.fontSize=Math.round(s);
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
  colorPanel.style.left = Math.max(70, Math.min(window.innerWidth - 200, rect.left)) + "px";
  colorPanel.classList.add("open");
}
function hideColorPanel() { colorPanel.classList.remove("open"); }

document.querySelectorAll(".color-swatch:not(.tag-color)").forEach(sw=>{
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

tap(addImageBtn, () => fileInput.click());
fileInput.addEventListener("change", e => {
  const file=e.target.files&&e.target.files[0]; if(!file)return;
  const reader=new FileReader();
  reader.onload=ev=>{ const c=viewCenter(); createImage(c.x-100,c.y-80,ev.target.result); saveCurrentPage(); };
  reader.readAsDataURL(file); fileInput.value="";
});

/* ==============================
   CHECKLIST FLOTTANTE
================================*/
function createChecklist(x, y, title, checkItems, id) {
  if (!title) title = "Checklist";
  if (!checkItems) checkItems = [{ text: "Première tâche", done: false }];

  const el = document.createElement("div");
  el.className = "checklist-el";
  el.dataset.type = "checklist";
  el.dataset.id = id || nextElId();
  el.style.left = x + "px"; el.style.top = y + "px";

  const titleInput = document.createElement("input");
  titleInput.className = "checklist-title";
  titleInput.value = title;
  titleInput.addEventListener("touchstart", e => e.stopPropagation(), {passive:true});
  titleInput.addEventListener("input", saveCurrentPage);
  titleInput.addEventListener("blur", saveCurrentPage);

  const itemsWrap = document.createElement("div");
  itemsWrap.className = "checklist-items";

  function addRow(text, done) {
    const row = document.createElement("div");
    row.className = "checklist-item" + (done ? " done" : "");
    const cb = document.createElement("input");
    cb.type = "checkbox"; cb.checked = !!done;
    cb.addEventListener("touchstart", e => e.stopPropagation(), {passive:true});
    cb.addEventListener("change", () => { row.classList.toggle("done", cb.checked); saveCurrentPage(); });

    const txt = document.createElement("div");
    txt.className = "ci-text"; txt.contentEditable = "true"; txt.innerText = text || "";
    txt.addEventListener("touchstart", e => e.stopPropagation(), {passive:true});
    txt.addEventListener("input", saveCurrentPage);
    txt.addEventListener("blur", saveCurrentPage);

    const del = document.createElement("button");
    del.className = "ci-del"; del.textContent = "✕";
    tap(del, e => { e&&e.stopPropagation&&e.stopPropagation(); row.remove(); saveCurrentPage(); });

    row.appendChild(cb); row.appendChild(txt); row.appendChild(del);
    itemsWrap.appendChild(row);
  }

  checkItems.forEach(it => addRow(it.text, it.done));

  const addLine = document.createElement("div");
  addLine.className = "checklist-add";
  addLine.textContent = "+ ajouter une ligne";
  tap(addLine, e => { e&&e.stopPropagation&&e.stopPropagation(); addRow("", false); saveCurrentPage(); });

  el.appendChild(titleInput);
  el.appendChild(itemsWrap);
  el.appendChild(addLine);

  ensureAnchor(el);
  addDeleteButton(el);
  canvas.appendChild(el);
  makeDraggable(el);
  return el;
}

tap(addChecklistBtn, () => {
  const c = viewCenter();
  createChecklist(c.x - 90, c.y - 40);
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
tap(toggleDark,  ()=>document.body.classList.toggle("dark"));
tap(undoBtn, () => doUndo());
tap(redoBtn, () => doRedo());

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

  // Rendu simplifié : on dessine le contenu sur un canvas HTML5 puis on l'injecte dans le PDF
  const scaleExport = 2; // résolution
  const exportCanvas = document.createElement("canvas");
  exportCanvas.width  = contentW * scaleExport;
  exportCanvas.height = contentH * scaleExport;
  const ctx = exportCanvas.getContext("2d");
  ctx.scale(scaleExport, scaleExport);
  ctx.fillStyle = document.body.classList.contains("dark") ? "#1e1e1e" : "#ffffff";
  ctx.fillRect(0, 0, contentW, contentH);

  // Liens d'abord (sous les éléments)
  ctx.strokeStyle = "#9b9bdc"; ctx.lineWidth = 2;
  linksLayer.querySelectorAll("line[data-from]").forEach(line => {
    const x1=parseFloat(line.getAttribute("x1"))-mnX, y1=parseFloat(line.getAttribute("y1"))-mnY;
    const x2=parseFloat(line.getAttribute("x2"))-mnX, y2=parseFloat(line.getAttribute("y2"))-mnY;
    ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
  });

  for (const el of items) {
    const x = (parseFloat(el.style.left)||0) - mnX;
    const y = (parseFloat(el.style.top)||0)  - mnY;
    const w = parseFloat(el.style.width)  || el.offsetWidth  || 140;
    const h = parseFloat(el.style.height) || el.offsetHeight || 60;
    const type = el.dataset.type;

    if (el.classList.contains("group-frame")) {
      ctx.save();
      ctx.strokeStyle = "#9b9bdc"; ctx.setLineDash([5,4]); ctx.lineWidth = 1.5;
      ctx.strokeRect(x, y, w, h);
      ctx.setLineDash([]);
      ctx.fillStyle = "#6a6ad9"; ctx.font = "bold 11px Arial";
      ctx.fillText(el.dataset.label || "Groupe", x, y - 8);
      ctx.restore();
      continue;
    }

    if (type === "text") {
      ctx.save();
      ctx.fillStyle = "#ffffff"; ctx.strokeStyle = "#e8e8e8"; ctx.lineWidth = 1;
      roundRectPath(ctx, x, y, w, h, 10); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#1a1a1a";
      const fs = parseInt(el.dataset.fontSize) || 16;
      ctx.font = fs + "px Arial";
      wrapCanvasText(ctx, el.innerText || "", x + 12, y + fs + 6, w - 24, fs * 1.3);
      ctx.restore();
    } else if (type === "shape") {
      ctx.save();
      const color = el.dataset.color || "#4A90D9";
      const shape = el.dataset.shape;
      const cx = x + w/2, cy = y + h/2;
      const rot = (parseFloat(el.dataset.rotation)||0) * Math.PI/180;
      ctx.translate(cx, cy); ctx.rotate(rot); ctx.translate(-cx,-cy);
      ctx.fillStyle = color;
      if (shape === "circle") { ctx.beginPath(); ctx.ellipse(cx,cy,w/2,h/2,0,0,Math.PI*2); ctx.fill(); }
      else if (shape === "triangle") { ctx.beginPath(); ctx.moveTo(x+w/2,y); ctx.lineTo(x+w,y+h); ctx.lineTo(x,y+h); ctx.closePath(); ctx.fill(); }
      else if (shape === "arrow") { ctx.strokeStyle=color; ctx.lineWidth=Math.max(2,h*0.15); ctx.beginPath(); ctx.moveTo(x,cy); ctx.lineTo(x+w*0.75,cy); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x+w,cy); ctx.lineTo(x+w*0.65,y); ctx.lineTo(x+w*0.65,y+h); ctx.closePath(); ctx.fill(); }
      else { roundRectPath(ctx, x, y, w, h, shape==="diamond"?0:8); ctx.fill(); }
      ctx.restore();
    } else if (type === "image") {
      try {
        const img = el.querySelector("img");
        ctx.drawImage(img, x, y, w, h);
      } catch(e){}
    } else if (type === "checklist") {
      ctx.save();
      ctx.fillStyle = "#fffdf2"; ctx.strokeStyle = "#f0e6c0"; ctx.lineWidth = 1;
      roundRectPath(ctx, x, y, w, h, 10); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#8a7a3a"; ctx.font = "bold 11px Arial";
      const title = el.querySelector(".checklist-title")?.value || "Checklist";
      ctx.fillText(title.toUpperCase(), x+12, y+18);
      let cy2 = y + 36;
      el.querySelectorAll(".checklist-item").forEach(row => {
        const done = row.classList.contains("done");
        const txt  = row.querySelector(".ci-text")?.innerText || "";
        ctx.strokeStyle = "#999"; ctx.lineWidth = 1.3;
        ctx.strokeRect(x+12, cy2-9, 12, 12);
        if (done) { ctx.beginPath(); ctx.moveTo(x+14,cy2-3); ctx.lineTo(x+17,cy2); ctx.lineTo(x+23,cy2-8); ctx.stroke(); }
        ctx.fillStyle = done ? "#aaa" : "#333";
        ctx.font = (done ? "italic " : "") + "12px Arial";
        ctx.fillText(txt.slice(0,40), x+30, cy2+1);
        cy2 += 20;
      });
      ctx.restore();
    }

    // étiquette
    if (el.dataset.tag) {
      ctx.save();
      ctx.fillStyle = el.dataset.tagColor || "#888";
      const tagW = ctx.measureText(el.dataset.tag).width + 16;
      roundRectPath(ctx, x+6, y-10, tagW, 16, 8); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.font = "bold 10px Arial";
      ctx.fillText(el.dataset.tag, x+14, y+1);
      ctx.restore();
    }
  }

  const imgData = exportCanvas.toDataURL("image/png");
  const { jsPDF } = window.jspdf;
  const orientation = contentW > contentH ? "landscape" : "portrait";
  const pdf = new jsPDF({ orientation, unit: "pt", format: [contentW, contentH] });
  pdf.addImage(imgData, "PNG", 0, 0, contentW, contentH);
  pdf.save((currentPage || "page").replace(/[^a-z0-9_\- ]/gi,"") + ".pdf");
});

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath();
}
function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(/\s+/);
  let line = "", yy = y;
  words.forEach(word => {
    const test = line ? line + " " + word : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, yy); line = word; yy += lineHeight;
    } else line = test;
  });
  if (line) ctx.fillText(line, x, yy);
}

/* ==============================
   INIT
================================*/
if (!pageOrder.length) pageOrder = Object.keys(pages);
if (!Object.keys(pages).length) { createPage(); } else { loadPage(orderedPages()[0]); }
updateTransform();
