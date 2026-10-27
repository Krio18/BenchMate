# AGENT.md --- Règles de travail pour Muse Code

Lis intégralement `AGENT.md` et `SPEC.md` avant de commencer toute
tâche. Ces fichiers sont le contrat du projet. En cas de conflit ou
d'ambiguïté, arrête-toi et demande une clarification avant de modifier
le code.

Contexte initial de l’agent. L’agent reçoit : une description textuelle du circuit (les cinq composants et leur rôle, l’ordre du signal de l’entrée vers la sortie), la liste des cinq points de mesure avec leur nom, la liste des trois outils, la fiche technique nominale (tensions DC, amplitudes et qualités attendues en fonctionnement normal, c’est-à-dire la colonne Sain de SPEC.md §4), et le symptôme rapporté. Il ne reçoit ni les tables des quatre pannes, ni aucune mention de leur existence ou de leur nombre, ni la liste des pannes possibles. La consigne système lui impose en outre trois principes de raisonnement : propagation (le fautif précède la première anomalie), dichotomie (caractériser le symptôme à la sortie puis remonter par dichotomie sur la grandeur pertinente) et vérification des conditions de fonctionnement (alimentation et polarisation du suspect avant de l’accuser).

## Règles obligatoires

1.  **Stack autorisée :** Python pour le simulateur et l'agent ;
    Three.js pour la scène 3D. N'ajoute aucune autre dépendance,
    bibliothèque, framework ou service sans me demander d'abord.
2.  **Une tâche à la fois :** travaille uniquement sur la tâche
    explicitement demandée. Une fois terminée, lance les vérifications
    pertinentes, résume les changements et attends mon accord. Ne
    commence jamais la tâche suivante de toi-même.
3.  **Limite de taille :** aucun fichier de code ne doit dépasser 200 lignes. Si
    un fichier de code risque de dépasser cette limite, arrête-toi et propose
    une découpe avant de continuer.
4.  **Tests obligatoires :** toute fonction du simulateur doit être
    accompagnée d'un test que je peux lancer. Donne la commande exacte
    pour exécuter les tests. N'ajoute pas de dépendance de test sans
    demander ; privilégie les outils de test standard déjà disponibles.
5.  **Décisions d'architecture :** si une décision d'architecture, de
    structure de projet, de protocole, de dépendance ou de contrat d'API
    est nécessaire et n'est pas définie dans les spécifications,
    arrête-toi et pose-moi la question. Ne décide pas à ma place.
6.  **Pas de bibliothèque de simulation électronique :** le simulateur
    est une table de valeurs prédéfinies. Il ne doit pas utiliser de
    bibliothèque de simulation électronique ni essayer de modéliser
    physiquement le circuit.
7.  **Respect de `SPEC.md` :** ne change pas les quatre pannes, les cinq
    points de mesure, les trois outils, leurs signatures ou leurs
    structures de retour sans mon autorisation explicite.
8.  **Le simulateur fait autorité :** le modèle ne doit jamais inventer
    une mesure. Les tensions, amplitudes et états de signal sont lus
    dans la table du scénario actif.
9.  **Pas de fuite du scénario :** l'agent ne doit pas recevoir
    l'identifiant de la panne active ni un indicateur révélant le
    composant défectueux.
10. **Pas de fausse réussite :** ne prétends pas qu'un test a réussi si
    tu ne l'as pas exécuté. Signale clairement les tests non exécutés et
    les limitations rencontrées.
11. **Changements minimaux :** ne refactorise pas le code sans rapport
    avec la tâche demandée. N'écrase pas le travail existant et examine
    les fichiers concernés avant de les modifier.
12. **Pas de fonctionnalités inventées :** ne crée pas de
    fonctionnalités, de fichiers ou de configuration supplémentaires qui
    n'ont pas été demandés ou approuvés.

## Procédure pour chaque tâche

1.  Lire `AGENT.md` et `SPEC.md`.
2.  Examiner les fichiers existants qui concernent directement la tâche.
3.  Reformuler brièvement l'objectif et les fichiers qui seront
    modifiés.
4.  Si une information ou décision nécessaire manque, s'arrêter et me
    demander.
5.  Effectuer uniquement la tâche autorisée.
6.  Vérifier que chaque fichier de code modifié fait au plus 200 lignes.
7.  Exécuter les tests pertinents, y compris les tests du simulateur
    concernés.
8.  Résumer les fichiers modifiés, les commandes lancées et les
    résultats exacts.
9.  S'arrêter et attendre mon accord avant de poursuivre.

## Format de compte rendu

À la fin de chaque tâche, fournir : - **Fait :** changements réalisés. -
**Fichiers :** liste des fichiers modifiés. - **Tests :** commande
exacte et résultat réel, ou raison pour laquelle ils n'ont pas été
exécutés. - **Limites :** points non vérifiés ou problèmes connus. -
**Suite :** attendre mon instruction ; ne pas commencer une nouvelle
tâche.
