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
   BARRE DE FORMATAGE TEXTE
================================*/
const textToolbar = document.createElement("div");
textToolbar.id = "textToolbar";
textToolbar.innerHTML = `
  <button data-cmd="bold"        title="Gras"><b>G</b></button>
  <button data-cmd="italic"      title="Italique"><i>I</i></button>
  <button data-cmd="underline"   title="Souligné"><u>S</u></u></button>
  <div class="tb-sep"></div>
  <button data-cmd="fontSize-"   title="Réduire">A-</button>
  <span   id="tbFontSize">16</span>
  <button data-cmd="fontSize+"   title="Agrandir">A+</button>
  <div class="tb-sep"></div>
  <button data-cmd="justifyLeft"   title="Gauche">⬅</button>
  <button data-cmd="justifyCenter" title="Centre">↔</button>
  <button data-cmd="justifyRight"  title="Droite">➡</button>
  <div class="tb-sep"></div>
  <button data-cmd="color-#1a1a1a" style="background:#1a1a1a" class="tb-color" title="Noir"></button>
  <button data-cmd="color-#E74C3C" style="background:#E74C3C" class="tb-color" title="Rouge"></button>
  <button data-cmd="color-#4A90D9" style="background:#4A90D9" class="tb-color" title="Bleu"></button>
  <button data-cmd="color-#2ECC71" style="background:#2ECC71" class="tb-color" title="Vert"></button>
  <button data-cmd="color-#F39C12" style="background:#F39C12" class="tb-color" title="Orange"></button>
  <button data-cmd="color-#9B59B6" style="background:#9B59B6" class="tb-color" title="Violet"></button>
`;
document.body.appendChild(textToolbar);

// Style injecté dynamiquement
const tbStyle = document.createElement("style");
tbStyle.textContent = `
#textToolbar {
  display: none;
  position: fixed;
  z-index: 1000;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 14px;
  padding: 6px 8px;
  box-shadow: 0 6px 24px rgba(0,0,0,0.13);
  align-items: center;
  gap: 3px;
  flex-wrap: nowrap;
  overflow-x: auto;
  max-width: calc(100vw - 80px);
  scrollbar-width: none;
  touch-action: manipulation;
}
#textToolbar.visible { display: flex; }
#textToolbar button {
  height: 32px; min-width: 32px; padding: 0 6px;
  border: none; border-radius: 8px;
  background: transparent; cursor: pointer;
  font-size: 13px; font-family: inherit;
  color: #333; display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; touch-action: manipulation;
  transition: background 0.12s;
}
#textToolbar button:active { background: #f0f0f0; }
#textToolbar button.active { background: #e8e8ff; }
#textToolbar .tb-sep {
  width: 1px; height: 20px; background: #e5e5e5; margin: 0 2px; flex-shrink: 0;
}
#textToolbar #tbFontSize {
  font-size: 12px; color: #888; min-width: 24px; text-align: center;
  flex-shrink: 0;
}
#textToolbar .tb-color {
  width: 22px; height: 22px; min-width: 22px; border-radius: 50% !important;
  border: 2px solid rgba(0,0,0,0.08) !important; padding: 0;
}

/* Renommage page */
.page-rename-wrap {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 10px; width: 100%;
}
.page-rename-wrap input {
  flex: 1; border: 1px solid #ccc; border-radius: 6px;
  padding: 4px 8px; font-size: 13px; font-family: inherit;
  outline: none;
}
.page-rename-wrap button {
  background: #1a1a1a; color: #fff; border: none;
  border-radius: 6px; padding: 4px 10px; font-size: 12px;
  cursor: pointer; font-family: inherit;
}

/* Drag pages */
.page-row.drag-over { outline: 2px solid #6a6aff; outline-offset: -2px; }
.page-row.dragging  { opacity: 0.4; }
.page-drag-handle {
  cursor: grab; padding: 0 4px; color: #bbb; font-size: 16px;
  touch-action: none; user-select: none; flex-shrink: 0;
  line-height: 1;
}
`;
document.head.appendChild(tbStyle);

let activeTextNode = null;

function positionTextToolbar(el) {
  const rect = el.getBoundingClientRect();
  const tbH  = 50;
  let top  = rect.top - tbH - 8;
  if (top < 8) top = rect.bottom + 8;
  let left = rect.left;
  const maxLeft = window.innerWidth - textToolbar.offsetWidth - 8;
  if (left > maxLeft) left = maxLeft;
  if (left < 68) left = 68;
  textToolbar.style.top  = top + "px";
  textToolbar.style.left = left + "px";
}

function showTextToolbar(el) {
  activeTextNode = el;
  textToolbar.classList.add("visible");
  updateToolbarState(el);
  positionTextToolbar(el);
}

function hideTextToolbar() {
  textToolbar.classList.remove("visible");
  activeTextNode = null;
}

function updateToolbarState(el) {
  const size = parseInt(el.dataset.fontSize) || 16;
  const fsEl = document.getElementById("tbFontSize");
  if (fsEl) fsEl.textContent = size;
}

textToolbar.addEventListener("mousedown", e => e.preventDefault()); // garde le focus

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
      activeTextNode.style.fontSize   = s + "px";
      activeTextNode.dataset.fontSize = s;
      updateToolbarState(activeTextNode);
    }
    if (cmd === "fontSize-") {
      const s = Math.max(8, (parseInt(activeTextNode.dataset.fontSize)||16) - 2);
      activeTextNode.style.fontSize   = s + "px";
      activeTextNode.dataset.fontSize = s;
      updateToolbarState(activeTextNode);
    }
    if (cmd.startsWith("color-")) {
      const color = cmd.replace("color-","");
      document.execCommand("foreColor", false, color);
    }

    saveCurrentPage();
  };
  btn.addEventListener("mousedown", handler);
  btn.addEventListener("touchstart", handler, { passive: false });
});

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
    const item = { type, x: parseFloat(el.style.left)||0, y: parseFloat(el.style.top)||0 };
    if (type === "text") {
      const clone = el.cloneNode(true);
      clone.querySelector(".el-delete") && clone.querySelector(".el-delete").remove();
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
  selectedEl = null;
  hideColorPanel();
  hideTextToolbar();
  if (!pages[name]) pages[name] = [];
  pages[name].forEach(data => restoreElement(data));
  refreshPageList();
  savePages();
}

function createPage() {
  let n = 1;
  while (pages["Page " + n]) n++;
  const name = "Page " + n;
  pages[name] = [];
  pageOrder.push(name);
  loadPage(name);
}

/* ==============================
   LISTE DES PAGES
   — renommage par bouton ✎
   — réordonnement drag natif (desktop) + touch drag (mobile)
================================*/
// État drag tactile partagé entre les rows
let touchDragName    = null;
let touchDragRow     = null;
let touchDragActive  = false;
let touchDragLongTm  = null;
let touchDragPlaceholder = null;
let touchDragClone   = null;

function refreshPageList() {
  pageList.innerHTML = "";

  orderedPages().forEach(name => {
    const row = document.createElement("div");
    row.className   = "page-row" + (name === currentPage ? " active" : "");
    row.dataset.page = name;
    row.draggable   = true; // desktop drag

    /* — poignée de drag — */
    const grip = document.createElement("span");
    grip.className   = "page-drag-handle";
    grip.textContent = "⠿";
    grip.title       = "Maintenir pour déplacer";

    /* — label — */
    const label = document.createElement("span");
    label.className   = "page-label";
    label.textContent = name;
    label.style.cursor = "pointer";

    /* — bouton renommer ✎ — */
    const renBtn = document.createElement("button");
    renBtn.style.cssText = "background:none;border:none;cursor:pointer;padding:2px 4px;font-size:13px;color:#aaa;flex-shrink:0;touch-action:manipulation;";
    renBtn.textContent = "✎";
    renBtn.title = "Renommer";

    /* — bouton supprimer — */
    const del = document.createElement("button");
    del.className = "page-del";
    del.textContent = "✕";

    /* Charger page au tap sur le label */
    label.addEventListener("click",      () => loadPage(name));
    label.addEventListener("touchend",   e => { e.preventDefault(); loadPage(name); }, { passive: false });

    /* Renommer : affiche un champ inline dans la row */
    const startRename = e => {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      row.innerHTML = "";
      const wrap  = document.createElement("div");
      wrap.className = "page-rename-wrap";
      const inp   = document.createElement("input");
      inp.value   = name;
      inp.type    = "text";
      const ok    = document.createElement("button");
      ok.textContent = "OK";
      wrap.appendChild(inp); wrap.appendChild(ok);
      row.appendChild(wrap);
      inp.focus(); inp.select();
      const commit = () => {
        const newName = inp.value.trim();
        if (newName && newName !== name && !pages[newName]) {
          pages[newName] = pages[name];
          delete pages[name];
          pageOrder = pageOrder.map(n2 => n2 === name ? newName : n2);
          if (currentPage === name) currentPage = newName;
          savePages();
        }
        refreshPageList();
      };
      ok.addEventListener("click",     commit);
      ok.addEventListener("touchend",  e => { e.preventDefault(); commit(); }, { passive: false });
      inp.addEventListener("keydown",  e => { if (e.key === "Enter") commit(); if (e.key === "Escape") refreshPageList(); });
    };
    renBtn.addEventListener("click",    startRename);
    renBtn.addEventListener("touchend", startRename, { passive: false });

    /* Supprimer */
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
    del.addEventListener("click",    doDelete);
    del.addEventListener("touchend", doDelete, { passive: false });

    /* ====== DESKTOP DRAG & DROP ====== */
    row.addEventListener("dragstart", e => {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", name);
      setTimeout(() => row.classList.add("dragging"), 0);
    });
    row.addEventListener("dragend", () => row.classList.remove("dragging"));
    row.addEventListener("dragover", e => { e.preventDefault(); row.classList.add("drag-over"); });
    row.addEventListener("dragleave",() => row.classList.remove("drag-over"));
    row.addEventListener("drop", e => {
      e.preventDefault();
      row.classList.remove("drag-over");
      const fromName = e.dataTransfer.getData("text/plain");
      if (!fromName || fromName === name) return;
      const order = orderedPages();
      const fi = order.indexOf(fromName), ti = order.indexOf(name);
      if (fi < 0 || ti < 0) return;
      order.splice(fi, 1);
      order.splice(ti, 0, fromName);
      pageOrder = order;
      savePages();
      refreshPageList();
    });

    /* ====== TOUCH DRAG (appui long sur la poignée) ====== */
    grip.addEventListener("touchstart", e => {
      e.stopPropagation();
      const touch = e.touches[0];
      touchDragLongTm = setTimeout(() => {
        touchDragName   = name;
        touchDragRow    = row;
        touchDragActive = true;
        row.classList.add("dragging");
        // vibration légère si dispo
        if (navigator.vibrate) navigator.vibrate(40);
      }, 300);
    }, { passive: true });

    grip.addEventListener("touchmove", e => {
      if (!touchDragActive) { clearTimeout(touchDragLongTm); return; }
      e.stopPropagation();
      const touch = e.touches[0];
      // Trouver la row sous le doigt
      const els = document.elementsFromPoint(touch.clientX, touch.clientY);
      const target = els.find(el => el.classList && el.classList.contains("page-row") && el !== touchDragRow);
      if (target) {
        const tName = target.dataset.page;
        if (!tName) return;
        const order = orderedPages();
        const fi = order.indexOf(touchDragName);
        const ti = order.indexOf(tName);
        if (fi >= 0 && ti >= 0 && fi !== ti) {
          order.splice(fi, 1);
          order.splice(ti, 0, touchDragName);
          pageOrder = [...order];
          savePages();
          refreshPageList(); // re-render
          // Après re-render, retrouver la nouvelle row du dragged item
          touchDragRow = pageList.querySelector(`[data-page="${touchDragName}"]`);
          if (touchDragRow) touchDragRow.classList.add("dragging");
        }
      }
    }, { passive: false });

    grip.addEventListener("touchend", e => {
      clearTimeout(touchDragLongTm);
      if (touchDragActive) {
        touchDragActive = false;
        touchDragName   = null;
        touchDragRow    = null;
        refreshPageList();
      }
    }, { passive: true });

    grip.addEventListener("touchcancel", () => {
      clearTimeout(touchDragLongTm);
      touchDragActive = false;
      touchDragName   = null;
      touchDragRow    = null;
      refreshPageList();
    });

    row.appendChild(grip);
    row.appendChild(label);
    row.appendChild(renBtn);
    row.appendChild(del);
    pageList.appendChild(row);
  });
}

/* ==============================
   SIDEBAR
================================*/
tap(toggleMenu, () => {
  sidebar.classList.toggle("expanded");
  document.body.classList.toggle("sidebar-expanded");
});

/* ==============================
   CANVAS — PAN + PINCH
================================*/
let offsetX = -24000, offsetY = -24000, scale = 1;
let isPanning = false, panSX = 0, panSY = 0;
let lastPinchDist = 0;
let touchWasPinch = false;
let lastBgTap = 0;

function updateTransform() {
  canvas.style.transform = "translate("+offsetX+"px,"+offsetY+"px) scale("+scale+")";
}

viewport.addEventListener("touchstart", e => {
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
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    const dist = Math.sqrt(dx*dx + dy*dy);
    if (lastPinchDist !== 0) {
      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      const wX = (midX - offsetX) / scale;
      const wY = (midY - offsetY) / scale;
      scale = Math.min(3, Math.max(0.2, scale * (dist / lastPinchDist)));
      offsetX = midX - wX * scale;
      offsetY = midY - wY * scale;
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
      lastBgTap = now;
    }
    lastPinchDist = 0;
    setTimeout(() => { touchWasPinch = false; }, 100);
  }
});

function recenterOnContent() {
  const items = [...canvas.children];
  if (!items.length) { offsetX = -24000; offsetY = -24000; scale = 1; updateTransform(); return; }
  let mnX=Infinity,mnY=Infinity,mxX=-Infinity,mxY=-Infinity;
  items.forEach(el => {
    const x=parseFloat(el.style.left)||0, y=parseFloat(el.style.top)||0;
    const w=parseFloat(el.style.width)||150, h=parseFloat(el.style.height)||80;
    if(x<mnX)mnX=x; if(y<mnY)mnY=y; if(x+w>mxX)mxX=x+w; if(y+h>mxY)mxY=y+h;
  });
  const cW=mxX-mnX, cH=mxY-mnY;
  const vw=viewport.clientWidth, vh=viewport.clientHeight, pad=60;
  scale = Math.min(3, Math.max(0.2, Math.min((vw-pad*2)/cW, (vh-pad*2)/cH)));
  offsetX = vw/2-(mnX+cW/2)*scale;
  offsetY = vh/2-(mnY+cH/2)*scale;
  updateTransform();
}

function viewCenter() {
  return { x:(viewport.clientWidth/2-offsetX)/scale, y:(viewport.clientHeight/2-offsetY)/scale };
}

/* ==============================
   HELPER TAP
================================*/
function tap(el, fn) {
  el.addEventListener("click", fn);
  el.addEventListener("touchstart", e => {
    e.stopPropagation(); e.preventDefault(); fn(e);
  }, { passive: false });
}

/* ==============================
   DRAG GÉNÉRIQUE
================================*/
function makeDraggable(el) {
  let active=false, sx=0, sy=0, ex=0, ey=0;
  el.addEventListener("touchstart", e => {
    if (e.touches.length !== 1) return;
    if (e.target.classList.contains("handle")||e.target.classList.contains("el-delete")) return;
    active=true;
    sx=e.touches[0].clientX; sy=e.touches[0].clientY;
    ex=parseFloat(el.style.left)||0; ey=parseFloat(el.style.top)||0;
    e.stopPropagation();
  }, { passive: true });
  el.addEventListener("touchmove", e => {
    if (!active||e.touches.length!==1) return;
    el.style.left = (ex+(e.touches[0].clientX-sx)/scale)+"px";
    el.style.top  = (ey+(e.touches[0].clientY-sy)/scale)+"px";
    e.stopPropagation();
  }, { passive: true });
  el.addEventListener("touchend", () => { active=false; saveCurrentPage(); });
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
    if (wrapper===selectedEl) { selectedEl=null; hideColorPanel(); }
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

  const enterEdit = () => {
    el.contentEditable = "true";
    el.focus();
    showTextToolbar(el);
  };

  let lastTap = 0;
  el.addEventListener("touchend", e => {
    if (el.contentEditable === "true") return; // déjà en édition
    const now = Date.now();
    if (now - lastTap < 350) enterEdit();
    lastTap = now;
  });
  el.addEventListener("dblclick", () => enterEdit());
  el.addEventListener("blur", () => {
    el.contentEditable = "false";
    // délai pour laisser le toolbar gérer son propre click avant de disparaître
    setTimeout(() => {
      if (document.activeElement !== el) hideTextToolbar();
    }, 200);
    saveCurrentPage();
  });
  el.addEventListener("focus", () => {
    if (el.contentEditable === "true") showTextToolbar(el);
  });
  el.addEventListener("input", () => {
    updateToolbarState(el);
    saveCurrentPage();
  });
  el.addEventListener("keyup", () => updateToolbarState(el));

  // Pinch = taille
  let pinchDist0=0, pinchSize0=0;
  el.addEventListener("touchstart", e => {
    if (e.touches.length===2) {
      const dx=e.touches[0].clientX-e.touches[1].clientX;
      const dy=e.touches[0].clientY-e.touches[1].clientY;
      pinchDist0=Math.sqrt(dx*dx+dy*dy);
      pinchSize0=parseFloat(el.dataset.fontSize)||16;
      e.stopPropagation(); e.preventDefault();
    }
  }, { passive: false });
  el.addEventListener("touchmove", e => {
    if (e.touches.length===2 && pinchDist0>0) {
      const dx=e.touches[0].clientX-e.touches[1].clientX;
      const dy=e.touches[0].clientY-e.touches[1].clientY;
      const s=Math.min(72,Math.max(8,pinchSize0*(Math.sqrt(dx*dx+dy*dy)/pinchDist0)));
      el.style.fontSize=s+"px"; el.dataset.fontSize=Math.round(s);
      updateToolbarState(el);
      e.stopPropagation(); e.preventDefault();
    }
  }, { passive: false });
  el.addEventListener("touchend", () => { if(pinchDist0>0){pinchDist0=0;saveCurrentPage();} });

  addDeleteButton(el);
  canvas.appendChild(el);
  makeDraggable(el);
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
    el.innerHTML=el.innerHTML.replace(/<svg[\s\S]*<\/svg>/,"");
    const svg=document.createElementNS("http://www.w3.org/2000/svg","svg");
    svg.setAttribute("width","100%"); svg.setAttribute("height","100%");
    svg.setAttribute("viewBox","0 0 100 40"); svg.setAttribute("preserveAspectRatio","none");
    svg.innerHTML='<line x1="5" y1="20" x2="80" y2="20" stroke="'+color+'" stroke-width="5" stroke-linecap="round"/><polygon points="72,8 100,20 72,32" fill="'+color+'"/>';
    el.appendChild(svg);
  } else { el.style.borderRadius="10px"; }
}

function createShape(shape, x, y, color, w, h, rotation) {
  if (!color) color="#4A90D9"; if (!w) w=140; if (!h) h=80; if (!rotation) rotation=0;
  const el=document.createElement("div");
  el.className="shape-el"; el.dataset.type="shape"; el.dataset.shape=shape;
  el.style.left=x+"px"; el.style.top=y+"px";
  applyShape(el, shape, color, w, h, rotation);
  tap(el, e => { e&&e.stopPropagation&&e.stopPropagation(); selectShape(el); });

  const hR=document.createElement("div"); hR.className="handle handle-resize"; hR.textContent="↘";
  let rsx=0,rsy=0,rw0=0,rh0=0;
  hR.addEventListener("touchstart",e=>{rsx=e.touches[0].clientX;rsy=e.touches[0].clientY;rw0=parseFloat(el.style.width)||w;rh0=parseFloat(el.style.height)||h;e.stopPropagation();e.preventDefault();},{passive:false});
  hR.addEventListener("touchmove",e=>{const nw=Math.max(40,rw0+(e.touches[0].clientX-rsx)/scale),nh=Math.max(30,rh0+(e.touches[0].clientY-rsy)/scale);applyShape(el,shape,el.dataset.color||color,nw,nh,parseFloat(el.dataset.rotation)||0);e.stopPropagation();e.preventDefault();},{passive:false});
  hR.addEventListener("touchend",()=>saveCurrentPage());

  const hRot=document.createElement("div"); hRot.className="handle handle-rotate"; hRot.textContent="↺";
  let ra=0,rr=0;
  hRot.addEventListener("touchstart",e=>{const rect=el.getBoundingClientRect(),cx=rect.left+rect.width/2,cy=rect.top+rect.height/2;ra=Math.atan2(e.touches[0].clientY-cy,e.touches[0].clientX-cx)*180/Math.PI;rr=parseFloat(el.dataset.rotation)||0;e.stopPropagation();e.preventDefault();},{passive:false});
  hRot.addEventListener("touchmove",e=>{const rect=el.getBoundingClientRect(),cx=rect.left+rect.width/2,cy=rect.top+rect.height/2;const a=Math.atan2(e.touches[0].clientY-cy,e.touches[0].clientX-cx)*180/Math.PI;applyShape(el,shape,el.dataset.color||color,parseFloat(el.style.width)||w,parseFloat(el.style.height)||h,rr+(a-ra));e.stopPropagation();e.preventDefault();},{passive:false});
  hRot.addEventListener("touchend",()=>saveCurrentPage());

  el.appendChild(hR); el.appendChild(hRot);
  addDeleteButton(el); canvas.appendChild(el); makeDraggable(el);
}

function selectShape(el) {
  if (selectedEl) selectedEl.classList.remove("selected");
  selectedEl=el; el.classList.add("selected");
  const rect=el.getBoundingClientRect();
  colorPanel.style.top=Math.min(window.innerHeight-120,rect.bottom+10)+"px";
  colorPanel.style.left=Math.max(70,Math.min(window.innerWidth-200,rect.left))+"px";
  colorPanel.classList.add("open");
}
function hideColorPanel() {
  colorPanel.classList.remove("open");
  if (selectedEl) { selectedEl.classList.remove("selected"); selectedEl=null; }
}

document.querySelectorAll(".color-swatch").forEach(sw=>{
  tap(sw,()=>{
    if(!selectedEl)return;
    applyShape(selectedEl,selectedEl.dataset.shape,sw.dataset.color,parseFloat(selectedEl.style.width)||140,parseFloat(selectedEl.style.height)||80,parseFloat(selectedEl.dataset.rotation)||0);
    saveCurrentPage();
  });
});
tap(viewport, () => hideColorPanel());

/* ==============================
   IMAGE
================================*/
function createImage(x, y, src, w, h) {
  const wrapper=document.createElement("div");
  wrapper.className="img-wrapper"; wrapper.dataset.type="image"; wrapper.dataset.src=src;
  wrapper.style.left=x+"px"; wrapper.style.top=y+"px";
  const img=document.createElement("img"); img.src=src; img.draggable=false;
  if(w){img.style.maxWidth=w+"px"; wrapper.style.width=w+"px";}
  if(h){img.style.maxHeight=h+"px"; wrapper.style.height=h+"px";}
  wrapper.appendChild(img);
  addDeleteButton(wrapper); canvas.appendChild(wrapper); makeDraggable(wrapper);
}

addImageBtn.addEventListener("click",     () => fileInput.click());
addImageBtn.addEventListener("touchend",  e  => { e.preventDefault(); e.stopPropagation(); fileInput.click(); }, { passive:false });

fileInput.addEventListener("change", e => {
  const file=e.target.files&&e.target.files[0]; if(!file)return;
  const reader=new FileReader();
  reader.onload=ev=>{ const c=viewCenter(); createImage(c.x-100,c.y-80,ev.target.result); saveCurrentPage(); };
  reader.readAsDataURL(file); fileInput.value="";
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
  });
});

/* ==============================
   TEXTE / PAGES / DARK
================================*/
tap(addTextBtn, ()=>{ const c=viewCenter(); createText(c.x-80,c.y-20); saveCurrentPage(); });
tap(newPageBtn,  ()=>createPage());
tap(toggleDark,  ()=>document.body.classList.toggle("dark"));

/* ==============================
   INIT
================================*/
if (!pageOrder.length) pageOrder=Object.keys(pages);
if (!Object.keys(pages).length) { createPage(); } else { loadPage(orderedPages()[0]); }
updateTransform();