"""Export JSON du passage complet (rejeu autonome, sans simulateur ni API).

La correspondance panne -> composant attendu n'est connue que d'ici :
jamais du simulateur ni de l'agent. Elle est ecrite dans le JSON apres
la conclusion de l'agent, comme l'identifiant de scenario.
"""

import json

EXPECTED = {"F1": "PS1", "F2": "R1", "F3": "U1", "F4": "C2",
            "G1": "D1", "G2": "C1", "G3": "U1", "G4": "C2",
            "H1": "FU1", "H2": "U1", "H3": "U2", "H4": "R1", "H5": "Q1", "H6": "C1",
            "J1": "Y1", "J2": "FU1", "J3": "L1", "J4": "U2", "J5": "Q1", "J6": "R1"}


def parse_justification(text, diag):
    for ligne in (text or "").splitlines():
        if ligne.strip().upper().startswith("DIAGNO"):
            i = ligne.upper().find(diag)
            if i >= 0:
                return ligne[i + len(diag):].strip(" :.-")
    return ""


def ecrire_json(chemin, data, scenario, journal, diag, justif, calls):
    table = {p: list(v) for p, v in data["scenarios"][scenario].items()}
    export = {"dispositif": data["name"], "scenario": scenario,
              "attendu": EXPECTED.get(scenario),
              "symptome": data["symptom"], "chaine": data["chain"],
              "points": data["points"], "composants": data["components"],
              "nominale": data["nominal"], "table": table, "tours": journal,
              "diagnostic": diag, "justification": justif, "nb_appels": calls,
              "liaisons": data.get("liaisons", [])}
    with open(chemin, "w", encoding="utf-8") as f:
        json.dump(export, f, ensure_ascii=False, indent=2)
    print(f"Passage ecrit : {chemin}")
