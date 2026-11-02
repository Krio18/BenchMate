/* BenchMate — rejeu : lecture du journal de passage (aucun accès au simulateur ni à l'API). */
window.BM = window.BM || {};
(() => {
const PREFIXES = [["FU", "fusible"], ["PS", "module"], ["RX", "module"], ["C", "condensateur"], ["R", "resistance"],
  ["Y", "quartz"], ["L", "inductance"],
  ["U", "circuit_integre"], ["Q", "transistor"], ["D", "diode"]];
const QUALITE = {clean: "propre", distorted: "distordu", silent: "silencieux"};
BM.OUTILS = {measure_voltage: "Tension DC", test_signal: "Signal", inspect_component: "Inspection"};

const lire = s => { if (s && typeof s === "object") return s; try { return JSON.parse(s); } catch { return null; } };
const fr = s => (typeof s === "number" && Number.isInteger(s) ? s.toFixed(1) : String(s)).replace(".", ",");
const nombre = s => parseFloat(String(s).replace(",", "."));
const typeDe = c => c.type || (PREFIXES.find(([p]) => String(c.id).startsWith(p)) || [0, "autre"])[1];
const horsTolerance = (m, a) => Math.abs(m - a) > Math.max(.05, Math.abs(a) * .06);
const echapper = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const majuscule = s => s ? s[0].toUpperCase() + s.slice(1) : s;
BM.majuscule = majuscule;

/* Fiche nominale « TP1 : 9.0 V DC, 0.0 Vpp, silent ; ... » → {TP1: {v, a, q}} */
function fiche(texte) {
  const n = {}, re = /(\w+)\s*:\s*(-?[\d.,]+)\s*V\s*DC\s*,\s*(-?[\d.,]+)\s*Vpp\s*,\s*([a-z]+)/gi;
  for (const m of (texte || "").matchAll(re)) n[m[1]] = {v: m[2], a: m[3], q: m[4].toLowerCase()};
  return n;
}

/* Valeur reçue par l'agent, comparée à la fiche du constructeur quand elle existe. */
function mesure(brut, nom) {
  const r = lire(brut);
  if (!r) return {type: "brut", texte: String(brut ?? "—").slice(0, 60)};
  if (r.error) return {type: "erreur", texte: r.message || r.error, etat: "ko"};
  if (r.voltage_v !== undefined) {
    const m = {type: "tension", texte: fr(r.voltage_v) + " V", court: fr(r.voltage_v) + " V", v: +r.voltage_v};
    if (nom) { m.attendu = fr(nom.v) + " V"; m.etat = horsTolerance(m.v, nombre(nom.v)) ? "ko" : "ok"; }
    return m;
  }
  if (r.amplitude_vpp !== undefined) {
    const q = QUALITE[r.quality] || r.quality || "";
    const m = {type: "signal", texte: fr(r.amplitude_vpp) + " Vpp · " + q, court: fr(r.amplitude_vpp) + " Vpp",
      valeur: fr(r.amplitude_vpp) + " Vpp", q, qualite: r.quality, a: +r.amplitude_vpp};
    if (nom) {
      m.attendu = fr(nom.a) + " Vpp · " + (QUALITE[nom.q] || nom.q); m.aNom = nombre(nom.a); m.qNom = nom.q;
      m.etat = horsTolerance(m.a, m.aNom) || r.quality !== nom.q ? "ko" : "ok";
    }
    return m;
  }
  if (r.name) return {type: "composant", texte: r.name, role: r.role || "", notes: r.visual_notes || ""};
  return {type: "brut", texte: JSON.stringify(r).slice(0, 60)};
}

/* Le raisonnement sans les lignes HYPOTHESES / DIAGNOSTIC, affichées ailleurs. */
const nettoyer = s => (s || "").split("\n").filter(l => !/^\s*(HYPOTH|DIAGNO)/i.test(l)).join(" ")
  .replace(/\s*=>\s*/g, " → ").replace(/\s+/g, " ").trim();

function hypotheses(s, ids) {
  const g = new Set(((s || "").match(/[A-Za-z0-9_]+/g) || []).filter(x => ids.has(x)));
  return g.size ? g : null;
}

function disposer(liste, y) {
  const n = liste.length;
  liste.forEach((e, i) => { e.x = 60 + i * 480 / Math.max(n - 1, 1); e.y = y; });
}

/* Découpe un texte en segments à surligner : points de test, composants, valeurs, flèches. */
BM.segments = (texte, ids) => {
  const alt = [...ids].map(echapper).sort((a, b) => b.length - a.length).join("|") || "(?!)";
  const re = new RegExp(`\\b(TP\\d+)\\b|\\b(${alt})\\b|(-?\\d+(?:[.,]\\d+)?\\s?(?:Vpp|V)(?![A-Za-z]))|(→)`, "g");
  const segs = []; let i = 0;
  for (const m of texte.matchAll(re)) {
    if (m.index > i) segs.push({t: texte.slice(i, m.index)});
    segs.push({t: m[0], c: m[1] ? "tp" : m[2] ? "cp" : m[3] ? "nb" : "fl"});
    i = m.index + m[0].length;
  }
  if (i < texte.length) segs.push({t: texte.slice(i)});
  return segs;
};

/* Journal brut → données prêtes à rejouer (état des hypothèses calculé à chaque tour). */
BM.preparer = j => {
  const points = (j.points || []).map(p => ({...p}));
  const composants = (j.composants || []).map(c => ({...c, type: typeDe(c)}));
  if (points.some(p => p.x == null)) disposer(points, 120);
  if (composants.some(c => c.x == null)) disposer(composants, 280);
  const ids = new Set(composants.map(c => c.id)), nominal = fiche(j.nominale);
  const liaisons = j.liaisons && j.liaisons.length ? j.liaisons : points.slice(1).map((p, i) => [points[i].id, p.id]);
  let garde = new Set(ids);
  const tours = (j.tours || []).map((t, i) => {
    const a = lire(t.argument) || {}, comp = t.tool === "inspect_component", cible = comp ? a.component_id : a.point_id;
    garde = hypotheses(t.remaining_hypotheses, ids) || garde;
    return {i, outil: t.tool, nomOutil: BM.OUTILS[t.tool] || t.tool, cible, comp, mesure: mesure(t.value_received, nominal[cible]),
      avant: nettoyer(t.reasoning_before), apres: nettoyer(t.reasoning_after), garde: new Set(garde)};
  });
  return {titre: j.dispositif || "", scenario: j.scenario || "?", symptome: j.symptome || "", points, composants, liaisons,
    tours, ids, diag: j.diagnostic || null, vrai: j.attendu || null,
    justification: majuscule((j.justification || "").replace(/^[\s,;:.\-]+/, "")),
    parId: Object.fromEntries([...points, ...composants].map(e => [e.id, e]))};
};
})();
