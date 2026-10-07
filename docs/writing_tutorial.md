# Didacticiel « Écrire le futur »

Documentation du parcours guidé accessible via `/ecrire-le-futur` (`writing_tutorial_path`).

## Accès et navigation

| Élément | Détail |
| --- | --- |
| Route | `/ecrire-le-futur` |
| Authentification | Non requise |
| Contrôleur Stimulus | `writing_tutorial_controller.js` |
| Fond animé | `auth_background_controller.js` |
| Barre de progression | 8 jalons, visible à partir de l'étape Pseudo |
| Bouton « Passer » | Bas droite → `/posts/new` (connecté) ou connexion (invité) ; sauvegarde les données collectées |
| Navigation | Suivant / Précédent ; touche Entrée sur l'étape courante |

## Parcours

```
Intro → Pseudo → Âge → Consignes → Générateur → Thème → Tendance → Style → Prêt (+ synthèse)
                                                                              ↓
                                                                Création de post (trame préremplie)
```

---

## Étape 0 — Intro (`step-intro`)

*Hors barre de progression.*

- **Titre :** Écrire le futur
- **Sous-titre :** Avant de commencer ton récit, voici quelques repères pour imaginer le monde de demain.
- **Action :** Commencer

---

## Étape 1 — Pseudo (`step-username`)

**Jalon :** Pseudo

### Utilisateur connecté

- *En 2050, tu seras appelé·e **[pseudo]***
- Note : pseudo enregistré sur le profil

### Invité

- *En 2050, par quel nom aimerais-tu être appelé·e ?*
- Champ texte + vérification de disponibilité (`/users/check_username`)
- **Validation :** pseudo non vide et unique

**Donnée :** `username`

---

## Étape 2 — Âge (`step-age`)

**Jalon :** Age

### Utilisateur connecté

- *En 2050, tu auras **[age] ans***

### Invité

- *Quel age auras-tu en 2050 ?*
- Champ numérique
- **Validation :** entier ≥ 0

**Donnée :** `age`

---

## Étape 3 — Consignes (`step-positive`)

**Jalon :** Consignes

- **Titre :** Des futurs désirables
- **Texte 1 :** Chaque histoire doit contribuer a imaginer un monde meilleur pour tous.tes. En publiant sur ce site tu t'engages a respecter cette ligne directrice.
- **Texte 2 :** En 2050, nous imaginons un monde fait de diversité et de respect. Aucun contenu faisant la promotion de discrimination ne sera toléré.

Lecture seule, pas de saisie.

---

## Étape 4 — Générateur (`step-freedom`)

**Jalon :** Générateur

- **Titre :** Générateur d'étincelles
- **Intro :** Besoin d'une étincelle ? / Associe un nom et un adjectif.
- **Affichage :** paire nom + adjectif (dictionnaire interne, animation de lettres)
- **Actions :** ↻ Nom · ↻ Adjectif · ↻ Tout

**Données :** `noun`, `adjective`, `phrase`

---

## Étape 5 — Thème (`step-theme`)

**Jalon :** Thème

- **Titre :** Quel thème t'inspire ?
- **Sous-titre :** Choisis une piste pour orienter ton futur.
- **Choix (1 obligatoire pour les invités) :**
  - Économie
  - Environnement
  - Géopolitique
  - Sociétal
  - Technologie

**Donnée :** `theme`

---

## Étape 6 — Tendance (`step-trend`)

**Jalon :** Tendance

- **Titre :** Inverse la tendance
- **Sous-titre :** Choisis une dynamique du présent que ton futur contredirait radicalement.
- **Sélecteur :** rouleau aléatoire limité au thème choisi à l'étape précédente
- **Champ conditionnel :** *Et si, en 2050, on inversait complètement cette tendance ?* + textarea
- **Validation (tous) :** tendance + approche opposée obligatoires

### Tendances disponibles

Définies par thème dans `WritingTutorialTrends::BY_THEME` (`lib/writing_tutorial_trends.rb`) : Économie, Environnement, Géopolitique, Sociétal, Technologie. Le rouleau ne propose que le vivier du thème sélectionné, dans un ordre aléatoire.

**Données :** `trend`, `trendOpposite`

---

## Étape 7 — Style (`step-style`)

**Jalon :** Style

- **Titre :** Trouve ton style
- **Sous-titre :** Tes ingrédients récoltés sont prêts. Choisis maintenant ton style pour générer ta trame de récit personnalisée.
- **Choix :** 6 cartes scrollables (1 obligatoire)
- **Validation (tous) :** style obligatoire

**Données :** `narrativeStyle`, `narrativeStyleLabel`, `bodyTemplate` (trame interpolée)

### Placeholders dynamiques

Les trames utilisent des variables remplacées au moment du choix du style :

| Placeholder | Source | Donnée |
| --- | --- | --- |
| `%{etincelle}` | Étape 4 | `phrase` ou `noun` + `adjectif` (majuscule initiale par mot) |
| `%{theme}` | Étape 5 | `theme` |
| `%{tendance}` | Étape 6 | `trend` |
| `%{inversion}` | Étape 6 | `trendOpposite` |

Interpolation : `app/javascript/utils/narrative_template.js`

### Styles et trames (modèles)

Source : `lib/writing_tutorial_narrative_styles.rb`

#### 1. JOURNAL DE 2050 — Journaliste

*Donnez des nouvelles fraîches de demain*

```
Journal de 2050 - Édition Spéciale

Titre de votre article : [Par exemple : Le jour où tout a basculé]

En ce mois de juin 2050, notre territoire respire enfin. Depuis que l'on s'est attaqué au problème de la %{tendance} grâce à notre décision de %{inversion}, nos modes de vie ont changé. Retour sur une transition réussie guidée par la thématique "%{theme}" et notre fameuse étincelle : %{etincelle}.

Corps de l'article : [Rédigez la suite de votre chronique ici. Comment les gens vivent-ils au quotidien ? Qu'est-ce qui se passe dans la rue ce matin ? ]
```

#### 2. LETTRE DU FUTUR — Intime

*Écrivez à un proche en 2050*

```
Destinataire : [par exemple : Mon moi de 2026 / Mes enfants / Un ami...]

Je t'écris d'une époque où la découverte de %{etincelle} a tout changé. On a enfin trouvé une alternative à la %{tendance} et, tu ne me croiras pas, mais on a retrouvé le goût du temps long.

Même quand les crises liées à notre %{theme} sont arrivées, on a tenu bon collectivement parce que nous avons appliqué notre plan : %{inversion}.

[Racontez vos impressions personnelles, vos émotions, ce que vous mangez, les bruits de votre quartier en 2050... ]
```

#### 3. LE SOUVENIR — Rétrospective

*Racontez comment on a surmonté la crise !*

```
Nous y sommes. En 2050, le pari est gagné. Notre société a prouvé sa robustesse. Pourtant, le chemin n'était pas tracé d'avance.

Quand le défi lié à la gestion de la %{tendance} a frappé, beaucoup ont cru à la fin. Mais notre secret a été d'activer immédiatement notre projet d'avenir (%{inversion}) pour recréer du lien social et de l'espoir à travers une dynamique forte autour de notre %{theme}. Tout a démarré à l'époque par une simple idée : %{etincelle}.

Le grand point de bascule historique s'est produit lorsque...

[Racontez comment les citoyens, les associations ou les communes se sont organisés concrètement pour faire basculer le système...  ]
```

#### 4. LE MANIFESTE CITOYEN — Engagé

*Ecrivez un manifeste politique*

```
Préambule :

Nous, citoyennes et citoyens réunis en 2050, déclarons que l'ère de la performance aveugle est révolue. Face aux enjeux du domaine %{theme}, nous avons fait le choix de la robustesse. Nous proclamons la primauté de notre concept, %{etincelle}, comme bien commun.

Nos grandes résolutions :

Article 1 : Pour respecter le vivant, nous avons brisé la dynamique de la %{tendance}. Désormais, nous nous engageons à appliquer notre résolution : %{inversion}.

Article 2 : Face aux crises de notre siècle, notre force réside dans... [Écrivez le premier grand principe de votre société...]
```

#### 5. L'INTERVIEW CROISÉE — Dialogue

*Faites parler deux passants qui racontent leur quotidien*

```
Personnage A :

Tu te rends compte ? Quand j'avais ton âge, les rues et nos vies étaient bloquées par la %{tendance}. C'était notre quotidien.

Personnage B :

Ça devait être étouffant ! Heureusement que les bouleversements de notre %{theme} nous ont forcés à bifurquer. Mais dis-moi, comment vous avez fait concrètement pour mettre en place %{inversion} ?

Personnage A : Ah, c'est une sacrée histoire ! Au début, on a eu peur, mais on s'est serré les coudes autour d'une idée folle : %{etincelle}...
```

#### 6. CARNET DE VOYAGE — Immersif

*Décrivez le futur à travers un récit de voyage*

```
Ce que je vois dans la rue :

Des infrastructures nées de notre décision de %{inversion} (merci d'avoir mis fin à la %{tendance} !).
[Ajoutez des éléments visuels marquants de votre quotidien...  ]

Ce que j'entends depuis ma fenêtre :

Les discussions des gens qui s'organisent au quotidien autour du thème %{theme}.
[Ajoutez un bruit typique de ce futur (artisans, rires, nature)... ]

Ce que j'ai dans les poches :

Un objet symbolisant notre %{etincelle} pour le marché de ce soir.
[Ajoutez un objet du futur ou un outil indispensable...]
```

---

## Étape 8 — Prêt (`step-ready`)

**Jalon :** Prêt

- **Titre :** C'est parti !
- **Sous-titre :**
  - Connecté : *Tu es prêt·e à écrire ton futur.*
  - Invité : *Connecte-toi pour commencer à écrire ton futur — tes choix seront conservés.*
- **Synthèse :** panneau « Ton brouillon »
- **CTA :** Écrire mon futur / Se connecter

---

## Synthèse (« Ton brouillon »)

Affichée à la fin du didacticiel et en haut du formulaire de création de post (`/posts/new`).

| Label | Contenu |
| --- | --- |
| Pseudo | Saisi ou profil |
| Âge en 2050 | Saisi ou profil (+ « ans ») |
| Étincelle | Nom + adjectif (majuscule initiale sur chaque mot) |
| Thème | Thème choisi |
| Tendance inversée | `Tendance choisie / solution proposée` |
| Style | Ex. `JOURNAL DE 2050 — Journaliste` |

---

## Persistance (`sessionStorage`)

Clé : `sp2050_registration_prefill`

```
username, age, theme, noun, adjective, phrase,
trend, trendOpposite, narrativeStyle, narrativeStyleLabel, bodyTemplate
```

### Trames dynamiques

- Les modèles dans `lib/writing_tutorial_narrative_styles.rb` contiennent les placeholders `%{etincelle}`, `%{theme}`, `%{tendance}`, `%{inversion}`.
- À la sélection d'un style (ou avant sauvegarde finale), `bodyTemplate` est **généré** par interpolation via `narrative_template.js`.
- La trame est recalculée si l'utilisateur modifie une étape antérieure (thème, tendance, inversion) après avoir choisi un style.
- Sur `/posts/new`, le champ texte est prérempli avec la trame interpolée à partir des données stockées.

### Réutilisation

| Contexte | Comportement |
| --- | --- |
| Inscription | Préremplit pseudo et âge (`signup_controller.js`) |
| Création de post | Préremplit `#post_body` avec la trame interpolée si vide (`writing_tutorial_prefill_controller.js`) |
| Passer le didacticiel | Sauvegarde tout ce qui a été collecté |

---

## Mise en forme de la trame dans l'éditeur

Dans `/futurs/new`, le corps du texte reste un `textarea` classique (sélection,
copier-coller, suppression au clavier), mais un **calque miroir**
(`.editor-draft-layer`) est rendu derrière lui et habille le texte :

| Élément | Rendu | Classe |
| --- | --- | --- |
| Réponses du didacticiel (pseudo, âge, lieu, étincelle, thème, tendance, inversion) | Étiquette à fond arrondi | `.draft-chip` |
| Conseils d'écriture entre crochets | Note ambrée en retrait | `.draft-note` |

Le texte du `textarea` est rendu transparent pendant que le calque est actif ;
son surlignage de sélection est translucide pour rester lisible. Le contrôleur
`draft_markup_controller.js` recopie les métriques du `textarea` sur le calque
(police, interlignage, marges intérieures, place de l'ascenseur) : **toute règle
CSS qui modifie la métrique du texte dans le calque — graisse, italique, taille,
interlettrage — désaligne les deux couches.**

### Conseils d'écriture

- Un conseil est un bloc entre crochets contenant au moins une espace (motif
  `NOTE_SOURCE` dans `utils/draft_markup.js`). Les renvois courts (`[1]`,
  `[sic]`) restent du texte normal.
- Le balisage est purement visuel : les conseils font partie du corps du texte
  et sont enregistrés tels quels. C'est à l'auteur de les remplacer par son
  récit.

---

## Fichiers sources

| Rôle | Fichier |
| --- | --- |
| Vue principale | `app/views/pages/writing_tutorial.html.erb` |
| Logique navigation / validation | `app/javascript/controllers/writing_tutorial_controller.js` |
| Tendances | `app/controllers/pages_controller.rb` |
| Styles narratifs + trames | `lib/writing_tutorial_narrative_styles.rb` |
| Persistance + synthèse | `app/javascript/utils/registration_prefill.js` |
| Interpolation des trames | `app/javascript/utils/narrative_template.js` |
| Générateur d'idées | `app/views/shared/_idea_generator.html.erb` |
| Affichage synthèse | `app/views/shared/_writing_tutorial_synthesis.html.erb` |
| Préremplissage post | `app/javascript/controllers/writing_tutorial_prefill_controller.js` |
| Balisage étiquettes + notes | `app/javascript/utils/draft_markup.js` |
| Calque miroir de l'éditeur | `app/javascript/controllers/draft_markup_controller.js` |
| Styles visuels | `app/assets/stylesheets/pages/_auth.scss`, `app/assets/stylesheets/components/_editor_draft_markup.scss` |
