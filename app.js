/* ==============================
   RÉCUPÉRATION DES ÉLÉMENTS
================================*/
const sidebar     = document.getElementById("sidebar");
const toggleMenu  = document.getElementById("toggleMenu");
const addTextBtn  = document.getElementById("addText");
const addShapeBtn = document.getElementById("addShape");
const addImageBtn = document.getElementById("addImage");
const newPageBtn  = document.getElementById("newPage");
const toggleDark  = document.getElementById("toggleDark");
const fileInput   = document.getElementById("fileInput");
const pageList    = document.getElementById("pageList");
const viewport    = document.getElementById("viewport");
const canvas      = document.getElementById("canvas");

/* ==============================
   MENU REPLIABLE
================================*/
toggleMenu.addEventListener("click", () => {
  sidebar.classList.toggle("collapsed");
  document.body.classList.toggle("sidebar-collapsed");
});

/* ==============================
   SYSTÈME DE PAGES
================================*/
let pages = {};
try { pages = JSON.parse(localStorage.getItem("gdd_pages") || "{}"); } catch(e) { pages = {}; }
let currentPage = null;

function savePages() {
  try { localStorage.setItem("gdd_pages", JSON.stringify(pages)); } catch(e) {}
}

function loadPage(name) {
  currentPage = name;
  canvas.innerHTML = "";
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

    let lastTapTime = 0;
    label.addEventListener("touchend", () => {
      const now = Date.now();
      if (now - lastTapTime < 350) renamePage(name);
      lastTapTime = now;
    });
    label.addEventListener("dblclick", () => renamePage(name));

    const del = document.createElement("button");
    del.className = "page-del";
    del.textContent = "✕";
    tap(del, (e) => {
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
  const newName = prompt("Renommer :", oldName);
  if (!newName || newName === oldName || pages[newName] !== undefined) return;
  pages[newName] = pages[oldName];
  delete pages[oldName];
  if (currentPage === oldName) currentPage = newName;
  savePages();
  refreshPageList();
}

function createPage() {
  const name = "Page " + (Object.keys(pages).length + 1);
  pages[name] = [];
  loadPage(name);
}

/* ==============================
   CANVAS INFINI — PAN + PINCH ZOOM
================================*/
let offsetX = -24000;
let offsetY = -24000;
let scale   = 1;
let isPanning = false;
let panSX = 0, panSY = 0;
let lastPinchDist = 0;

function updateTransform() {
  canvas.style.transform = "translate(" + offsetX + "px, " + offsetY + "px) scale(" + scale + ")";
}

viewport.addEventListener("touchstart", e => {
  if (e.touches.length === 1) {
    isPanning = true;
    panSX = e.touches[0].clientX - offsetX;
    panSY = e.touches[0].clientY - offsetY;
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
      scale = Math.min(Math.max(scale + (dist - lastPinchDist) * 0.002, 0.2), 3);
      updateTransform();
    }
    lastPinchDist = dist;
  }
}, { passive: false });

viewport.addEventListener("touchend", () => {
  isPanning = false;
  lastPinchDist = 0;
});

/* ==============================
   HELPER : TAP FIABLE SUR IPHONE
   touchstart + preventDefault élimine le délai 300ms
   et empêche le conflit avec le pan du viewport
================================*/
function tap(el, handler) {
  el.addEventListener("click", handler);
  el.addEventListener("touchstart", e => {
    e.stopPropagation();
    e.preventDefault();
    handler(e);
  }, { passive: false });
}

/* ==============================
   CENTRE DE LA VUE COURANTE
================================*/
function viewCenter() {
  return {
    x: (viewport.clientWidth  / 2 - offsetX) / scale,
    y: (viewport.clientHeight / 2 - offsetY) / scale,
  };
}

/* ==============================
   DRAG DES ÉLÉMENTS SUR LE CANVAS
================================*/
function makeDraggable(el) {
  let active = false;
  let sx = 0, sy = 0, ex = 0, ey = 0;

  el.addEventListener("touchstart", e => {
    if (e.touches.length !== 1) return;
    active = true;
    sx = e.touches[0].clientX;
    sy = e.touches[0].clientY;
    ex = parseFloat(el.style.left) || 0;
    ey = parseFloat(el.style.top)  || 0;
    e.stopPropagation();
  }, { passive: true });

  el.addEventListener("touchmove", e => {
    if (!active || e.touches.length !== 1) return;
    el.style.left = (ex + (e.touches[0].clientX - sx) / scale) + "px";
    el.style.top  = (ey + (e.touches[0].clientY - sy) / scale) + "px";
    e.stopPropagation();
  }, { passive: true });

  el.addEventListener("touchend", () => {
    active = false;
    saveCurrentPage();
  });
}

/* ==============================
   BOUTON SUPPRIMER SUR LES ÉLÉMENTS
================================*/
function addDeleteButton(wrapper) {
  const btn = document.createElement("button");
  btn.className = "el-delete";
  btn.textContent = "✕";
  tap(btn, e => {
    e && e.stopPropagation && e.stopPropagation();
    wrapper.remove();
    saveCurrentPage();
  });
  wrapper.appendChild(btn);
}

/* ==============================
   SAUVEGARDE + RESTAURATION
================================*/
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
      item.text = clone.innerHTML;
    }
    if (type === "image") item.src = el.dataset.src || "";
    return item;
  });
  savePages();
}

function restoreElement(data) {
  if (data.type === "text")              createText(data.x, data.y, data.text);
  if (data.type === "shape")             createShape(data.x, data.y);
  if (data.type === "image" && data.src) createImage(data.x, data.y, data.src);
}

/* ==============================
   CRÉER UN TEXTE
================================*/
function createText(x, y, content) {
  if (content === undefined) content = "Double-tap pour écrire";
  const el = document.createElement("div");
  el.className    = "node";
  el.dataset.type = "text";
  el.style.left   = x + "px";
  el.style.top    = y + "px";
  el.innerHTML    = content;

  let lastTap = 0;
  el.addEventListener("touchend", e => {
    const now = Date.now();
    if (now - lastTap < 350) { el.contentEditable = "true"; el.focus(); }
    lastTap = now;
  });
  el.addEventListener("dblclick", () => { el.contentEditable = "true"; el.focus(); });
  el.addEventListener("blur", () => { el.contentEditable = "false"; saveCurrentPage(); });
  el.addEventListener("input", saveCurrentPage);

  addDeleteButton(el);
  canvas.appendChild(el);
  makeDraggable(el);
}

/* ==============================
   CRÉER UNE FORME
================================*/
function createShape(x, y) {
  const el = document.createElement("div");
  el.className    = "shape";
  el.dataset.type = "shape";
  el.style.left   = x + "px";
  el.style.top    = y + "px";
  addDeleteButton(el);
  canvas.appendChild(el);
  makeDraggable(el);
  saveCurrentPage();
}

/* ==============================
   CRÉER UNE IMAGE (base64)
================================*/
function createImage(x, y, src) {
  const wrapper = document.createElement("div");
  wrapper.className    = "img-wrapper";
  wrapper.dataset.type = "image";
  wrapper.dataset.src  = src;
  wrapper.style.left   = x + "px";
  wrapper.style.top    = y + "px";

  const img = document.createElement("img");
  img.src       = src;
  img.draggable = false;
  wrapper.appendChild(img);

  addDeleteButton(wrapper);
  canvas.appendChild(wrapper);
  makeDraggable(wrapper);
}

/* ==============================
   BOUTONS DE LA BARRE LATÉRALE
================================*/
tap(addTextBtn, () => {
  const c = viewCenter();
  createText(c.x - 80, c.y - 20);
  saveCurrentPage();
});

tap(addShapeBtn, () => {
  const c = viewCenter();
  createShape(c.x - 70, c.y - 40);
});

tap(addImageBtn, () => fileInput.click());
tap(newPageBtn,  () => createPage());
tap(toggleDark,  () => document.body.classList.toggle("dark"));

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
   INITIALISATION
================================*/
if (Object.keys(pages).length === 0) {
  createPage();
} else {
  loadPage(Object.keys(pages)[0]);
}

updateTransform();
