/* ==============================
   ÉLÉMENTS DOM
================================*/
const sidebar        = document.getElementById("sidebar");
const toggleMenu     = document.getElementById("toggleMenu");
const addTextBtn     = document.getElementById("addText");
const addShapeBtn    = document.getElementById("addShape");
const shapeMenu      = document.getElementById("shapeMenu");
const addImageBtn    = document.getElementById("addImage");
const addChecklistBtn= document.getElementById("addChecklist");
const selectModeBtn  = document.getElementById("selectMode");
const linkModeBtn    = document.getElementById("linkMode");
const tagModeBtn     = document.getElementById("tagMode");
const undoBtn        = document.getElementById("undoBtn");
const redoBtn        = document.getElementById("redoBtn");
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
   BARRE DE FORMATAGE TEXTE (injectée)
================================*/
const textToolbar = document.createElement("div");
textToolbar.id = "textToolbar";
textToolbar.innerHTML = `
  <button data-cmd="bold"><b>G</b></button>
  <button data-cmd="italic"><i>I</i></button>
  <button data-cmd="underline"><u>S</u></button>
  <div class="tb-sep"></div>
  <button data-cmd="fontSize-">A−</button>
  <span id="tbFontSize">16</span>
  <button data-cmd="fontSize+">A+</button>
  <div class="tb-sep"></div>
  <button data-cmd="justifyLeft">⬅</button>
  <button data-cmd="justifyCenter">↔</button>
  <button data-cmd="justifyRight">➡</button>
  <div class="tb-sep"></div>
  <button data-cmd="col-#1a1a1a" style="background:#1a1a1a" class="tb-col"></button>
  <button data-cmd="col-#E74C3C" style="background:#E74C3C" class="tb-col"></button>
  <button data-cmd="col-#4A90D9" style="background:#4A90D9" class="tb-col"></button>
  <button data-cmd="col-#2ECC71" style="background:#2ECC71" class="tb-col"></button>
  <button data-cmd="col-#F39C12" style="background:#F39C12" class="tb-col"></button>
  <button data-cmd="col-#9B59B6" style="background:#9B59B6" class="tb-col"></button>
`;
document.body.appendChild(textToolbar);

const dynStyle = document.createElement("style");
dynStyle.textContent = `
/* ---- BARRE TEXTE ---- */
#textToolbar {
  display:none; position:fixed; z-index:1100;
  background:#fff; border:1px solid #e0e0e0; border-radius:14px;
  padding:5px 8px; box-shadow:0 6px 24px rgba(0,0,0,0.13);
  align-items:center; gap:2px; flex-wrap:nowrap;
  overflow-x:auto; max-width:calc(100vw - 80px);
  scrollbar-width:none; touch-action:manipulation;
}
#textToolbar.visible { display:flex; }
#textToolbar button {
  height:30px; min-width:30px; padding:0 5px; border:none; border-radius:7px;
  background:transparent; cursor:pointer; font-size:13px; font-family:inherit;
  color:#333; display:flex; align-items:center; justify-content:center;
  flex-shrink:0; touch-action:manipulation; transition:background .1s;
}
#textToolbar button:active { background:#f0f0f0; }
#textToolbar .tb-sep { width:1px; height:18px; background:#e5e5e5; margin:0 2px; flex-shrink:0; }
#textToolbar #tbFontSize { font-size:11px; color:#888; min-width:22px; text-align:center; flex-shrink:0; }
#textToolbar .tb-col { width:20px; height:20px; min-width:20px; border-radius:50% !important; border:2px solid rgba(0,0,0,.08) !important; padding:0; }
body.dark #textToolbar { background:#2a2a2a; border-color:#3a3a3a; }
body.dark #textToolbar button { color:#ddd; }
body.dark #textToolbar button:active { background:#3a3a3a; }

/* ---- MINIMAP ---- */
#minimap {
  position:fixed; bottom:16px; right:16px; width:120px; height:82px;
  background:#fff; border:1px solid #ddd; border-radius:10px;
  box-shadow:0 4px 18px rgba(0,0,0,0.13); overflow:hidden; z-index:400;
  cursor:pointer; touch-action:manipulation;
}
#minimap canvas { width:100%; height:100%; display:block; }
#minimapViewport {
  position:absolute; border:2px solid rgba(100,100,255,0.7); border-radius:3px;
  background:rgba(100,100,255,0.08); pointer-events:none; top:0; left:0;
}
body.dark #minimap { background:#1e1e1e; border-color:#333; }

/* ---- BOUTON CALQUES ---- */
#layerBtn {
  display:none; position:fixed; z-index:600;
  background:#fff; border:1px solid #e0e0e0; border-radius:10px;
  box-shadow:0 4px 14px rgba(0,0,0,0.13); flex-direction:column; overflow:hidden;
}
#layerBtn.visible { display:flex; }
#layerBtn button {
  width:34px; height:30px; border:none; background:transparent;
  font-size:15px; cursor:pointer; touch-action:manipulation; color:#444;
  transition:background .1s; line-height:1;
  display:flex; align-items:center; justify-content:center;
}
#layerBtn button:active { background:#f0f0f0; }
#layerBtn button:first-child { border-bottom:1px solid #eee; }
body.dark #layerBtn { background:#2a2a2a; border-color:#3a3a3a; }
body.dark #layerBtn button { color:#ddd; }
body.dark #layerBtn button:first-child { border-color:#3a3a3a; }

/* ---- PANNEAU CHECKLIST OPTIONS ---- */
#checklistPanel {
  display:none; position:fixed; z-index:700;
  background:#fff; border:1px solid #e8e8e8; border-radius:16px;
  padding:12px 14px; box-shadow:0 8px 28px rgba(0,0,0,0.13);
  flex-direction:column; gap:10px; width:210px;
}
#checklistPanel.open { display:flex; }
#checklistPanel label { font-size:12px; color:#888; font-weight:600; text-transform:uppercase; letter-spacing:.05em; }
.cl-color-row { display:flex; gap:6px; flex-wrap:wrap; }
.cl-col-swatch {
  width:24px; height:24px; border-radius:50%; cursor:pointer; flex-shrink:0;
  border:2px solid transparent; box-shadow:0 1px 4px rgba(0,0,0,0.12); touch-action:manipulation;
}
.cl-col-swatch.active { border-color:#1a1a1a; }
.cl-border-row { display:flex; gap:5px; }
.cl-style-btn {
  flex:1; padding:6px 4px; border:1px solid #e0e0e0; border-radius:8px;
  background:#f8f8f8; font-size:11px; cursor:pointer; touch-action:manipulation;
  font-family:inherit; color:#444; transition:background .1s;
}
.cl-style-btn.active { background:#1a1a1a; color:#fff; border-color:#1a1a1a; }
.cl-icon-row { display:flex; gap:5px; }
.cl-icon-btn {
  flex:1; padding:6px 4px; border:1px solid #e0e0e0; border-radius:8px;
  background:#f8f8f8; font-size:14px; cursor:pointer; touch-action:manipulation; text-align:center;
}
.cl-icon-btn.active { background:#e8e8ff; border-color:#9b9bdc; }
body.dark #checklistPanel { background:#2a2a2a; border-color:#3a3a3a; color:#ddd; }
body.dark .cl-style-btn { background:#333; border-color:#444; color:#ccc; }
body.dark .cl-style-btn.active { background:#fff; color:#1a1a1a; }
body.dark .cl-icon-btn { background:#333; border-color:#444; }
body.dark .cl-icon-btn.active { background:#3a3a6a; border-color:#6a6adc; }

/* ---- PANNEAU GROUPE OPTIONS ---- */
#groupPanel {
  display:none; position:fixed; z-index:700;
  background:#fff; border:1px solid #e8e8e8; border-radius:16px;
  padding:12px 14px; box-shadow:0 8px 28px rgba(0,0,0,0.13);
  flex-direction:column; gap:10px; width:210px;
}
#groupPanel.open { display:flex; }
#groupPanel label { font-size:12px; color:#888; font-weight:600; text-transform:uppercase; letter-spacing:.05em; }
#groupNameInput {
  border:1px solid #ddd; border-radius:9px; padding:7px 10px;
  font-size:14px; font-family:inherit; outline:none; width:100%;
}
#groupNameInput:focus { border-color:#999; }
.gp-color-row { display:flex; gap:6px; flex-wrap:wrap; }
.gp-col-swatch {
  width:24px; height:24px; border-radius:50%; cursor:pointer; flex-shrink:0;
  border:2px solid transparent; box-shadow:0 1px 4px rgba(0,0,0,0.12); touch-action:manipulation;
}
.gp-col-swatch.active { border-color:#1a1a1a; }
.gp-style-row { display:flex; gap:5px; }
.gp-style-btn {
  flex:1; padding:6px 4px; border:1px solid #e0e0e0; border-radius:8px;
  background:#f8f8f8; font-size:11px; cursor:pointer; touch-action:manipulation;
  font-family:inherit; color:#444;
}
.gp-style-btn.active { background:#1a1a1a; color:#fff; border-color:#1a1a1a; }
.gp-actions { display:flex; gap:8px; }
.gp-actions button {
  flex:1; padding:8px; border:none; border-radius:9px; font-size:12.5px;
  cursor:pointer; font-family:inherit; font-weight:600; touch-action:manipulation;
}
#gpSave { background:#1a1a1a; color:#fff; }
#gpDelete { background:#f5f5f5; color:#e74c3c; }
body.dark #groupPanel { background:#2a2a2a; border-color:#3a3a3a; }
body.dark #groupNameInput { background:#333; border-color:#444; color:#eee; }
body.dark .gp-style-btn { background:#333; border-color:#444; color:#ccc; }
body.dark .gp-style-btn.active { background:#fff; color:#1a1a1a; }

/* ---- PAGE RENAME ---- */
.page-rename-wrap { display:flex; align-items:center; gap:6px; padding:6px 10px; width:100%; }
.page-rename-wrap input { flex:1; border:1px solid #ccc; border-radius:6px; padding:4px 8px; font-size:13px; font-family:inherit; outline:none; }
.page-rename-wrap button { background:#1a1a1a; color:#fff; border:none; border-radius:6px; padding:4px 10px; font-size:12px; cursor:pointer; font-family:inherit; }
.page-drag-handle { cursor:grab; padding:0 4px; color:#bbb; font-size:16px; touch-action:none; user-select:none; flex-shrink:0; line-height:1; }
.page-row.drag-over { outline:2px solid #6a6aff; outline-offset:-2px; }
.page-row.dragging { opacity:0.4; }
`;
document.head.appendChild(dynStyle);

/* ==============================
   ÉTAT GLOBAL
================================*/
let pages = {};
try { pages = JSON.parse(localStorage.getItem("gdd_pages") || "{}"); } catch(e) { pages = {}; }
let pageOrder = [];
try { pageOrder = JSON.parse(localStorage.getItem("gdd_order") || "[]"); } catch(e) { pageOrder = []; }
let currentPage = null;
let selectedEl  = null;
let elIdCounter = Date.now();

let activeMode = null;
let multiSelection = new Set();
let linkFirstEl = null;
let tagTargetEl = null;

let undoStack = [], redoStack = [], suppressHistory = false;

/* ==============================
   HELPER TAP
================================*/
function tap(el, fn) {
  el.addEventListener("click", fn);
  el.addEventListener("touchstart", e => { e.stopPropagation(); e.preventDefault(); fn(e); }, { passive: false });
}

function nextElId() { return "el" + (elIdCounter++); }

/* ==============================
   BARRE TEXTE LOGIQUE
================================*/
let activeTextNode = null;

function positionTextToolbar(el) {
  const rect = el.getBoundingClientRect();
  let top = rect.top - 46;
  if (top < 8) top = rect.bottom + 8;
  let left = rect.left;
  if (left + textToolbar.offsetWidth + 8 > window.innerWidth) left = window.innerWidth - textToolbar.offsetWidth - 8;
  if (left < 68) left = 68;
  textToolbar.style.top  = top + "px";
  textToolbar.style.left = left + "px";
}

function showTextToolbar(el) {
  activeTextNode = el;
  textToolbar.classList.add("visible");
  updateTBState(el);
  positionTextToolbar(el);
}
function hideTextToolbar() { textToolbar.classList.remove("visible"); activeTextNode = null; }
function updateTBState(el) {
  const sz = document.getElementById("tbFontSize");
  if (sz) sz.textContent = parseInt(el.dataset.fontSize) || 16;
}

textToolbar.addEventListener("mousedown", e => e.preventDefault());
textToolbar.querySelectorAll("button[data-cmd]").forEach(btn => {
  const h = e => {
    e.preventDefault(); e.stopPropagation();
    if (!activeTextNode) return;
    const cmd = btn.dataset.cmd;
    if (cmd === "bold")          document.execCommand("bold");
    if (cmd === "italic")        document.execCommand("italic");
    if (cmd === "underline")     document.execCommand("underline");
    if (cmd === "justifyLeft")   document.execCommand("justifyLeft");
    if (cmd === "justifyCenter") document.execCommand("justifyCenter");
    if (cmd === "justifyRight")  document.execCommand("justifyRight");
    if (cmd === "fontSize+") {
      const s = Math.min(72, (parseInt(activeTextNode.dataset.fontSize)||16) + 2);
      activeTextNode.style.fontSize = s + "px"; activeTextNode.dataset.fontSize = s; updateTBState(activeTextNode);
    }
    if (cmd === "fontSize-") {
      const s = Math.max(8, (parseInt(activeTextNode.dataset.fontSize)||16) - 2);
      activeTextNode.style.fontSize = s + "px"; activeTextNode.dataset.fontSize = s; updateTBState(activeTextNode);
    }
    if (cmd.startsWith("col-")) document.execCommand("foreColor", false, cmd.replace("col-",""));
    saveCurrentPage(false);
  };
  btn.addEventListener("mousedown", h);
  btn.addEventListener("touchstart", h, { passive: false });
});

/* ==============================
   MINIMAP
================================*/
const minimapEl = document.createElement("div");
minimapEl.id = "minimap";
const mmCvs = document.createElement("canvas");
mmCvs.width = 240; mmCvs.height = 164;
const mmVP = document.createElement("div");
mmVP.id = "minimapViewport";
minimapEl.appendChild(mmCvs);
minimapEl.appendChild(mmVP);
document.body.appendChild(minimapEl);

const MM_W = 4000, MM_H = 3000;

function getMMOrigin() {
  const cx = -offsetX/scale + viewport.clientWidth/2/scale;
  const cy = -offsetY/scale + viewport.clientHeight/2/scale;
  return { x: cx - MM_W/2, y: cy - MM_H/2 };
}

function updateMinimap() {
  const ctx = mmCvs.getContext("2d");
  const mw = mmCvs.width, mh = mmCvs.height;
  const dark = document.body.classList.contains("dark");
  ctx.clearRect(0, 0, mw, mh);
  ctx.fillStyle = dark ? "#1e1e1e" : "#f5f4f2";
  ctx.fillRect(0, 0, mw, mh);
  const org = getMMOrigin(), sx = mw/MM_W, sy = mh/MM_H;

  canvas.querySelectorAll(".node,.shape-el,.img-wrapper,.checklist-el,.group-frame").forEach(el => {
    const wx = (parseFloat(el.style.left)||0) - org.x;
    const wy = (parseFloat(el.style.top) ||0) - org.y;
    const ww = parseFloat(el.style.width)  || el.offsetWidth  || 140;
    const wh = parseFloat(el.style.height) || el.offsetHeight || 60;
    const mx = wx*sx, my = wy*sy, mew = Math.max(4,ww*sx), meh = Math.max(3,wh*sy);
    if (mx+mew<0||my+meh<0||mx>mw||my>mh) return;
    ctx.save();
    if (el.classList.contains("group-frame")) {
      ctx.strokeStyle = el.dataset.borderColor || "#9b9bdc";
      ctx.setLineDash([4,3]); ctx.lineWidth=1;
      ctx.strokeRect(mx,my,mew,meh); ctx.setLineDash([]);
    } else if (el.dataset.type === "text") {
      ctx.fillStyle = dark?"#2e2e2e":"#fff"; ctx.strokeStyle = dark?"#444":"#e0e0e0"; ctx.lineWidth=1;
      ctx.beginPath(); ctx.roundRect(mx,my,mew,meh,3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = dark?"#666":"#d0d0d0";
      const lh=Math.max(2,meh*.18),gap=lh*1.7;
      for(let l=0;l*gap+lh<meh-4;l++) ctx.fillRect(mx+3,my+3+l*gap,Math.min(l===0?mew*.7:mew*.5,mew-6),lh);
    } else if (el.dataset.type === "image") {
      ctx.fillStyle = dark?"#333":"#e0e0e0"; ctx.strokeStyle = dark?"#444":"#ccc"; ctx.lineWidth=1;
      ctx.beginPath(); ctx.roundRect(mx,my,mew,meh,3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = dark?"#555":"#b0b0b0";
      ctx.beginPath(); ctx.arc(mx+mew/2,my+meh/2,Math.min(mew,meh)*.22,0,Math.PI*2); ctx.fill();
    } else if (el.dataset.type === "checklist") {
      ctx.fillStyle = dark?"#2a2812":"#fffdf2"; ctx.strokeStyle = dark?"#4a4525":"#f0e6c0"; ctx.lineWidth=1;
      ctx.beginPath(); ctx.roundRect(mx,my,mew,meh,3); ctx.fill(); ctx.stroke();
    } else if (el.dataset.type === "shape") {
      ctx.fillStyle = el.dataset.color||"#4A90D9"; ctx.globalAlpha=0.85;
      const shape = el.dataset.shape;
      if (shape==="circle") { ctx.beginPath(); ctx.ellipse(mx+mew/2,my+meh/2,mew/2,meh/2,0,0,Math.PI*2); ctx.fill(); }
      else if (shape==="arrow") { ctx.strokeStyle=ctx.fillStyle; ctx.lineWidth=Math.max(1.5,meh*.15); ctx.beginPath(); ctx.moveTo(mx,my+meh/2); ctx.lineTo(mx+mew*.8,my+meh/2); ctx.stroke(); }
      else { ctx.beginPath(); ctx.roundRect(mx,my,mew,meh,2); ctx.fill(); }
    }
    ctx.restore();
  });

  const vpX = (-offsetX/scale - org.x)*sx, vpY = (-offsetY/scale - org.y)*sy;
  const vpW = (viewport.clientWidth/scale)*sx, vpH = (viewport.clientHeight/scale)*sy;
  mmVP.style.left  =(vpX/mw*100).toFixed(1)+"%"; mmVP.style.top   =(vpY/mh*100).toFixed(1)+"%";
  mmVP.style.width =(vpW/mw*100).toFixed(1)+"%"; mmVP.style.height=(vpH/mh*100).toFixed(1)+"%";
}

minimapEl.addEventListener("click", e => {
  const r=minimapEl.getBoundingClientRect(), org=getMMOrigin();
  const wx=org.x+(e.clientX-r.left)/r.width*MM_W, wy=org.y+(e.clientY-r.top)/r.height*MM_H;
  offsetX=viewport.clientWidth/2-wx*scale; offsetY=viewport.clientHeight/2-wy*scale;
  updateTransform();
});

let mmRaf=null;
function scheduleMM(){ if(!mmRaf) mmRaf=requestAnimationFrame(()=>{mmRaf=null;updateMinimap();}); }
new MutationObserver(scheduleMM).observe(canvas,{childList:true,subtree:true,attributes:true,attributeFilter:["style"]});

/* ==============================
   BOUTON CALQUES
================================*/
const layerBtn = document.createElement("div");
layerBtn.id = "layerBtn";
layerBtn.innerHTML = `<button id="layerUp">↑</button><button id="layerDown">↓</button>`;
document.body.appendChild(layerBtn);

let layerTarget = null;
function showLayerBtn(el) { layerTarget=el; posLayerBtn(el); layerBtn.classList.add("visible"); }
function hideLayerBtn()   { layerBtn.classList.remove("visible"); layerTarget=null; }
function posLayerBtn(el) {
  const rect=el.getBoundingClientRect();
  let left=rect.left-42; if(left<68) left=rect.right+6;
  let top=rect.top+rect.height/2-30; top=Math.max(8,Math.min(top,window.innerHeight-70));
  layerBtn.style.left=left+"px"; layerBtn.style.top=top+"px";
}
function layerMove(el,dir) {
  if(!el||!el.parentNode)return;
  if(dir>0){const n=el.nextElementSibling; if(n)el.parentNode.insertBefore(n,el);}
  else{const p=el.previousElementSibling; if(p)el.parentNode.insertBefore(el,p);}
  saveCurrentPage(); scheduleMM(); if(layerTarget)posLayerBtn(layerTarget);
}
["layerUp","layerDown"].forEach((id,i) => {
  const btn=document.getElementById(id);
  const h=e=>{e.preventDefault();e.stopPropagation();layerMove(layerTarget,i===0?1:-1);};
  btn.addEventListener("click",h); btn.addEventListener("touchend",h,{passive:false});
});

/* ==============================
   PANNEAU CHECKLIST OPTIONS
================================*/
const checklistPanel = document.createElement("div");
checklistPanel.id = "checklistPanel";
checklistPanel.innerHTML = `
  <label>Couleur de fond</label>
  <div class="cl-color-row">
    ${["#fffdf2","#e8f4fd","#f0fff0","#fdf0f8","#f5f5f5","#1e1e2e"].map(c=>`<div class="cl-col-swatch" data-color="${c}" style="background:${c};${c==='#f5f5f5'?'border:1.5px solid #ddd;':''}"></div>`).join("")}
  </div>
  <label>Style du cadre</label>
  <div class="cl-border-row">
    <button class="cl-style-btn active" data-border="solid">Plein</button>
    <button class="cl-style-btn" data-border="dashed">Pointillé</button>
    <button class="cl-style-btn" data-border="none">Aucun</button>
  </div>
  <label>Icône des items</label>
  <div class="cl-icon-row">
    <button class="cl-icon-btn active" data-icon="checkbox">☑</button>
    <button class="cl-icon-btn" data-icon="bullet">•</button>
    <button class="cl-icon-btn" data-icon="star">★</button>
    <button class="cl-icon-btn" data-icon="arrow">→</button>
  </div>
`;
document.body.appendChild(checklistPanel);

let checklistTarget = null;

function openChecklistPanel(el) {
  checklistTarget = el;
  const rect = el.getBoundingClientRect();
  checklistPanel.style.top  = Math.min(window.innerHeight-280, rect.bottom+10) + "px";
  checklistPanel.style.left = Math.max(70, Math.min(window.innerWidth-220, rect.left)) + "px";
  checklistPanel.classList.add("open");
  // Sync état actuel
  checklistPanel.querySelectorAll(".cl-col-swatch").forEach(s=>s.classList.toggle("active", s.dataset.color===(el.dataset.bgColor||"#fffdf2")));
  checklistPanel.querySelectorAll(".cl-style-btn").forEach(s=>s.classList.toggle("active", s.dataset.border===(el.dataset.borderStyle||"solid")));
  checklistPanel.querySelectorAll(".cl-icon-btn").forEach(s=>s.classList.toggle("active", s.dataset.icon===(el.dataset.itemIcon||"checkbox")));
}
function closeChecklistPanel() { checklistPanel.classList.remove("open"); checklistTarget=null; }

checklistPanel.querySelectorAll(".cl-col-swatch").forEach(sw => {
  tap(sw, () => {
    if (!checklistTarget) return;
    checklistTarget.style.background = sw.dataset.color;
    checklistTarget.dataset.bgColor  = sw.dataset.color;
    // Adapter couleur texte si fond sombre
    const isDark = sw.dataset.color === "#1e1e2e";
    checklistTarget.style.color = isDark ? "#eee" : "";
    checklistTarget.querySelector(".checklist-title").style.color = isDark ? "#c9b96a" : "";
    checklistPanel.querySelectorAll(".cl-col-swatch").forEach(s=>s.classList.toggle("active",s===sw));
    saveCurrentPage();
  });
});
checklistPanel.querySelectorAll(".cl-style-btn").forEach(btn => {
  tap(btn, () => {
    if (!checklistTarget) return;
    const b = btn.dataset.border;
    checklistTarget.style.borderStyle = b==="none"?"none":b;
    checklistTarget.dataset.borderStyle = b;
    checklistPanel.querySelectorAll(".cl-style-btn").forEach(s=>s.classList.toggle("active",s===btn));
    saveCurrentPage();
  });
});
checklistPanel.querySelectorAll(".cl-icon-btn").forEach(btn => {
  tap(btn, () => {
    if (!checklistTarget) return;
    checklistTarget.dataset.itemIcon = btn.dataset.icon;
    updateChecklistIcons(checklistTarget);
    checklistPanel.querySelectorAll(".cl-icon-btn").forEach(s=>s.classList.toggle("active",s===btn));
    saveCurrentPage();
  });
});

function updateChecklistIcons(el) {
  const icon = el.dataset.itemIcon || "checkbox";
  const ICONS = { checkbox:"☐", bullet:"•", star:"★", arrow:"→" };
  const DONE_ICONS = { checkbox:"☑", bullet:"•", star:"★", arrow:"→" };
  if (icon === "checkbox") {
    el.querySelectorAll(".ci-icon-display").forEach(d=>d.remove());
    el.querySelectorAll("input[type=checkbox]").forEach(cb=>cb.style.display="");
    return;
  }
  el.querySelectorAll("input[type=checkbox]").forEach((cb,i) => {
    cb.style.display = "none";
    let disp = cb.parentElement.querySelector(".ci-icon-display");
    if (!disp) { disp=document.createElement("span"); disp.className="ci-icon-display"; cb.after(disp); }
    const done = cb.parentElement.classList.contains("done");
    disp.textContent = done ? DONE_ICONS[icon] : ICONS[icon];
    disp.style.cssText="font-size:14px;flex-shrink:0;cursor:pointer;touch-action:manipulation;";
    disp.onclick=()=>{ cb.click(); };
  });
}

/* ==============================
   PANNEAU GROUPE OPTIONS
================================*/
const groupPanel = document.createElement("div");
groupPanel.id = "groupPanel";
groupPanel.innerHTML = `
  <label>Nom du groupe</label>
  <input type="text" id="groupNameInput" maxlength="40" />
  <label>Couleur du cadre</label>
  <div class="gp-color-row">
    ${["#9b9bdc","#4A90D9","#E74C3C","#2ECC71","#F39C12","#9B59B6","#1a1a1a"].map(c=>`<div class="gp-col-swatch" data-color="${c}" style="background:${c}"></div>`).join("")}
  </div>
  <label>Style du cadre</label>
  <div class="gp-style-row">
    <button class="gp-style-btn active" data-style="dashed">Pointillé</button>
    <button class="gp-style-btn" data-style="solid">Plein</button>
    <button class="gp-style-btn" data-style="dotted">Pointé</button>
  </div>
  <div class="gp-actions">
    <button id="gpSave">Enregistrer</button>
    <button id="gpDelete">Supprimer</button>
  </div>
`;
document.body.appendChild(groupPanel);

let groupPanelTarget = null;

function openGroupPanel(frame) {
  groupPanelTarget = frame;
  const rect = frame.getBoundingClientRect();
  groupPanel.style.top  = Math.min(window.innerHeight-320, rect.bottom+10) + "px";
  groupPanel.style.left = Math.max(70, Math.min(window.innerWidth-220, rect.left)) + "px";
  groupPanel.classList.add("open");
  document.getElementById("groupNameInput").value = frame.dataset.label || "Groupe";
  groupPanel.querySelectorAll(".gp-col-swatch").forEach(s=>s.classList.toggle("active", s.dataset.color===(frame.dataset.borderColor||"#9b9bdc")));
  groupPanel.querySelectorAll(".gp-style-btn").forEach(s=>s.classList.toggle("active", s.dataset.style===(frame.dataset.borderStyle||"dashed")));
}
function closeGroupPanel() { groupPanel.classList.remove("open"); groupPanelTarget=null; }

groupPanel.querySelectorAll(".gp-col-swatch").forEach(sw => {
  tap(sw, () => {
    if (!groupPanelTarget) return;
    groupPanelTarget.style.borderColor = sw.dataset.color;
    groupPanelTarget.dataset.borderColor = sw.dataset.color;
    groupPanelTarget.querySelector(".group-label").style.color = sw.dataset.color;
    groupPanel.querySelectorAll(".gp-col-swatch").forEach(s=>s.classList.toggle("active",s===sw));
  });
});
groupPanel.querySelectorAll(".gp-style-btn").forEach(btn => {
  tap(btn, () => {
    if (!groupPanelTarget) return;
    groupPanelTarget.style.borderStyle = btn.dataset.style;
    groupPanelTarget.dataset.borderStyle = btn.dataset.style;
    groupPanel.querySelectorAll(".gp-style-btn").forEach(s=>s.classList.toggle("active",s===btn));
  });
});
tap(document.getElementById("gpSave"), () => {
  if (!groupPanelTarget) return;
  const name = document.getElementById("groupNameInput").value.trim() || "Groupe";
  groupPanelTarget.dataset.label = name;
  groupPanelTarget.querySelector(".group-label").textContent = name;
  closeGroupPanel(); saveCurrentPage();
});
tap(document.getElementById("gpDelete"), () => {
  if (!groupPanelTarget) return;
  if (confirm("Supprimer ce groupe ?")) { groupPanelTarget.remove(); closeGroupPanel(); saveCurrentPage(); }
});

/* ==============================
   SAUVEGARDE / SÉRIALISATION
================================*/
function savePages() {
  try {
    localStorage.setItem("gdd_pages", JSON.stringify(pages));
    localStorage.setItem("gdd_order", JSON.stringify(pageOrder));
  } catch(e) {}
}

function serializeCanvas() {
  const items = [...canvas.querySelectorAll(":scope > .node, :scope > .shape-el, :scope > .img-wrapper, :scope > .checklist-el")]
    .map(el => serializeEl(el));
  const links = [...linksLayer.querySelectorAll("line[data-from]")].map(line=>({from:line.dataset.from,to:line.dataset.to}));
  const groups = [...canvas.querySelectorAll(":scope > .group-frame")].map(g=>({
    id:g.dataset.id, label:g.dataset.label||"Groupe",
    x:parseFloat(g.style.left)||0, y:parseFloat(g.style.top)||0,
    w:parseFloat(g.style.width)||0, h:parseFloat(g.style.height)||0,
    members:(g.dataset.members||"").split(",").filter(Boolean),
    borderColor:g.dataset.borderColor||"#9b9bdc", borderStyle:g.dataset.borderStyle||"dashed"
  }));
  return { items, links, groups };
}

function serializeEl(el) {
  const type=el.dataset.type;
  const item={id:el.dataset.id,type,x:parseFloat(el.style.left)||0,y:parseFloat(el.style.top)||0,tag:el.dataset.tag||"",tagColor:el.dataset.tagColor||""};
  if(type==="text"){
    const clone=el.cloneNode(true);
    [".el-delete",".elem-tag",".link-anchor"].forEach(s=>clone.querySelector(s)?.remove());
    item.text=clone.innerHTML; item.fontSize=el.dataset.fontSize||"16";
  }
  if(type==="shape"){item.shape=el.dataset.shape;item.color=el.dataset.color||"#E8E8FF";item.w=parseFloat(el.style.width)||140;item.h=parseFloat(el.style.height)||80;item.rotation=parseFloat(el.dataset.rotation)||0;}
  if(type==="image"){item.src=el.dataset.src||"";item.w=parseFloat(el.style.width)||200;item.h=parseFloat(el.style.height)||200;}
  if(type==="checklist"){
    item.title=el.querySelector(".checklist-title")?.value||"Checklist";
    item.bgColor=el.dataset.bgColor||""; item.borderStyle=el.dataset.borderStyle||"solid"; item.itemIcon=el.dataset.itemIcon||"checkbox";
    item.checkItems=[...el.querySelectorAll(".checklist-item")].map(r=>({text:r.querySelector(".ci-text")?.innerText||"",done:r.querySelector("input[type=checkbox]")?.checked||false}));
  }
  return item;
}

function saveCurrentPage(pushHist) {
  if (!currentPage) return;
  const snap = serializeCanvas();
  pages[currentPage] = snap; savePages();
  if (pushHist!==false && !suppressHistory) pushUndo(snap);
  scheduleLinksRedraw(); scheduleMM();
}

/* ==============================
   UNDO / REDO
================================*/
function pushUndo(snap) {
  undoStack.push(JSON.stringify(snap));
  if(undoStack.length>50)undoStack.shift();
  redoStack=[]; updateUndoBtns();
}
function updateUndoBtns() {
  undoBtn.style.opacity=undoStack.length>1?"1":"0.35";
  redoBtn.style.opacity=redoStack.length>0?"1":"0.35";
}
function doUndo() {
  if(undoStack.length<=1)return;
  redoStack.push(undoStack.pop());
  suppressHistory=true; restoreSnapshot(JSON.parse(undoStack[undoStack.length-1])); suppressHistory=false;
  updateUndoBtns();
}
function doRedo() {
  if(!redoStack.length)return;
  const snap=redoStack.pop(); undoStack.push(snap);
  suppressHistory=true; restoreSnapshot(JSON.parse(snap)); suppressHistory=false;
  updateUndoBtns();
}
function restoreSnapshot(snap) {
  canvas.innerHTML=""; linksLayer.innerHTML=""; deselectAll();
  (snap.items||[]).forEach(d=>restoreElement(d));
  (snap.groups||[]).forEach(g=>restoreGroup(g));
  (snap.links||[]).forEach(l=>drawLink(l.from,l.to));
  pages[currentPage]=snap; savePages();
}

/* ==============================
   RESTAURATION
================================*/
function restoreElement(data) {
  let el=null;
  if(data.type==="text")      el=createText(data.x,data.y,data.text,data.fontSize,data.id);
  if(data.type==="shape")     el=createShape(data.shape,data.x,data.y,data.color,data.w,data.h,data.rotation,data.id);
  if(data.type==="image"&&data.src) el=createImage(data.x,data.y,data.src,data.w,data.h,data.id);
  if(data.type==="checklist") el=createChecklist(data.x,data.y,data.title,data.checkItems,data.id,data.bgColor,data.borderStyle,data.itemIcon);
  if(el&&data.tag) applyTag(el,data.tag,data.tagColor);
  return el;
}

function restoreGroup(g) {
  const frame=document.createElement("div");
  frame.className="group-frame"; frame.dataset.id=g.id; frame.dataset.label=g.label;
  frame.dataset.members=g.members.join(",");
  frame.style.left=g.x+"px"; frame.style.top=g.y+"px"; frame.style.width=g.w+"px"; frame.style.height=g.h+"px";
  if(g.borderColor){frame.style.borderColor=g.borderColor;frame.dataset.borderColor=g.borderColor;}
  if(g.borderStyle){frame.style.borderStyle=g.borderStyle;frame.dataset.borderStyle=g.borderStyle;}
  const lbl=document.createElement("div"); lbl.className="group-label"; lbl.textContent=g.label;
  if(g.borderColor) lbl.style.color=g.borderColor;
  frame.appendChild(lbl);
  canvas.insertBefore(frame,canvas.firstChild);
  makeGroupDraggable(frame);
  return frame;
}

/* ==============================
   PAGES
================================*/
function orderedPages() {
  const keys=Object.keys(pages);
  const ordered=pageOrder.filter(n=>keys.includes(n));
  keys.forEach(k=>{if(!ordered.includes(k))ordered.push(k);});
  pageOrder=ordered; return ordered;
}

function loadPage(name) {
  currentPage=name; canvas.innerHTML=""; linksLayer.innerHTML="";
  deselectAll(); hideTextToolbar(); closeChecklistPanel(); closeGroupPanel(); hideLayerBtn();
  exitAllModes();
  if(!pages[name]) pages[name]={items:[],links:[],groups:[]};
  const data=pages[name];
  (data.items||[]).forEach(d=>restoreElement(d));
  (data.groups||[]).forEach(g=>restoreGroup(g));
  (data.links||[]).forEach(l=>drawLink(l.from,l.to));
  refreshPageList(); savePages();
  undoStack=[JSON.stringify(serializeCanvas())]; redoStack=[]; updateUndoBtns();
  scheduleLinksRedraw(); scheduleMM();
}

function createPage() {
  let n=1; while(pages["Page "+n])n++;
  const name="Page "+n;
  pages[name]={items:[],links:[],groups:[]}; pageOrder.push(name); loadPage(name);
}

/* ==============================
   LISTE DES PAGES
================================*/
let touchDragName=null,touchDragRow=null,touchDragActive=false,touchDragLongTm=null;

function refreshPageList() {
  pageList.innerHTML="";
  orderedPages().forEach(name=>{
    const row=document.createElement("div");
    row.className="page-row"+(name===currentPage?" active":""); row.dataset.page=name; row.draggable=true;
    const grip=document.createElement("span"); grip.className="page-drag-handle"; grip.textContent="⠿";
    const label=document.createElement("span"); label.className="page-label"; label.textContent=name;
    const renBtn=document.createElement("button");
    renBtn.style.cssText="background:none;border:none;cursor:pointer;padding:2px 4px;font-size:13px;color:#aaa;flex-shrink:0;touch-action:manipulation;";
    renBtn.textContent="✎";
    const del=document.createElement("button"); del.className="page-del"; del.textContent="✕";

    label.addEventListener("click",()=>loadPage(name));
    label.addEventListener("touchend",e=>{e.preventDefault();loadPage(name);},{passive:false});

    const startRename=e=>{
      if(e){e.preventDefault();e.stopPropagation();}
      row.innerHTML="";
      const wrap=document.createElement("div"); wrap.className="page-rename-wrap";
      const inp=document.createElement("input"); inp.value=name; inp.type="text";
      const ok=document.createElement("button"); ok.textContent="OK";
      wrap.appendChild(inp); wrap.appendChild(ok); row.appendChild(wrap);
      inp.focus(); inp.select();
      const commit=()=>{
        const newName=inp.value.trim();
        if(newName&&newName!==name&&!pages[newName]){
          pages[newName]=pages[name]; delete pages[name];
          pageOrder=pageOrder.map(n2=>n2===name?newName:n2);
          if(currentPage===name)currentPage=newName; savePages();
        } refreshPageList();
      };
      ok.addEventListener("click",commit);
      ok.addEventListener("touchend",e=>{e.preventDefault();commit();},{passive:false});
      inp.addEventListener("keydown",e=>{if(e.key==="Enter")commit();if(e.key==="Escape")refreshPageList();});
    };
    renBtn.addEventListener("click",startRename); renBtn.addEventListener("touchend",startRename,{passive:false});

    const doDelete=e=>{
      if(e){e.preventDefault();e.stopPropagation();}
      if(orderedPages().length<=1)return;
      if(!confirm("Supprimer \""+name+"\" ?"))return;
      delete pages[name]; pageOrder=pageOrder.filter(n2=>n2!==name); savePages();
      if(currentPage===name)loadPage(orderedPages()[0]); else refreshPageList();
    };
    del.addEventListener("click",doDelete); del.addEventListener("touchend",doDelete,{passive:false});

    row.addEventListener("dragstart",e=>{e.dataTransfer.setData("text/plain",name);setTimeout(()=>row.classList.add("dragging"),0);});
    row.addEventListener("dragend",()=>row.classList.remove("dragging"));
    row.addEventListener("dragover",e=>{e.preventDefault();row.classList.add("drag-over");});
    row.addEventListener("dragleave",()=>row.classList.remove("drag-over"));
    row.addEventListener("drop",e=>{
      e.preventDefault();row.classList.remove("drag-over");
      const fromName=e.dataTransfer.getData("text/plain"); if(!fromName||fromName===name)return;
      const order=orderedPages(),fi=order.indexOf(fromName),ti=order.indexOf(name);
      if(fi<0||ti<0)return; order.splice(fi,1); order.splice(ti,0,fromName);
      pageOrder=order; savePages(); refreshPageList();
    });

    grip.addEventListener("touchstart",e=>{e.stopPropagation();touchDragLongTm=setTimeout(()=>{touchDragName=name;touchDragRow=row;touchDragActive=true;row.classList.add("dragging");if(navigator.vibrate)navigator.vibrate(40);},300);},{passive:true});
    grip.addEventListener("touchmove",e=>{
      if(!touchDragActive){clearTimeout(touchDragLongTm);return;}
      e.stopPropagation();
      const touch=e.touches[0];
      const els=document.elementsFromPoint(touch.clientX,touch.clientY);
      const target=els.find(el=>el.classList&&el.classList.contains("page-row")&&el!==touchDragRow);
      if(target){
        const tName=target.dataset.page, order=orderedPages();
        const fi=order.indexOf(touchDragName),ti=order.indexOf(tName);
        if(fi>=0&&ti>=0&&fi!==ti){order.splice(fi,1);order.splice(ti,0,touchDragName);pageOrder=[...order];savePages();refreshPageList();touchDragRow=pageList.querySelector('[data-page="'+touchDragName+'"]');if(touchDragRow)touchDragRow.classList.add("dragging");}
      }
    },{passive:false});
    grip.addEventListener("touchend",()=>{clearTimeout(touchDragLongTm);if(touchDragActive){touchDragActive=false;touchDragName=null;touchDragRow=null;refreshPageList();}},{passive:true});

    row.appendChild(grip); row.appendChild(label); row.appendChild(renBtn); row.appendChild(del);
    pageList.appendChild(row);
  });
}

/* ==============================
   SIDEBAR
================================*/
tap(toggleMenu,()=>{sidebar.classList.toggle("expanded");document.body.classList.toggle("sidebar-expanded");});

/* ==============================
   CANVAS — PAN + PINCH
================================*/
let offsetX=-24000,offsetY=-24000,scale=1;
let isPanning=false,panSX=0,panSY=0,lastPinchDist=0,touchWasPinch=false,lastBgTap=0;

function updateTransform() {
  const t="translate("+offsetX+"px,"+offsetY+"px) scale("+scale+")";
  canvas.style.transform=t; linksLayer.style.transform=t; scheduleMM();
}

viewport.addEventListener("touchstart",e=>{
  if(e.touches.length===2){touchWasPinch=true;isPanning=false;const dx=e.touches[0].clientX-e.touches[1].clientX,dy=e.touches[0].clientY-e.touches[1].clientY;lastPinchDist=Math.sqrt(dx*dx+dy*dy);}
  else if(e.touches.length===1){isPanning=true;panSX=e.touches[0].clientX-offsetX;panSY=e.touches[0].clientY-offsetY;}
},{passive:true});

viewport.addEventListener("touchmove",e=>{
  e.preventDefault();
  if(e.touches.length===1&&isPanning&&!touchWasPinch){offsetX=e.touches[0].clientX-panSX;offsetY=e.touches[0].clientY-panSY;updateTransform();}
  if(e.touches.length===2){
    touchWasPinch=true;
    const dx=e.touches[0].clientX-e.touches[1].clientX,dy=e.touches[0].clientY-e.touches[1].clientY,dist=Math.sqrt(dx*dx+dy*dy);
    if(lastPinchDist!==0){const midX=(e.touches[0].clientX+e.touches[1].clientX)/2,midY=(e.touches[0].clientY+e.touches[1].clientY)/2,wX=(midX-offsetX)/scale,wY=(midY-offsetY)/scale;scale=Math.min(3,Math.max(0.2,scale*(dist/lastPinchDist)));offsetX=midX-wX*scale;offsetY=midY-wY*scale;updateTransform();}
    lastPinchDist=dist;
  }
},{passive:false});

viewport.addEventListener("touchend",e=>{
  isPanning=false;
  if(e.touches.length===0){
    if(!touchWasPinch&&(e.target===viewport||e.target===canvas)){const now=Date.now();if(now-lastBgTap<300)recenterOnContent();else handleBgTap();lastBgTap=now;}
    lastPinchDist=0; setTimeout(()=>{touchWasPinch=false;},100);
  }
});

function recenterOnContent() {
  const items=[...canvas.querySelectorAll(".node,.shape-el,.img-wrapper,.checklist-el,.group-frame")];
  if(!items.length){offsetX=-24000;offsetY=-24000;scale=1;updateTransform();return;}
  let mnX=Infinity,mnY=Infinity,mxX=-Infinity,mxY=-Infinity;
  items.forEach(el=>{const x=parseFloat(el.style.left)||0,y=parseFloat(el.style.top)||0,w=parseFloat(el.style.width)||el.offsetWidth||150,h=parseFloat(el.style.height)||el.offsetHeight||80;if(x<mnX)mnX=x;if(y<mnY)mnY=y;if(x+w>mxX)mxX=x+w;if(y+h>mxY)mxY=y+h;});
  const cW=mxX-mnX,cH=mxY-mnY,vw=viewport.clientWidth,vh=viewport.clientHeight,pad=60;
  scale=Math.min(3,Math.max(0.2,Math.min((vw-pad*2)/cW,(vh-pad*2)/cH)));
  offsetX=vw/2-(mnX+cW/2)*scale; offsetY=vh/2-(mnY+cH/2)*scale; updateTransform();
}

function viewCenter(){ return{x:(viewport.clientWidth/2-offsetX)/scale,y:(viewport.clientHeight/2-offsetY)/scale}; }

function handleBgTap() {
  if(activeMode==="link"&&linkFirstEl){linkFirstEl.classList.remove("selected");linkFirstEl=null;updateModeBanner();return;}
  deselectAll(); hideTextToolbar(); closeChecklistPanel(); closeGroupPanel(); hideLayerBtn();
}

/* ==============================
   MODES
================================*/
function setMode(mode) {
  if(activeMode===mode){exitAllModes();return;}
  exitAllModes(false); activeMode=mode;
  document.body.classList.toggle("mode-link",mode==="link");
  [selectModeBtn,linkModeBtn,tagModeBtn].forEach(b=>b.classList.remove("active-mode"));
  if(mode==="select")selectModeBtn.classList.add("active-mode");
  if(mode==="link")  linkModeBtn.classList.add("active-mode");
  if(mode==="tag")   tagModeBtn.classList.add("active-mode");
  updateModeBanner();
}
function exitAllModes(upd) {
  activeMode=null; linkFirstEl=null;
  document.body.classList.remove("mode-link");
  [selectModeBtn,linkModeBtn,tagModeBtn].forEach(b=>b.classList.remove("active-mode"));
  clearMultiSelection(); if(upd!==false)updateModeBanner();
}
function updateModeBanner() {
  if(activeMode==="select"){modeBannerText.textContent="Sélectionne les éléments à grouper";modeBanner.classList.add("visible");}
  else if(activeMode==="link"){modeBannerText.textContent=linkFirstEl?"Tape le 2ᵉ élément à relier":"Tape un premier élément";modeBanner.classList.add("visible");}
  else if(activeMode==="tag"){modeBannerText.textContent="Tape un élément pour l'étiqueter";modeBanner.classList.add("visible");}
  else modeBanner.classList.remove("visible");
  updateSelectionBar();
}
tap(selectModeBtn,()=>setMode("select")); tap(linkModeBtn,()=>setMode("link")); tap(tagModeBtn,()=>setMode("tag"));
tap(modeBannerCancel,()=>exitAllModes());

/* ==============================
   SÉLECTION MULTIPLE
================================*/
function toggleMultiSelect(el) {
  const id=el.dataset.id;
  if(multiSelection.has(id)){multiSelection.delete(id);el.classList.remove("multi-selected");}
  else{multiSelection.add(id);el.classList.add("multi-selected");}
  updateSelectionBar();
}
function clearMultiSelection() {
  multiSelection.forEach(id=>{const el=canvas.querySelector('[data-id="'+id+'"]');if(el)el.classList.remove("multi-selected");});
  multiSelection.clear(); updateSelectionBar();
}
function updateSelectionBar() {
  if(activeMode==="select"&&multiSelection.size>0){
    selectionCount.textContent=multiSelection.size+" sélectionné(s)"; selectionBar.classList.add("visible");
    ungroupBtn.style.display=multiSelection.size===1&&canvas.querySelector('.group-frame[data-id="'+[...multiSelection][0]+'"]')?"inline-block":"none";
  } else selectionBar.classList.remove("visible");
}

tap(groupBtn,()=>{
  if(multiSelection.size<2)return;
  const ids=[...multiSelection];
  const els=ids.map(id=>canvas.querySelector('[data-id="'+id+'"]')).filter(Boolean);
  if(els.length<2)return;
  let mnX=Infinity,mnY=Infinity,mxX=-Infinity,mxY=-Infinity;
  els.forEach(el=>{const x=parseFloat(el.style.left)||0,y=parseFloat(el.style.top)||0,w=parseFloat(el.style.width)||el.offsetWidth||140,h=parseFloat(el.style.height)||el.offsetHeight||80;if(x-10<mnX)mnX=x-10;if(y-26<mnY)mnY=y-26;if(x+w+10>mxX)mxX=x+w+10;if(y+h+10>mxY)mxY=y+h+10;});
  const label=prompt("Nom du groupe :","Groupe")||"Groupe";
  restoreGroup({id:"grp"+nextElId(),label,x:mnX,y:mnY,w:mxX-mnX,h:mxY-mnY,members:ids,borderColor:"#9b9bdc",borderStyle:"dashed"});
  clearMultiSelection(); exitAllModes(); saveCurrentPage();
});
tap(ungroupBtn,()=>{
  const id=[...multiSelection][0];
  const g=canvas.querySelector('.group-frame[data-id="'+id+'"]');
  if(g)g.remove(); clearMultiSelection(); saveCurrentPage();
});

/* ==============================
   DRAG GÉNÉRIQUE
================================*/
function makeDraggable(el) {
  let active=false,sx=0,sy=0,ex=0,ey=0,moved=false;
  el.addEventListener("touchstart",e=>{
    if(e.target.classList.contains("handle")||e.target.classList.contains("el-delete")||e.target.classList.contains("link-anchor")||e.target.classList.contains("elem-tag"))return;
    if(activeMode==="select"){e.stopPropagation();e.preventDefault();toggleMultiSelect(el);return;}
    if(activeMode==="link"){e.stopPropagation();e.preventDefault();handleLinkTap(el);return;}
    if(activeMode==="tag"){e.stopPropagation();e.preventDefault();openTagPanel(el);return;}
    if(e.touches.length!==1)return;
    active=true;moved=false;
    sx=e.touches[0].clientX;sy=e.touches[0].clientY;
    ex=parseFloat(el.style.left)||0;ey=parseFloat(el.style.top)||0;
    e.stopPropagation();
  },{passive:false});
  el.addEventListener("touchmove",e=>{
    if(!active||e.touches.length!==1)return;
    moved=true;
    el.style.left=(ex+(e.touches[0].clientX-sx)/scale)+"px";
    el.style.top =(ey+(e.touches[0].clientY-sy)/scale)+"px";
    scheduleLinksRedraw(); if(layerTarget===el)posLayerBtn(el);
    e.stopPropagation();
  },{passive:true});
  el.addEventListener("touchend",()=>{
    if(active&&!moved&&el.dataset.type==="shape")selectShape(el);
    if(active&&!moved&&(el.dataset.type==="text"||el.dataset.type==="image"||el.dataset.type==="checklist"))showLayerBtn(el);
    active=false; if(moved)saveCurrentPage();
  });
}

function makeGroupDraggable(frame) {
  let active=false,sx=0,sy=0,ex=0,ey=0,longTm=null;
  frame.addEventListener("touchstart",e=>{
    if(e.target.classList.contains("group-label")){
      longTm=setTimeout(()=>openGroupPanel(frame),400);
      e.stopPropagation(); return;
    }
    if(e.touches.length!==1)return;
    clearTimeout(longTm); active=true;
    sx=e.touches[0].clientX;sy=e.touches[0].clientY;
    ex=parseFloat(frame.style.left)||0;ey=parseFloat(frame.style.top)||0;
    const members=(frame.dataset.members||"").split(",").filter(Boolean);
    members.forEach(id=>{const el=canvas.querySelector('[data-id="'+id+'"]');if(el)el._gb={x:parseFloat(el.style.left)||0,y:parseFloat(el.style.top)||0};});
    e.stopPropagation();
  },{passive:true});
  frame.addEventListener("touchmove",e=>{
    clearTimeout(longTm); if(!active||e.touches.length!==1)return;
    const dx=(e.touches[0].clientX-sx)/scale,dy=(e.touches[0].clientY-sy)/scale;
    frame.style.left=(ex+dx)+"px"; frame.style.top=(ey+dy)+"px";
    const members=(frame.dataset.members||"").split(",").filter(Boolean);
    members.forEach(id=>{const el=canvas.querySelector('[data-id="'+id+'"]');if(el&&el._gb){el.style.left=(el._gb.x+dx)+"px";el.style.top=(el._gb.y+dy)+"px";}});
    scheduleLinksRedraw(); e.stopPropagation();
  },{passive:true});
  frame.addEventListener("touchend",()=>{clearTimeout(longTm);active=false;saveCurrentPage();});
  // Tap label = ouvrir panneau
  const lbl=frame.querySelector(".group-label");
  if(lbl){lbl.addEventListener("click",()=>openGroupPanel(frame));}
}

/* ==============================
   SUPPRIMER
================================*/
function addDeleteButton(wrapper) {
  const btn=document.createElement("button"); btn.className="el-delete"; btn.textContent="✕";
  tap(btn,e=>{
    e&&e.stopPropagation&&e.stopPropagation();
    const id=wrapper.dataset.id;
    linksLayer.querySelectorAll('line[data-from="'+id+'"],line[data-to="'+id+'"]').forEach(l=>l.remove());
    if(wrapper===selectedEl){selectedEl=null;hideColorPanel();}
    multiSelection.delete(id); wrapper.remove(); saveCurrentPage();
  });
  wrapper.appendChild(btn);
}

function deselectAll() {
  if(selectedEl){selectedEl.classList.remove("selected");selectedEl=null;}
  hideColorPanel(); hideLayerBtn();
}

/* ==============================
   TEXTE
================================*/
function createText(x,y,content,fontSize,id){
  if(content===undefined)content="Double-tap pour écrire"; if(!fontSize)fontSize="16";
  const el=document.createElement("div");
  el.className="node"; el.dataset.type="text"; el.dataset.id=id||nextElId();
  el.dataset.fontSize=fontSize; el.style.left=x+"px"; el.style.top=y+"px"; el.style.fontSize=fontSize+"px";
  el.innerHTML=content;

  const enterEdit=()=>{el.contentEditable="true";el.focus();showTextToolbar(el);};
  let lastTap=0;
  el.addEventListener("touchend",e=>{if(activeMode)return;if(el.contentEditable==="true")return;const now=Date.now();if(now-lastTap<350)enterEdit();lastTap=now;});
  el.addEventListener("dblclick",()=>{if(!activeMode)enterEdit();});
  el.addEventListener("focus",()=>{if(el.contentEditable==="true")showTextToolbar(el);});
  el.addEventListener("blur",()=>{el.contentEditable="false";setTimeout(()=>{if(document.activeElement!==el)hideTextToolbar();},200);saveCurrentPage();});
  el.addEventListener("input",()=>{updateTBState(el);saveCurrentPage(false);});
  el.addEventListener("keyup",()=>updateTBState(el));

  let pd0=0,ps0=0;
  el.addEventListener("touchstart",e=>{if(e.touches.length===2&&!activeMode){const dx=e.touches[0].clientX-e.touches[1].clientX,dy=e.touches[0].clientY-e.touches[1].clientY;pd0=Math.sqrt(dx*dx+dy*dy);ps0=parseFloat(el.dataset.fontSize)||16;e.stopPropagation();e.preventDefault();}},{passive:false});
  el.addEventListener("touchmove",e=>{if(e.touches.length===2&&pd0>0){const dx=e.touches[0].clientX-e.touches[1].clientX,dy=e.touches[0].clientY-e.touches[1].clientY;const s=Math.min(72,Math.max(8,ps0*(Math.sqrt(dx*dx+dy*dy)/pd0)));el.style.fontSize=s+"px";el.dataset.fontSize=Math.round(s);updateTBState(el);e.stopPropagation();e.preventDefault();}},{passive:false});
  el.addEventListener("touchend",()=>{if(pd0>0){pd0=0;saveCurrentPage();}});

  ensureAnchor(el); addDeleteButton(el); canvas.appendChild(el); makeDraggable(el);
  return el;
}

/* ==============================
   FORMES
================================*/
function applyShape(el,shape,color,w,h,rotation){
  el.style.width=w+"px";el.style.height=h+"px";el.style.background=color;el.style.transform="rotate("+rotation+"deg)";el.dataset.color=color;el.dataset.rotation=rotation;
  if(shape==="circle"){el.style.borderRadius="50%";}
  else if(shape==="triangle"){el.style.background="transparent";el.style.borderLeft=(w/2)+"px solid transparent";el.style.borderRight=(w/2)+"px solid transparent";el.style.borderBottom=h+"px solid "+color;el.style.borderRadius="0";el.style.width="0";el.style.height="0";}
  else if(shape==="diamond"){el.style.borderRadius="0";el.style.transform="rotate("+(rotation+45)+"deg)";}
  else if(shape==="arrow"){el.style.background="transparent";el.style.borderRadius="0";const old=el.querySelector("svg");if(old)old.remove();const svg=document.createElementNS("http://www.w3.org/2000/svg","svg");svg.setAttribute("width","100%");svg.setAttribute("height","100%");svg.setAttribute("viewBox","0 0 100 40");svg.setAttribute("preserveAspectRatio","none");svg.innerHTML='<line x1="5" y1="20" x2="80" y2="20" stroke="'+color+'" stroke-width="5" stroke-linecap="round"/><polygon points="72,8 100,20 72,32" fill="'+color+'"/>';el.insertBefore(svg,el.firstChild);}
  else{el.style.borderRadius="10px";}
}

function createShape(shape,x,y,color,w,h,rotation,id){
  if(!color)color="#4A90D9";if(!w)w=140;if(!h)h=80;if(!rotation)rotation=0;
  const el=document.createElement("div");
  el.className="shape-el";el.dataset.type="shape";el.dataset.shape=shape;el.dataset.id=id||nextElId();
  el.style.left=x+"px";el.style.top=y+"px";
  applyShape(el,shape,color,w,h,rotation);

  const hR=document.createElement("div");hR.className="handle handle-resize";hR.textContent="↘";
  let rsx=0,rsy=0,rw0=0,rh0=0;
  hR.addEventListener("touchstart",e=>{rsx=e.touches[0].clientX;rsy=e.touches[0].clientY;rw0=parseFloat(el.style.width)||w;rh0=parseFloat(el.style.height)||h;e.stopPropagation();e.preventDefault();},{passive:false});
  hR.addEventListener("touchmove",e=>{applyShape(el,shape,el.dataset.color||color,Math.max(40,rw0+(e.touches[0].clientX-rsx)/scale),Math.max(30,rh0+(e.touches[0].clientY-rsy)/scale),parseFloat(el.dataset.rotation)||0);scheduleLinksRedraw();e.stopPropagation();e.preventDefault();},{passive:false});
  hR.addEventListener("touchend",()=>saveCurrentPage());

  const hRot=document.createElement("div");hRot.className="handle handle-rotate";hRot.textContent="↺";
  let ra=0,rr=0;
  hRot.addEventListener("touchstart",e=>{const r=el.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;ra=Math.atan2(e.touches[0].clientY-cy,e.touches[0].clientX-cx)*180/Math.PI;rr=parseFloat(el.dataset.rotation)||0;e.stopPropagation();e.preventDefault();},{passive:false});
  hRot.addEventListener("touchmove",e=>{const r=el.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;applyShape(el,shape,el.dataset.color||color,parseFloat(el.style.width)||w,parseFloat(el.style.height)||h,rr+(Math.atan2(e.touches[0].clientY-cy,e.touches[0].clientX-cx)*180/Math.PI-ra));e.stopPropagation();e.preventDefault();},{passive:false});
  hRot.addEventListener("touchend",()=>saveCurrentPage());

  el.appendChild(hR);el.appendChild(hRot);ensureAnchor(el);addDeleteButton(el);canvas.appendChild(el);makeDraggable(el);
  return el;
}

function selectShape(el){
  if(selectedEl)selectedEl.classList.remove("selected");
  selectedEl=el;el.classList.add("selected");
  const rect=el.getBoundingClientRect();
  colorPanel.style.top=Math.min(window.innerHeight-120,rect.bottom+10)+"px";
  colorPanel.style.left=Math.max(70,Math.min(window.innerWidth-200,rect.left))+"px";
  colorPanel.classList.add("open"); showLayerBtn(el);
}
function hideColorPanel(){colorPanel.classList.remove("open");}

document.querySelectorAll(".color-swatch:not(.tag-color)").forEach(sw=>{
  tap(sw,()=>{if(!selectedEl)return;applyShape(selectedEl,selectedEl.dataset.shape,sw.dataset.color,parseFloat(selectedEl.style.width)||140,parseFloat(selectedEl.style.height)||80,parseFloat(selectedEl.dataset.rotation)||0);saveCurrentPage();});
});

/* ==============================
   IMAGE
================================*/
function createImage(x,y,src,w,h,id){
  const wrapper=document.createElement("div");
  wrapper.className="img-wrapper";wrapper.dataset.type="image";wrapper.dataset.src=src;wrapper.dataset.id=id||nextElId();
  wrapper.style.left=x+"px";wrapper.style.top=y+"px";
  const img=document.createElement("img");img.src=src;img.draggable=false;
  if(w){img.style.maxWidth=w+"px";wrapper.style.width=w+"px";}
  if(h){img.style.maxHeight=h+"px";wrapper.style.height=h+"px";}
  wrapper.appendChild(img);ensureAnchor(wrapper);addDeleteButton(wrapper);canvas.appendChild(wrapper);makeDraggable(wrapper);
  return wrapper;
}
tap(addImageBtn,()=>fileInput.click());
fileInput.addEventListener("change",e=>{const file=e.target.files&&e.target.files[0];if(!file)return;const reader=new FileReader();reader.onload=ev=>{const c=viewCenter();createImage(c.x-100,c.y-80,ev.target.result);saveCurrentPage();};reader.readAsDataURL(file);fileInput.value="";});

/* ==============================
   CHECKLIST
================================*/
function createChecklist(x,y,title,checkItems,id,bgColor,borderStyleVal,itemIcon){
  if(!title)title="Checklist"; if(!checkItems)checkItems=[{text:"Première tâche",done:false}];
  const el=document.createElement("div");
  el.className="checklist-el";el.dataset.type="checklist";el.dataset.id=id||nextElId();
  el.style.left=x+"px";el.style.top=y+"px";
  if(bgColor){el.style.background=bgColor;el.dataset.bgColor=bgColor;}
  if(borderStyleVal){el.style.borderStyle=borderStyleVal;el.dataset.borderStyle=borderStyleVal;}
  if(itemIcon)el.dataset.itemIcon=itemIcon;

  const titleInput=document.createElement("input");titleInput.className="checklist-title";titleInput.value=title;
  titleInput.addEventListener("touchstart",e=>e.stopPropagation(),{passive:true});
  titleInput.addEventListener("input",saveCurrentPage);titleInput.addEventListener("blur",saveCurrentPage);

  // Long press sur le titre = ouvrir panneau options
  let titleLongTm=null;
  titleInput.addEventListener("touchstart",()=>{titleLongTm=setTimeout(()=>openChecklistPanel(el),500);},{passive:true});
  titleInput.addEventListener("touchend",()=>clearTimeout(titleLongTm),{passive:true});
  titleInput.addEventListener("click",()=>openChecklistPanel(el));

  const itemsWrap=document.createElement("div");itemsWrap.className="checklist-items";

  function addRow(text,done){
    const row=document.createElement("div");row.className="checklist-item"+(done?" done":"");
    const cb=document.createElement("input");cb.type="checkbox";cb.checked=!!done;
    cb.addEventListener("touchstart",e=>e.stopPropagation(),{passive:true});
    cb.addEventListener("change",()=>{row.classList.toggle("done",cb.checked);updateChecklistIcons(el);saveCurrentPage();});
    const txt=document.createElement("div");txt.className="ci-text";txt.contentEditable="true";txt.innerText=text||"";
    txt.addEventListener("touchstart",e=>e.stopPropagation(),{passive:true});
    txt.addEventListener("input",saveCurrentPage);txt.addEventListener("blur",saveCurrentPage);
    const del=document.createElement("button");del.className="ci-del";del.textContent="✕";
    tap(del,e=>{e&&e.stopPropagation&&e.stopPropagation();row.remove();saveCurrentPage();});
    row.appendChild(cb);row.appendChild(txt);row.appendChild(del);itemsWrap.appendChild(row);
  }
  checkItems.forEach(it=>addRow(it.text,it.done));

  const addLine=document.createElement("div");addLine.className="checklist-add";addLine.textContent="+ ajouter une ligne";
  tap(addLine,e=>{e&&e.stopPropagation&&e.stopPropagation();addRow("",false);updateChecklistIcons(el);saveCurrentPage();});

  el.appendChild(titleInput);el.appendChild(itemsWrap);el.appendChild(addLine);
  if(itemIcon&&itemIcon!=="checkbox")updateChecklistIcons(el);
  ensureAnchor(el);addDeleteButton(el);canvas.appendChild(el);makeDraggable(el);
  return el;
}
tap(addChecklistBtn,()=>{const c=viewCenter();createChecklist(c.x-90,c.y-40);saveCurrentPage();});

/* ==============================
   SOUS-MENU FORMES
================================*/
let shapeMenuOpen=false;
tap(addShapeBtn,e=>{shapeMenuOpen=!shapeMenuOpen;shapeMenu.classList.toggle("open",shapeMenuOpen);e&&e.stopPropagation&&e.stopPropagation();});
document.querySelectorAll(".shape-opt").forEach(opt=>{tap(opt,e=>{e&&e.stopPropagation&&e.stopPropagation();const c=viewCenter();createShape(opt.dataset.shape,c.x-70,c.y-40);shapeMenuOpen=false;shapeMenu.classList.remove("open");saveCurrentPage();});});

/* ==============================
   ÉTIQUETTES
================================*/
function applyTag(el,text,color){
  let tagEl=el.querySelector(".elem-tag");
  if(!text){if(tagEl)tagEl.remove();el.dataset.tag="";el.dataset.tagColor="";return;}
  if(!tagEl){tagEl=document.createElement("div");tagEl.className="elem-tag";el.appendChild(tagEl);}
  tagEl.textContent=text;tagEl.style.background=color||"#888888";el.dataset.tag=text;el.dataset.tagColor=color||"#888888";
}
function openTagPanel(el){
  tagTargetEl=el;tagInput.value=el.dataset.tag||"";
  document.querySelectorAll(".tag-color").forEach(sw=>sw.classList.toggle("tag-selected",sw.dataset.color===el.dataset.tagColor));
  const rect=el.getBoundingClientRect();
  tagPanel.style.top=Math.min(window.innerHeight-160,rect.bottom+10)+"px";
  tagPanel.style.left=Math.max(70,Math.min(window.innerWidth-230,rect.left))+"px";
  tagPanel.classList.add("open");tagInput.focus();
}
function hideTagPanel(){tagPanel.classList.remove("open");tagTargetEl=null;}
document.querySelectorAll(".tag-color").forEach(sw=>{tap(sw,()=>{document.querySelectorAll(".tag-color").forEach(s=>s.classList.remove("tag-selected"));sw.classList.add("tag-selected");if(tagTargetEl)applyTag(tagTargetEl,tagInput.value||tagTargetEl.dataset.tag||"Étiquette",sw.dataset.color);});});
tagInput.addEventListener("input",()=>{if(tagTargetEl&&tagTargetEl.dataset.tagColor)applyTag(tagTargetEl,tagInput.value,tagTargetEl.dataset.tagColor);});
tap(document.getElementById("tagRemove"),()=>{if(tagTargetEl)applyTag(tagTargetEl,"","");hideTagPanel();exitAllModes();saveCurrentPage();});
tap(document.getElementById("tagDone"),()=>{if(tagTargetEl&&tagInput.value.trim())applyTag(tagTargetEl,tagInput.value.trim(),tagTargetEl.dataset.tagColor||"#888888");hideTagPanel();exitAllModes();saveCurrentPage();});

/* ==============================
   CONNECTEURS
================================*/
function ensureAnchor(el){if(!el.querySelector(".link-anchor")){const a=document.createElement("div");a.className="link-anchor";el.appendChild(a);}}
function handleLinkTap(el){
  if(!linkFirstEl){linkFirstEl=el;el.classList.add("selected");updateModeBanner();return;}
  if(linkFirstEl===el){el.classList.remove("selected");linkFirstEl=null;updateModeBanner();return;}
  drawLink(linkFirstEl.dataset.id,el.dataset.id);
  linkFirstEl.classList.remove("selected");linkFirstEl=null;updateModeBanner();saveCurrentPage();
}
function elCenter(el){return{x:(parseFloat(el.style.left)||0)+(parseFloat(el.style.width)||el.offsetWidth||100)/2,y:(parseFloat(el.style.top)||0)+(parseFloat(el.style.height)||el.offsetHeight||40)/2};}
function drawLink(fromId,toId){
  const fromEl=canvas.querySelector('[data-id="'+fromId+'"]'),toEl=canvas.querySelector('[data-id="'+toId+'"]');
  if(!fromEl||!toEl)return;
  const line=document.createElementNS("http://www.w3.org/2000/svg","line");
  line.setAttribute("stroke","#9b9bdc");line.setAttribute("stroke-width","2.5");
  line.dataset.from=fromId;line.dataset.to=toId;linksLayer.appendChild(line);updateLinkLine(line);
}
function updateLinkLine(line){
  const fromEl=canvas.querySelector('[data-id="'+line.dataset.from+'"]'),toEl=canvas.querySelector('[data-id="'+line.dataset.to+'"]');
  if(!fromEl||!toEl){line.remove();return;}
  const c1=elCenter(fromEl),c2=elCenter(toEl);
  line.setAttribute("x1",c1.x);line.setAttribute("y1",c1.y);line.setAttribute("x2",c2.x);line.setAttribute("y2",c2.y);
}
let linksRaf=null;
function scheduleLinksRedraw(){if(!linksRaf)linksRaf=requestAnimationFrame(()=>{linksRaf=null;linksLayer.querySelectorAll("line[data-from]").forEach(updateLinkLine);});}

/* ==============================
   UNDO/REDO TEXTE/PAGES/DARK
================================*/
tap(addTextBtn,()=>{const c=viewCenter();createText(c.x-80,c.y-20);saveCurrentPage();});
tap(newPageBtn,()=>createPage());
tap(toggleDark,()=>{document.body.classList.toggle("dark");scheduleMM();});
tap(undoBtn,()=>doUndo()); tap(redoBtn,()=>doRedo());

/* ==============================
   EXPORT PDF
================================*/
tap(exportPdfBtn,async()=>{
  if(!window.jspdf){alert("Module d'export non disponible (connexion internet ?)");return;}
  const items=[...canvas.querySelectorAll(".node,.shape-el,.img-wrapper,.checklist-el,.group-frame")];
  if(!items.length){alert("Cette page est vide.");return;}
  let mnX=Infinity,mnY=Infinity,mxX=-Infinity,mxY=-Infinity;
  items.forEach(el=>{const x=parseFloat(el.style.left)||0,y=parseFloat(el.style.top)||0,w=parseFloat(el.style.width)||el.offsetWidth||140,h=parseFloat(el.style.height)||el.offsetHeight||80;if(x<mnX)mnX=x;if(y<mnY)mnY=y;if(x+w>mxX)mxX=x+w;if(y+h>mxY)mxY=y+h;});
  const pad=40; mnX-=pad;mnY-=pad;mxX+=pad;mxY+=pad;
  const cW=mxX-mnX,cH=mxY-mnY,sc=2;
  const ec=document.createElement("canvas"); ec.width=cW*sc; ec.height=cH*sc;
  const ctx=ec.getContext("2d"); ctx.scale(sc,sc);
  ctx.fillStyle=document.body.classList.contains("dark")?"#1e1e1e":"#ffffff"; ctx.fillRect(0,0,cW,cH);
  ctx.strokeStyle="#9b9bdc";ctx.lineWidth=2;
  linksLayer.querySelectorAll("line[data-from]").forEach(l=>{const x1=parseFloat(l.getAttribute("x1"))-mnX,y1=parseFloat(l.getAttribute("y1"))-mnY,x2=parseFloat(l.getAttribute("x2"))-mnX,y2=parseFloat(l.getAttribute("y2"))-mnY;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();});
  for(const el of items){
    const x=(parseFloat(el.style.left)||0)-mnX,y=(parseFloat(el.style.top)||0)-mnY,w=parseFloat(el.style.width)||el.offsetWidth||140,h=parseFloat(el.style.height)||el.offsetHeight||60,type=el.dataset.type;
    ctx.save();
    if(el.classList.contains("group-frame")){ctx.strokeStyle=el.dataset.borderColor||"#9b9bdc";ctx.setLineDash([5,4]);ctx.lineWidth=1.5;ctx.strokeRect(x,y,w,h);ctx.setLineDash([]);ctx.fillStyle=el.dataset.borderColor||"#6a6ad9";ctx.font="bold 11px Arial";ctx.fillText(el.dataset.label||"Groupe",x,y-8);}
    else if(type==="text"){ctx.fillStyle="#ffffff";ctx.strokeStyle="#e8e8e8";ctx.lineWidth=1;rrp(ctx,x,y,w,h,10);ctx.fill();ctx.stroke();ctx.fillStyle="#1a1a1a";ctx.font=(parseInt(el.dataset.fontSize)||16)+"px Arial";wct(ctx,el.innerText||"",x+12,y+(parseInt(el.dataset.fontSize)||16)+6,w-24,(parseInt(el.dataset.fontSize)||16)*1.3);}
    else if(type==="shape"){const color=el.dataset.color||"#4A90D9",shape=el.dataset.shape,cx=x+w/2,cy=y+h/2;ctx.translate(cx,cy);ctx.rotate(((parseFloat(el.dataset.rotation)||0)*Math.PI)/180);ctx.translate(-cx,-cy);ctx.fillStyle=color;if(shape==="circle"){ctx.beginPath();ctx.ellipse(cx,cy,w/2,h/2,0,0,Math.PI*2);ctx.fill();}else if(shape==="arrow"){ctx.strokeStyle=color;ctx.lineWidth=Math.max(2,h*.15);ctx.beginPath();ctx.moveTo(x,cy);ctx.lineTo(x+w*.75,cy);ctx.stroke();ctx.beginPath();ctx.moveTo(x+w,cy);ctx.lineTo(x+w*.65,y);ctx.lineTo(x+w*.65,y+h);ctx.closePath();ctx.fill();}else{rrp(ctx,x,y,w,h,shape==="diamond"?0:8);ctx.fill();}}
    else if(type==="image"){try{ctx.drawImage(el.querySelector("img"),x,y,w,h);}catch(e){}}
    else if(type==="checklist"){ctx.fillStyle=el.dataset.bgColor||"#fffdf2";ctx.strokeStyle="#f0e6c0";ctx.lineWidth=1;rrp(ctx,x,y,w,h,10);ctx.fill();ctx.stroke();ctx.fillStyle="#8a7a3a";ctx.font="bold 11px Arial";ctx.fillText((el.querySelector(".checklist-title")?.value||"Checklist").toUpperCase(),x+12,y+18);let cy2=y+36;el.querySelectorAll(".checklist-item").forEach(row=>{const done=row.classList.contains("done"),txt=row.querySelector(".ci-text")?.innerText||"";ctx.strokeStyle="#999";ctx.lineWidth=1.3;ctx.strokeRect(x+12,cy2-9,12,12);if(done){ctx.beginPath();ctx.moveTo(x+14,cy2-3);ctx.lineTo(x+17,cy2);ctx.lineTo(x+23,cy2-8);ctx.stroke();}ctx.fillStyle=done?"#aaa":"#333";ctx.font=(done?"italic ":"")+"12px Arial";ctx.fillText(txt.slice(0,40),x+30,cy2+1);cy2+=20;});}
    if(el.dataset.tag){ctx.fillStyle=el.dataset.tagColor||"#888";const tw=ctx.measureText(el.dataset.tag).width+16;rrp(ctx,x+6,y-10,tw,16,8);ctx.fill();ctx.fillStyle="#fff";ctx.font="bold 10px Arial";ctx.fillText(el.dataset.tag,x+14,y+1);}
    ctx.restore();
  }
  const {jsPDF}=window.jspdf;
  const pdf=new jsPDF({orientation:cW>cH?"landscape":"portrait",unit:"pt",format:[cW,cH]});
  pdf.addImage(ec.toDataURL("image/png"),"PNG",0,0,cW,cH);
  pdf.save((currentPage||"page").replace(/[^a-z0-9_\- ]/gi,"")+".pdf");
});
function rrp(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
function wct(ctx,text,x,y,mW,lH){const words=text.split(/\s+/);let line="",yy=y;words.forEach(w=>{const t=line?line+" "+w:w;if(ctx.measureText(t).width>mW&&line){ctx.fillText(line,x,yy);line=w;yy+=lH;}else line=t;});if(line)ctx.fillText(line,x,yy);}

/* ==============================
   INIT
================================*/
if(!pageOrder.length) pageOrder=Object.keys(pages);
if(!Object.keys(pages).length){createPage();}else{loadPage(orderedPages()[0]);}
updateTransform(); updateMinimap();