"""Simulateur BenchMate 3D (SPEC.md sections 4 a 6).

Table de valeurs predefinies : 5 scenarios x 5 points de mesure.
Aucune simulation physique, aucune bibliotheque electronique.
Le scenario actif se choisit a la creation : Simulator("F1").
Un identifiant inconnu renvoie une erreur structuree, jamais une valeur.
"""

SCENARIOS = {
    # Chaque point : (tension DC en V, amplitude en Vpp, qualite).
    # Valeurs recopiees de SPEC.md section 4, ordre TP1..TP5.
    "sain": {
        "TP1": (9.0, 0.0, "silent"),
        "TP2": (4.5, 0.0, "silent"),
        "TP3": (4.5, 0.2, "clean"),
        "TP4": (4.5, 2.0, "clean"),
        "TP5": (0.0, 2.0, "clean"),
    },
    "F1": {
        "TP1": (5.2, 0.0, "silent"),
        "TP2": (2.6, 0.0, "silent"),
        "TP3": (2.6, 0.2, "clean"),
        "TP4": (2.6, 0.5, "distorted"),
        "TP5": (0.0, 0.4, "distorted"),
    },
    "F2": {
        "TP1": (9.0, 0.0, "silent"),
        "TP2": (0.1, 0.0, "silent"),
        "TP3": (0.1, 0.2, "clean"),
        "TP4": (0.1, 0.1, "silent"),
        "TP5": (0.0, 0.1, "silent"),
    },
    "F3": {
        "TP1": (9.0, 0.0, "silent"),
        "TP2": (4.5, 0.0, "silent"),
        "TP3": (4.5, 0.2, "clean"),
        "TP4": (4.5, 0.2, "distorted"),
        "TP5": (0.0, 0.2, "distorted"),
    },
    "F4": {
        "TP1": (9.0, 0.0, "silent"),
        "TP2": (4.5, 0.0, "silent"),
        "TP3": (4.5, 0.2, "clean"),
        "TP4": (4.5, 2.0, "clean"),
        "TP5": (0.0, 0.3, "weak"),
    },
}

COMPONENTS = {
    # Metadonnees statiques (SPEC.md section 5) : nom et role recopies,
    # visual_notes purement descriptives, identiques quel que soit
    # le scenario, sans aucun indice sur la panne.
    "C1": {
        "name": "Condensateur d'entr\u00e9e",
        "role": "Couple le signal d'entr\u00e9e",
        "visual_notes": (
            "Condensateur cylindrique traversant, "
            "marquage de r\u00e9f\u00e9rence lisible."
        ),
    },
    "R1": {
        "name": "R\u00e9seau de polarisation",
        "role": "\u00c9tablit la r\u00e9f\u00e9rence de polarisation",
        "visual_notes": (
            "R\u00e9seau de r\u00e9sistances traversant, "
            "marquage de r\u00e9f\u00e9rence lisible."
        ),
    },
    "U1": {
        "name": "Amplificateur op\u00e9rationnel",
        "role": "Amplifie le signal",
        "visual_notes": (
            "Circuit int\u00e9gr\u00e9 traversant, "
            "marquage de r\u00e9f\u00e9rence lisible."
        ),
    },
    "C2": {
        "name": "Condensateur de sortie",
        "role": "Couple le signal vers la sortie",
        "visual_notes": (
            "Condensateur cylindrique traversant, "
            "marquage de r\u00e9f\u00e9rence lisible."
        ),
    },
    "PS1": {
        "name": "Alimentation",
        "role": "Fournit le rail d'alimentation",
        "visual_notes": (
            "Module d'alimentation, marquage de r\u00e9f\u00e9rence lisible."
        ),
    },
}


class Simulator:
    """Lit la table du scenario actif, sans jamais l'exposer."""

    def __init__(self, scenario: str):
        if not isinstance(scenario, str) or scenario not in SCENARIOS:
            raise ValueError(f"Unknown scenario: {scenario!r}")
        self._points = SCENARIOS[scenario]

    def inspect_component(self, component_id: str) -> dict:
        if not isinstance(component_id, str) or component_id not in COMPONENTS:
            return {
                "error": "UNKNOWN_COMPONENT_ID",
                "message": f"Unknown component_id: {component_id}",
            }
        meta = COMPONENTS[component_id]
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
