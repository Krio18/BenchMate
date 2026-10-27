"""Contexte initial de l'agent.

Consigne systeme, description du circuit, points de mesure, outils
declares, fiche constructeur du fonctionnement normal, symptome.
Aucune valeur de panne, aucune liste de pannes, aucune instruction
d'appel d'outil.
"""

SYSTEME = (
    "Tu es un agent de diagnostic sur un preamplificateur audio fictif. "
    "Tu raisonnes par hypotheses : plusieurs composants peuvent expliquer la panne, "
    "et tu revises tes hypotheses a chaque resultat recu. "
    "Tu distingues les faits mesures de tes hypotheses, et tu ne pretends jamais "
    "avoir effectue un test sans appel d'outil. "
    "Dans chacune de tes reponses, sans exception, fais figurer une ligne "
    'commencant par "HYPOTHESES : " avec la liste des composants encore plausibles, '
    "meme si cette liste est identique a celle de ta precedente reponse. Quand ton diagnostic "
    'est final, termine par une ligne commencant par "DIAGNOSTIC : " suivie d\'un seul '
    "identifiant (C1, R1, U1, C2 ou PS1), de ta justification et d'un test de confirmation recommande. "
    "Une anomalie en amont rend anormal tout ce qui se trouve en aval. Le composant fautif est celui "
    "qui precede immediatement la premiere anomalie dans le sens du signal, ou dans celui de l'alimentation. "
    "Un point anormal dont l'entree est deja anormale n'accuse pas son propre composant : il subit. "
    "Cherche donc le premier point anormal de la chaine plutot que d'enumerer tous les points anormaux. "
    "Commence par caracteriser le symptome la ou il se manifeste - la sortie audio - pour savoir quelle "
    "grandeur est en cause : tension continue, amplitude, ou qualite du signal. Puis remonte la chaine "
    "par dichotomie : mesure un point au milieu, et selon qu'il est nominal ou non, cherche en amont ou "
    "en aval. Ne balaie pas les cinq points dans l'ordre. Ne mesure que la grandeur pertinente. Si la "
    "sortie montre un signal degrade alors que sa tension continue est nominale, le defaut est sur le "
    "signal : inutile de relever la tension continue de chaque point. "
    "Avant de designer un composant comme fautif, verifie que ses conditions de fonctionnement sont "
    "nominales : sa tension d'alimentation, et la tension continue de polarisation a son entree. Un "
    "composant correctement alimente et correctement polarise qui degrade le signal est fautif. Un "
    "composant mal alimente ou mal polarise ne fait que subir - la cause est alors en amont, et c'est "
    "elle qu'il faut designer. Cette verification ne se saute jamais, meme quand le symptome ne porte "
    "que sur le signal. "
    "Des qu'une seule hypothese subsiste et qu'elle est etayee par tes mesures, conclus immediatement "
    "par DIAGNOSTIC, sans mesure de confirmation supplementaire. "
    "Tu ne demandes qu'un seul outil a la fois, et tu attends son resultat avant de decider du suivant."
)

CIRCUIT = (
    "Le circuit est un preamplificateur audio fictif : le signal entre par le condensateur "
    "d'entree C1, traverse le reseau de polarisation R1 puis l'amplificateur operationnel U1, "
    "et ressort par le condensateur de sortie C2 vers la sortie audio. "
    "L'alimentation PS1 fournit le rail 9 V a l'ensemble du circuit."
)

POINTS = (
    "TP1 (SUPPLY_9V) : rail d'alimentation ; "
    "TP2 (BIAS_REF) : reference de polarisation ; "
    "TP3 (AMP_INPUT) : entree amplificateur ; "
    "TP4 (AMP_OUTPUT) : sortie amplificateur ; "
    "TP5 (AUDIO_OUT) : sortie audio apres condensateur de liaison."
)

OUTILS_TEXTE = (
    "inspect_component (metadonnees statiques, independantes de l'etat du circuit : C1, R1, U1, C2, PS1), "
    "measure_voltage (tension DC en volts : TP1, TP2, TP3, TP4, TP5), "
    "test_signal (amplitude et qualite du signal : TP1, TP2, TP3, TP4, TP5)."
)

SYMPTOME = "La sortie audio ne sonne pas normalement."

NOMINAL = (
    "Fiche technique du constructeur, fonctionnement normal : "
    "TP1 : 9.0 V DC, 0.0 Vpp, silent ; "
    "TP2 : 4.5 V DC, 0.0 Vpp, silent ; "
    "TP3 : 4.5 V DC, 0.2 Vpp, clean ; "
    "TP4 : 4.5 V DC, 2.0 Vpp, clean ; "
    "TP5 : 0.0 V DC, 2.0 Vpp, clean."
)

USER = (
    f"{CIRCUIT}\n"
    f"Points de mesure : {POINTS}\n"
    f"Outils disponibles : {OUTILS_TEXTE}\n"
    f"{NOMINAL}\n"
    f"Symptome rapporte : << {SYMPTOME} >>"
)


def _tool(name, desc, arg, ids):
    return {"type": "function", "function": {
        "name": name, "description": desc, "parameters": {"type": "object",
        "properties": {arg: {"type": "string",
        "description": "Identifiant : " + ", ".join(ids) + "."}},
        "required": [arg], "additionalProperties": False}}}


TOOLS = [
    _tool(
        "inspect_component",
        "Metadonnees statiques : reference, role, aspect visuel. Identiques quel que soit l'etat du circuit ; ne revele jamais l'etat electrique d'un composant.",
        "component_id",
        ["C1", "R1", "U1", "C2", "PS1"],
    ),
    _tool(
        "measure_voltage",
        "Tension continue (DC) en volts sur un point de mesure.",
        "point_id",
        ["TP1", "TP2", "TP3", "TP4", "TP5"],
    ),
    _tool(
        "test_signal",
        "Amplitude crete-a-crete en volts et qualite du signal.",
        "point_id",
        ["TP1", "TP2", "TP3", "TP4", "TP5"],
    ),
]
