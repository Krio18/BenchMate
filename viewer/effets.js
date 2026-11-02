/* BenchMate — rejeu : effets lumineux (impulsions sur les pistes, ondes, étincelles) et sonde de mesure. */
(() => {
const E = BM.effets = {};
E.COUL = {ok: 0x3ddc97, ko: 0xff4d6d, info: 0x46d9ff, ambre: 0xffb547, violet: 0xa78bfa};
E.OUTIL = {measure_voltage: 0x46d9ff, test_signal: 0xa78bfa, inspect_component: 0xc4d2ff};
const N = 420, imp = [];
let scene, tex, pistes = [], parts, pPos, pVit, pBase, pCol, pVie, pMax, curseur = 0, ambiance = 0, tmp, tmp2, dernier;

function halo() {
  const c = document.createElement("canvas"); c.width = c.height = 64;
  const g = c.getContext("2d"), r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, "#fff"); r.addColorStop(.22, "rgba(255,255,255,.6)"); r.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

E.init = () => {
  scene = BM.scene.scene3d; tex = halo(); tmp = new THREE.Vector3(); tmp2 = new THREE.Vector3(); dernier = new THREE.Vector3(1e9, 0, 0);
  pPos = new Float32Array(N * 3); pVit = new Float32Array(N * 3); pBase = new Float32Array(N * 3); pCol = new Float32Array(N * 3);
  pVie = new Float32Array(N); pMax = new Float32Array(N).fill(1);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pPos, 3)); geo.setAttribute("color", new THREE.BufferAttribute(pCol, 3));
  parts = new THREE.Points(geo, new THREE.PointsMaterial({size: .1, map: tex, vertexColors: true, transparent: true,
    depthWrite: false, blending: THREE.AdditiveBlending}));
  parts.frustumCulled = false; scene.add(parts);
  E.sonde = creerSonde();
  BM.scene.boucle(animer);
};

E.pistes = p => { pistes = p; for (const i of imp.splice(0)) jeter(i.sp); };
const jeter = sp => { sp.removeFromParent(); sp.material.dispose(); };

/* Une impulsion lumineuse qui parcourt une piste, et se propage aux pistes suivantes si prof > 0. */
E.impulsion = (pi, depuis, couleur, o = {}) => {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({map: tex, color: new THREE.Color(couleur).multiplyScalar(o.force || 3),
    blending: THREE.AdditiveBlending, depthWrite: false, transparent: true}));
  sp.scale.setScalar(o.taille || .45); sp.visible = false; scene.add(sp);
  imp.push({pi, sens: pi.a === depuis ? 1 : -1, s: -(o.delai || 0) * (o.vitesse || 6), v: o.vitesse || 6, sp, couleur, o});
};
E.depuis = (id, couleur, o = {}, sauf) => {
  for (const pi of pistes) if (pi !== sauf && (pi.a === id || pi.b === id)) E.impulsion(pi, id, couleur, o);
};

E.onde = (pos, couleur, rayon = 1.6, duree = .8, ep = .08) => {
  const m = new THREE.Mesh(new THREE.RingGeometry(1 - ep, 1, 72), new THREE.MeshBasicMaterial({color: new THREE.Color(couleur).multiplyScalar(2.6),
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false}));
  m.rotation.x = -Math.PI / 2; m.position.copy(pos).setY(.045); m.scale.setScalar(.01); scene.add(m);
  BM.scene.tween(duree, (e, k) => { m.scale.setScalar(.15 + rayon * BM.scene.sortie(k)); m.material.opacity = 1 - k; },
    {ease: k => k, fin: () => { m.removeFromParent(); m.geometry.dispose(); m.material.dispose(); }});
};

E.etincelles = (pos, couleur, n = 14, force = 2.2, haut = 1) => {
  const c = new THREE.Color(couleur);
  for (let k = 0; k < n; k++) {
    const i = curseur = (curseur + 1) % N, a = Math.random() * Math.PI * 2, v = force * (.35 + Math.random() * .8);
    pPos.set([pos.x, pos.y, pos.z], i * 3);
    pVit.set([Math.cos(a) * v * .6, haut * v * (.5 + Math.random()), Math.sin(a) * v * .6], i * 3);
    pBase.set([c.r * 2.6, c.g * 2.6, c.b * 2.6], i * 3); pVie[i] = pMax[i] = .45 + Math.random() * .6;
  }
};

E.flash = (couleur, force = 8) => {
  const l = E.sonde.lum; l.color.setHex(couleur);
  BM.scene.tween(.7, (e, k) => { l.intensity = force * (1 - k) * (1 - k); }, {ease: k => k, cle: "flash"});
};

/* ---------- Sonde ---------- */
function creerSonde() {
  const g = new THREE.Group(), inc = new THREE.Group(); g.add(inc); inc.rotation.set(-.22, 0, -.32);
  const metal = new THREE.MeshStandardMaterial({color: 0xe9edf3, metalness: 1, roughness: .18});
  const coque = new THREE.MeshPhysicalMaterial({color: 0x1b1f27, roughness: .32, clearcoat: 1, clearcoatRoughness: .15});
  const bague = new THREE.MeshStandardMaterial({color: 0x000000, emissive: E.COUL.info, emissiveIntensity: 3.2});
  const piece = (geo, mat, y) => { const m = new THREE.Mesh(geo, mat); m.position.y = y; m.castShadow = true; inc.add(m); return m; };
  piece(new THREE.ConeGeometry(.028, .34, 16), metal, .17).rotation.x = Math.PI;
  piece(new THREE.CylinderGeometry(.05, .03, .14, 20), metal, .41);
  piece(new THREE.CylinderGeometry(.08, .08, .06, 24), bague, .51);
  piece(new THREE.CylinderGeometry(.105, .085, 1.5, 28), coque, 1.29);
  piece(new THREE.CylinderGeometry(.055, .08, .28, 20), coque, 2.15);
  for (let i = 0; i < 4; i++) piece(new THREE.TorusGeometry(.098, .012, 6, 24), metal, .72 + i * .08).rotation.x = Math.PI / 2;
  const lum = new THREE.PointLight(E.COUL.info, 0, 5, 2); lum.position.y = .08; g.add(lum);
  const cable = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshStandardMaterial({color: 0x161a21, roughness: .55}));
  cable.castShadow = true; cable.frustumCulled = false;
  scene.add(g, cable);
  return {g, inc, lum, bague, cable, ancre: new THREE.Vector3(12, 10, -10), haut: true};
}

E.garer = (plateau, visible = true) => {
  const s = E.sonde; s.g.visible = s.cable.visible = visible; s.haut = true;
  s.parking = plateau.parking.clone(); s.g.position.copy(s.parking);
  s.ancre.set(plateau.W / 2 + 6, 9, -plateau.H / 2 - 7);
};
E.couleurSonde = c => { E.sonde.bague.emissive.setHex(c); };

/* Vol en arc jusqu'au-dessus de la cible, puis descente au contact (sauf toucher: false). */
E.sondeVers = (cible, o = {}) => {
  const s = E.sonde, p0 = s.g.position.clone(), haut = cible.clone().add(tmp2.set(0, o.hauteur || 1.25, 0)), toucher = o.toucher !== false;
  if (o.couleur != null) E.couleurSonde(o.couleur);
  if (o.instant) { BM.scene.tween(0, () => {}, {cle: "sonde"}); s.g.position.copy(toucher ? cible : haut); return; }
  BM.scene.tween(o.duree || 1.05, (e, k) => {
    if (k < .76 || !toucher) {
      const u = BM.scene.ease(Math.min(k / (toucher ? .76 : 1), 1));
      s.g.position.lerpVectors(p0, haut, u); s.g.position.y += Math.sin(Math.PI * u) * .9;
    } else { const u = (k - .76) / .24; s.g.position.lerpVectors(haut, cible, u * u); }
  }, {jeu: o.jeu !== false, ease: k => k, cle: "sonde"});
};
E.parquer = () => { if (E.sonde.parking) E.sondeVers(E.sonde.parking, {toucher: false, hauteur: .001, duree: 1.4, jeu: false}); };

function cable(t) {
  const s = E.sonde; if (!s.g.visible) return;
  const bout = s.inc.localToWorld(tmp.set(0, 2.29, 0));
  if (bout.distanceToSquared(dernier) < 1e-6) return;
  dernier.copy(bout);
  const axe = s.inc.localToWorld(tmp2.set(0, 3.1, 0)).clone(), milieu = bout.clone().lerp(s.ancre, .5); milieu.y -= 1.2;
  const courbe = new THREE.CatmullRomCurve3([bout.clone(), axe, milieu, s.ancre.clone()]);
  s.cable.geometry.dispose(); s.cable.geometry = new THREE.TubeGeometry(courbe, 48, .034, 8);
}

/* ---------- Boucle ---------- */
function animer(dt, dj, t) {
  for (let i = imp.length; i--;) {
    const p = imp[i]; p.s += dt * p.v;
    if (p.s < 0) continue;
    p.sp.visible = true;
    BM.plateau.pointSur(p.pi, p.sens > 0 ? p.s : p.pi.L - p.s, p.sp.position).setY(.07);
    if (p.s >= p.pi.L) {
      imp.splice(i, 1); jeter(p.sp);
      if (p.o.prof > 0) E.depuis(p.sens > 0 ? p.pi.b : p.pi.a, p.couleur, {...p.o, prof: p.o.prof - 1, delai: 0}, p.pi);
    }
  }
  if (pistes.length && !BM.calme && (ambiance += dt) > .55) {
    ambiance = 0; const pi = pistes[Math.floor(Math.random() * pistes.length)];
    E.impulsion(pi, Math.random() < .5 ? pi.a : pi.b, E.COUL.info, {force: 1.1, vitesse: 3.2, taille: .3});
  }
  for (let i = 0; i < N; i++) {
    if (pVie[i] <= 0) { pCol[i * 3] = pCol[i * 3 + 1] = pCol[i * 3 + 2] = 0; continue; }
    pVie[i] -= dt; pVit[i * 3 + 1] -= 5.5 * dt;
    for (let a = 0; a < 3; a++) { pPos[i * 3 + a] += pVit[i * 3 + a] * dt; pCol[i * 3 + a] = pBase[i * 3 + a] * Math.max(pVie[i] / pMax[i], 0); }
    if (pPos[i * 3 + 1] < .02) { pPos[i * 3 + 1] = .02; pVit[i * 3 + 1] *= -.35; }
  }
  parts.geometry.attributes.position.needsUpdate = parts.geometry.attributes.color.needsUpdate = true;
  const s = E.sonde; s.inc.position.y = s.g.position.y > .5 ? Math.sin(t * 2.2) * .04 : 0;
  cable(t);
}
})();
