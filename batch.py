"""Harnais de mesure : rejoue chaque panne N fois.

Pour chaque scenario F1-F4 : taux de diagnostics corrects et nombre
moyen d'appels d'outils. La correspondance panne -> composant attendu
est definie dans export_json (harnais) : jamais du simulateur ni de
l'agent. Le scenario sain est exclu : aucun composant n'y est en panne.
Usage : python batch.py [N] [dispositif]   (defaut 10, preamplificateur.json ; '.json' facultatif)
Cle API : variable d'environnement MODEL_API_KEY.
"""

import contextlib
import io
import os
import sys

import diagnostic
from export_json import EXPECTED
from simulator import charger_dispositif

DEFAULT_N = 10


def main():
    try:
        n = int(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_N
        if n < 1:
            raise ValueError
    except ValueError:
        print("Usage : python batch.py [N] [dispositif]   (N entier >= 1, defaut 10 ; '.json' facultatif)")
        raise SystemExit(2)
    dispositif = sys.argv[2] if len(sys.argv) > 2 else None
    if not os.environ.get("MODEL_API_KEY", ""):
        print("MODEL_API_KEY absente : $env:MODEL_API_KEY = ... puis relancer.")
        raise SystemExit(2)
    scenarios = [s for s in charger_dispositif(dispositif)["scenarios"] if s in EXPECTED]
    if not scenarios:
        print("aucun scenario connu pour ce dispositif")
        raise SystemExit(2)
    plage = scenarios[0] if len(scenarios) == 1 else f"{scenarios[0]}-{scenarios[-1]}"
    print(f"BenchMate 3D -- mesure ({n} passages par scenario : {plage})")
    for scenario in scenarios:
        attendu = EXPECTED[scenario]
        ok, calls = 0, 0
        for _ in range(n):
            try:
                with contextlib.redirect_stdout(io.StringIO()):
                    res = diagnostic.run_diagnostic(scenario, dispositif)
            except SystemExit as fin:
                print(f"abandon : erreur sur {scenario} (code {fin.code})")
                raise
            ok += res["diagnostic"] == attendu
            calls += res["calls"]
        print(f"{scenario} : {ok}/{n} corrects ({ok / n:.0%}), "
              f"{calls / n:.1f} appels en moyenne")


if __name__ == "__main__":
    main()
