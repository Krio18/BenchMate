# BenchMate 3D

Un agent de diagnostic de panne, et le banc qui prouve qu'il raisonne.

Muse Spark reçoit un symptôme, une fiche technique et trois outils de mesure. Il
formule ses hypothèses, choisit où mesurer, interprète ce qu'il reçoit, élimine,
et conclut. Il n'a jamais accès à l'état réel de la carte : toutes les valeurs
viennent d'un simulateur déterministe qui, lui, connaît la panne.

**Le modèle ne peut rien inventer.** C'est ce qui rend chaque diagnostic vérifiable.

## Résultats

**200 diagnostics, 200 corrects.** Quatre dispositifs sans rapport les uns avec les
autres, consigne d'agent identique au mot près.

| Dispositif | Points | Composants | Pannes | Taux | Mesures en moyenne |
| --- | --- | --- | --- | --- | --- |
| Préamplificateur audio | 5 | 5 | 4 | 40/40 | 6,0 |
| Alimentation régulée | 6 | 4 | 4 | 40/40 | 4,7 |
| Carte d'attaque moteur | 10 | 8 | 6 | 60/60 | 6,1 |
| Carte de contrôle de drone | 14 | 13 | 6 | 60/60 | 7,4 |

Reproductible : `python batch.py 10 drone` (`preamplificateur`, `alimentation`,
`moteur` ou `drone`, 10 passages par panne).

## Ce qui a été construit pendant le hackathon

**La totalité du dépôt.** Aucun code antérieur au 27 octobre 2026, aucune
bibliothèque de simulation électronique, aucune dépendance hors bibliothèque
standard de Python. Les spécifications sont datées du 26 octobre, tout le code du
27 octobre au 2 novembre — l'historique git le montre.

## L'essentiel : ce qu'il a fallu pour y arriver

Le modèle seul atteignait **50 %**. Il accusait systématiquement le composant le
plus proche du symptôme. Trois principes, ajoutés à sa consigne, l'ont porté à
100 % :

1. **Propagation.** Une anomalie en amont rend anormal tout ce qui suit. Le fautif
   précède la *première* anomalie de la chaîne — ce qui vient après ne fait que subir.
2. **Dichotomie.** Partir du symptôme là où il se manifeste et remonter en coupant
   la chaîne en deux, plutôt que de balayer les points dans l'ordre.
3. **Vérification des conditions de fonctionnement.** Ne jamais condamner un
   composant sans avoir vérifié son alimentation et sa polarisation. Un composant
   mal alimenté dysfonctionne sans être fautif.

Aucun des trois n'est spécifique à l'électronique : ce sont les réflexes de
n'importe quel dépannage par élimination, et le modèle ne les applique pas seul.

Chacun a réparé des pannes en en cassant d'autres. Le troisième a complété la
carte moteur mais dégradé le préamplificateur — c'est le harnais de mesure qui
l'a révélé, en deux minutes.

## Ce que l'agent raisonne, sur la carte de drone

Panne J2, fusible partiellement dégradé, carte de 13 composants découverte sans
aucune adaptation :

> Sortie moteur dégradée → remonte la chaîne PWM → **TP10 nominal**, la commande du
> microcontrôleur est bonne → TP11 anormal juste après le pilote de grille, *mais
> son alimentation TP3 est à 11 V au lieu de 14,8* → **« U5 subit donc sa condition
> d'alimentation »** → dichotomie sur la chaîne d'alimentation → TP2 anormal, TP1
> nominal → **FU1**.

Deux composants successivement disculpés, deux niveaux remontés, huit mesures.

## Indépendant du dispositif

La consigne de l'agent ne contient **aucun identifiant de point, aucun nom de
composant, aucune référence à un circuit** — un test automatique le vérifie contre
tous les dispositifs du dépôt.

Ajouter un dispositif, c'est ajouter un fichier de données : la chaîne, les points,
les composants, la fiche nominale du constructeur, les scénarios. Les trois
dispositifs ajoutés après le premier l'ont été ainsi, et diagnostiqués à 100 % sans
qu'un mot de la consigne ne change.

En production, le simulateur est remplacé par l'instrument réel. L'agent, lui, ne
change pas.

## Ce que l'agent reçoit, et ce qu'il ne reçoit pas

**Reçoit** : la description de la chaîne, les points de mesure, les trois outils,
la fiche technique des valeurs nominales — celle dont dispose tout technicien — et
le symptôme rapporté.

**Ne reçoit pas** : les tables de pannes, leur nombre, leur existence, ni aucune
valeur en défaut. Des tests anti-fuite vérifient qu'aucune de ces valeurs
n'apparaît dans son contexte. Et aucune instruction ne lui dit d'appeler
un outil : il décide seul s'il mesure, et où.

## Le rejeu 3D

`viewer/index.html` — page autonome, aucune requête réseau, à ouvrir par
double-clic. Elle charge un journal de passage et le rejoue : la carte en 3D avec
ses composants modélisés, la sonde qui se déplace de point en point, l'oscillogramme
qui superpose le signal nominal au signal mesuré, le raisonnement de l'agent affiché
au fil de l'eau, et les hypothèses qui s'éteignent une à une.

Sur la carte de drone, la liste passe de **13 hypothèses à 1** en huit mesures.

La page ne touche ni au simulateur ni à l'API : tout vient du journal.

## Les modèles Meta

**Muse Spark** (`muse-spark-1.3`), via Meta Model API, en appel de fonction. C'est
le moteur entier : hypothèses, choix des mesures, interprétation, conclusion. Aucun
autre modèle n'est utilisé — aucun n'aurait servi à autre chose qu'à faire nombre.

## Architecture

- `simulator.py` — détient la vérité, expose trois outils, ne révèle jamais le scénario actif
- `contexte.py` — construit le contexte de l'agent depuis le dispositif ; ne contient rien de spécifique
- `diagnostic.py` — la boucle : un outil par tour, budget paramétrable, tout journalisé
- `export_json.py` — l'enregistrement d'un passage, rejouable sans simulateur ni API
- `batch.py` — rejoue chaque panne N fois et note les résultats
- `devices/*.json` — les quatre dispositifs
- `viewer/` — le rejeu 3D

## Lancer

```
$env:MODEL_API_KEY = "..."
python diagnostic.py J1 drone
python diagnostic.py J1 drone --json runs/mon_passage.json
python batch.py 10 drone
pytest
```


Puis ouvrir `viewer/index.html` et y charger un journal de `runs/`.

## Limites

Les dispositifs sont simulés : les valeurs sont des tables, pas une résolution de
circuit. C'est délibéré — le sujet est le raisonnement de l'agent, et une table
déterministe est précisément ce qui permet de le noter. Le passage à un instrument
réel se fait derrière les trois outils, sans toucher à l'agent.

Une seule panne à la fois. Les pannes multiples ne sont pas traitées.