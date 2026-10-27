"""risk_test.py -- Test de risque : Muse Spark sait-il appeler un outil ?

Envoie a Muse Spark, via Meta Model API (protocole Chat Completions),
la description du circuit, les cinq points de mesure et le symptome.
Attend un appel d'outil structure (champ `tool_calls`), execute l'outil
localement, renvoie le resultat et affiche la suite du modele.

Outil declare : une seule fonction, `measure_voltage(point_id: str)`,
qui renvoie une valeur en dur (pas de simulateur, pas de table).

Si le modele ne demande aucun appel d'outil, le test echoue : il ne
tente jamais de deviner un appel en analysant du texte.

Prerequis : cle API dans MODEL_API_KEY.
Commande :  python risk_test.py
Sorties : 0 = un appel d'outil a ete demande et traite ;
1 = echec du test ; 2 = MODEL_API_KEY absente.

Protocole verifie dans la doc officielle :
https://dev.meta.ai/docs/tool-calling (base https://api.meta.ai/v1).
"""

import json
import os
import urllib.error
import urllib.request

BASE_URL = "https://api.meta.ai/v1"
MODEL = "muse-spark-1.3"
TIMEOUT_S = 60

CIRCUIT = (
    "Le circuit est un preamplificateur audio fictif : le signal entre par "
    "le condensateur d'entree C1, traverse le reseau de polarisation R1 puis "
    "l'amplificateur operationnel U1, et ressort par le condensateur de "
    "sortie C2 vers la sortie audio. "
    "L'alimentation PS1 fournit le rail 9 V a l'ensemble du circuit."
)

POINTS = (
    "TP1 (SUPPLY_9V) : rail d'alimentation ; "
    "TP2 (BIAS_REF) : reference de polarisation ; "
    "TP3 (AMP_INPUT) : entree amplificateur ; "
    "TP4 (AMP_OUTPUT) : sortie amplificateur ; "
    "TP5 (AUDIO_OUT) : sortie audio apres condensateur de liaison."
)

SYMPTOME = "la sortie audio ne sonne pas normalement"

PROMPT = (
    f"{CIRCUIT}\n"
    f"Points de mesure : {POINTS}\n"
    f"Symptome rapporte : << {SYMPTOME} >>.\n"
    "Commence le diagnostic : appelle l'outil measure_voltage sur le "
    "point de mesure le plus utile en premier."
)


def measure_voltage(point_id: str):
    """Outil unique du test : valeur en dur, pas de simulateur."""
    return {"point_id": point_id, "voltage_v": 5.2, "unit": "V"}


TOOL_SPEC = {
    "type": "function",
    "function": {
        "name": "measure_voltage",
        "description": (
            "Mesure la tension continue (DC) en volts sur un point "
            "de mesure du preamplificateur."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "point_id": {
                    "type": "string",
                    "description": (
                        "Identifiant du point : "
                        "TP1, TP2, TP3, TP4 ou TP5."
                    ),
                }
            },
            "required": ["point_id"],
            "additionalProperties": False,
        },
    },
}


def echec(message):
    print(f"RESULTAT : ECHEC -- {message}")
    raise SystemExit(1)


def appel_api(messages):
    cle = os.environ.get("MODEL_API_KEY", "")
    if not cle:
        print(
            "RESULTAT : CONFIGURATION MANQUANTE -- la variable "
            "d'environnement MODEL_API_KEY n'est pas definie. Exemple "
            "(PowerShell) : $env:MODEL_API_KEY = \"...\" puis relancer : "
            "python risk_test.py"
        )
        raise SystemExit(2)
    corps = json.dumps(
        {"model": MODEL, "messages": messages, "tools": [TOOL_SPEC]}
    ).encode("utf-8")
    requete = urllib.request.Request(
        f"{BASE_URL}/chat/completions",
        data=corps,
        headers={
            "Authorization": f"Bearer {cle}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(requete, timeout=TIMEOUT_S) as reponse:
            return json.load(reponse)
    except urllib.error.HTTPError as err:
        detail = err.read().decode("utf-8", "replace")
        echec(f"l'API a repondu HTTP {err.code} : {detail}")
    except (urllib.error.URLError, OSError, json.JSONDecodeError) as err:
        echec(f"appel API impossible ({type(err).__name__}) : {err}")
    raise AssertionError("inaccessible")  # echec() leve toujours SystemExit


def extrait_message(reponse):
    try:
        return reponse["choices"][0]["message"]
    except (KeyError, IndexError, TypeError):
        echec(f"reponse API inattendue : {reponse!r}")
    raise AssertionError("inaccessible")  # echec() leve toujours SystemExit


def main():
    print(f"[ENVOI] Modele : {MODEL} -- prompt envoye :")
    print(PROMPT)
    print()

    messages = [{"role": "user", "content": PROMPT}]
    message = extrait_message(appel_api(messages))
    appels = message.get("tool_calls") or []

    if not appels:
        print("[1] DEMANDE DU MODELE : aucun appel d'outil.")
        print(f"Texte recu : {message.get('content')}")
        echec("le modele n'a pas demande d'appel d'outil.")

    resultats = []
    for appel in appels:
        nom = appel["function"]["name"]
        brut = appel["function"]["arguments"]
        print(f"[1] DEMANDE DU MODELE : appel d'outil << {nom} >>.")
        print(f"[2] ARGUMENT TRANSMIS : {brut}")
        if nom != "measure_voltage":
            echec(f"outil inconnu demande : << {nom} >>.")
        try:
            point_id = json.loads(brut)["point_id"]
        except (json.JSONDecodeError, KeyError, TypeError):
            echec(f"arguments invalides pour measure_voltage : {brut}")
        resultat = measure_voltage(point_id)
        print(f"[3] RESULTAT RENVOYE A L'OUTIL : {json.dumps(resultat)}")
        resultats.append((appel["id"], resultat))

    messages.append(
        {
            "role": "assistant",
            "content": message.get("content"),
            "tool_calls": appels,
        }
    )
    for call_id, resultat in resultats:
        messages.append(
            {
                "role": "tool",
                "tool_call_id": call_id,
                "content": json.dumps(resultat),
            }
        )

    print()
    print("[ENVOI] Resultat(s) renvoye(s) au modele, attente de la suite...")
    suite = extrait_message(appel_api(messages))
    print(f"[4] SUITE DU MODELE : {suite.get('content')}")
    if suite.get("tool_calls"):
        print(
            "Note : le modele demande un autre appel d'outil ; "
            "le test s'arrete apres un aller-retour."
        )
    print(
        "RESULTAT : OK -- le modele a demande un appel d'outil via "
        "l'API et le resultat lui a ete renvoye."
    )


if __name__ == "__main__":
    main()
