"""Simulateur BenchMate 3D (SPEC.md sections 4 a 6).

Donnees chargees depuis preamplificateur.json, sauf dispositif fourni.
Aucune simulation physique, aucune bibliotheque electronique.
Le scenario actif se choisit a la creation : Simulator("F1").
Un identifiant inconnu renvoie une erreur structuree, jamais une valeur.
"""

import json
import os

DOSSIER_DEVICES = os.path.join(os.path.dirname(__file__), "devices")
DISPOSITIF_DEFAUT = os.path.join(DOSSIER_DEVICES, "preamplificateur.json")


def charger_dispositif(dispositif=None):
    if dispositif is None:
        dispositif = DISPOSITIF_DEFAUT
    if isinstance(dispositif, str):
        candidats = [dispositif, dispositif + ".json",
                     os.path.join(DOSSIER_DEVICES, dispositif),
                     os.path.join(DOSSIER_DEVICES, dispositif + ".json")]
        for chemin in candidats:
            if os.path.isfile(chemin):
                dispositif = chemin
                break
        with open(dispositif, encoding="utf-8") as f:
            dispositif = json.load(f)
    scenarios = {s: {p: tuple(v) for p, v in pts.items()}
                 for s, pts in dispositif["scenarios"].items()}
    return {**dispositif, "scenarios": scenarios}


_DEFAUT = charger_dispositif()
SCENARIOS = _DEFAUT["scenarios"]
COMPONENTS = {c["id"]: {"name": c["name"], "role": c["role"],
                         "visual_notes": c["visual_notes"]}
              for c in _DEFAUT["components"]}


class Simulator:
    """Lit la table du scenario actif, sans jamais l'exposer."""

    def __init__(self, scenario, dispositif=None):
        data = charger_dispositif(dispositif)
        if not isinstance(scenario, str) or scenario not in data["scenarios"]:
            raise ValueError(f"Unknown scenario: {scenario!r}")
        self._points = data["scenarios"][scenario]
        self._components = {c["id"]: c for c in data["components"]}

    @property
    def component_ids(self):
        return list(self._components)

    def inspect_component(self, component_id: str) -> dict:
        if not isinstance(component_id, str) or component_id not in self._components:
            return {
                "error": "UNKNOWN_COMPONENT_ID",
                "message": f"Unknown component_id: {component_id}",
            }
        meta = self._components[component_id]
        return {
            "component_id": component_id,
            "name": meta["name"],
            "role": meta["role"],
            "visual_notes": meta["visual_notes"],
        }

    def measure_voltage(self, point_id: str) -> dict:
        if not isinstance(point_id, str) or point_id not in self._points:
            return {
                "error": "UNKNOWN_POINT_ID",
                "message": f"Unknown point_id: {point_id}",
            }
        voltage_v, _, _ = self._points[point_id]
        return {"point_id": point_id, "voltage_v": voltage_v, "unit": "V"}

    def test_signal(self, point_id: str) -> dict:
        if not isinstance(point_id, str) or point_id not in self._points:
            return {
                "error": "UNKNOWN_POINT_ID",
                "message": f"Unknown point_id: {point_id}",
            }
        _, amplitude_vpp, quality = self._points[point_id]
        return {
            "point_id": point_id,
            "amplitude_vpp": amplitude_vpp,
            "quality": quality,
        }
