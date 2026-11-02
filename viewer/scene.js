/* BenchMate — rejeu : moteur 3D (rendu, post-traitement, caméra, sol, interpolations). */
(() => {
const S = BM.scene = {vitesse: 1, pause: false, cibles: [], surSurvol: null};
const tweens = [], boucles = [], dec = {x: 0, y: 0, vx: 0, vy: 0};
let L, rendu, compo, bloom, etiq, cam, ctrl, scene, solMat, poussiere, horloge, heros = null, survol = null, ray, ndc;

S.ease = k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
S.sortie = k => 1 - Math.pow(1 - k, 3);
S.rebond = k => 1 + 2.7 * Math.pow(k - 1, 3) + 1.7 * Math.pow(k - 1, 2);
S.chute = k => {
  const n = 7.5625, d = 2.75;
  return k < 1 / d ? n * k * k : k < 2 / d ? n * (k -= 1.5 / d) * k + .75
    : k < 2.5 / d ? n * (k -= 2.25 / d) * k + .9375 : n * (k -= 2.625 / d) * k + .984375;
};

/* maj(e, k) reçoit l'avancement adouci e et brut k ; jeu = suit la vitesse et la pause de la lecture. */
S.tween = (duree, maj, o = {}) => {
  if (o.cle) for (let i = tweens.length; i--;) if (tweens[i].cle === o.cle) tweens.splice(i, 1);
  const tw = {duree: Math.max(duree, 1e-4), maj, t: -(o.delai || 0), jeu: !!o.jeu, f: o.ease || S.ease, fin: o.fin, cle: o.cle};
  tweens.push(tw);
  return tw;
};
S.plusTard = (s, f, jeu) => S.tween(1e-4, () => {}, {delai: s, fin: f, jeu});
S.annulerJeu = () => { for (let i = tweens.length; i--;) if (tweens[i].jeu) tweens.splice(i, 1); };
S.boucle = f => boucles.push(f);

S.init = libs => {
  L = S.L = libs;
  const THREE = window.THREE = libs.THREE, hote = document.getElementById("scene");
  rendu = new THREE.WebGLRenderer({powerPreference: "high-performance"});
  rendu.setPixelRatio(Math.min(devicePixelRatio, 2));
  rendu.toneMapping = THREE.ACESFilmicToneMapping; rendu.toneMappingExposure = 1.1;
  rendu.shadowMap.enabled = true; rendu.shadowMap.type = THREE.PCFSoftShadowMap;
  hote.appendChild(rendu.domElement);
  etiq = new libs.CSS2DRenderer(); etiq.domElement.className = "etiquettes"; hote.appendChild(etiq.domElement);
  scene = S.scene3d = new THREE.Scene();
  scene.background = new THREE.Color(0x04060b); scene.fog = new THREE.FogExp2(0x04060b, .016);
  scene.environment = new THREE.PMREMGenerator(rendu).fromScene(new libs.RoomEnvironment(), .04).texture;
  scene.environmentIntensity = .5;
  cam = S.camera = new THREE.PerspectiveCamera(34, innerWidth / innerHeight, .1, 300);
  ctrl = S.controles = new libs.OrbitControls(cam, etiq.domElement);
  Object.assign(ctrl, {enableDamping: true, dampingFactor: .06, enablePan: false, minDistance: 4, maxDistance: 70,
    maxPolarAngle: 1.36, autoRotate: !BM.calme, autoRotateSpeed: .45});
  ctrl.addEventListener("start", () => { ctrl.autoRotate = false; });
  lumieres(THREE); sol(THREE); particules(THREE);
  const rt = new THREE.WebGLRenderTarget(1, 1, {type: THREE.HalfFloatType, samples: 4});
  compo = new libs.EffectComposer(rendu, rt);
  compo.addPass(new libs.RenderPass(scene, cam));
  bloom = new libs.UnrealBloomPass(new THREE.Vector2(1, 1), .75, .55, .88);
  compo.addPass(bloom); compo.addPass(new libs.OutputPass());
  ray = new THREE.Raycaster(); ndc = new THREE.Vector2();
  etiq.domElement.addEventListener("pointermove", e => { survol = e; });
  etiq.domElement.addEventListener("pointerleave", () => { survol = null; S.surSurvol && S.surSurvol(null); });
  addEventListener("resize", redim); redim();
  S.vitrine();
  horloge = new THREE.Clock(); requestAnimationFrame(boucle);
};

function lumieres(THREE) {
  const soleil = new THREE.DirectionalLight(0xfff1de, 2.6);
  soleil.position.set(7, 15, 8); soleil.castShadow = true; soleil.shadow.mapSize.set(2048, 2048);
  Object.assign(soleil.shadow.camera, {left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 50});
  soleil.shadow.bias = -.0004; soleil.shadow.normalBias = .02;
  const bleu = new THREE.DirectionalLight(0x46c8ff, 1.8); bleu.position.set(-12, 6, -10);
  const violet = new THREE.DirectionalLight(0xa070ff, 1.1); violet.position.set(12, 5, -8);
  scene.add(soleil, bleu, violet, new THREE.HemisphereLight(0x9fbfff, 0x06080e, .35));
}

/* Sol infini : grille lumineuse qui s'estompe au loin, ombre douce sous la carte. */
function sol(THREE) {
  solMat = new THREE.ShaderMaterial({
    uniforms: {uTaille: {value: new THREE.Vector2(5, 3.5)}, uFond: {value: new THREE.Color(0x04060b)}},
    vertexShader: "varying vec3 vP; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vP = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }",
    fragmentShader: `uniform vec2 uTaille; uniform vec3 uFond; varying vec3 vP;
      float grille(vec2 p, float pas){ vec2 q = p / pas; vec2 g = abs(fract(q - .5) - .5) / fwidth(q); return 1. - min(min(g.x, g.y), 1.); }
      void main(){ float d = length(vP.xz);
        float l = grille(vP.xz, 1.) * .35 + grille(vP.xz, 5.) * .8;
        vec3 c = uFond + vec3(.16, .62, .9) * l * .14 * exp(-d * .045) + vec3(.03, .16, .26) * exp(-d * .11) * .7;
        float b = length(max(abs(vP.xz) - uTaille, 0.));
        c *= mix(.2, 1., smoothstep(0., 3.5, b));
        gl_FragColor = vec4(mix(c, uFond, smoothstep(16., 70., d)), 1.); }`
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(240, 240), solMat);
  m.rotation.x = -Math.PI / 2; m.position.y = -1.7; scene.add(m);
}
S.sol = (W, H) => solMat.uniforms.uTaille.value.set(W / 2, H / 2);
S.compiler = () => rendu.compile(scene, cam); // shaders prêts avant l'entrée en scène, sans à-coup

function particules(THREE) {
  const n = 520, p = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) p.set([(Math.random() - .5) * 56, -1.5 + Math.random() * 10, (Math.random() - .5) * 56], i * 3);
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(p, 3));
  const c = document.createElement("canvas"); c.width = c.height = 32;
  const x = c.getContext("2d"), r = x.createRadialGradient(16, 16, 0, 16, 16, 16);
  r.addColorStop(0, "#fff"); r.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = r; x.fillRect(0, 0, 32, 32);
  poussiere = new THREE.Points(g, new THREE.PointsMaterial({size: .08, map: new THREE.CanvasTexture(c), color: 0x6fd8ff,
    transparent: true, opacity: .5, depthWrite: false, blending: THREE.AdditiveBlending}));
  scene.add(poussiere);
}

function redim() {
  const w = innerWidth, h = innerHeight;
  rendu.setSize(w, h); compo.setSize(w, h); bloom.resolution.set(w / 2, h / 2); etiq.setSize(w, h);
  cam.aspect = w / h;
  if (document.body.classList.contains("charge")) dec.vx = S.libre() / 2;
}

/* ---------- Caméra ---------- */
S.libre = () => {
  const p = document.getElementById("panneau");
  return document.body.classList.contains("charge") && innerWidth > 980 ? p.offsetWidth + 32 : 0;
};
S.cadrer = (W, H) => {
  const lib = S.libre(), fracW = (innerWidth - lib) / innerWidth, tv = Math.tan(cam.fov * Math.PI / 360);
  const th = tv * (innerWidth / innerHeight) * fracW, d = Math.max(W * .64 / th, H * .66 / tv, 8), pol = .86, az = -.3;
  dec.vx = lib / 2; dec.vy = -innerHeight * .035;
  heros = {cible: new THREE.Vector3(0, 0, .3),
    pos: new THREE.Vector3(Math.sin(pol) * Math.sin(az), Math.cos(pol), Math.sin(pol) * Math.cos(az)).multiplyScalar(d)};
  return heros;
};
S.voler = (pos, cible, duree = 2, ease = S.ease) => {
  const c0 = ctrl.target.clone(), s0 = new THREE.Spherical().setFromVector3(cam.position.clone().sub(c0));
  const s1 = new THREE.Spherical().setFromVector3(pos.clone().sub(cible)), sp = new THREE.Spherical();
  let dth = s1.theta - s0.theta; if (dth > Math.PI) dth -= 2 * Math.PI; if (dth < -Math.PI) dth += 2 * Math.PI;
  ctrl.enabled = false;
  S.tween(duree, e => {
    ctrl.target.lerpVectors(c0, cible, e);
    sp.set(s0.radius + (s1.radius - s0.radius) * e, s0.phi + (s1.phi - s0.phi) * e, s0.theta + dth * e);
    cam.position.setFromSpherical(sp).add(ctrl.target);
  }, {ease, cle: "camera", fin: () => { ctrl.enabled = true; }});
};
S.vitrine = () => {
  cam.position.set(7, 12.5, 14); ctrl.target.set(0, 2.2, 0); dec.vx = dec.vy = 0;
  ctrl.autoRotate = !BM.calme;
};
S.intro = (W, H) => {
  const h = S.cadrer(W, H), s = new THREE.Spherical().setFromVector3(h.pos.clone().sub(h.cible));
  s.radius *= 2.3; s.phi = .14; s.theta -= 1.6;
  ctrl.autoRotate = false; ctrl.target.copy(h.cible); cam.position.setFromSpherical(s).add(h.cible);
  S.voler(h.pos, h.cible, BM.calme ? .01 : 3.6);
  S.sol(W, H);
};
S.revenir = (d = 1.4) => { if (heros) S.voler(heros.pos, heros.cible, d); };
S.focaliser = (p, d = 2.2) => {
  if (!heros) return;
  // on vise un peu devant le composant : il remonte dans l'image, au-dessus de la carte du verdict
  const dir = heros.pos.clone().sub(heros.cible).normalize(), c = p.clone().add(new THREE.Vector3(0, .3, 2.1));
  S.voler(c.clone().addScaledVector(dir, Math.min(13, heros.pos.length() * .62)), c, d);
};

/* ---------- Boucle ---------- */
function boucle() {
  requestAnimationFrame(boucle);
  const dt = Math.min(horloge.getDelta(), .1), dj = S.pause ? 0 : dt * S.vitesse, t = horloge.elapsedTime;
  for (const tw of tweens.slice()) {
    if (!tweens.includes(tw)) continue;
    tw.t += tw.jeu ? dj : dt;
    if (tw.t < 0) continue;
    const k = Math.min(tw.t / tw.duree, 1);
    tw.maj(tw.f(k), k);
    if (k >= 1) { const i = tweens.indexOf(tw); if (i >= 0) tweens.splice(i, 1); tw.fin && tw.fin(); }
  }
  for (const f of boucles) f(dt, dj, t);
  poussiere.rotation.y = t * .012; poussiere.position.y = Math.sin(t * .25) * .3;
  dec.x += (dec.vx - dec.x) * Math.min(1, dt * 2.5); dec.y += (dec.vy - dec.y) * Math.min(1, dt * 2.5);
  cam.setViewOffset(innerWidth, innerHeight, dec.x, dec.y, innerWidth, innerHeight);
  ctrl.update();
  if (survol && S.surSurvol) {
    const e = survol; survol = null;
    ray.setFromCamera(ndc.set(e.clientX / innerWidth * 2 - 1, -e.clientY / innerHeight * 2 + 1), cam);
    let o = (ray.intersectObjects(S.cibles, true)[0] || {}).object;
    while (o && !o.userData.cible) o = o.parent;
    S.surSurvol(o ? o.userData.cible : null, e.clientX, e.clientY);
  }
  compo.render();
  etiq.render(scene, cam);
}
})();
