/* ==============================
   ÉLÉMENTS DOM
================================*/
const sidebar     = document.getElementById("sidebar");
const toggleMenu  = document.getElementById("toggleMenu");
const addTextBtn  = document.getElementById("addText");
const addShapeBtn = document.getElementById("addShape");
const shapeMenu   = document.getElementById("shapeMenu");
const addImageBtn = document.getElementById("addImage");
const newPageBtn  = document.getElementById("newPage");
const toggleDark  = document.getElementById("toggleDark");
const fileInput   = document.getElementById("fileInput");
const pageList    = document.getElementById("pageList");
const viewport    = document.getElementById("viewport");
const canvas      = document.getElementById("canvas");
const colorPanel  = document.getElementById("colorPanel");

/* ==============================
   ÉTAT GLOBAL
================================*/
let pages = {};
try { pages = JSON.parse(localStorage.getItem("gdd_pages") || "{}"); } catch(e) { pages = {}; }
let currentPage   = null;
let selectedEl    = null; // élément forme sélectionné

/* ==============================
   SAUVEGARDE
================================*/
function savePages() {
  try { localStorage.setItem("gdd_pages", JSON.stringify(pages)); } catch(e) {}
}

function saveCurrentPage() {
  if (!currentPage) return;
  pages[currentPage] = [...canvas.children].map(el => {
    const type = el.dataset.type;
    const item = {
      type,
      x: parseFloat(el.style.left) || 0,
      y: parseFloat(el.style.top)  || 0,
    };
    if (type === "text") {
      const clone = el.cloneNode(true);
      clone.querySelector(".el-delete") && clone.querySelector(".el-delete").remove();
      item.text     = clone.innerHTML;
      item.fontSize = el.dataset.fontSize || "16";
    }
    if (type === "shape") {
      item.shape    = el.dataset.shape;
      item.color    = el.dataset.color  || "#E8E8FF";
      item.w        = parseFloat(el.style.width)  || 140;
      item.h        = parseFloat(el.style.height) || 80;
      item.rotation = parseFloat(el.dataset.rotation) || 0;
    }
    if (type === "image") {
      item.src = el.dataset.src || "";
      item.w   = parseFloat(el.style.width)  || 200;
      item.h   = parseFloat(el.style.height) || 200;
    }
    return item;
  });
  savePages();
}

function restoreElement(data) {
  if (data.type === "text")              createText(data.x, data.y, data.text, data.fontSize);
  if (data.type === "shape")             createShape(data.shape, data.x, data.y, data.color, data.w, data.h, data.rotation);
  if (data.type === "image" && data.src) createImage(data.x, data.y, data.src, data.w, data.h);
}

/* ==============================
   PAGES
================================*/
function loadPage(name) {
  currentPage = name;
  canvas.innerHTML = "";
  selectedEl = null;
  hideColorPanel();
  if (!pages[name]) pages[name] = [];
  pages[name].forEach(data => restoreElement(data));
  refreshPageList();
  savePages();
}

function refreshPageList() {
  pageList.innerHTML = "";
  Object.keys(pages).forEach(name => {
    const row = document.createElement("div");
    row.className = "page-row" + (name === currentPage ? " active" : "");

    const label = document.createElement("span");
    label.className = "page-label";
    label.textContent = name;
    tap(label, () => loadPage(name));

    let lastTapT = 0;
    label.addEventListener("touchend", () => {
      const now = Date.now();
      if (now - lastTapT < 350) renamePage(name);
      lastTapT = now;
    });
    label.addEventListener("dblclick", () => renamePage(name));

    const del = document.createElement("button");
    del.className = "page-del";
    del.textContent = "✕";
    tap(del, e => {
      e && e.stopPropagation && e.stopPropagation();
      if (Object.keys(pages).length <= 1) return;
      if (!confirm("Supprimer \"" + name + "\" ?")) return;
      delete pages[name];
      savePages();
      if (currentPage === name) loadPage(Object.keys(pages)[0]);
      else refreshPageList();
    });

    row.appendChild(label);
    row.appendChild(del);
    pageList.appendChild(row);
  });
}

function renamePage(oldName) {
  const n = prompt("Renommer :", oldName);
  if (!n || n === oldName || pages[n] !== undefined) return;
  pages[n] = pages[oldName];
  delete pages[oldName];
  if (currentPage === oldName) currentPage = n;
  savePages();
  refreshPageList();
}

function createPage() {
  const name = "Page " + (Object.keys(pages).length + 1);
  pages[name] = [];
  loadPage(name);
}

/* ==============================
   MENU SIDEBAR
================================*/
tap(toggleMenu, () => {
  sidebar.classList.toggle("expanded");
  document.body.classList.toggle("sidebar-expanded");
});

/* ==============================
   CANVAS INFINI — PAN + PINCH + DOUBLE TAP
================================*/
let offsetX = -24000, offsetY = -24000, scale = 1;
let isPanning = false, panSX = 0, panSY = 0;
let lastPinchDist = 0, pinchMidX = 0, pinchMidY = 0;

function updateTransform() {
  canvas.style.transform = "translate("+offsetX+"px,"+offsetY+"px) scale("+scale+")";
}

// Double tap sur le fond → recentrer sur les objets
let lastBgTap = 0;
viewport.addEventListener("touchend", e => {
  if (e.target !== viewport && e.target !== canvas) return;
  const now = Date.now();
  if (now - lastBgTap < 350) recenterOnContent();
  lastBgTap = now;
});

function recenterOnContent() {
  const items = [...canvas.children];
  if (items.length === 0) { offsetX = -24000; offsetY = -24000; scale = 1; updateTransform(); return; }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  items.forEach(el => {
    const x = parseFloat(el.style.left) || 0;
    const y = parseFloat(el.style.top)  || 0;
    const w = parseFloat(el.style.width)  || 150;
    const h = parseFloat(el.style.height) || 80;
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x + w > maxX) maxX = x + w;
    if (y + h > maxY) maxY = y + h;
  });
  const contentW = maxX - minX;
  const contentH = maxY - minY;
  const vw = viewport.clientWidth;
  const vh = viewport.clientHeight;
  const padding = 60;
  const newScale = Math.min(3, Math.max(0.2, Math.min((vw - padding*2) / contentW, (vh - padding*2) / contentH)));
  scale = newScale;
  offsetX = vw/2 - (minX + contentW/2) * scale;
  offsetY = vh/2 - (minY + contentH/2) * scale;
  updateTransform();
}

viewport.addEventListener("touchstart", e => {
  if (e.touches.length === 1) {
    isPanning = true;
    panSX = e.touches[0].clientX - offsetX;
    panSY = e.touches[0].clientY - offsetY;
  }
  if (e.touches.length === 2) {
    isPanning = false;
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    lastPinchDist = Math.sqrt(dx*dx + dy*dy);
    pinchMidX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
    pinchMidY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
  }
}, { passive: true });

viewport.addEventListener("touchmove", e => {
  e.preventDefault();
  if (e.touches.length === 1 && isPanning) {
    offsetX = e.touches[0].clientX - panSX;
    offsetY = e.touches[0].clientY - panSY;
    updateTransform();
  }
  if (e.touches.length === 2) {
    const dx   = e.touches[0].clientX - e.touches[1].clientX;
    const dy   = e.touches[0].clientY - e.touches[1].clientY;
    const dist = Math.sqrt(dx*dx + dy*dy);
    if (lastPinchDist !== 0) {
      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      const worldMidX = (midX - offsetX) / scale;
      const worldMidY = (midY - offsetY) / scale;
      scale = Math.min(3, Math.max(0.2, scale * (dist / lastPinchDist)));
      offsetX = midX - worldMidX * scale;
      offsetY = midY - worldMidY * scale;
      updateTransform();
    }
    lastPinchDist = dist;
  }
}, { passive: false });

viewport.addEventListener("touchend", () => { isPanning = false; lastPinchDist = 0; });

function viewCenter() {
  return {
    x: (viewport.clientWidth  / 2 - offsetX) / scale,
    y: (viewport.clientHeight / 2 - offsetY) / scale,
  };
}

/* ==============================
   HELPER TAP (fix 300ms iPhone)
================================*/
function tap(el, fn) {
  el.addEventListener("click", fn);
  el.addEventListener("touchstart", e => {
    e.stopPropagation();
    e.preventDefault();
    fn(e);
  }, { passive: false });
}

/* ==============================
   DRAG GÉNÉRIQUE
================================*/
function makeDraggable(el) {
  let active = false, sx = 0, sy = 0, ex = 0, ey = 0;

  el.addEventListener("touchstart", e => {
    if (e.touches.length !== 1) return;
    // ne pas démarrer le drag si on touche un handle ou bouton
    if (e.target.classList.contains("handle") || e.target.classList.contains("el-delete")) return;
    active = true;
    sx = e.touches[0].clientX; sy = e.touches[0].clientY;
    ex = parseFloat(el.style.left)||0; ey = parseFloat(el.style.top)||0;
    e.stopPropagation();
  }, { passive: true });

  el.addEventListener("touchmove", e => {
    if (!active || e.touches.length !== 1) return;
    el.style.left = (ex + (e.touches[0].clientX - sx) / scale) + "px";
    el.style.top  = (ey + (e.touches[0].clientY - sy) / scale) + "px";
    e.stopPropagation();
  }, { passive: true });

  el.addEventListener("touchend", () => { active = false; saveCurrentPage(); });
}

/* ==============================
   BOUTON SUPPRIMER
================================*/
function addDeleteButton(wrapper) {
  const btn = document.createElement("button");
  btn.className = "el-delete";
  btn.textContent = "✕";
  tap(btn, e => {
    e && e.stopPropagation && e.stopPropagation();
    if (wrapper === selectedEl) { selectedEl = null; hideColorPanel(); }
    wrapper.remove();
    saveCurrentPage();
  });
  wrapper.appendChild(btn);
}

/* ==============================
   TEXTE — pincer la bulle pour changer la taille
================================*/
function createText(x, y, content, fontSize) {
  if (content === undefined) content = "Double-tap pour écrire";
  if (!fontSize) fontSize = "16";

  const el = document.createElement("div");
  el.className     = "node";
  el.dataset.type  = "text";
  el.dataset.fontSize = fontSize;
  el.style.left    = x + "px";
  el.style.top     = y + "px";
  el.style.fontSize = fontSize + "px";
  el.innerHTML     = content;

  // Double tap → éditer
  let lastTap = 0;
  el.addEventListener("touchend", e => {
    const now = Date.now();
    if (now - lastTap < 350) { el.contentEditable = "true"; el.focus(); }
    lastTap = now;
  });
  el.addEventListener("dblclick", () => { el.contentEditable = "true"; el.focus(); });
  el.addEventListener("blur", () => { el.contentEditable = "false"; saveCurrentPage(); });
  el.addEventListener("input", saveCurrentPage);

  // Pinch sur la bulle = modifier la taille du texte
  let pinchStartDist = 0, pinchStartSize = 0;
  el.addEventListener("touchstart", e => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchStartDist = Math.sqrt(dx*dx + dy*dy);
      pinchStartSize = parseFloat(el.dataset.fontSize) || 16;
      e.stopPropagation();
      e.preventDefault();
    }
  }, { passive: false });

  el.addEventListener("touchmove", e => {
    if (e.touches.length === 2 && pinchStartDist > 0) {
      const dx   = e.touches[0].clientX - e.touches[1].clientX;
      const dy   = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx*dx + dy*dy);
      const newSize = Math.min(72, Math.max(10, pinchStartSize * (dist / pinchStartDist)));
      el.style.fontSize = newSize + "px";
      el.dataset.fontSize = Math.round(newSize);
      e.stopPropagation();
      e.preventDefault();
    }
  }, { passive: false });

  el.addEventListener("touchend", e => {
    if (pinchStartDist > 0) { pinchStartDist = 0; saveCurrentPage(); }
  });

  addDeleteButton(el);
  canvas.appendChild(el);
  makeDraggable(el);
}

/* ==============================
   FORMES — resize + rotation tactile
================================*/
function applyShape(el, shape, color, w, h, rotation) {
  el.style.width    = w + "px";
  el.style.height   = h + "px";
  el.style.background = color;
  el.style.transform  = "rotate(" + rotation + "deg)";
  el.dataset.color    = color;
  el.dataset.rotation = rotation;

  if (shape === "circle")   { el.style.borderRadius = "50%"; }
  else if (shape === "triangle") {
    el.style.background  = "transparent";
    el.style.borderLeft  = (w/2) + "px solid transparent";
    el.style.borderRight = (w/2) + "px solid transparent";
    el.style.borderBottom= h + "px solid " + color;
    el.style.borderRadius= "0";
    el.style.width = "0"; el.style.height = "0";
    el.dataset.triW = w; el.dataset.triH = h;
  }
  else if (shape === "diamond") {
    el.style.borderRadius = "0";
    el.style.transform = "rotate(" + (rotation+45) + "deg)";
  }
  else if (shape === "arrow") {
    el.style.background = "transparent";
    el.style.borderRadius = "0";
    el.innerHTML = el.innerHTML.replace(/<svg[\s\S]*<\/svg>/, "");
    const svg = document.createElementNS("http://www.w3.org/2000/svg","svg");
    svg.setAttribute("width","100%"); svg.setAttribute("height","100%");
    svg.setAttribute("viewBox","0 0 100 40"); svg.setAttribute("preserveAspectRatio","none");
    svg.innerHTML = '<line x1="5" y1="20" x2="80" y2="20" stroke="'+color+'" stroke-width="5" stroke-linecap="round"/><polygon points="72,8 100,20 72,32" fill="'+color+'"/>';
    el.appendChild(svg);
  }
  else { el.style.borderRadius = "10px"; }
}

function createShape(shape, x, y, color, w, h, rotation) {
  if (!color)    color    = "#4A90D9";
  if (!w)        w        = 140;
  if (!h)        h        = 80;
  if (!rotation) rotation = 0;

  const el = document.createElement("div");
  el.className      = "shape-el";
  el.dataset.type   = "shape";
  el.dataset.shape  = shape;
  el.style.left     = x + "px";
  el.style.top      = y + "px";
  applyShape(el, shape, color, w, h, rotation);

  // Sélection → afficher panneau couleur
  tap(el, e => {
    e && e.stopPropagation && e.stopPropagation();
    selectShape(el);
  });

  // Handle resize (coin bas-droite)
  const hResize = document.createElement("div");
  hResize.className = "handle handle-resize";
  hResize.textContent = "↘";

  let rsx = 0, rsy = 0, rw0 = 0, rh0 = 0;
  hResize.addEventListener("touchstart", e => {
    rsx = e.touches[0].clientX; rsy = e.touches[0].clientY;
    rw0 = parseFloat(el.style.width)  || w;
    rh0 = parseFloat(el.style.height) || h;
    e.stopPropagation(); e.preventDefault();
  }, { passive: false });
  hResize.addEventListener("touchmove", e => {
    const nw = Math.max(40, rw0 + (e.touches[0].clientX - rsx) / scale);
    const nh = Math.max(30, rh0 + (e.touches[0].clientY - rsy) / scale);
    const rot = parseFloat(el.dataset.rotation)||0;
    const col = el.dataset.color||color;
    applyShape(el, shape, col, nw, nh, rot);
    e.stopPropagation(); e.preventDefault();
  }, { passive: false });
  hResize.addEventListener("touchend", () => saveCurrentPage());

  // Handle rotation (coin bas-gauche)
  const hRotate = document.createElement("div");
  hRotate.className = "handle handle-rotate";
  hRotate.textContent = "↺";

  let rotStartAngle = 0, rotStartRot = 0;
  hRotate.addEventListener("touchstart", e => {
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top  + rect.height / 2;
    rotStartAngle = Math.atan2(e.touches[0].clientY - cy, e.touches[0].clientX - cx) * 180 / Math.PI;
    rotStartRot   = parseFloat(el.dataset.rotation) || 0;
    e.stopPropagation(); e.preventDefault();
  }, { passive: false });
  hRotate.addEventListener("touchmove", e => {
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top  + rect.height / 2;
    const angle = Math.atan2(e.touches[0].clientY - cy, e.touches[0].clientX - cx) * 180 / Math.PI;
    const newRot = rotStartRot + (angle - rotStartAngle);
    const col = el.dataset.color || color;
    const nw  = parseFloat(el.style.width)  || w;
    const nh  = parseFloat(el.style.height) || h;
    applyShape(el, shape, col, nw, nh, newRot);
    e.stopPropagation(); e.preventDefault();
  }, { passive: false });
  hRotate.addEventListener("touchend", () => saveCurrentPage());

  el.appendChild(hResize);
  el.appendChild(hRotate);
  addDeleteButton(el);
  canvas.appendChild(el);
  makeDraggable(el);
}

function selectShape(el) {
  if (selectedEl) selectedEl.classList.remove("selected");
  selectedEl = el;
  el.classList.add("selected");
  // Positionner le panneau couleur près de la forme
  const rect = el.getBoundingClientRect();
  colorPanel.style.top  = Math.min(window.innerHeight - 120, rect.bottom + 10) + "px";
  colorPanel.style.left = Math.max(70, Math.min(window.innerWidth - 200, rect.left)) + "px";
  colorPanel.classList.add("open");
}

function hideColorPanel() {
  colorPanel.classList.remove("open");
  if (selectedEl) { selectedEl.classList.remove("selected"); selectedEl = null; }
}

// Swatches couleur
document.querySelectorAll(".color-swatch").forEach(sw => {
  tap(sw, () => {
    if (!selectedEl) return;
    const color = sw.dataset.color;
    const shape = selectedEl.dataset.shape;
    const w     = parseFloat(selectedEl.style.width)  || 140;
    const h     = parseFloat(selectedEl.style.height) || 80;
    const rot   = parseFloat(selectedEl.dataset.rotation) || 0;
    applyShape(selectedEl, shape, color, w, h, rot);
    saveCurrentPage();
  });
});

// Clic fond = désélectionner
tap(viewport, () => hideColorPanel());

/* ==============================
   IMAGE — import base64
================================*/
function createImage(x, y, src, w, h) {
  const wrapper = document.createElement("div");
  wrapper.className    = "img-wrapper";
  wrapper.dataset.type = "image";
  wrapper.dataset.src  = src;
  wrapper.style.left   = x + "px";
  wrapper.style.top    = y + "px";

  const img = document.createElement("img");
  img.src       = src;
  img.draggable = false;
  if (w) img.style.maxWidth  = w + "px";
  if (h) img.style.maxHeight = h + "px";
  wrapper.appendChild(img);

  addDeleteButton(wrapper);
  canvas.appendChild(wrapper);
  makeDraggable(wrapper);
}

tap(addImageBtn, () => fileInput.click());

fileInput.addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    const c = viewCenter();
    createImage(c.x - 100, c.y - 80, ev.target.result);
    saveCurrentPage();
  };
  reader.readAsDataURL(file);
  fileInput.value = "";
});

/* ==============================
   SOUS-MENU FORMES
================================*/
let shapeMenuOpen = false;

tap(addShapeBtn, e => {
  shapeMenuOpen = !shapeMenuOpen;
  shapeMenu.classList.toggle("open", shapeMenuOpen);
  e && e.stopPropagation && e.stopPropagation();
});

document.querySelectorAll(".shape-opt").forEach(opt => {
  tap(opt, e => {
    e && e.stopPropagation && e.stopPropagation();
    const shape = opt.dataset.shape;
    const c = viewCenter();
    createShape(shape, c.x - 70, c.y - 40);
    shapeMenuOpen = false;
    shapeMenu.classList.remove("open");
  });
});

/* ==============================
   TEXTE + PAGES + DARK
================================*/
tap(addTextBtn, () => {
  const c = viewCenter();
  createText(c.x - 80, c.y - 20);
  saveCurrentPage();
});

tap(newPageBtn,  () => createPage());
tap(toggleDark,  () => document.body.classList.toggle("dark"));

/* ==============================
   INIT
================================*/
if (Object.keys(pages).length === 0) {
  createPage();
} else {
  loadPage(Object.keys(pages)[0]);
}

updateTransform();
