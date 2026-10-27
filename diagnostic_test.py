"""Tests pytest de la boucle de diagnostic (non-regressions).

Extraction des hypotheses et compteur de budget, avec API simulee
(aucune cle requise).
Commande : python -m pytest diagnostic_test.py -v
"""

import json
import sys

import pytest

import contexte
import diagnostic


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

    def faux_appel(messages):
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
    blob = (contexte.SYSTEME + "\n" + contexte.USER
            + json.dumps(contexte.TOOLS)).lower()
    # NB : "panne"/"defaut" generiques exclus : vocabulaire de diagnostic,
    # pas les scenarios de panne predetermines.
    for token in ["5.2", "2.6", "0.1", "0.5", "0.4", "0.3",
                  "distorted", "weak", "f1", "f2", "f3", "f4",
                  "sain", "quatre"]:
        assert token not in blob, token
    for attendu in ["fiche technique",
                    "tp1 : 9.0 v dc, 0.0 vpp, silent",
                    "tp2 : 4.5 v dc, 0.0 vpp, silent",
                    "tp3 : 4.5 v dc, 0.2 vpp, clean",
                    "tp4 : 4.5 v dc, 2.0 vpp, clean",
                    "tp5 : 0.0 v dc, 2.0 vpp, clean"]:
        assert attendu in blob, attendu
