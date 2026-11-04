/* BenchMate — rejeu : la carte (sérigraphie, pistes de cuivre, points de test), construite depuis le journal. */
(() => {
const P = BM.plateau = {};
const ECH = 1 / 40;
let MAT = null, JOINT = null;

function materiaux() {
  return {or: new THREE.MeshStandardMaterial({color: 0xd9a64a, metalness: 1, roughness: .3, emissive: 0x2b1803}),
    etain: new THREE.MeshStandardMaterial({color: 0xe3e7ee, metalness: 1, roughness: .22}),
    tranche: new THREE.MeshStandardMaterial({color: 0x0a201c, roughness: .7}),
    trou: new THREE.MeshBasicMaterial({color: 0x020303})};
}

P.construire = D => {
  MAT = MAT || materiaux(); JOINT = JOINT || new THREE.CylinderGeometry(.05, .05, .022, 16);
  const tous = [...D.points, ...D.composants], vide = !tous.length, xs = tous.map(e => e.x), ys = tous.map(e => e.y);
  const x0 = vide ? 0 : Math.min(...xs), x1 = vide ? 440 : Math.max(...xs);
  const y0 = vide ? 0 : Math.min(...ys), y1 = vide ? 250 : Math.max(...ys);
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2 + (vide ? 0 : 14); // marge basse élargie pour le cartouche
  const W = Math.max((x1 - x0) * ECH + 3.6, 9), H = Math.max((y1 - y0) * ECH + (vide ? 3.8 : 4.5), 6);
  const versMonde = (x, y) => new THREE.Vector3((x - cx) * ECH, 0, (y - cy) * ECH), groupe = new THREE.Group();
  const corps = new THREE.Mesh(new BM.scene.L.RoundedBoxGeometry(W, .16, H, 4, .12), MAT.tranche);
  corps.position.y = -.081; corps.castShadow = corps.receiveShadow = true;
  const dessus = new THREE.Mesh(new THREE.PlaneGeometry(W - .06, H - .06), new THREE.MeshPhysicalMaterial({
    map: serigraphie(D, W, H, versMonde, vide), roughness: .78, clearcoat: .3, clearcoatRoughness: .45, envMapIntensity: .4}));
  dessus.rotation.x = -Math.PI / 2; dessus.position.y = .001; dessus.receiveShadow = true;
  groupe.add(corps, dessus);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) fixation(groupe, sx * (W / 2 - .42), sz * (H / 2 - .42));
  const ou = id => { const e = D.parId[id]; return e ? versMonde(e.x, e.y) : null; }, pistes = [], points = {};
  for (const [a, b] of D.liaisons) { const pa = ou(a), pb = ou(b); if (pa && pb) pistes.push({a, b, ...piste(pa, pb, groupe)}); }
  for (const p of D.points) points[p.id] = pointTest(p, versMonde(p.x, p.y), groupe);
  return {groupe, W, H, versMonde, pistes, points, parking: new THREE.Vector3(W / 2 - .9, 1.7, H / 2 - .7)};
};

/* Pistes à 45° : on suit l'axe dominant, puis on rejoint en diagonale. */
function route(a, b) {
  const dx = b.x - a.x, dz = b.z - a.z, m = Math.min(Math.abs(dx), Math.abs(dz));
  if (m < .02) return [a, b];
  const coin = Math.abs(dx) > Math.abs(dz) ? new THREE.Vector3(b.x - Math.sign(dx) * m, 0, a.z)
    : new THREE.Vector3(a.x, 0, b.z - Math.sign(dz) * m);
  return coin.distanceTo(a) < .02 ? [a, b] : [a, coin, b];
}

function piste(a, b, groupe) {
  const pts = route(a, b), cumul = [0];
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i - 1], q = pts[i], l = p.distanceTo(q);
    cumul.push(cumul[i - 1] + l);
    const seg = new THREE.Mesh(new THREE.BoxGeometry(l, .022, .1), MAT.or);
    seg.position.set((p.x + q.x) / 2, .011, (p.z + q.z) / 2); seg.rotation.y = -Math.atan2(q.z - p.z, q.x - p.x);
    seg.receiveShadow = true; groupe.add(seg);
  }
  for (const p of pts) { const j = new THREE.Mesh(JOINT, MAT.or); j.position.set(p.x, .011, p.z); groupe.add(j); }
  return {pts, cumul, L: cumul[cumul.length - 1]};
}

/* Position à la distance s le long d'une piste. */
P.pointSur = (pi, s, cible) => {
  s = Math.max(0, Math.min(s, pi.L));
  let i = 1;
  while (i < pi.cumul.length - 1 && pi.cumul[i] < s) i++;
  const t = (s - pi.cumul[i - 1]) / ((pi.cumul[i] - pi.cumul[i - 1]) || 1);
  return cible.lerpVectors(pi.pts[i - 1], pi.pts[i], t);
};

function fixation(groupe, x, z) {
  const anneau = new THREE.Mesh(new THREE.RingGeometry(.13, .27, 40), MAT.or);
  const trou = new THREE.Mesh(new THREE.CircleGeometry(.13, 32), MAT.trou);
  anneau.rotation.x = trou.rotation.x = -Math.PI / 2; anneau.position.set(x, .003, z); trou.position.set(x, .004, z);
  groupe.add(anneau, trou);
}

function pointTest(p, pos, groupe) {
  const g = new THREE.Group(); g.position.copy(pos); g.userData.cible = {type: "point", id: p.id};
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(.22, .22, .03, 36), MAT.or); pad.position.y = .015; pad.receiveShadow = true;
  const boucle = new THREE.Mesh(new THREE.TorusGeometry(.15, .03, 12, 32, Math.PI), MAT.etain); boucle.position.y = .03; boucle.castShadow = true;
  const halo = new THREE.Mesh(new THREE.RingGeometry(.3, .42, 48), new THREE.MeshBasicMaterial({color: 0x46d9ff,
    transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false}));
  halo.rotation.x = -Math.PI / 2; halo.position.y = .036;
  const el = document.createElement("div"), eti = document.createElement("div"), b = document.createElement("b"), val = document.createElement("span");
  eti.className = "eti tp"; b.textContent = p.id; val.className = "v"; eti.append(b, val); el.append(eti);
  const o = new BM.scene.L.CSS2DObject(el); o.position.y = .62; o.center.set(.5, 1);
  g.add(pad, boucle, halo, o); groupe.add(g);
  return {id: p.id, pos, groupe: g, halo, eti, val, sommet: pos.clone().setY(.21), mesures: {}, etat: ""};
}

/* Sérigraphie peinte sur une toile : vernis, plan de masse hachuré, empreintes, repères, cartouche. */
function serigraphie(D, W, H, versMonde, vide) {
  const k = 2048 / W, c = document.createElement("canvas"); c.width = 2048; c.height = Math.round(H * k);
  const g = c.getContext("2d"), px = (x, y) => { const v = versMonde(x, y); return [(v.x + W / 2) * k, (v.z + H / 2) * k]; };
  const police = (t, p = 600) => `${p} ${t * k}px "Segoe UI", system-ui, sans-serif`;
  const f = g.createLinearGradient(0, 0, c.width, c.height); f.addColorStop(0, "#0d3d35"); f.addColorStop(1, "#06221c");
  g.fillStyle = f; g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = "rgba(150,255,225,.035)"; g.lineWidth = 3;
  for (let x = -c.height; x < c.width; x += 24) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + c.height, c.height); g.stroke(); }
  g.strokeStyle = g.fillStyle = "rgba(234,241,233,.86)"; g.lineWidth = .028 * k; g.textAlign = "center"; g.textBaseline = "middle";
  g.beginPath(); g.roundRect(.2 * k, .2 * k, c.width - .4 * k, c.height - .4 * k, .25 * k); g.stroke();
  for (const e of D.composants) {
    const [x, y] = px(e.x, e.y), [w, h] = BM.composants.TAILLES[e.type] || BM.composants.TAILLES.autre;
    coins(g, x, y, (w / 2 + .14) * k, (h / 2 + .14) * k, .22 * k);
    g.font = police(.22, 700); g.textAlign = "left"; g.fillText(e.id, x - (w / 2 + .14) * k, y - (h / 2 + .36) * k); g.textAlign = "center";
  }
  for (const p of D.points) {
    const [x, y] = px(p.x, p.y);
    g.beginPath(); g.arc(x, y, .34 * k, 0, 7); g.stroke();
    if (p.name) { g.font = police(.15, 650); g.fillText(p.name, x, y + .55 * k); }
  }
  if (vide) {
    g.font = police(1.1, 800); g.fillStyle = "rgba(234,241,233,.12)"; g.fillText("BENCHMATE", c.width / 2, c.height / 2);
    g.font = police(.24, 600); g.fillText("MUSE SPARK · DIAGNOSIS BENCH", c.width / 2, c.height / 2 + .9 * k);
  } else {
    g.textAlign = "right"; g.font = police(.3, 800); g.fillText("BENCHMATE", c.width - .55 * k, c.height - .7 * k);
    g.font = police(.14, 600); g.fillText((D.titre || "").toUpperCase() + "  ·  REV 2026", c.width - .55 * k, c.height - .42 * k);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

/* Équerres d'angle autour d'une empreinte. */
function coins(g, x, y, a, b, l) {
  for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    g.beginPath(); g.moveTo(x + sx * a, y + sy * (b - l)); g.lineTo(x + sx * a, y + sy * b); g.lineTo(x + sx * (a - l), y + sy * b); g.stroke();
  }
}
})();
