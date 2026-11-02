/* BenchMate — rejeu : pilotage — chargement du journal, lecture pas à pas, clavier, glisser-déposer. */
(() => {
const L = BM.lecture = {};
const $ = id => document.getElementById(id);
const VITESSES = [1, 1.5, 2, .5], CLE = "benchmate.journal";
const IC = {
  lecture: '<svg viewBox="0 0 24 24"><path d="M7 4.5v15l13-7.5z" fill="currentColor"/></svg>',
  pause: '<svg viewBox="0 0 24 24"><path d="M6.5 4h4v16h-4zM13.5 4h4v16h-4z" fill="currentColor"/></svg>',
  rejouer: '<svg viewBox="0 0 24 24"><path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v5h5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  son: '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4zM16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  muet: '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4zM16.5 9.5l5 5M21.5 9.5l-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
};
let D = null, cur = 0, ts = 0, tire = 0, prog = null, etat = "vide", iv = 0; // vide | pret | lecture | pause | fini
BM.calme = matchMedia("(prefers-reduced-motion: reduce)").matches;
BM.erreur = m => { const e = $("erreur"); e.textContent = m; e.hidden = false; clearTimeout(BM.erreur.t); BM.erreur.t = setTimeout(() => { e.hidden = true; }, 6000); };

BM.demarrer = libs => {
  let s = null, vitrine = {};
  try { s = JSON.parse(localStorage.getItem(CLE)); if (s && s.texte) vitrine = JSON.parse(s.texte); } catch { s = null; }
  try {
    BM.scene.init(libs); BM.effets.init(); BM.scene.boucle(BM.banc.animer);
    document.body.classList.add("sans-eti"); BM.banc.prechauffer();
    BM.banc.construire(BM.preparer(vitrine), true); // le dernier banc en vitrine
  } catch (e) { console.error(e); return BM.erreur("La scène 3D n'a pas pu démarrer : " + e.message); }
  BM.scene.boucle((dt, dj) => tick(dj)); BM.scene.surSurvol = BM.panneau.survol;
  lier(); regler("vide"); BM.pret = true; document.body.classList.add("pret");
  if (s && s.texte) { const b = $("bReprendre"); b.hidden = false; b.querySelector("span").textContent = s.nom; b.onclick = () => charger(s.texte, s.nom); }
};

function charger(texte, nom) {
  let j; try { j = JSON.parse(texte); } catch { return BM.erreur(`${nom} : fichier JSON illisible.`); }
  if (!Array.isArray(j.tours) || !Array.isArray(j.points) || !Array.isArray(j.composants))
    return BM.erreur(`${nom} : ce n'est pas un journal de passage BenchMate.`);
  $("erreur").hidden = true; $("bOuvrir").title = nom + " — ouvrir un autre journal (O)";
  try { localStorage.setItem(CLE, JSON.stringify({nom, texte})); } catch {}
  D = BM.preparer(j); prog = null; cur = 0;
  document.body.classList.add("charge");
  BM.panneau.preparer(D);
  const pl = BM.banc.construire(D);
  BM.scene.intro(pl.W, pl.H); BM.son.intro();
  regler("pret"); $("cta").hidden = true;
  BM.scene.plusTard(BM.calme ? .5 : 3.4, () => { if (etat === "pret") $("cta").hidden = false; });
}
function lireFichier(f) { const r = new FileReader(); r.onload = () => charger(r.result, f.name); r.readAsText(f); }

/* Le scénario d'un tour : intention → vol de la sonde → contact → interprétation → élimination. */
function programme(t, prec) {
  const P = BM.panneau, B = BM.banc, ev = []; let x = 0;
  if (t.avant && t.avant !== prec) { ev.push([0, () => P.penser(t.avant, "hypothese")]); x += P.duree(t.avant) + .5; }
  ev.push([x, () => { P.phase("mesure"); B.viser(t); BM.son.deplacer(); }]); x += 1.1;
  ev.push([x, () => { B.contact(t); P.etape(t); }]); x += .7;
  if (t.apres) { ev.push([x, () => P.penser(t.apres, "interprete")]); x += P.duree(t.apres) + .3; }
  ev.push([x, () => { B.hypotheses(t.garde); P.hypotheses(t.garde); }]); x += 1.3;
  return {ev, duree: x};
}
const preparer = () => { ts = tire = 0; prog = programme(D.tours[cur], cur ? D.tours[cur - 1].apres : ""); };

function tick(dj) {
  BM.panneau.tick(dj);
  if (etat !== "lecture" || !prog) return;
  ts += dj;
  while (prog && tire < prog.ev.length && prog.ev[tire][0] <= ts) prog.ev[tire++][1]();
  BM.panneau.frise(cur, ts / prog.duree);
  if (ts >= prog.duree) { cur++; if (cur < D.tours.length) preparer(); else fin(); }
}

/* Saut direct au tour i : l'état des tours précédents est reconstruit sans animation. */
L.allerA = (i, jouer) => {
  if (!D || etat === "vide") return;
  i = Math.max(0, Math.min(i, D.tours.length));
  const B = BM.banc, P = BM.panneau, etaitFini = etat === "fini";
  B.reinitialiser(); P.reinitialiser(); $("cta").hidden = true;
  for (let k = 0; k < i; k++) { B.instantane(D.tours[k]); P.etape(D.tours[k], true); }
  const g = i ? D.tours[i - 1].garde : D.ids; B.hypotheses(g, true); P.hypotheses(g);
  if (i) { B.poserSonde(D.tours[i - 1]); P.penser(D.tours[i - 1].apres, "interprete", true); }
  cur = i;
  if (i >= D.tours.length) return fin();
  if (etaitFini || etat === "pret") BM.scene.revenir();
  preparer(); regler(jouer || etat === "lecture" || etat === "pret" ? "lecture" : "pause"); P.frise(cur, 0);
};
function fin() { prog = null; regler("fini"); BM.panneau.frise(D.tours.length, 0); BM.banc.verdict(D); BM.panneau.verdict(); }

function regler(e) {
  etat = e; BM.scene.pause = e === "pause"; document.body.dataset.etat = e;
  $("bLecture").innerHTML = e === "lecture" ? IC.pause : e === "fini" ? IC.rejouer : IC.lecture;
}
function basculer() {
  if (etat === "pret" || etat === "fini") L.allerA(0, true);
  else if (etat === "lecture") regler("pause");
  else if (etat === "pause") regler("lecture");
}
function vitesse() { iv = (iv + 1) % VITESSES.length; BM.scene.vitesse = VITESSES[iv]; $("bVitesse").textContent = String(VITESSES[iv]).replace(".", ",") + "×"; }
function son() { BM.son.actif = !BM.son.actif; $("bSon").innerHTML = BM.son.actif ? IC.son : IC.muet; }
function plein() { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen().catch(() => {}); }

function lier() {
  $("fichier").onchange = e => { const f = e.target.files[0]; if (f) lireFichier(f); e.target.value = ""; };
  $("bOuvrir").onclick = () => $("fichier").click();
  $("bLancer").onclick = $("bLecture").onclick = basculer;
  $("bRejouer").onclick = () => L.allerA(0, true);
  $("bVitesse").onclick = vitesse; $("bSon").onclick = son; $("bPlein").onclick = plein;
  $("bSon").innerHTML = IC.son; $("bRejouer").innerHTML = IC.rejouer;
  addEventListener("keydown", e => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.target.closest("input, textarea")) return;
    const k = e.key.toLowerCase(), act = {
      " ": basculer, enter: () => (etat === "vide" ? $("bReprendre").hidden || $("bReprendre").click() : basculer()),
      arrowright: () => L.allerA(cur + 1), arrowleft: () => L.allerA(cur - 1), r: () => L.allerA(0, true),
      s: vitesse, m: son, f: plein, o: () => $("fichier").click()
    }[k];
    if (act) { e.preventDefault(); e.target.blur && e.target.blur(); act(); }
  });
  addEventListener("dragover", e => { e.preventDefault(); document.body.classList.add("survol-fichier"); });
  addEventListener("dragleave", e => { if (!e.relatedTarget) document.body.classList.remove("survol-fichier"); });
  addEventListener("drop", e => {
    e.preventDefault(); document.body.classList.remove("survol-fichier");
    const f = e.dataTransfer.files[0]; if (f) lireFichier(f);
  });
}
})();
