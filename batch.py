"""Harnais de mesure : rejoue chaque panne N fois.

Pour chaque scenario F1-F4 : taux de diagnostics corrects et nombre
moyen d'appels d'outils. La correspondance panne -> composant attendu
n'est connue que d'ici : jamais du simulateur ni de l'agent.
Le scenario sain est exclu : aucun composant n'y est en panne.
Usage : python batch.py [N]   (defaut 10)
Cle API : variable d'environnement MODEL_API_KEY.
"""

import contextlib
import io
import os
import sys

import diagnostic

EXPECTED = {"F1": "PS1", "F2": "R1", "F3": "U1", "F4": "C2"}
DEFAULT_N = 10


def main():
    try:
        n = int(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_N
        if n < 1:
            raise ValueError
    except ValueError:
        print("Usage : python batch.py [N]   (N entier >= 1, defaut 10)")
        raise SystemExit(2)
    if not os.environ.get("MODEL_API_KEY", ""):
        print("MODEL_API_KEY absente : $env:MODEL_API_KEY = ... puis relancer.")
        raise SystemExit(2)
    print(f"BenchMate 3D -- mesure ({n} passages par scenario : F1-F4)")
    for scenario, attendu in EXPECTED.items():
        ok, calls = 0, 0
        for _ in range(n):
            try:
                with contextlib.redirect_stdout(io.StringIO()):
                    res = diagnostic.run_diagnostic(scenario)
            except SystemExit as fin:
                print(f"abandon : erreur sur {scenario} (code {fin.code})")
                raise
            ok += res["diagnostic"] == attendu
            calls += res["calls"]
        print(f"{scenario} : {ok}/{n} corrects ({ok / n:.0%}), "
              f"{calls / n:.1f} appels en moyenne")


if __name__ == "__main__":
    main()
