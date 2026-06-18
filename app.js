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
let pageOrder = [];
try { pageOrder = JSON.parse(localStorage.getItem("gdd_order") || "[]"); } catch(e) { pageOrder = []; }
let currentPage = null;
let selectedEl  = null;

/* ==============================
   SAUVEGARDE
================================*/
function savePages() {
  try {
    localStorage.setItem("gdd_pages", JSON.stringify(pages));
    localStorage.setItem("gdd_order", JSON.stringify(pageOrder));
  } catch(e) {}
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

function orderedPages() {
  // pageOrder peut être incomplet si pages a été modifié hors ordre
  const keys = Object.keys(pages);
  const ordered = pageOrder.filter(n => keys.includes(n));
  keys.forEach(k => { if (!ordered.includes(k)) ordered.push(k); });
  pageOrder = ordered;
  return ordered;
}

function refreshPageList() {
  pageList.innerHTML = "";
  orderedPages().forEach(name => {
    const row = document.createElement("div");
    row.className = "page-row" + (name === currentPage ? " active" : "");
    row.dataset.page = name;
    row.draggable = true;

    /* --- Label cliquable / renommable --- */
    const label = document.createElement("span");
    label.className = "page-label";
    label.textContent = name;

    // Tap simple = charger la page
    tap(label, () => loadPage(name));

    // Double-tap / double-clic = renommer inline
    let lastTapT = 0;
    const startRename = () => {
      const input = document.createElement("input");
      input.value = name;
      input.className = "page-rename-input";
      input.style.cssText = "flex:1;border:none;background:transparent;font-size:13px;font-weight:500;outline:none;color:inherit;width:100%;font-family:inherit;";
      label.replaceWith(input);
      input.focus();
      input.select();
      const commit = () => {
        const newName = input.value.trim();
        if (newName && newName !== name && !pages[newName]) {
          pages[newName] = pages[name];
          delete pages[name];
          pageOrder = pageOrder.map(n => n === name ? newName : n);
          if (currentPage === name) currentPage = newName;
          savePages();
          refreshPageList();
        } else {
          refreshPageList(); // annule
        }
      };
      input.addEventListener("blur", commit);
      input.addEventListener("keydown", e => {
        if (e.key === "Enter") { input.blur(); }
        if (e.key === "Escape") { name = name; refreshPageList(); }
      });
    };
    label.addEventListener("touchend", () => {
      const now = Date.now();
      if (now - lastTapT < 350) startRename();
      lastTapT = now;
    });
    label.addEventListener("dblclick", startRename);

    /* --- Bouton supprimer --- */
    const del = document.createElement("button");
    del.className = "page-del";
    del.textContent = "✕";
    tap(del, e => {
      e && e.stopPropagation && e.stopPropagation();
      if (orderedPages().length <= 1) return;
      if (!confirm("Supprimer \"" + name + "\" ?")) return;
      delete pages[name];
      pageOrder = pageOrder.filter(n => n !== name);
      savePages();
      if (currentPage === name) loadPage(orderedPages()[0]);
      else refreshPageList();
    });

    /* --- Drag & drop pour réordonner --- */
    row.addEventListener("dragstart", e => {
      e.dataTransfer.setData("text/plain", name);
      row.style.opacity = "0.4";
    });
    row.addEventListener("dragend", () => { row.style.opacity = ""; });
    row.addEventListener("dragover", e => {
      e.preventDefault();
      row.style.background = row.classList.contains("active") ? "" : "#eef";
    });
    row.addEventListener("dragleave", () => { row.style.background = ""; });
    row.addEventListener("drop", e => {
      e.preventDefault();
      row.style.background = "";
      const draggedName = e.dataTransfer.getData("text/plain");
      if (draggedName === name) return;
      const order = orderedPages();
      const from  = order.indexOf(draggedName);
      const to    = order.indexOf(name);
      if (from === -1 || to === -1) return;
      order.splice(from, 1);
      order.splice(to, 0, draggedName);
      pageOrder = order;
      savePages();
      refreshPageList();
    });

    // Réordonnement tactile (long press + glisser)
    let touchDragActive = false, touchDragEl = null, touchDragName = null;
    let longPressTimer = null;
    row.addEventListener("touchstart", e => {
      longPressTimer = setTimeout(() => {
        touchDragActive = true;
        touchDragName   = name;
        touchDragEl     = row;
        row.style.opacity = "0.45";
        row.style.boxShadow = "0 4px 16px rgba(0,0,0,0.18)";
      }, 400);
    }, { passive: true });
    row.addEventListener("touchmove", e => {
      clearTimeout(longPressTimer);
      if (!touchDragActive) return;
      const touch = e.touches[0];
      const els = document.elementsFromPoint(touch.clientX, touch.clientY);
      const target = els.find(el => el.classList.contains("page-row") && el !== row);
      if (target) {
        const targetName = target.dataset.page;
        const order = orderedPages();
        const from  = order.indexOf(touchDragName);
        const to    = order.indexOf(targetName);
        if (from !== -1 && to !== -1 && from !== to) {
          order.splice(from, 1);
          order.splice(to, 0, touchDragName);
          pageOrder = order;
          refreshPageList();
        }
      }
    }, { passive: true });
    row.addEventListener("touchend", () => {
      clearTimeout(longPressTimer);
      if (touchDragActive) {
        touchDragActive = false;
        savePages();
        refreshPageList();
      }
    });

    row.appendChild(label);
    row.appendChild(del);
    pageList.appendChild(row);
  });
}

function createPage() {
  const name = "Page " + (Object.keys(pages).length + 1);
  pages[name] = [];
  pageOrder.push(name);
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
   CANVAS INFINI — PAN + PINCH
================================*/
let offsetX = -24000, offsetY = -24000, scale = 1;
let isPanning = false, panSX = 0, panSY = 0;
let lastPinchDist = 0;

// Seuils pour distinguer pinch / double-tap
let touchStartCount = 0;       // nbre de doigts au touchstart
let touchWasPinch   = false;   // le dernier geste était un pinch
let lastBgTap = 0;

function updateTransform() {
  canvas.style.transform = "translate(" + offsetX + "px," + offsetY + "px) scale(" + scale + ")";
}

viewport.addEventListener("touchstart", e => {
  touchStartCount = e.touches.length;
  if (e.touches.length === 2) {
    touchWasPinch = true;
    isPanning = false;
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    lastPinchDist = Math.sqrt(dx*dx + dy*dy);
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

viewport.addEventListener("touchend", e => {
  isPanning = false;
  if (e.touches.length === 0) {
    // double-tap recentrer UNIQUEMENT si ce n'était pas un pinch
    if (!touchWasPinch) {
      const now = Date.now();
      if (e.target === viewport || e.target === canvas) {
        if (now - lastBgTap < 320) recenterOnContent();
        lastBgTap = now;
      }
    }
    lastPinchDist = 0;
    // reset après un léger délai (les doigts se lèvent en décalé)
    setTimeout(() => { touchWasPinch = false; }, 80);
  }
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
    if (x < minX) minX = x; if (y < minY) minY = y;
    if (x + w > maxX) maxX = x + w; if (y + h > maxY) maxY = y + h;
  });
  const cW = maxX - minX, cH = maxY - minY;
  const vw = viewport.clientWidth, vh = viewport.clientHeight;
  const pad = 60;
  scale = Math.min(3, Math.max(0.2, Math.min((vw - pad*2) / cW, (vh - pad*2) / cH)));
  offsetX = vw/2 - (minX + cW/2) * scale;
  offsetY = vh/2 - (minY + cH/2) * scale;
  updateTransform();
}

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
   TEXTE
================================*/
function createText(x, y, content, fontSize) {
  if (content === undefined) content = "Double-tap pour écrire";
  if (!fontSize) fontSize = "16";

  const el = document.createElement("div");
  el.className        = "node";
  el.dataset.type     = "text";
  el.dataset.fontSize = fontSize;
  el.style.left       = x + "px";
  el.style.top        = y + "px";
  el.style.fontSize   = fontSize + "px";
  el.innerHTML        = content;

  let lastTap = 0;
  el.addEventListener("touchend", e => {
    const now = Date.now();
    if (now - lastTap < 350) { el.contentEditable = "true"; el.focus(); }
    lastTap = now;
  });
  el.addEventListener("dblclick", () => { el.contentEditable = "true"; el.focus(); });
  el.addEventListener("blur",  () => { el.contentEditable = "false"; saveCurrentPage(); });
  el.addEventListener("input", saveCurrentPage);

  // Pinch sur la bulle = changer taille police
  let pinchStartDist = 0, pinchStartSize = 0;
  el.addEventListener("touchstart", e => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchStartDist = Math.sqrt(dx*dx + dy*dy);
      pinchStartSize = parseFloat(el.dataset.fontSize) || 16;
      e.stopPropagation(); e.preventDefault();
    }
  }, { passive: false });
  el.addEventListener("touchmove", e => {
    if (e.touches.length === 2 && pinchStartDist > 0) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx*dx + dy*dy);
      const newSize = Math.min(72, Math.max(10, pinchStartSize * (dist / pinchStartDist)));
      el.style.fontSize   = newSize + "px";
      el.dataset.fontSize = Math.round(newSize);
      e.stopPropagation(); e.preventDefault();
    }
  }, { passive: false });
  el.addEventListener("touchend", () => { if (pinchStartDist > 0) { pinchStartDist = 0; saveCurrentPage(); } });

  addDeleteButton(el);
  canvas.appendChild(el);
  makeDraggable(el);
}

/* ==============================
   FORMES
================================*/
function applyShape(el, shape, color, w, h, rotation) {
  el.style.width      = w + "px";
  el.style.height     = h + "px";
  el.style.background = color;
  el.style.transform  = "rotate(" + rotation + "deg)";
  el.dataset.color    = color;
  el.dataset.rotation = rotation;

  if (shape === "circle") {
    el.style.borderRadius = "50%";
  } else if (shape === "triangle") {
    el.style.background   = "transparent";
    el.style.borderLeft   = (w/2) + "px solid transparent";
    el.style.borderRight  = (w/2) + "px solid transparent";
    el.style.borderBottom = h + "px solid " + color;
    el.style.borderRadius = "0";
    el.style.width = "0"; el.style.height = "0";
    el.dataset.triW = w; el.dataset.triH = h;
  } else if (shape === "diamond") {
    el.style.borderRadius = "0";
    el.style.transform    = "rotate(" + (rotation + 45) + "deg)";
  } else if (shape === "arrow") {
    el.style.background   = "transparent";
    el.style.borderRadius = "0";
    el.innerHTML = el.innerHTML.replace(/<svg[\s\S]*<\/svg>/, "");
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width","100%"); svg.setAttribute("height","100%");
    svg.setAttribute("viewBox","0 0 100 40"); svg.setAttribute("preserveAspectRatio","none");
    svg.innerHTML = '<line x1="5" y1="20" x2="80" y2="20" stroke="'+color+'" stroke-width="5" stroke-linecap="round"/><polygon points="72,8 100,20 72,32" fill="'+color+'"/>';
    el.appendChild(svg);
  } else {
    el.style.borderRadius = "10px";
  }
}

function createShape(shape, x, y, color, w, h, rotation) {
  if (!color)    color    = "#4A90D9";
  if (!w)        w        = 140;
  if (!h)        h        = 80;
  if (!rotation) rotation = 0;

  const el = document.createElement("div");
  el.className     = "shape-el";
  el.dataset.type  = "shape";
  el.dataset.shape = shape;
  el.style.left    = x + "px";
  el.style.top     = y + "px";
  applyShape(el, shape, color, w, h, rotation);

  tap(el, e => { e && e.stopPropagation && e.stopPropagation(); selectShape(el); });

  // Resize
  const hResize = document.createElement("div");
  hResize.className = "handle handle-resize";
  hResize.textContent = "↘";
  let rsx = 0, rsy = 0, rw0 = 0, rh0 = 0;
  hResize.addEventListener("touchstart", e => {
    rsx = e.touches[0].clientX; rsy = e.touches[0].clientY;
    rw0 = parseFloat(el.style.width)||w; rh0 = parseFloat(el.style.height)||h;
    e.stopPropagation(); e.preventDefault();
  }, { passive: false });
  hResize.addEventListener("touchmove", e => {
    const nw  = Math.max(40, rw0 + (e.touches[0].clientX - rsx) / scale);
    const nh  = Math.max(30, rh0 + (e.touches[0].clientY - rsy) / scale);
    applyShape(el, shape, el.dataset.color||color, nw, nh, parseFloat(el.dataset.rotation)||0);
    e.stopPropagation(); e.preventDefault();
  }, { passive: false });
  hResize.addEventListener("touchend", () => saveCurrentPage());

  // Rotation
  const hRotate = document.createElement("div");
  hRotate.className = "handle handle-rotate";
  hRotate.textContent = "↺";
  let rotStartAngle = 0, rotStartRot = 0;
  hRotate.addEventListener("touchstart", e => {
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width/2, cy = rect.top + rect.height/2;
    rotStartAngle = Math.atan2(e.touches[0].clientY - cy, e.touches[0].clientX - cx) * 180 / Math.PI;
    rotStartRot   = parseFloat(el.dataset.rotation) || 0;
    e.stopPropagation(); e.preventDefault();
  }, { passive: false });
  hRotate.addEventListener("touchmove", e => {
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width/2, cy = rect.top + rect.height/2;
    const angle  = Math.atan2(e.touches[0].clientY - cy, e.touches[0].clientX - cx) * 180 / Math.PI;
    const newRot = rotStartRot + (angle - rotStartAngle);
    applyShape(el, shape, el.dataset.color||color, parseFloat(el.style.width)||w, parseFloat(el.style.height)||h, newRot);
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
  const rect = el.getBoundingClientRect();
  colorPanel.style.top  = Math.min(window.innerHeight - 120, rect.bottom + 10) + "px";
  colorPanel.style.left = Math.max(70, Math.min(window.innerWidth - 200, rect.left)) + "px";
  colorPanel.classList.add("open");
}

function hideColorPanel() {
  colorPanel.classList.remove("open");
  if (selectedEl) { selectedEl.classList.remove("selected"); selectedEl = null; }
}

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

tap(viewport, () => hideColorPanel());

/* ==============================
   IMAGE — CORRIGÉ
   Utilise un input file classique sans interférence tap()
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
  if (w) { img.style.maxWidth = w + "px"; wrapper.style.width = w + "px"; }
  if (h) { img.style.maxHeight = h + "px"; wrapper.style.height = h + "px"; }
  wrapper.appendChild(img);

  addDeleteButton(wrapper);
  canvas.appendChild(wrapper);
  makeDraggable(wrapper);
}

// On utilise un click natif pour l'input file (tap() bloquait le picker sur iOS)
addImageBtn.addEventListener("click", () => fileInput.click());
addImageBtn.addEventListener("touchend", e => {
  e.preventDefault();
  e.stopPropagation();
  fileInput.click();
}, { passive: false });

fileInput.addEventListener("change", e => {
  const file = e.target.files && e.target.files[0];
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
// Récupérer l'ordre sauvegardé ou l'inférer depuis les clés
if (pageOrder.length === 0) pageOrder = Object.keys(pages);

if (Object.keys(pages).length === 0) {
  createPage();
} else {
  loadPage(orderedPages()[0]);
}

updateTransform();