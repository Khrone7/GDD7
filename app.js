/* ------------------------------
   RÉCUPÉRATION DES ÉLÉMENTS HTML
--------------------------------*/
const sidebar = document.getElementById("sidebar");
const toggleMenu = document.getElementById("toggleMenu");

const addText = document.getElementById("addText");
const addShape = document.getElementById("addShape");
const addImage = document.getElementById("addImage");
const newPage = document.getElementById("newPage");
const toggleDark = document.getElementById("toggleDark");

const fileInput = document.getElementById("fileInput");
const pageList = document.getElementById("pageList");
const viewport = document.getElementById("viewport");
const canvas = document.getElementById("canvas");

/* ------------------------------
   MENU REPLIABLE
--------------------------------*/
toggleMenu.onclick = () => {
  sidebar.classList.toggle("collapsed");
};

/* ------------------------------
   SYSTEME DE PAGES
--------------------------------*/
let pages = JSON.parse(localStorage.getItem("gdd_pages") || "{}");
let currentPage = null;

function savePages() {
  localStorage.setItem("gdd_pages", JSON.stringify(pages));
}

function loadPage(name) {
  currentPage = name;
  canvas.innerHTML = "";
  if (!pages[name]) pages[name] = [];
  pages[name].forEach(el => restoreElement(el));
  refreshPageList();
  savePages();
}

function refreshPageList() {
  pageList.innerHTML = "";
  Object.keys(pages).forEach(name => {
    const div = document.createElement("div");
    div.className = "tool";
    div.textContent = name;
    div.onclick = () => loadPage(name);
    pageList.appendChild(div);
  });
}

function createPage() {
  const name = "Page " + (Object.keys(pages).length + 1);
  pages[name] = [];
  loadPage(name);
}

/* ------------------------------
   CANVAS INFINI + TOUCH CONTROLS
--------------------------------*/
let offsetX = -24000;
let offsetY = -24000;
let scale = 1;

let isPanning = false;
let startX = 0, startY = 0;

function updateTransform() {
  canvas.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
}

/* PAN AU DOIGT */
viewport.addEventListener("touchstart", e => {
  if (e.touches.length === 1) {
    isPanning = true;
    startX = e.touches[0].clientX - offsetX;
    startY = e.touches[0].clientY - offsetY;
  }
});

/* PINCH ZOOM */
let lastDist = 0;

viewport.addEventListener("touchmove", e => {
  e.preventDefault();

  if (e.touches.length === 1 && isPanning) {
    offsetX = e.touches[0].clientX - startX;
    offsetY = e.touches[0].clientY - startY;
    updateTransform();
  }

  if (e.touches.length === 2) {
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    const dist = Math.sqrt(dx*dx + dy*dy);

    if (lastDist !== 0) {
      const delta = dist - lastDist;
      scale += delta * 0.002;
      scale = Math.min(Math.max(scale, 0.2), 3);
      updateTransform();
    }
    lastDist = dist;
  }
}, { passive: false });

viewport.addEventListener("touchend", () => {
  isPanning = false;
  lastDist = 0;
});

/* ------------------------------
   CREATION D’ELEMENTS
--------------------------------*/
function makeDraggable(el) {
  let dragging = false;
  let sx = 0, sy = 0, ex = 0, ey = 0;

  el.addEventListener("touchstart", e => {
    dragging = true;
    sx = e.touches[0].clientX;
    sy = e.touches[0].clientY;
    ex = parseFloat(el.style.left);
    ey = parseFloat(el.style.top);
    e.stopPropagation();
  });

  el.addEventListener("touchmove", e => {
    if (!dragging) return;
    const dx = (e.touches[0].clientX - sx) / scale;
    const dy = (e.touches[0].clientY - sy) / scale;
    el.style.left = ex + dx + "px";
    el.style.top = ey + dy + "px";
  });

  el.addEventListener("touchend", () => {
    dragging = false;
    saveCurrentPage();
  });
}

function saveCurrentPage() {
  if (!currentPage) return;
  pages[currentPage] = [...canvas.children].map(el => ({
    type: el.dataset.type,
    x: parseFloat(el.style.left),
    y: parseFloat(el.style.top),
    text: el.innerHTML,
    src: el.dataset.src || null
  }));
  savePages();
}

function restoreElement(data) {
  if (data.type === "text") createText(data.x, data.y, data.text);
  if (data.type === "shape") createShape(data.x, data.y);
  if (data.type === "image") createImage(data.x, data.y, data.src);
}

function createText(x, y, content = "Double-tap pour écrire") {
  const el = document.createElement("div");
  el.className = "node";
  el.dataset.type = "text";
  el.style.left = x + "px";
  el.style.top = y + "px";
  el.innerHTML = content;
  el.ondblclick = () => el.contentEditable = true;
  el.oninput = saveCurrentPage;
  canvas.appendChild(el);
  makeDraggable(el);
}

function createShape(x, y) {
  const el = document.createElement("div");
  el.className = "shape";
  el.dataset.type = "shape";
  el.style.left = x + "px";
  el.style.top = y + "px";
  canvas.appendChild(el);
  makeDraggable(el);
}

function createImage(x, y, src) {
  const el = document.createElement("img");
  el.className = "img-item";
  el.dataset.type = "image";
  el.dataset.src = src;
  el.src = src;
  el.style.left = x + "px";
  el.style.top = y + "px";
  canvas.appendChild(el);
  makeDraggable(el);
}

/* ------------------------------
   BOUTONS DU MENU
--------------------------------*/
addText.onclick = () => createText(25000, 25000);
addShape.onclick = () => createShape(25000, 25000);

addImage.onclick = () => fileInput.click();
fileInput.onchange = e => {
  const file = e.target.files[0];
  const url = URL.createObjectURL(file);
  createImage(25000, 25000, url);
  saveCurrentPage();
};

newPage.onclick = () => createPage();

toggleDark.onclick = () => {
  document.body.classList.toggle("dark");
};

/* ------------------------------
   INITIALISATION
--------------------------------*/
if (Object.keys(pages).length === 0) {
  createPage();
} else {
  loadPage(Object.keys(pages)[0]);
}

updateTransform();
