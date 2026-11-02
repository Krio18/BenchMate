"""Tests pytest du dispositif drone (devices/drone.json).

Cohérence des données, anti-fuite du contexte de l'agent, et lecture
des pannes par le simulateur. Fichier séparé : diagnostic_test.py
approche la limite de 200 lignes.
Commande : python -m pytest drone_test.py -v
"""

import json
import os

import contexte
from batch import EXPECTED
from simulator import Simulator, charger_dispositif

DRONE = os.path.join(os.path.dirname(__file__), "devices", "drone.json")
TYPES = {"fusible", "condensateur", "resistance", "circuit_integre", "transistor",
         "diode", "module", "quartz", "inductance"}
QUALITES = {"clean", "distorted", "silent", "weak"}


def test_donnees_coherentes():
    d = charger_dispositif(DRONE)
    pids = [p["id"] for p in d["points"]]
    cids = [c["id"] for c in d["components"]]
    assert len(pids) == 14 and len(cids) == 13
    assert len(set(pids + cids)) == len(pids) + len(cids)
    for e in d["points"] + d["components"]:
        assert isinstance(e["x"], int) and isinstance(e["y"], int)
    for c in d["components"]:
        assert c["type"] in TYPES, c["id"]
    for a, b in d["liaisons"]:
        assert a in pids + cids and b in pids + cids
    for scenario, table in d["scenarios"].items():
        assert list(table) == pids, scenario
        for v, a, q in table.values():
            assert v >= 0 and a >= 0 and q in QUALITES, scenario


def test_une_seule_panne_par_scenario_et_cle_de_correction():
    d = charger_dispositif(DRONE)
    pannes = [s for s in d["scenarios"] if s != "sain"]
    assert pannes == ["J1", "J2", "J3", "J4", "J5", "J6"]
    cids = {c["id"] for c in d["components"]}
    sain = d["scenarios"]["sain"]
    for s in pannes:
        assert EXPECTED[s] in cids
        assert d["scenarios"][s] != sain, s


def test_fiche_nominale_egale_au_scenario_sain():
    d = charger_dispositif(DRONE)
    for tp, (v, a, q) in d["scenarios"]["sain"].items():
        attendu = f"{tp} : {v:.2f} V DC" if v < 10 else f"{tp} : {v:.1f} V DC"
        assert attendu in d["nominal"], tp
        assert (f"{a:.2f} Vpp, {q}" if a < 10 else f"{a:.1f} Vpp, {q}") in d["nominal"], tp


def test_contexte_sans_fuite_pannes():
    systeme, user, tools = contexte.construire_contexte(DRONE)
    blob = (systeme + "\n" + user + json.dumps(tools)).lower()
    interdits = ["0.14", "0.16", "0.25", "0.3", "0.4", "0.6", "0.9", "1.2", "1.55", "11.0",
                 "2.4", "3.1", "4.1", "4.4", "5.5", "8.8", "9.2", "distorted", "silent", "weak",
                 "j1", "j2", "j3", "j4", "j5", "j6", "sain", "quartz arrêté", "fatigué", "saturée"]
    for token in interdits:
        assert token not in blob, token
    for attendu in ["fiche technique", "tp4 : 5.00 v dc, 14.8 vpp, clean",
                    "tp7 : 1.65 v dc, 3.30 vpp, clean", "tp14 : 0.20 v dc, 0.05 vpp, clean",
                    "cadencé par l'horloge de y1", "l'inductance l1"]:
        assert attendu in blob, attendu
    assert '"liaisons"' not in blob and '"x": 40' not in blob
    for c in charger_dispositif(DRONE)["components"]:
        assert f'"type": "{c["type"]}"' not in blob, c["id"]


def test_simulateur_lit_la_panne_sans_la_reveler():
    sim = Simulator("J1", DRONE)
    assert sim.test_signal("TP7") == {"point_id": "TP7", "amplitude_vpp": 0.0, "quality": "silent"}
    assert sim.measure_voltage("TP6") == {"point_id": "TP6", "voltage_v": 3.3, "unit": "V"}
    assert sim.measure_voltage("TP99")["error"] == "UNKNOWN_POINT_ID"
    info = sim.inspect_component("Y1")
    assert set(info) == {"component_id", "name", "role", "visual_notes"}
    assert info == Simulator("sain", DRONE).inspect_component("Y1")
