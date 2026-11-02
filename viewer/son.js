/* BenchMate — rejeu : petits sons de synthèse (Web Audio, aucun fichier). */
(() => {
const A = BM.son = {actif: true};
let ctx = null, sortie = null;

function pret() {
  if (!A.actif) return false;
  try {
    if (!ctx) { ctx = new AudioContext(); sortie = ctx.createGain(); sortie.gain.value = .32; sortie.connect(ctx.destination); }
    if (ctx.state === "suspended") ctx.resume();
  } catch { return false; }
  return true;
}
function note(f, t, d, type = "sine", v = .2, f2 = 0) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
  g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(v, t + .015); g.gain.exponentialRampToValueAtTime(.0001, t + d);
  o.connect(g).connect(sortie); o.start(t); o.stop(t + d + .05);
}
function souffle(t, d, f0, f1, v = .12) {
  const n = Math.floor(ctx.sampleRate * d), buf = ctx.createBuffer(1, n, ctx.sampleRate), x = buf.getChannelData(0);
  for (let i = 0; i < n; i++) x[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
  src.buffer = buf; fl.type = "bandpass"; fl.Q.value = 1.4;
  fl.frequency.setValueAtTime(f0, t); fl.frequency.exponentialRampToValueAtTime(f1, t + d);
  g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(v, t + d * .45); g.gain.exponentialRampToValueAtTime(.0001, t + d);
  src.connect(fl).connect(g).connect(sortie); src.start(t);
}

A.intro = () => {
  if (!pret()) return; const t = ctx.currentTime;
  souffle(t, 2, 180, 2600, .13); note(55, t, 2.8, "sine", .22, 110);
  [440, 554, 659, 880].forEach((f, i) => note(f, t + 1.4 + i * .09, 1.3, "sine", .05));
};
A.pose = () => { if (pret()) note(170 + Math.random() * 60, ctx.currentTime, .14, "triangle", .05, 80); };
A.deplacer = () => { if (pret()) souffle(ctx.currentTime, .55, 500, 1900, .035); };
A.contact = etat => {
  if (!pret()) return; const t = ctx.currentTime, ko = etat === "ko";
  note(ko ? 311 : 1046, t, .16, "triangle", .13); note(ko ? 233 : 1568, t + .08, .28, "sine", .09);
};
A.ecarte = () => { if (pret()) note(520, ctx.currentTime, .32, "sine", .06, 240); };
A.verdict = juste => {
  if (!pret()) return; const t = ctx.currentTime;
  (juste ? [523, 659, 784, 1046] : [392, 370, 349]).forEach((f, i) => note(f, t + .9 + i * .11, 1.5, "triangle", .09));
  note(juste ? 130 : 98, t + .9, 2.2, "sine", .18);
};
})();
