/* BenchMate — rejeu : modèles 3D des composants, entièrement procéduraux (aucun fichier externe). */
(() => {
const C = BM.composants = {};
C.TAILLES = {condensateur: [1, 1], resistance: [1.7, .5], circuit_integre: [1.35, 1.15], transistor: [1, .7],
  diode: [1.5, .45], fusible: [1.7, .7], module: [2.1, 1.3], quartz: [.8, .5], inductance: [1.1, .6], autre: [1.2, 1]};
let M = null, GRIS = null;

const V = (geo, mat, x = 0, y = 0, z = 0) => {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; return m;
};
const cyl = (r, h, s = 24) => new THREE.CylinderGeometry(r, r, h, s);
const boite = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const arrondie = (w, h, d, r) => new BM.scene.L.RoundedBoxGeometry(w, h, d, 3, r);
const couche = m => { m.rotation.z = Math.PI / 2; return m; };
const aPlat = (m, y) => { m.rotation.x = -Math.PI / 2; m.position.y = y; return m; };

function materiaux() {
  const St = THREE.MeshStandardMaterial, Ph = THREE.MeshPhysicalMaterial;
  return {etain: new St({color: 0xdde2ea, metalness: 1, roughness: .25}), alu: new St({color: 0xc3c9d2, metalness: 1, roughness: .32}),
    epoxy: new Ph({color: 0x141519, roughness: .48, clearcoat: .5, clearcoatRoughness: .4}),
    creux: new St({color: 0x050506, roughness: .9}), anodise: new St({color: 0x262c37, metalness: .75, roughness: .36}),
    bornier: new St({color: 0x2f7fd8, roughness: .45}),
    verre: new Ph({color: 0xdff1ff, roughness: .05, clearcoat: 1, transparent: true, opacity: .3, depthWrite: false}),
    fil: new St({color: 0xffc27a, emissive: 0xff8c3a, emissiveIntensity: .6, metalness: .5, roughness: .3}),
    led: new St({color: 0x0a3a1f, emissive: 0x3dff9a, emissiveIntensity: 2.6})};
}
function texture(l, h, dessin) {
  const c = document.createElement("canvas"); c.width = l; c.height = h; dessin(c.getContext("2d"), l, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
/* Marquage imprimé sur une face : lignes [texte, taille relative, position verticale relative]. */
function marquage(lignes, w, h, coul = "rgba(205,212,224,.72)") {
  const tex = texture(512, Math.round(512 * h / w), (g, l, H) => {
    g.fillStyle = coul; g.textAlign = "center"; g.textBaseline = "middle";
    for (const [txt, taille, y] of lignes) { g.font = `650 ${taille * H}px "Segoe UI", sans-serif`; g.fillText(txt, l / 2, y * H); }
  });
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({map: tex, transparent: true, roughness: .6, depthWrite: false}));
}
function soudure(g, x, z) { const s = V(new THREE.SphereGeometry(.065, 14, 8), M.etain, x, .01, z); s.scale.y = .5; g.add(s); }
function patte(g, x, y, s) { // sortie axiale : horizontale, puis coudée vers la carte
  const xe = x + s * .17;
  g.add(couche(V(cyl(.022, .17, 8), M.etain, x + s * .085, y, 0)), V(cyl(.022, y, 8), M.etain, xe, y / 2, 0),
    V(new THREE.SphereGeometry(.022, 8, 6), M.etain, xe, y, 0));
  soudure(g, xe, 0);
}

const F = {
  condensateur() {
    const g = new THREE.Group(), r = .36, h = .92, y = .07 + h / 2;
    const manchon = new THREE.MeshPhysicalMaterial({roughness: .3, clearcoat: .9, clearcoatRoughness: .2, map: texture(512, 256, (k, l, H) => {
      k.fillStyle = "#1a2b5c"; k.fillRect(0, 0, l, H); k.fillStyle = "#a8b7d8"; k.fillRect(l * .62, 0, l * .13, H);
      k.fillStyle = "#1a2b5c"; k.font = "800 44px Segoe UI"; k.textAlign = "center";
      for (let i = 0; i < 4; i++) k.fillText("–", l * .685, 48 + i * 58);
      k.fillStyle = "#e3e9f6"; k.font = "700 46px Segoe UI"; k.fillText("470µF", l * .3, H * .42);
      k.font = "600 30px Segoe UI"; k.fillText("25V · 105°C", l * .3, H * .64);
    })});
    const corps = V(cyl(r, h, 48), [manchon, M.alu, M.epoxy], 0, y, 0); corps.rotation.y = 4.1; g.add(corps);
    const bord = V(new THREE.TorusGeometry(r - .015, .026, 10, 48), M.alu, 0, y + h / 2 - .012, 0); bord.rotation.x = Math.PI / 2; g.add(bord);
    for (const a of [0, Math.PI / 2]) { const e = V(boite(.46, .012, .03), M.creux, 0, y + h / 2 + .004, 0); e.rotation.y = a + .6; g.add(e); }
    for (const x of [-.13, .13]) { g.add(V(cyl(.02, .08, 8), M.etain, x, .04, 0)); soudure(g, x, 0); }
    return [g, .07 + h];
  },
  resistance() {
    const g = new THREE.Group(), y = .3, prof = [];
    for (let i = 0; i <= 48; i++) {
      const t = -.56 + i * 1.12 / 48, a = Math.abs(t);
      prof.push(new THREE.Vector2(a > .53 ? .11 * Math.sqrt(Math.max(0, (.56 - a) / .03)) : .118 + .038 * Math.exp(-(((a - .42) / .075) ** 2)), t));
    }
    const tex = texture(64, 512, (k, l, H) => {
      k.fillStyle = "#c9b28b"; k.fillRect(0, 0, l, H);
      for (const [col, v] of [["#6b3a1e", .2], ["#151515", .34], ["#e06a12", .46], ["#c9a24a", .8]]) { k.fillStyle = col; k.fillRect(0, (1 - v) * H - 20, l, 40); }
    });
    g.add(couche(V(new THREE.LatheGeometry(prof, 40), new THREE.MeshPhysicalMaterial({map: tex, roughness: .45, clearcoat: .6}), 0, y, 0)));
    for (const s of [-1, 1]) patte(g, s * .56, y, s);
    return [g, y + .16];
  },
  circuit_integre(c) {
    const g = new THREE.Group(), y = .25, lo = 1.04, la = .64, ha = .26;
    g.add(V(arrondie(lo, ha, la, .03), M.epoxy, 0, y, 0));
    g.add(aPlat(marquage([["MS-358P", .3, .38], [c.id + "  ·  2644", .2, .7]], lo * .78, la * .7), y + ha / 2 + .003));
    g.add(V(new THREE.CylinderGeometry(.07, .07, .012, 20, 1, false, 0, Math.PI), M.creux, -lo / 2, y + ha / 2 - .004, 0));
    g.add(V(cyl(.035, .01, 16), M.creux, -lo / 2 + .14, y + ha / 2, la / 2 - .14));
    for (const s of [-1, 1]) for (let i = 0; i < 4; i++) {
      const x = -.39 + i * .26;
      g.add(V(boite(.08, .03, .12), M.etain, x, y - .03, s * (la / 2 + .05)), V(boite(.07, y - .02, .03), M.etain, x, (y - .02) / 2, s * (la / 2 + .1)));
      soudure(g, x, s * (la / 2 + .1));
    }
    return [g, y + ha / 2];
  },
  transistor(c) {
    const g = new THREE.Group(), b = .34;
    g.add(V(boite(.66, .58, .3), M.epoxy, 0, b + .29, 0), V(boite(.66, 1, .06), M.alu, 0, b + .5, -.18));
    const trou = V(cyl(.1, .08, 24), M.creux, 0, b + .78, -.18); trou.rotation.x = Math.PI / 2; g.add(trou);
    const m = marquage([["IRLZ44N", .3, .38], [c.id, .26, .72]], .56, .34); m.position.set(0, b + .3, .152); g.add(m);
    for (const x of [-.22, 0, .22]) { g.add(V(boite(.06, b, .03), M.etain, x, b / 2, 0)); soudure(g, x, 0); }
    return [g, b + 1];
  },
  diode() {
    const g = new THREE.Group(), y = .24;
    g.add(couche(V(cyl(.11, .62, 32), M.epoxy, 0, y, 0)), couche(V(cyl(.114, .09, 32), M.alu, .22, y, 0)));
    for (const s of [-1, 1]) patte(g, s * .31, y, s);
    return [g, y + .11];
  },
  fusible() {
    const g = new THREE.Group(), y = .36, tube = couche(V(cyl(.15, .78, 32), M.verre, 0, y, 0));
    tube.castShadow = false; g.add(tube, couche(V(cyl(.012, .5, 6), M.fil, 0, y, 0)));
    for (const s of [-1, 1]) {
      g.add(couche(V(cyl(.16, .17, 32), M.alu, s * .33, y, 0)), V(boite(.15, .03, .36), M.etain, s * .33, .015, 0));
      for (const z of [-.15, .15]) g.add(V(boite(.13, .3, .03), M.etain, s * .33, .17, z));
    }
    return [g, y + .16];
  },
  module(c) {
    const g = new THREE.Group(), lo = 1.4, la = 1, h = .42, y = .05 + h / 2;
    g.add(V(arrondie(lo, h, la, .05), M.anodise, 0, y, 0));
    for (let i = 0; i < 8; i++) g.add(V(boite(.035, .34, la * .86), M.alu, -.56 + i * .16, y + h / 2 + .17, 0));
    const m = marquage([[c.id + "  ·  DC-DC", .42, .4], ["INPUT 12 V — OUTPUT 9 V", .26, .78]], lo * .8, .24, "rgba(225,232,242,.85)");
    m.position.set(0, y - .02, la / 2 + .003); g.add(m);
    g.add(V(new THREE.SphereGeometry(.045, 16, 10), M.led, lo / 2 - .13, y + .12, la / 2 + .005));
    g.add(V(boite(.3, .26, .52), M.bornier, -lo / 2 - .16, .13, 0));
    for (const z of [-.13, .13]) g.add(V(cyl(.06, .03, 16), M.alu, -lo / 2 - .16, .27, z));
    return [g, y + h / 2 + .34];
  },
  quartz(c) { // boîtier métallique HC-49 debout
    const g = new THREE.Group(), y = .27;
    g.add(V(arrondie(.56, .42, .2, .08), M.alu, 0, y, 0), V(boite(.6, .05, .24), M.epoxy, 0, .05, 0));
    const m = marquage([["8.000", .42, .4], [c.id, .32, .76]], .44, .3, "rgba(40,44,52,.85)"); m.position.set(0, y, .102); g.add(m);
    for (const x of [-.15, .15]) { g.add(V(cyl(.02, .05, 8), M.etain, x, .025, 0)); soudure(g, x, 0); }
    return [g, y + .21];
  },
  inductance() { // tore bobiné debout, spires de cuivre
    const g = new THREE.Group(), y = .5, spires = new THREE.MeshStandardMaterial({metalness: .9, roughness: .3,
      map: texture(512, 64, (k, l, H) => { k.fillStyle = "#e9a45e"; k.fillRect(0, 0, l, H); k.fillStyle = "#6e3b17"; for (let i = 0; i < 72; i++) k.fillRect(i * l / 72, 0, 2.5, H); })});
    g.add(V(new THREE.TorusGeometry(.3, .12, 20, 72), spires, 0, y, 0), V(boite(.5, .06, .3), M.epoxy, 0, .03, 0));
    for (const x of [-.12, .12]) { g.add(V(cyl(.022, .14, 8), M.etain, x, .1, 0)); soudure(g, x, 0); }
    return [g, y + .42];
  },
  autre(c) {
    const g = new THREE.Group();
    g.add(V(arrondie(1, .4, .8, .05), M.anodise, 0, .22, 0), aPlat(marquage([[c.id, .5, .5]], .7, .4), .425));
    return [g, .42];
  }
};

/* Contour lumineux posé sur la carte autour du composant (suspect, fautif...). */
function contour(w, h) {
  const forme = (a, b, r) => {
    const s = new THREE.Shape(); s.moveTo(-a + r, -b); s.lineTo(a - r, -b); s.quadraticCurveTo(a, -b, a, -b + r); s.lineTo(a, b - r);
    s.quadraticCurveTo(a, b, a - r, b); s.lineTo(-a + r, b); s.quadraticCurveTo(-a, b, -a, b - r); s.lineTo(-a, -b + r);
    s.quadraticCurveTo(-a, -b, -a + r, -b); return s;
  };
  const ext = forme(w / 2 + .2, h / 2 + .2, .22); ext.holes.push(forme(w / 2 + .13, h / 2 + .13, .16));
  return aPlat(new THREE.Mesh(new THREE.ShapeGeometry(ext, 8), new THREE.MeshBasicMaterial({color: 0xffb547, transparent: true,
    opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false})), .02);
}

C.creer = (c, pos) => {
  M = M || materiaux(); GRIS = GRIS || new THREE.Color();
  const [g, hauteur] = (F[c.type] || F.autre)(c), taille = C.TAILLES[c.type] || C.TAILLES.autre;
  const racine = new THREE.Group(), mats = [], copies = new Map();
  racine.position.copy(pos); racine.add(g); racine.userData.cible = {type: "composant", id: c.id};
  const copier = m => { // matériaux propres au composant, pour pouvoir l'estomper seul
    if (!copies.has(m)) {
      const n = m.clone(); copies.set(m, n); n.transparent = true; // fixé d'avance : estomper ne recompile aucun shader
      mats.push({m: n, c0: n.color.clone(), e0: n.emissive ? n.emissive.clone() : null, o0: n.opacity, d0: n.depthWrite});
    }
    return copies.get(m);
  };
  g.traverse(o => { if (o.isMesh) o.material = Array.isArray(o.material) ? o.material.map(copier) : copier(o.material); });
  const cadre = contour(taille[0], taille[1]); racine.add(cadre);
  const el = document.createElement("div"), eti = document.createElement("div"), b = document.createElement("b");
  eti.className = "eti cp"; b.textContent = c.id; eti.append(b); el.append(eti);
  const o = new BM.scene.L.CSS2DObject(el); o.position.set(0, 0, taille[1] / 2 + .3); o.center.set(.5, 0); racine.add(o);
  return {id: c.id, c, racine, corps: g, mats, cadre, eti, taille, hauteur, pos, k: 0, etat: "suspect"};
};

/* k = 0 : intact ; k = 1 : hypothèse écartée (désaturé, translucide). */
C.estomper = (comp, k) => {
  comp.k = k;
  for (const x of comp.mats) {
    const m = x.m, l = x.c0.r * .3 + x.c0.g * .59 + x.c0.b * .11;
    m.color.copy(x.c0).lerp(GRIS.setRGB(l, l, l), k * .85).multiplyScalar(1 - .45 * k);
    if (x.e0) m.emissive.copy(x.e0).multiplyScalar(1 - k);
    m.opacity = x.o0 * (1 - .68 * k);
    m.depthWrite = x.d0 && k < .5;
  }
};
})();
