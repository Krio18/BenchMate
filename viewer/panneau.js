/* BenchMate — rejeu : interface — panneau latéral, sous-titres du raisonnement, frise, verdict, infobulle. */
(() => {
const P = BM.panneau = {};
const $ = id => document.getElementById(id);
P.ICONES = {
  measure_voltage: '<svg viewBox="0 0 24 24"><path d="M13 2 4.5 13.5H11L10 22l8.5-11.5H12z" fill="currentColor"/></svg>',
  test_signal: '<svg viewBox="0 0 24 24"><path d="M2 12c2-6.5 4.5-6.5 6.5 0s4.5 6.5 6.5 0 4.5-6.5 7 0" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"/></svg>',
  inspect_component: '<svg viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="2.3"/><path d="m15.5 15.5 5 5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>',
  fin: '<svg viewBox="0 0 24 24"><path d="M5 21V4h12l-2 4 2 4H5" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linejoin="round"/></svg>'
};
const PHASES = {hypothese: "states a hypothesis", mesure: "measures", interprete: "interprets the measurement"};
const ETATS = {suspect: "Suspect", seul: "Last suspect", ecarte: "Hypothesis ruled out", fautif: "Diagnosed faulty", vrai: "Actual fault",
  ok: "Nominal", ko: "Abnormal", info: "Measured"};
const VITESSE_LECTURE = 150; // caractères par seconde
let D = null, segs = [], total = 0, vu = 0;

const esc = s => s.replace(/[&<>"]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]));
const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };

P.preparer = donnees => {
  D = donnees;
  $("nomDispo").textContent = BM.majuscule(D.titre) || "Device"; $("scen").textContent = "Scenario " + D.scenario; $("dispo").hidden = false;
  $("symptome").textContent = D.symptome || "—";
  const jet = $("jetons"); jet.replaceChildren();
  for (const c of D.composants) {
    const j = el("span", "jeton"); j.id = "jt-" + c.id; j.title = c.role || "";
    j.append(el("b", null, c.id), el("span", null, c.name || c.type)); jet.append(j);
  }
  const fr = $("points"); fr.replaceChildren();
  D.tours.forEach((t, i) => {
    const b = el("button", "pt"); b.innerHTML = P.ICONES[t.outil] || ""; b.title = `${i + 1} · ${t.nomOutil} ${t.cible || ""}`;
    b.dataset.outil = t.outil; b.onclick = () => BM.lecture.allerA(i); fr.append(b);
  });
  const f = el("button", "pt fin"); f.innerHTML = P.ICONES.fin; f.title = "Verdict"; f.onclick = () => BM.lecture.allerA(D.tours.length); fr.append(f);
  P.reinitialiser();
};
P.reinitialiser = () => {
  $("etapes").replaceChildren(); $("vide").hidden = false; P.hypotheses(D.ids); P.penser("");
  $("soustitre").hidden = true; $("verdict").hidden = true; P.frise(0, 0);
};

/* ---------- Journal des mesures ---------- */
P.etape = (t, instant) => {
  const m = t.mesure, li = el("li", "etape " + (m.etat || "") + (instant ? "" : " neuve")); li.dataset.outil = t.outil;
  const tete = el("div", "e-tete");
  tete.innerHTML = `<span class="num">${String(t.i + 1).padStart(2, "0")}</span><span class="outil">${P.ICONES[t.outil] || ""}</span>`;
  tete.append(el("span", "nom", t.nomOutil), el("b", "cible", t.cible || "?"));
  const e = D.parId[t.cible]; if (e && e.name) tete.append(el("span", "sous", e.name));
  const mes = el("div", "e-mes"); mes.append(el("span", "val", m.texte));
  if (m.attendu) mes.append(el("span", "att", "expected " + m.attendu));
  if (m.etat) mes.append(el("span", "pastille " + m.etat, m.etat === "ko" ? "abnormal" : "nominal"));
  li.append(tete, mes);
  if (t.apres) { li.append(el("p", "e-pensee", t.apres)); li.onclick = () => li.classList.toggle("ouverte"); }
  const ol = $("etapes"); ol.querySelectorAll(".actuelle").forEach(x => x.classList.remove("actuelle"));
  li.classList.add("actuelle"); ol.append(li); $("vide").hidden = true;
  ol.scrollTo({top: ol.scrollHeight, behavior: instant ? "auto" : "smooth"});
};

P.hypotheses = garde => {
  for (const id of D.ids) {
    const j = $("jt-" + id); if (!j) continue;
    const reste = garde.has(id);
    j.classList.toggle("off", !reste); j.classList.toggle("seul", reste && garde.size === 1); j.classList.remove("fautif", "vrai");
  }
  $("compte").textContent = `${garde.size} / ${D.ids.size}`;
};

/* ---------- Sous-titres : la pensée de Muse Spark, tapée en direct ---------- */
P.penser = (texte, phase, instant) => {
  if (!texte) { segs = []; total = vu = 0; $("pensee").textContent = ""; return; }
  $("soustitre").hidden = false; P.phase(phase);
  segs = BM.segments(texte, D.ids); total = texte.length; vu = instant ? total : 0; rendre();
};
P.phase = phase => { $("phase").textContent = PHASES[phase] || ""; $("soustitre").dataset.phase = phase || ""; };
P.duree = texte => Math.max(1.4, texte.length / VITESSE_LECTURE);
P.tick = dj => { if (vu < total) { vu = Math.min(total, vu + dj * VITESSE_LECTURE); rendre(); } };
function rendre() {
  let n = Math.floor(vu), h = "";
  for (const s of segs) {
    if (n <= 0) break;
    const t = esc(s.t.slice(0, n)); n -= s.t.length;
    h += s.c ? `<span class="${s.c}">${t}</span>` : t;
  }
  const p = $("pensee"); p.innerHTML = h + (vu < total ? '<i class="curseur"></i>' : ""); p.scrollTop = p.scrollHeight;
}

/* ---------- Frise ---------- */
P.frise = (cur, frac) => {
  const pts = [...$("points").children], n = Math.max(pts.length - 1, 1);
  pts.forEach((b, i) => { b.classList.toggle("fait", i < cur); b.classList.toggle("cours", i === cur); });
  $("barreProg").style.width = Math.min(1, (cur + Math.min(frac, 1)) / n) * 100 + "%";
};

/* ---------- Verdict ---------- */
P.verdict = () => {
  const v = $("verdict"), c = D.parId[D.diag], juste = !!D.diag && D.diag === D.vrai;
  $("soustitre").hidden = true;
  v.className = "verre " + (!D.diag ? "echec" : !D.vrai ? "" : juste ? "juste" : "faux");
  $("vId").textContent = D.diag || "∅";
  $("vNom").textContent = c ? c.name || c.id : D.diag ? D.diag : "No diagnosis";
  $("vRole").textContent = c ? c.role || "" : "The agent did not conclude within the measurement budget.";
  $("vJust").textContent = D.justification; $("vJust").hidden = !D.justification;
  $("vReel").textContent = !D.vrai ? "Actual fault: unknown" : (juste ? "✓ Actual fault: " : "✗ Actual fault: ") + D.vrai;
  $("vMes").textContent = `${D.tours.length} measurement${D.tours.length > 1 ? "s" : ""}`;
  $("vHyp").textContent = `${D.ids.size} hypotheses → ${D.diag ? 1 : 0}`;
  v.hidden = false; v.style.animation = "none"; void v.offsetWidth; v.style.animation = "";
  if (c) $("jt-" + D.diag)?.classList.replace("off", "fautif") || $("jt-" + D.diag)?.classList.add("fautif");
  if (D.vrai && !juste) $("jt-" + D.vrai)?.classList.replace("off", "vrai") || $("jt-" + D.vrai)?.classList.add("vrai");
};

/* ---------- Infobulle au survol de la scène ---------- */
P.survol = (cible, x, y) => {
  const b = $("infobulle"), e = cible && D && D.parId[cible.id];
  if (!e) { b.hidden = true; return; }
  const etat = BM.banc.etatDe(e.id);
  b.replaceChildren(el("b", null, e.id + (e.name ? " · " + e.name : "")));
  if (cible.type === "composant") b.append(el("p", null, e.role || ""));
  else {
    if (e.description) b.append(el("p", null, BM.majuscule(e.description)));
    const ms = BM.banc.mesuresDe(e.id);
    if (ms.length) b.append(el("p", "mono", ms.join(" · ")));
  }
  if (etat && ETATS[etat]) b.append(el("span", "pastille " + etat, ETATS[etat]));
  b.style.left = Math.min(x + 16, innerWidth - 300) + "px"; b.style.top = Math.min(y + 16, innerHeight - 140) + "px";
  b.hidden = false;
};
})();
