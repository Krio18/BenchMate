"""Contexte initial de l'agent, construit depuis le dispositif.

Consigne systeme generique (nom et composants injectes, sans reference
a un dispositif particulier), description du circuit, points, outils,
fiche nominale, symptome. Aucune valeur de panne, aucune liste de
pannes, aucune instruction d'appel d'outil. Defaut : preamplificateur.
"""

from simulator import charger_dispositif

SYSTEME_TEMPLATE = (
    "Tu es un agent de diagnostic sur {name}. "
    "Tu raisonnes par hypotheses : plusieurs composants peuvent expliquer la panne, "
    "et tu revises tes hypotheses a chaque resultat recu. "
    "Tu distingues les faits mesures de tes hypotheses, et tu ne pretends jamais "
    "avoir effectue un test sans appel d'outil. "
    "Dans chacune de tes reponses, sans exception, fais figurer une ligne "
    'commencant par "HYPOTHESES : " avec la liste des composants encore plausibles, '
    "meme si cette liste est identique a celle de ta precedente reponse. Quand ton diagnostic "
    'est final, termine par une ligne commencant par "DIAGNOSTIC : " suivie d\'un seul '
    "identifiant ({cids}), de ta justification et d'un test de confirmation recommande. "
    "Une anomalie en amont rend anormal tout ce qui se trouve en aval. Le composant fautif est celui "
    "qui precede immediatement la premiere anomalie dans le sens du signal, ou dans celui de l'alimentation. "
    "Un point anormal dont l'entree est deja anormale n'accuse pas son propre composant : il subit. "
    "Cherche donc le premier point anormal de la chaine plutot que d'enumerer tous les points anormaux. "
    "Commence par caracteriser le symptome la ou il se manifeste pour savoir quelle "
    "grandeur est en cause : tension continue, amplitude, ou qualite du signal. Puis remonte la chaine "
    "par dichotomie : mesure un point au milieu, et selon qu'il est nominal ou non, cherche en amont ou "
    "en aval. Ne balaie pas les points dans l'ordre. Ne mesure que la grandeur pertinente. Si la "
    "sortie montre un signal degrade alors que sa tension continue est nominale, le defaut est sur le "
    "signal : inutile de relever la tension continue de chaque point. "
    "Avant de designer un composant comme fautif, verifie que ses conditions de fonctionnement sont "
    "nominales : sa tension d'alimentation, et la tension continue a son entree. Un composant en "
    "conditions nominales qui degrade le signal est fautif. Un composant en conditions anormales ne "
    "fait que subir - la cause est alors en amont, et c'est elle qu'il faut designer. Cette verification "
    "ne se saute jamais, meme quand le symptome ne porte que sur le signal. "
    "Des qu'une seule hypothese subsiste et qu'elle est etayee par tes mesures, conclus immediatement "
    "par DIAGNOSTIC, sans mesure de confirmation supplementaire. "
    "Tu ne demandes qu'un seul outil a la fois, et tu attends son resultat avant de decider du suivant."
)

def _tool(name, desc, arg, ids):
    return {"type": "function", "function": {
        "name": name, "description": desc, "parameters": {"type": "object",
        "properties": {arg: {"type": "string",
        "description": "Identifiant : " + ", ".join(ids) + "."}},
        "required": [arg], "additionalProperties": False}}}


def _enumeration(ids):
    if len(ids) < 2:
        return "".join(ids)
    return ", ".join(ids[:-1]) + " ou " + ids[-1]


def construire_contexte(dispositif=None):
    d = charger_dispositif(dispositif)
    pids = [p["id"] for p in d["points"]]
    cids = [c["id"] for c in d["components"]]
    systeme = SYSTEME_TEMPLATE.format(name=d["name"], cids=_enumeration(cids))
    points = " ; ".join(f"{p['id']} ({p['name']}) : {p['description']}" for p in d["points"]) + "."
    outils = (f"inspect_component (metadonnees statiques, independantes de l'etat du circuit : {', '.join(cids)}), "
              f"measure_voltage (tension DC en volts : {', '.join(pids)}), "
              f"test_signal (amplitude et qualite du signal : {', '.join(pids)}).")
    user = (f"{d['chain']}\n"
            f"Points de mesure : {points}\n"
            f"Outils disponibles : {outils}\n"
            f"{d['nominal']}\n"
            f"Symptome rapporte : << {d['symptom']} >>")
    tools = [
        _tool("inspect_component",
              "Metadonnees statiques : reference, role, aspect visuel. Identiques quel que soit l'etat du circuit ; ne revele jamais l'etat electrique d'un composant.",
              "component_id", cids),
        _tool("measure_voltage",
              "Tension continue (DC) en volts sur un point de mesure.",
              "point_id", pids),
        _tool("test_signal",
              "Amplitude crete-a-crete en volts et qualite du signal.",
              "point_id", pids),
    ]
    return systeme, user, tools


SYSTEME, USER, TOOLS = construire_contexte()
