# SPEC.md --- BenchMate 3D

## 1. But et périmètre

BenchMate 3D est une démo d'agent de diagnostic sur un préamplificateur
audio fictif. L'agent inspecte des composants, demande des mesures,
révise ses hypothèses et propose un diagnostic. Le circuit n'est pas une
simulation physique : les résultats viennent exclusivement des tables de
ce fichier.

Le scénario actif contient exactement une des quatre pannes ci-dessous.
Le scénario sain est réservé aux tests.

## 2. Règle d'or

**Le simulateur est l'autorité ; le modèle n'invente aucune valeur.**

-   Toute tension, amplitude, qualité de signal et métadonnée provient
    du simulateur.
-   Le modèle ne calcule ni ne devine aucune mesure ; il doit appeler
    les outils contractuels.
-   Le simulateur renvoie les valeurs prédéfinies du scénario actif.
-   Un identifiant inconnu produit une erreur explicite, jamais une
    valeur de remplacement.
-   Le scénario actif et l'identité de la panne restent cachés à
    l'agent.
-   L'agent distingue les faits mesurés de ses hypothèses et justifie
    son diagnostic par des résultats retournés par les outils.

## 3. Points de mesure

Tensions DC en volts (`V`), amplitudes de signal en volts crête-à-crête
(`Vpp`). États autorisés : `clean`, `distorted`, `silent`, `weak`.

  ID      Nom            Description
  ------- -------------- --------------------------------------------
  `TP1`   `SUPPLY_9V`    Rail d'alimentation
  `TP2`   `BIAS_REF`     Référence de polarisation
  `TP3`   `AMP_INPUT`    Entrée amplificateur
  `TP4`   `AMP_OUTPUT`   Sortie amplificateur
  `TP5`   `AUDIO_OUT`    Sortie audio après condensateur de liaison

## 4. Scénarios prédéfinis

Dans les lignes ci-dessous, chaque valeur est
`DC V / amplitude Vpp / qualité`, dans l'ordre
`TP1, TP2, TP3, TP4, TP5`. Ces valeurs sont des données de
démonstration, pas des spécifications de fabrication.

  -------------------------------------------------------------------------------------------------------------------
  Scénario        TP1                TP2                TP3               TP4                   TP5
  --------------- ------------------ ------------------ ----------------- --------------------- ---------------------
  Sain (tests     `9.0/0.0/silent`   `4.5/0.0/silent`   `4.5/0.2/clean`   `4.5/2.0/clean`       `0.0/2.0/clean`
  uniquement)                                                                                   

  F1 ---          `5.2/0.0/silent`   `2.6/0.0/silent`   `2.6/0.2/clean`   `2.6/0.5/distorted`   `0.0/0.4/distorted`
  alimentation                                                                                  
  affaiblie                                                                                     

  F2 --- réseau   `9.0/0.0/silent`   `0.1/0.0/silent`   `0.1/0.2/clean`   `0.1/0.1/silent`      `0.0/0.1/silent`
  de polarisation                                                                               
  ouvert                                                                                        

  F3 --- étage    `9.0/0.0/silent`   `4.5/0.0/silent`   `4.5/0.2/clean`   `4.5/0.2/distorted`   `0.0/0.2/distorted`
  amplificateur                                                                                 
  défaillant                                                                                    

  F4 ---          `9.0/0.0/silent`   `4.5/0.0/silent`   `4.5/0.2/clean`   `4.5/2.0/clean`       `0.0/0.3/weak`
  condensateur de                                                                               
  sortie dégradé                                                                                
  -------------------------------------------------------------------------------------------------------------------

## 5. Composants inspectables

L'inspection retourne uniquement des métadonnées statiques ; elle ne
révèle jamais l'état de panne réel.

  ID      Nom                          Rôle
  ------- ---------------------------- --------------------------------------
  `C1`    Condensateur d'entrée        Couple le signal d'entrée
  `R1`    Réseau de polarisation       Établit la référence de polarisation
  `U1`    Amplificateur opérationnel   Amplifie le signal
  `C2`    Condensateur de sortie       Couple le signal vers la sortie
  `PS1`   Alimentation                 Fournit le rail d'alimentation

## 6. Trois outils autorisés : signatures exactes

Aucun outil supplémentaire ne doit être ajouté sans autorisation.

### `inspect_component`

``` python
inspect_component(component_id: str) -> ComponentInfo
```

`component_id` doit être `C1`, `R1`, `U1`, `C2` ou `PS1`. Retour :

``` python
{
    "component_id": str,
    "name": str,
    "role": str,
    "visual_notes": str
}
```

`visual_notes` contient uniquement des informations statiques. Ne pas
retourner `is_faulty`, la panne active ou un indice qui la révèle.

### `measure_voltage`

``` python
measure_voltage(point_id: str) -> VoltageReading
```

`point_id` doit être `TP1`, `TP2`, `TP3`, `TP4` ou `TP5`. Retour :

``` python
{
    "point_id": str,
    "voltage_v": float,
    "unit": "V"
}
```

`voltage_v` est lu directement dans la table du scénario actif.

### `test_signal`

``` python
test_signal(point_id: str) -> SignalReading
```

`point_id` doit être `TP1`, `TP2`, `TP3`, `TP4` ou `TP5`. Retour :

``` python
{
    "point_id": str,
    "amplitude_vpp": float,
    "quality": "clean" | "distorted" | "silent" | "weak"
}
```

Amplitude et qualité sont lues directement dans la table du scénario
actif.

### Erreurs

Un identifiant inconnu retourne une erreur structurée, sans correction
silencieuse ni valeur par défaut. Utiliser `UNKNOWN_COMPONENT_ID` pour
un composant invalide et `UNKNOWN_POINT_ID` pour un point invalide.

``` python
{
    "error": "UNKNOWN_POINT_ID",
    "message": "Unknown point_id: TP99"
}
```

Les erreurs ne sont pas des mesures.

## 7. Boucle attendue de l'agent

1.  Symptôme rapporté, pour tous les scénarios en panne : « La sortie audio ne sonne pas normalement. »
2.  Présenter les causes possibles comme des hypothèses.
3.  Choisir une inspection ou une mesure discriminante.
4.  Appeler un outil et rapporter fidèlement son résultat.
5.  Réviser les hypothèses à partir des observations.
6.  Recommencer si une autre mesure est utile.
7.  Donner le diagnostic le mieux étayé, les résultats qui le
    soutiennent et un test de confirmation recommandé.
8.  La boucle s’arrête quand l’agent nomme un composant, ou après 8 appels d’outils. L’arrêt forcé est journalisé comme un échec de diagnostic.

L'agent ne prétend jamais avoir effectué un test sans appel d'outil et
ne présente pas une hypothèse comme une certitude non étayée.

## 8. Journal de diagnostic vérifiable
Le journal est un livrable obligatoire du MVP, pas une fonctionnalité facultative. Il doit permettre à une personne de vérifier comment l'agent est arrivé à son diagnostic. Chaque tour de diagnostic qui appelle un outil ajoute une entrée au journal contenant au minimum :
- turn : numéro du tour, dans l'ordre chronologique ;
- tool : nom exact de l'outil appelé ;
- argument : argument exact transmis à l'outil ;
- value_received : valeur exacte retournée par l'outil, ou l'erreur structurée reçue ;
- remaining_hypotheses : hypothèses encore plausibles après prise en compte de ce résultat.
Les valeurs journalisées doivent correspondre aux appels et retours réels, sans réécriture ni mesure ajoutée par le modèle. Les hypothèses restantes sont l'interprétation de l'agent et doivent rester distinctes des mesures factuelles. Le journal doit être consultable pendant la démonstration et permettre de retracer chaque étape du diagnostic. Ne pas journaliser l'identifiant secret du scénario actif ni une donnée qui le révèle directement.

## 9. Critères d'acceptation
- Les quatre pannes et le scénario sain sont encodés comme tables déterministes.
- Les cinq points et les trois outils respectent ce contrat.
- Les identifiants invalides renvoient des erreurs explicites.
- L'agent ne reçoit pas l'identité du scénario actif.
- Toute fonction du simulateur a un test exécutable.
- Chaque tour journalise l'outil appelé, son argument, la valeur exacte reçue et les hypothèses restantes après cette valeur.
- Le journal est consultable pendant la démo et permet de vérifier la chaîne de diagnostic sans révéler le scénario secret.
- La démo montre au moins deux mesures, une révision d'hypothèse et un diagnostic fondé sur les résultats des outils.