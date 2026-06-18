window.onerror = function(msg, url, line, col, error) {
  alert("ERREUR JS : " + msg + "\nLigne : " + line);
};

alert("JS chargé");

const addText = document.getElementById("addText");
const addShape = document.getElementById("addShape");

addText.onclick = () => {
  alert("Bouton TEXTE cliqué");
  createText(25000, 25000);
};

addShape.onclick = () => {
  alert("Bouton FORME cliqué");
  createShape(25000, 25000);
};

// Fonctions minimales pour tester
function createText(x, y) {
  alert("createText exécuté");
}

function createShape(x, y) {
  alert("createShape exécuté");
}
