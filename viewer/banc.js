/* BenchMate — rejeu : le banc — construction animée, états des composants et des points, lectures, verdict. */
(() => {
const B = BM.banc = {};
const CADRE = {suspect: [0xffb547, 1.2, .2, .07, 2], seul: [0xffb547, 2.6, .75, .25, 5], fautif: [0xff4d6d, 3.2, .85, .15, 7],
  vrai: [0x3ddc97, 2.6, .8, .2, 4], ecarte: [0, 0, 0, 0, 0]};
let racine = null, plateau = null, comps = {}, points = {}, lecture = null, verdict = null, braise = 0;

B.construire = (D, vitrine = false) => {
  const sc = BM.scene;
  if (racine) { racine.traverse(o => o.isCSS2DObject && o.element.remove()); racine.removeFromParent(); }
  lecture = verdict = null;
  racine = new THREE.Group(); sc.scene3d.add(racine);
  plateau = BM.plateau.construire(D); racine.add(plateau.groupe); points = plateau.points; comps = {};
  for (const c of D.composants) { const k = BM.composants.creer(c, plateau.versMonde(c.x, c.y)); comps[c.id] = k; racine.add(k.racine); }
  sc.cibles = [...Object.values(comps).map(k => k.racine), ...Object.values(points).map(p => p.groupe)];
  BM.effets.pistes(plateau.pistes); BM.effets.garer(plateau, !vitrine); sc.sol(plateau.W, plateau.H); sc.compiler();
  if (!vitrine) intro();
  return plateau;
};
/* Compile une fois chaque type de composant, cachés : la première entrée en scène ne saccade pas. */
B.prechauffer = () => {
  const g = new THREE.Group(), v = new THREE.Vector3(0, -50, 0);
  for (const type of Object.keys(BM.composants.TAILLES)) g.add(BM.composants.creer({id: "X", type}, v).racine);
  BM.scene.scene3d.add(g); BM.scene.compiler();
  g.traverse(o => o.isCSS2DObject && o.element.remove()); g.removeFromParent();
};
B.etatDe = id => comps[id] ? comps[id].etat : points[id] ? points[id].etat : "";
B.mesuresDe = id => points[id] ? Object.values(points[id].mesures).map(m => m.texte) : [];

/* L'entrée en scène : la carte monte, les points éclosent, les composants tombent et le courant s'établit. */
function intro() {
  const sc = BM.scene, E = BM.effets, g = plateau.groupe, f = BM.calme ? .2 : 1;
  document.body.classList.add("sans-eti");
  g.position.y = -3; g.scale.setScalar(.88);
  sc.tween(1.6 * f, e => { g.position.y = -3 * (1 - e); g.scale.setScalar(.88 + .12 * e); }, {ease: sc.sortie});
  Object.values(points).forEach((p, i) => {
    p.groupe.scale.setScalar(.001);
    sc.tween(.5 * f, e => p.groupe.scale.setScalar(Math.max(e, .001)), {delai: (1 + i * .06) * f, ease: sc.rebond});
  });
  Object.values(comps).forEach((k, i) => {
    k.corps.visible = false;
    sc.tween(.8 * f, e => { k.corps.visible = true; k.corps.position.y = 6 * (1 - e); }, {delai: (1.3 + i * .16) * f, ease: sc.chute,
      fin: () => { E.onde(k.pos, E.COUL.info, 1.5, .7); E.etincelles(k.pos.clone().setY(.1), E.COUL.info, 10, 1.6); BM.son.pose(); }});
  });
  plateau.pistes.forEach((pi, i) => E.impulsion(pi, pi.a, E.COUL.info, {vitesse: 7, force: 2.8, delai: (1.1 + i * .07) * f, prof: 0}));
  sc.plusTard(2.4 * f, () => document.body.classList.remove("sans-eti"));
}

/* ---------- États ---------- */
B.reinitialiser = () => {
  BM.scene.annulerJeu(); B.retirerLecture(); finVerdict();
  for (const p of Object.values(points)) { p.mesures = {}; p.etat = ""; p.halo.material.opacity = 0; p.eti.className = "eti tp"; p.val.textContent = ""; }
  for (const k of Object.values(comps)) { k.etat = "suspect"; BM.composants.estomper(k, 0); k.eti.className = "eti cp"; }
  if (BM.effets.sonde.parking) BM.effets.sondeVers(BM.effets.sonde.parking, {instant: true, toucher: false, hauteur: .001});
};

function marquerPoint(t) {
  const p = points[t.cible]; if (!p) return;
  p.mesures[t.mesure.type] = t.mesure;
  const etats = Object.values(p.mesures).map(m => m.etat);
  p.etat = etats.includes("ko") ? "ko" : etats.includes("ok") ? "ok" : "info";
  p.halo.material.color.setHex(BM.effets.COUL[p.etat]).multiplyScalar(2.2);
  p.eti.className = "eti tp " + p.etat;
  p.val.textContent = [p.mesures.tension, p.mesures.signal].filter(Boolean).map(m => m.court).join(" · ");
}

B.hypotheses = (garde, instant) => {
  let ecartes = 0;
  for (const k of Object.values(comps)) {
    const reste = garde.has(k.id), etat = reste ? (garde.size === 1 ? "seul" : "suspect") : "ecarte";
    if (k.etat === etat) continue;
    if (!instant && !reste) { BM.effets.etincelles(k.pos.clone().setY(k.hauteur * .6), 0x8796b0, 12, 1.1, 1.4); ecartes++; }
    const k0 = k.k, k1 = reste ? 0 : 1; k.etat = etat; k.eti.className = "eti cp " + (reste ? etat : "off");
    if (instant) BM.composants.estomper(k, k1);
    else BM.scene.tween(.9, e => BM.composants.estomper(k, k0 + (k1 - k0) * e), {cle: "fondu" + k.id});
  }
  if (ecartes) BM.son.ecarte();
};

B.viser = t => {
  const E = BM.effets, couleur = E.OUTIL[t.outil] ?? E.COUL.info;
  if (t.comp) { const k = comps[t.cible]; if (k) E.sondeVers(k.pos.clone().setY(k.hauteur), {toucher: false, hauteur: 1, couleur}); }
  else if (points[t.cible]) E.sondeVers(points[t.cible].sommet, {couleur});
};
B.poserSonde = t => {
  const k = comps[t.cible], p = points[t.cible], E = BM.effets;
  E.couleurSonde(E.OUTIL[t.outil] ?? E.COUL.info);
  if (p) E.sondeVers(p.sommet, {instant: true}); else if (k) E.sondeVers(k.pos.clone().setY(k.hauteur), {instant: true, toucher: false, hauteur: 1});
};
B.instantane = t => { if (!t.comp) marquerPoint(t); };

B.contact = t => {
  const E = BM.effets, m = t.mesure, coul = E.COUL[m.etat] || E.COUL.info;
  if (t.comp) {
    const k = comps[t.cible]; if (!k) return B.retirerLecture();
    scan(k); bulle(t, k.pos.clone().add(new THREE.Vector3(-.3, k.hauteur + .5, 0))); BM.son.contact(); return;
  }
  const p = points[t.cible]; if (!p) return B.retirerLecture();
  E.flash(coul); E.onde(p.pos, coul, 1.8, .8); E.onde(p.pos, coul, 3.4, 1.4, .03); E.etincelles(p.sommet, coul, 18, 2.4);
  E.depuis(p.id, coul, {prof: 1, force: 3.2, vitesse: 6.5});
  marquerPoint(t); bulle(t, p.pos.clone().add(new THREE.Vector3(-.32, 1.05, 0))); BM.son.contact(m.etat);
};

function scan(k) {
  const m = new THREE.Mesh(k.cadre.geometry, new THREE.MeshBasicMaterial({color: new THREE.Color(BM.effets.COUL.violet).multiplyScalar(3),
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide}));
  m.rotation.x = -Math.PI / 2; m.position.copy(k.pos); racine.add(m);
  BM.scene.tween(1.8, (e, x) => { m.position.y = k.hauteur * (.5 - .5 * Math.cos(x * Math.PI * 4)) + .03; m.material.opacity = Math.sin(x * Math.PI); },
    {ease: x => x, fin: () => { m.removeFromParent(); m.material.dispose(); }});
}

/* Bulle de lecture accrochée au point mesuré (avec oscillogramme pour un test de signal). */
function bulle(t, ancre) {
  B.retirerLecture();
  const m = t.mesure, el = document.createElement("div"), b = document.createElement("div");
  b.className = "lecture " + (m.etat || "") + " " + t.outil;
  b.innerHTML = `<div class="tete">${BM.panneau.ICONES[t.outil] || ""}<span></span></div><div class="val"></div><div class="att"></div>`;
  b.querySelector(".tete span").textContent = t.nomOutil + " · " + (t.cible || "?");
  const val = b.querySelector(".val");
  if (m.type === "signal") { val.textContent = m.valeur; const q = document.createElement("span"); q.className = "q"; q.textContent = m.q; val.append(q); }
  else val.textContent = m.texte;
  b.querySelector(".att").textContent = m.attendu ? "expected " + m.attendu : m.role || "";
  if (m.type === "signal") { const cv = document.createElement("canvas"); cv.width = 312; cv.height = 100; b.append(cv); }
  el.append(b);
  const o = new BM.scene.L.CSS2DObject(el); o.position.copy(ancre); o.center.set(1, 1); racine.add(o);
  lecture = {o, cv: b.querySelector("canvas"), m};
}
B.retirerLecture = () => { if (lecture) { lecture.o.removeFromParent(); lecture = null; } };

function oscillo(cv, m, t) {
  const g = cv.getContext("2d"), w = cv.width, h = cv.height, ref = Math.max(m.aNom || 0, m.a || 0, .001);
  g.clearRect(0, 0, w, h); g.strokeStyle = "rgba(255,255,255,.07)"; g.lineWidth = 1; g.setLineDash([]);
  for (let x = 0; x <= w; x += w / 8) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
  g.beginPath(); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.stroke();
  const trace = (amp, qual, coul, larg, tirets) => {
    g.beginPath(); g.strokeStyle = coul; g.lineWidth = larg; g.setLineDash(tirets ? [7, 7] : []);
    for (let x = 0; x <= w; x += 2) {
      const ph = x / w * Math.PI * 6 - t * 5; let y = Math.sin(ph);
      if (qual === "distorted") y = Math.max(-.5, Math.min(.5, y * 1.5)) / .5 * .9 + Math.sin(ph * 7.3 + t * 9) * .14;
      const yy = h / 2 - y * h * .4 * amp / ref + (qual === "silent" ? (Math.random() - .5) * 2 : 0);
      x ? g.lineTo(x, yy) : g.moveTo(x, yy);
    }
    g.stroke();
  };
  if (m.aNom) trace(m.aNom, m.qNom, "rgba(255,255,255,.3)", 2, true);
  trace(m.a, m.qualite, m.etat === "ko" ? "#ff4d6d" : "#3ddc97", 3.2, false);
}

/* ---------- Verdict ---------- */
B.verdict = D => {
  B.retirerLecture(); BM.effets.parquer();
  const k = comps[D.diag], juste = !!D.diag && D.diag === D.vrai;
  if (D.vrai && !juste && comps[D.vrai]) { comps[D.vrai].etat = "vrai"; BM.composants.estomper(comps[D.vrai], 0); comps[D.vrai].eti.className = "eti cp vrai"; }
  if (!k) { BM.son.verdict(false); return; }
  k.etat = "fautif"; BM.composants.estomper(k, 0); k.eti.className = "eti cp fautif";
  const viseur = new THREE.Group(), r = Math.max(...k.taille) * .78, mat = new THREE.MeshBasicMaterial({color: new THREE.Color(BM.effets.COUL.ko).multiplyScalar(3),
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false});
  for (let i = 0; i < 4; i++) { const a = new THREE.Mesh(new THREE.TorusGeometry(r, .022, 8, 24, Math.PI / 3), mat); a.rotation.z = i * Math.PI / 2; viseur.add(a); }
  const anneau = new THREE.Mesh(new THREE.TorusGeometry(r * 1.18, .01, 6, 120), mat); viseur.add(anneau);
  viseur.rotation.x = -Math.PI / 2; viseur.position.copy(k.pos).setY(.06); racine.add(viseur);
  verdict = {viseur, k, mat};
  BM.scene.tween(.9, e => { viseur.scale.setScalar(3.2 - 2.2 * e); mat.opacity = e; }, {ease: BM.scene.sortie,
    fin: () => { BM.effets.onde(k.pos, juste ? BM.effets.COUL.ok : BM.effets.COUL.ko, 11, 2.4, .02); BM.effets.etincelles(k.pos.clone().setY(k.hauteur), 0xff7a3d, 40, 3); }});
  BM.scene.focaliser(k.pos); BM.son.verdict(juste);
};
function finVerdict() { if (verdict) { verdict.viseur.removeFromParent(); verdict = null; } }

B.animer = (dt, dj, t) => {
  for (const k of Object.values(comps)) {
    const c = CADRE[k.etat] || CADRE.ecarte, m = k.cadre.material;
    m.color.setHex(c[0]).multiplyScalar(c[1]); m.opacity += (Math.max(0, c[2] + c[3] * Math.sin(t * c[4])) - m.opacity) * Math.min(1, dt * 6);
  }
  for (const p of Object.values(points)) {
    const cible = p.etat === "ko" ? .6 + .3 * Math.sin(t * 5) : p.etat ? .55 : 0;
    p.halo.material.opacity += (cible - p.halo.material.opacity) * Math.min(1, dt * 8);
  }
  if (lecture && lecture.cv) oscillo(lecture.cv, lecture.m, t);
  if (verdict) {
    verdict.viseur.rotation.z = t * .6;
    if ((braise += dt) > .05) { braise = 0; BM.effets.etincelles(verdict.k.pos.clone().setY(verdict.k.hauteur * .8), 0xff6a3d, 2, 1.1, 1.8); }
  }
};
})();
