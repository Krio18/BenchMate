"""Agent initial context, built from the device.

Generic system prompt (name and components injected, with no reference
to any particular device), circuit description, points, tools,
nominal datasheet, symptom. No fault values, no fault list, no
tool-call instruction. Default: preamplifier.
"""

from simulator import charger_dispositif

SYSTEME_TEMPLATE = (
    "You are a diagnosis agent for {name}. "
    "You reason through hypotheses: several components may explain the fault, "
    "and you revise your hypotheses with each result received. "
    "You distinguish measured facts from your hypotheses, and you never claim "
    "to have run a test without a tool call. "
    "In each of your responses, without exception, include a line "
    'starting with "HYPOTHESES: " listing the components still plausible, '
    "even if that list is identical to the one in your previous response. When your diagnosis "
    'is final, end with a line starting with "DIAGNOSTIC: " followed by a single '
    "identifier ({cids}), your justification, and a recommended confirmation test. "
    "An upstream anomaly makes everything downstream abnormal. The faulty component is the one "
    "immediately preceding the first anomaly in the signal direction, or in the supply direction. "
    "An abnormal point whose input is already abnormal does not accuse its own component: it suffers. "
    "So look for the first abnormal point of the chain rather than listing every abnormal point. "
    "Start by characterizing the symptom where it shows to know which "
    "quantity is at stake: DC voltage, amplitude, or signal quality. Then walk back up the chain "
    "by dichotomy: measure a point in the middle, and depending on whether it reads nominal or not, search "
    "upstream or downstream. Do not sweep the points in order. Measure only the relevant quantity. If the "
    "output shows a degraded signal while its DC voltage reads nominal, the defect is on the "
    "signal: no need to take the DC voltage of each point. "
    "Before naming a component as faulty, check that its operating conditions read "
    "nominal: its supply voltage, and the DC voltage at its input. A component under "
    "nominal conditions that degrades the signal is faulty. A component under abnormal conditions merely "
    "suffers - the cause is then upstream, and that is what must be named. This check "
    "is never skipped, even when the symptom concerns only the signal. "
    "As soon as a single hypothesis remains and it is supported by your measurements, conclude immediately "
    "with DIAGNOSTIC, with no further confirmation measurement. "
    "You request a single tool at a time, and you wait for its result before deciding on the next one."
)

def _tool(name, desc, arg, ids):
    return {"type": "function", "function": {
        "name": name, "description": desc, "parameters": {"type": "object",
        "properties": {arg: {"type": "string",
        "description": "Identifier: " + ", ".join(ids) + "."}},
        "required": [arg], "additionalProperties": False}}}


def _enumeration(ids):
    if len(ids) < 2:
        return "".join(ids)
    return ", ".join(ids[:-1]) + " or " + ids[-1]


def construire_contexte(dispositif=None):
    d = charger_dispositif(dispositif)
    pids = [p["id"] for p in d["points"]]
    cids = [c["id"] for c in d["components"]]
    systeme = SYSTEME_TEMPLATE.format(name=d["name"], cids=_enumeration(cids))
    points = " ; ".join(f"{p['id']} ({p['name']}): {p['description']}" for p in d["points"]) + "."
    outils = (f"inspect_component (static metadata, independent of the circuit state: {', '.join(cids)}), "
              f"measure_voltage (DC voltage in volts: {', '.join(pids)}), "
              f"test_signal (signal amplitude and quality: {', '.join(pids)}).")
    user = (f"{d['chain']}\n"
            f"Measurement points: {points}\n"
            f"Available tools: {outils}\n"
            f"{d['nominal']}\n"
            f"Reported symptom: \"{d['symptom']}\"")
    tools = [
        _tool("inspect_component",
              "Static metadata: reference, role, visual aspect. Identical whatever the circuit state; never reveals the electrical state of a component.",
              "component_id", cids),
        _tool("measure_voltage",
              "DC voltage in volts on a measurement point.",
              "point_id", pids),
        _tool("test_signal",
              "Peak-to-peak amplitude in volts and signal quality.",
              "point_id", pids),
    ]
    return systeme, user, tools


SYSTEME, USER, TOOLS = construire_contexte()
