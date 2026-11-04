"""Tests pytest de la boucle de diagnostic (non-regressions).

Extraction des hypotheses et compteur de budget, avec API simulee
(aucune cle requise).
Commande : python -m pytest diagnostic_test.py -v
"""

import glob
import json
import os
import sys

import pytest

import contexte
import diagnostic
from batch import EXPECTED as ATTENDUS_BATCH
from export_json import EXPECTED as ATTENDUS_EXPORT
from simulator import charger_dispositif


def test_extraction_hypotheses():
    msg = ("Je commence par verifier l'alimentation.\n"
           "HYPOTHESES : C1, R1, U1, C2, PS1\n"
           "\n"
           "Je mesure TP1 en premier.")
    assert diagnostic.parse_hypotheses(msg) == "C1, R1, U1, C2, PS1"
    assert diagnostic.parse_hypotheses("HYPOTHESES : C1\nligne suivante") == "C1"
    assert diagnostic.parse_hypotheses("hypotheses : U1") == "U1"
    assert diagnostic.parse_hypotheses("HYPOTHESES:C1") == "C1"
    assert diagnostic.parse_hypotheses("HYPOTHESES :   C1  ") == "C1"
    assert diagnostic.parse_hypotheses(
        "HYPOTH" + chr(200) + "SES : U1, C2") == "U1, C2"
    assert diagnostic.parse_hypotheses(
        "Hypoth" + chr(232) + "se : le condensateur") is None
    assert diagnostic.parse_hypotheses("HYPOTHESES : C1\nHYPOTHESES : U1") == "U1"
    assert diagnostic.parse_hypotheses("HYPOTHESES :") is None
    assert diagnostic.parse_hypotheses("sans marqueur") is None
    assert diagnostic.parse_hypotheses("") is None
    assert diagnostic.parse_hypotheses(None) is None


def test_compteur_budget_uniquement_appels_executes(monkeypatch, capsys):
    def appel(i, point):
        return {"id": f"tour-{i}",
                "function": {"name": "measure_voltage",
                             "arguments": json.dumps({"point_id": point})}}

    points = ["TP4", "TP5", "TP1", "TP2", "TP3", "TP4", "TP5"]
    script = [
        {"content": "Reflexion.", "tool_calls": []},
        {"content": "Lot de 3.",
         "tool_calls": [appel(1, "TP1"), appel(2, "TP2"), appel(3, "TP3")]},
        {"content": "Encore des idees.", "tool_calls": []},
    ]
    script += [{"content": f"Mesure {i}.", "tool_calls": [appel(3 + i, p)]}
               for i, p in enumerate(points, start=1)]
    script += [{"content": "Une de plus.", "tool_calls": [appel(11, "TP1")]}]

    def faux_appel(messages, tools):
        assert script, "appel API inattendu"
        return dict(script.pop(0))

    monkeypatch.setattr(diagnostic, "appel_api", faux_appel)
    monkeypatch.setattr(sys, "argv", ["diagnostic.py", "F3"])
    with pytest.raises(SystemExit) as exc:
        diagnostic.main()
    assert exc.value.code == 1
    out = capsys.readouterr().out
    assert out.count("(relance") == 2
    assert out.count("(appel ignore, un seul par tour") == 2
    assert '1. measure_voltage {"point_id": "TP1"}' in out
    for tour in range(1, 9):
        assert f"{tour}. measure_voltage" in out
    assert "9. measure_voltage" not in out
    assert "Arret force" in out
    assert "Etat final : " in out


def test_contexte_nominal_sans_fuite_pannes():
    alim = os.path.join(os.path.dirname(__file__), "devices", "alimentation.json")
    mot = os.path.join(os.path.dirname(__file__), "devices", "moteur.json")
    types = {"fusible", "condensateur", "resistance", "circuit_integre",
             "transistor", "diode", "module"}
    # NB : "panne"/"defaut" generiques exclus : vocabulaire de diagnostic,
    # pas les scenarios de panne predetermines.
    cas = [
        (None,
         ["5.2", "2.6", "0.1", "0.5", "0.4", "0.3",
          "distorted", "weak", "f1", "f2", "f3", "f4",
          "sain", "four"],
         ["manufacturer datasheet",
          "tp1: 9.0 v dc, 0.0 vpp, silent",
          "tp2: 4.5 v dc, 0.0 vpp, silent",
          "tp3: 4.5 v dc, 0.2 vpp, clean",
          "tp4: 4.5 v dc, 2.0 vpp, clean",
          "tp5: 0.0 v dc, 2.0 vpp, clean"]),
        (alim,
         ["9.0", "10.2", "4.8", "4.5", "0.9", "0.15", "0.12",
          "10.8", "2.6", "4.9", "0.35", "0.3", "3.1", "0.05", "0.04", "0.18",
          "distorted", "g1", "g2", "g3", "g4", "sain", "four"],
         ["manufacturer datasheet",
          "tp1: 11.5 v dc, 2.00 vpp, clean",
          "tp2: 12.0 v dc, 0.20 vpp, clean",
          "tp3: 12.0 v dc, 0.20 vpp, clean",
          "tp4: 5.00 v dc, 0.02 vpp, clean",
          "tp5: 5.00 v dc, 0.01 vpp, clean",
          "tp6: 5.00 v dc, 0.01 vpp, clean",
          "ripple"]),
        (mot,
         ["11.2", "1.80", "2.10", "0.00", "5.60", "11.0",
          "0.14", "0.09", "0.06",
          "distorted", "silent", "weak",
          "h1", "h2", "h3", "h4", "h5", "h6", "sain", "six"],
         ["manufacturer datasheet",
          "tp1: 12.0 v dc, 0.05 vpp, clean",
          "tp2: 12.0 v dc, 0.05 vpp, clean",
          "tp3: 12.0 v dc, 0.05 vpp, clean",
          "tp4: 12.0 v dc, 0.05 vpp, clean",
          "tp5: 5.00 v dc, 0.02 vpp, clean",
          "tp6: 5.00 v dc, 0.02 vpp, clean",
          "tp7: 2.50 v dc, 5.00 vpp, clean",
          "tp8: 2.50 v dc, 5.00 vpp, clean",
          "tp9: 6.00 v dc, 12.0 vpp, clean",
          "tp10: 0.15 v dc, 0.05 vpp, clean",
          "switched"]),
    ]
    for dispositif, interdits, attendus in cas:
        systeme, user, tools = contexte.construire_contexte(dispositif)
        blob = (systeme + "\n" + user + json.dumps(tools)).lower()
        for token in interdits:
            assert token not in blob, (dispositif, token)
        for attendu in attendus:
            assert attendu in blob, (dispositif, attendu)
        # NB : fragment JSON exact, car "condensateur" seul est dans la prose.
        data = charger_dispositif(dispositif)
        for c in data["components"]:
            assert c["type"] in types, (dispositif, c["id"])
            assert f'"type": "{c["type"]}"' not in blob, (dispositif, c["id"])
        envoyes = {e["id"] for e in data["points"] + data["components"]}
        for e in data["points"] + data["components"]:
            assert isinstance(e["x"], int) and isinstance(e["y"], int)
            assert f'"x": {e["x"]}' not in blob and f'"y": {e["y"]}' not in blob
        assert '"liaisons"' not in blob
        assert all(len(l) == 2 and l[0] in envoyes and l[1] in envoyes
                   for l in data["liaisons"])


def test_consigne_sans_identifiant_dispositif():
    fichiers = sorted(glob.glob(os.path.join(os.path.dirname(__file__), "devices", "*.json")))
    assert fichiers, "aucun fichier dispositif"
    ids = set()
    for chemin in fichiers:
        with open(chemin, encoding="utf-8") as f:
            d = json.load(f)
        ids.update(p["id"] for p in d["points"])
        ids.update(c["id"] for c in d["components"])
    assert len(ids) >= 10
    for ident in sorted(ids):
        assert ident not in contexte.SYSTEME_TEMPLATE, ident


def test_journal_textes_avant_apres(monkeypatch, tmp_path):
    avant = "HYPOTHESES : C1, U1\nJe mesure TP1."
    apres = "HYPOTHESES : U1\nDIAGNOSTIC : U1, TP1 bas."
    script = [
        {"content": avant, "tool_calls": [{"id": "t1", "function": {
            "name": "measure_voltage",
            "arguments": json.dumps({"point_id": "TP1"})}}]},
        {"content": apres, "tool_calls": []},
    ]
    monkeypatch.setattr(diagnostic, "appel_api", lambda m, t: dict(script.pop(0)))
    out = tmp_path / "passage.json"
    res = diagnostic.run_diagnostic("F1", json_path=str(out))
    assert res["diagnostic"] == "U1"
    assert ATTENDUS_BATCH is ATTENDUS_EXPORT
    export = json.loads(out.read_text(encoding="utf-8"))
    assert export["attendu"] == "PS1"
    tour = export["tours"][0]
    assert tour["turn"] == 1
    assert tour["reasoning_before"] == avant
    assert tour["tool"] == "measure_voltage"
    assert json.loads(tour["value_received"])["voltage_v"] == 5.2
    assert tour["reasoning_after"] == apres
    assert tour["remaining_hypotheses"] == "U1"


def test_budget_appels_par_dispositif(monkeypatch):
    script = [{"content": "HYPOTHESES : FU1\nMesure.",
               "tool_calls": [{"id": f"t{i}", "function": {
                   "name": "measure_voltage",
                   "arguments": json.dumps({"point_id": "TP1"})}}]}
              for i in range(13)]
    monkeypatch.setattr(diagnostic, "appel_api", lambda m, t: dict(script.pop(0)))
    res = diagnostic.run_diagnostic("H1", "moteur")
    assert res["diagnostic"] is None and res["calls"] == 12
