"""Boucle de diagnostic console (SPEC.md sections 7-8).

Simulator sur le scenario CLI, dialogue Muse Spark <-> 3 outils reels.
Contexte initial seul (circuit, points, outils, symptome), aucune
instruction d'appel d'outil. Arret sur "DIAGNOSTIC : <ID>" ou apres
8 appels (arret force = echec) ; texte sans appel ni diagnostic :
relance neutre hors budget ; un seul outil par tour. Cle : MODEL_API_KEY.
"""

import json
import os
import re
import sys
import urllib.error
import urllib.request

from contexte import SYSTEME, TOOLS, USER
from simulator import Simulator

BASE_URL = "https://api.meta.ai/v1"
MODEL = "muse-spark-1.3"
TIMEOUT_S = 60
MAX_CALLS = 8

_IDS = re.compile(r"\b(C1|R1|U1|C2|PS1)\b")
_HYP = re.compile("^\\s*HYPOTH[" + chr(200) + "E]SES\\s*:\\s*(.*?)\\s*$", re.IGNORECASE)  # chr(200) = E accent aigu


def appel_api(messages):
    cle = os.environ.get("MODEL_API_KEY", "")
    if not cle:
        print("MODEL_API_KEY absente : $env:MODEL_API_KEY = ... puis relancer.")
        raise SystemExit(2)
    corps = json.dumps({"model": MODEL, "messages": messages, "tools": TOOLS})
    req = urllib.request.Request(
        f"{BASE_URL}/chat/completions",
        data=corps.encode(),
        headers={"Authorization": f"Bearer {cle}",
                 "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT_S) as rep:
            return json.load(rep)["choices"][0]["message"]
    except urllib.error.HTTPError as err:
        print(f"Echec API : HTTP {err.code} : "
              f"{err.read().decode('utf-8', 'replace')}")
    except (urllib.error.URLError, OSError, KeyError, IndexError,
            TypeError, json.JSONDecodeError) as err:
        print(f"Echec API ({type(err).__name__}) : {err}")
    raise SystemExit(1)


def execute_tool(sim, name, raw):
    try:
        args = json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        return "Erreur : arguments illisibles, renvoyez du JSON valide."
    if not isinstance(args, dict):
        return "Erreur : arguments illisibles, renvoyez un objet JSON."
    if name == "inspect_component" and "component_id" in args:
        return json.dumps(sim.inspect_component(args["component_id"]))
    if name == "measure_voltage" and "point_id" in args:
        return json.dumps(sim.measure_voltage(args["point_id"]))
    if name == "test_signal" and "point_id" in args:
        return json.dumps(sim.test_signal(args["point_id"]))
    return "Erreur : outil inconnu ou argument manquant."


def parse_hypotheses(text):
    trouve = None
    for ligne in (text or "").splitlines():
        m = _HYP.match(ligne)
        if m and m.group(1):
            trouve = m.group(1)
    return trouve


def parse_diagnostic(text):
    for ligne in (text or "").splitlines():
        if ligne.strip().upper().startswith("DIAGNO"):
            trouve = _IDS.search(ligne.upper())
            return trouve.group(1) if trouve else None
    return None


def recap(journal, statut, hypotheses):
    print(f"=== Journal : {len(journal)} entrees -- {statut} ===")
    for e in journal:
        print(f"{e['turn']}. {e['tool']} {e['argument']}")
        print(f"   recu : {e['value_received']}")
        print(f"   hypotheses : {e['remaining_hypotheses']}")
    print(f"Etat final : {hypotheses}")


def run_diagnostic(scenario):
    """Boucle complete sur un scenario ; retourne diagnostic, calls, journal."""
    sim = Simulator(scenario)
    print(f"BenchMate 3D -- diagnostic (scenario {scenario}, "
          "masque a l'agent)")
    messages = [{"role": "system", "content": SYSTEME},
                {"role": "user", "content": USER}]
    print("--- Contexte envoye a l'agent ---")
    print(USER)
    journal, calls, hypotheses = [], 0, "C1, R1, U1, C2, PS1"
    while True:
        msg = appel_api(messages)
        text = msg.get("content") or ""
        demandes = msg.get("tool_calls") or []
        ligne = parse_hypotheses(text)
        if ligne is not None:
            hypotheses = ligne
        print("--- Reponse de l'agent ---")
        print(text if text else "(sans texte)")
        diag = parse_diagnostic(text)
        if diag:
            print(f"=== Fin : DIAGNOSTIC {diag} ===")
            recap(journal, f"diagnostic {diag}", hypotheses)
            return {"diagnostic": diag, "calls": calls, "journal": journal}
        if not demandes:
            print("(relance : texte sans appel ni diagnostic)")
            messages.append({"role": "assistant", "content": text})
            messages.append({"role": "user", "content": "Continue."})
            continue
        if calls >= MAX_CALLS:
            print("=== Arret force : budget de 8 appels epuise ===")
            recap(journal, "echec (arret force)", hypotheses)
            return {"diagnostic": None, "calls": calls, "journal": journal}
        messages.append({"role": "assistant", "content": text,
                         "tool_calls": demandes})
        for d in demandes[:1]:
            calls += 1
            nom, brut = d["function"]["name"], d["function"].get("arguments", "")
            contenu = execute_tool(sim, nom, brut)
            entree = {"turn": calls, "tool": nom, "argument": brut,
                      "value_received": contenu, "remaining_hypotheses": hypotheses}
            journal.append(entree)
            messages.append({"role": "tool", "tool_call_id": d["id"],
                             "content": contenu})
            print(f"--- Tour {calls} : {nom} ---")
            print(f"Argument : {brut}")
            print(f"Recu : {contenu}")
        for d in demandes[1:]:
            print(f"(appel ignore, un seul par tour : {d['function']['name']})")
            messages.append({"role": "tool", "tool_call_id": d["id"],
                             "content": "Un seul outil par tour : appel non execute."})


def main():
    try:
        res = run_diagnostic(sys.argv[1] if len(sys.argv) > 1 else None)
    except ValueError:
        print("Usage : python diagnostic.py <scenario> (sain, F1-F4)")
        raise SystemExit(2)
    if res["diagnostic"] is None:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
