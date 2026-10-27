"""Tests pytest du simulateur (SPEC.md sections 4 a 6).

Commande : python -m pytest simulator_test.py -v
"""

import pytest

from simulator import SCENARIOS, Simulator

POINTS = ["TP1", "TP2", "TP3", "TP4", "TP5"]
COMPONENT_IDS = ["C1", "R1", "U1", "C2", "PS1"]

# Copie independante de SPEC.md section 4 : (DC V, amplitude Vpp, qualite).
EXPECTED = {
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

# Noms et roles recopies de SPEC.md section 5.
EXPECTED_NAMES = {
    "C1": ("Condensateur d'entr\u00e9e", "Couple le signal d'entr\u00e9e"),
    "R1": (
        "R\u00e9seau de polarisation",
        "\u00c9tablit la r\u00e9f\u00e9rence de polarisation",
    ),
    "U1": ("Amplificateur op\u00e9rationnel", "Amplifie le signal"),
    "C2": ("Condensateur de sortie", "Couple le signal vers la sortie"),
    "PS1": ("Alimentation", "Fournit le rail d'alimentation"),
}


def test_scenarios_and_points_match_contract():
    assert set(SCENARIOS) == set(EXPECTED)
    for scenario, points in SCENARIOS.items():
        assert set(points) == set(POINTS), scenario


def test_measure_voltage_matches_spec_table():
    for scenario, points in EXPECTED.items():
        sim = Simulator(scenario)
        for point_id, (voltage_v, _, _) in points.items():
            assert sim.measure_voltage(point_id) == {
                "point_id": point_id,
                "voltage_v": voltage_v,
                "unit": "V",
            }, (scenario, point_id)


def test_test_signal_matches_spec_table():
    for scenario, points in EXPECTED.items():
        sim = Simulator(scenario)
        for point_id, (_, amplitude_vpp, quality) in points.items():
            assert sim.test_signal(point_id) == {
                "point_id": point_id,
                "amplitude_vpp": amplitude_vpp,
                "quality": quality,
            }, (scenario, point_id)


def test_measure_voltage_unknown_point():
    sim = Simulator("sain")
    assert sim.measure_voltage("TP99") == {
        "error": "UNKNOWN_POINT_ID",
        "message": "Unknown point_id: TP99",
    }
    assert sim.measure_voltage("")["error"] == "UNKNOWN_POINT_ID"
    assert sim.measure_voltage(None)["error"] == "UNKNOWN_POINT_ID"


def test_test_signal_unknown_point():
    sim = Simulator("F1")
    assert sim.test_signal("TP99")["error"] == "UNKNOWN_POINT_ID"
    assert sim.test_signal(None)["error"] == "UNKNOWN_POINT_ID"


def test_inspect_component_returns_exact_structure():
    sim = Simulator("F2")
    for component_id, (name, role) in EXPECTED_NAMES.items():
        info = sim.inspect_component(component_id)
        assert set(info) == {"component_id", "name", "role", "visual_notes"}
        assert info["component_id"] == component_id
        assert info["name"] == name
        assert info["role"] == role
        assert isinstance(info["visual_notes"], str) and info["visual_notes"]


def test_inspect_component_identical_across_all_scenarios():
    refs = {
        cid: Simulator("sain").inspect_component(cid) for cid in COMPONENT_IDS
    }
    for scenario in EXPECTED:
        sim = Simulator(scenario)
        for component_id, ref in refs.items():
            assert sim.inspect_component(component_id) == ref, (
                scenario,
                component_id,
            )


def test_inspect_component_unknown_id():
    sim = Simulator("sain")
    assert sim.inspect_component("XX") == {
        "error": "UNKNOWN_COMPONENT_ID",
        "message": "Unknown component_id: XX",
    }
    assert sim.inspect_component(None)["error"] == "UNKNOWN_COMPONENT_ID"


def test_unknown_scenario_raises():
    with pytest.raises(ValueError):
        Simulator("F9")
    with pytest.raises(ValueError):
        Simulator(None)


def test_tool_results_never_reveal_scenario():
    for scenario in EXPECTED:
        sim = Simulator(scenario)
        results = [sim.measure_voltage(p) for p in POINTS]
        results += [sim.test_signal(p) for p in POINTS]
        results += [sim.inspect_component(c) for c in COMPONENT_IDS]
        for res in results:
            assert "is_faulty" not in res
            assert "scenario" not in res
            for value in res.values():
                assert value not in EXPECTED, (scenario, res)
