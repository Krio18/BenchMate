# BenchMate

Un agent de diagnostic de panne, et le banc qui prouve qu'il raisonne.

Muse Spark reçoit un symptôme et trois outils de mesure. Il formule ses hypothèses,
choisit où mesurer, interprète ce qu'il reçoit, élimine, et conclut. Il n'a jamais
accès à l'état réel du dispositif : toutes les valeurs viennent d'un simulateur
déterministe qui, lui, connaît la panne.

**Le modèle ne peut rien inventer.** C'est ce qui rend chaque diagnostic vérifiable.

## Résultats

80 diagnostics, deux dispositifs sans rapport l'un avec l'autre, consigne identique.

| Dispositif | Pannes | Taux | Mesures en moyenne |
| --- | --- | --- | --- |
| Préamplificateur audio — 5 points, 5 composants | 4 | 40/40 | 6,0 |
| Alimentation régulée — 6 points, 4 composants | 4 | 40/40 | 4,7 |

Reproductible : `python batch.py 10` et `python batch.py 10 alimentation`.

## Ce qui a été construit pendant le hackathon

**La totalité du dépôt.** Aucun code antérieur au 27 octobre 2026, aucune
bibliothèque de simulation : l'historique git le montre, les spécifications sont
datées du 26 et tout le code du 27 au 4 novembre.

## L'essentiel : ce qu'il a fallu pour y arriver

Le modèle seul atteignait 50 %. Il accusait systématiquement le composant le plus
proche du symptôme. Trois principes, ajoutés à sa consigne, l'ont porté à 100 % :

1. **Propagation.** Une anomalie en amont rend anormal tout ce qui suit. Le fautif
   précède la *première* anomalie de la chaîne — ce qui vient après ne fait que subir.
2. **Dichotomie.** Partir du symptôme là où il se manifeste et remonter en coupant
   la chaîne en deux, plutôt que de balayer les points dans l'ordre.
3. **Vérification des conditions de fonctionnement.** Ne jamais condamner un
   composant sans avoir vérifié qu'il est correctement alimenté. Un composant mal
   alimenté dysfonctionne sans être fautif.

Aucun de ces trois n'est spécifique à l'électronique. Ce sont les réflexes de
n'importe quel dépannage par élimination, et le modèle ne les applique pas seul.

## Indépendant du dispositif

La consigne de l'agent ne contient **aucun identifiant de point, aucun nom de
composant, aucune référence à un circuit** — un test automatique le vérifie contre
tous les dispositifs du dépôt.

Ajouter un dispositif, c'est ajouter un fichier de données : la chaîne, les points,
les composants, la fiche nominale du constructeur et les scénarios. Aucun code à
toucher. Le deuxième dispositif a été ajouté ainsi, et diagnostiqué à 100 % sans
qu'un mot de la consigne ne change.

En production, le simulateur est remplacé par l'instrument réel. L'agent, lui,
ne change pas.

## Ce que l'agent reçoit, et ce qu'il ne reçoit pas

**Reçoit** : la description de la chaîne, les points de mesure, les trois outils,
la fiche technique des valeurs nominales — celle dont dispose tout technicien — et
le symptôme rapporté.

**Ne reçoit pas** : les tables de pannes, leur nombre, leur existence, ni aucune
valeur en défaut. Un test anti-fuite vérifie à chaque exécution qu'aucune de ces
valeurs n'apparaît dans son contexte, et qu'aucune instruction ne lui dit d'appeler
un outil : il décide seul s'il mesure, et où.

## Les modèles Meta

**Muse Spark** (`muse-spark-1.3`), via Meta Model API, en appel de fonction. C'est
le moteur entier : hypothèses, choix des mesures, interprétation, conclusion.
Aucun autre modèle n'est utilisé — aucun n'aurait servi à autre chose qu'à faire
nombre.

## Architecture

- `simulator.py` — détient la vérité, expose trois outils, ne révèle jamais le scénario actif
- `contexte.py` — construit le contexte de l'agent depuis le dispositif ; ne contient rien de spécifique
- `diagnostic.py` — la boucle : un outil par tour, 8 au maximum, tout journalisé
- `batch.py` — rejoue chaque panne N fois et note les résultats
- `preampli.json`, `alimentation.json` — les dispositifs

## Lancer
python diagnostic.py F3
python batch.py 10
python batch.py 10 alimentation
pytest


## Limites

Les dispositifs sont simulés : les valeurs sont des tables, pas une résolution de
circuit. C'est délibéré — le sujet est le raisonnement de l'agent, et une table
déterministe est précisément ce qui permet de le noter. Le passage à un instrument
réel se fait derrière les trois outils, sans toucher à l'agent.

Une seule panne à la fois. Les pannes multiples ne sont pas traitées.