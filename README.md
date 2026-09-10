<div align="center">

# 🎬 FRAMED LOCAL

### Six scènes ou une affiche floutée. Un seul film à retrouver.

**Une adaptation locale du jeu de cinéma, avec 7 466 films issus du monde entier et de toutes les époques.**

`100 % STATIQUE` · `SANS COMPTE` · `SANS TRAQUEUR` · `COMPATIBLE GITHUB PAGES`

</div>

---

## Le principe

Choisis entre deux jeux : retrouver un film à partir de six scènes, ou reconnaître son affiche en quatre essais maximum parmi une sélection de 500 films incontournables.

Dans le jeu **Frames**, chaque mauvaise proposition révèle une nouvelle scène, de la plus difficile à la plus reconnaissable. Dans le jeu **Affiche**, l’affiche officielle du film devient progressivement plus nette. Aucune scène du film n’est utilisée dans ce mode.

Après la victoire ou la défaite, le titre et le nom du réalisateur sont révélés. Les scènes débloquées restent consultables et l’affiche apparaît entièrement nette.

---

## Règles du jeu

1. Choisis **Frames** ou **Affiche** en haut de la page.
2. Commence à saisir le titre d’un film dans le champ de recherche.
3. Choisis le film dans les suggestions avec la souris ou les flèches du clavier.
4. Valide ta proposition — ou valide un champ vide pour passer.
5. Une mauvaise réponse débloque la scène suivante ou réduit le flou.
6. Retrouve le film en six essais dans Frames ou quatre essais dans Affiche.

### Saisie des réponses

- Le titre et l’année apparaissent dans les suggestions pour distinguer les remakes et les homonymes.
- Si un seul film porte ce titre, écrire le titre sans l’année suffit.
- Lorsqu’un titre correspond à plusieurs films, sélectionne la bonne année dans la liste.
- Utilise `↑` et `↓` pour parcourir les suggestions, puis `Entrée` pour choisir.

### Après la partie

- Les boutons numérotés permettent de revoir les scènes ou niveaux déjà débloqués.
- La réponse prend la forme **Titre — Réalisateur**.
- Le bouton **Autre film** lance le film suivant de la sélection active.
- Le résultat peut être copié pour être partagé sans révéler la réponse.

---

## Les modes

| Mode | Fonctionnement |
|---|---|
| **Frames** | Six scènes successives, de la plus difficile à la plus évidente. |
| **Affiche** | Une affiche qui se défloute progressivement sur quatre essais, parmi les 500 films du catalogue comptant le plus de votes IMDb. |
| **Film du jour** | Le même film est proposé pendant toute la journée. |
| **Film aléatoire** | Un film est choisi parmi l’ensemble du catalogue. |
| **Carnet** | Choisis directement un numéro ou construis une sélection avec les filtres. |

---

## Le carnet des films

Le carnet permet de parcourir les **7 466 films sans afficher leur titre avant la partie**.

Tu peux filtrer le catalogue par :

- genre ;
- pays ;
- époque ;
- mouvement cinématographique.

Après avoir lancé un film depuis une sélection filtrée, les flèches **précédent/suivant** et le bouton **Autre film** restent dans cette sélection. Les boutons aléatoires reviennent volontairement au catalogue complet.

Le catalogue couvre notamment la Nouvelle Vague française, le néoréalisme italien, l’expressionnisme allemand, le Nouvel Hollywood, les nouvelles vagues asiatiques et de nombreux cinémas contemporains.

---

## Lancer le jeu en local

Aucune installation n’est nécessaire : ouvre simplement [`index.html`](./index.html) dans un navigateur récent.

Pour utiliser un petit serveur local :

```bash
python -m http.server 8000
```

Puis ouvre <http://localhost:8000>.

Les statistiques sont conservées uniquement dans le stockage local du navigateur utilisé.

---

## Déployer avec GitHub Pages

Le workflow fourni publie automatiquement le site après chaque push sur la branche `main`.

### 1. Créer le dépôt GitHub

Crée un dépôt vide — par exemple `framed-local` — sans ajouter de README, de licence ou de `.gitignore` depuis GitHub.

### 2. Relier ce dossier au dépôt

Depuis ce dossier, remplace `VOTRE-NOM` par ton identifiant GitHub :

```bash
git remote add origin https://github.com/VOTRE-NOM/framed-local.git
git push -u origin main
```

### 3. Activer GitHub Pages

Dans le dépôt GitHub :

1. ouvre **Settings** ;
2. choisis **Pages** ;
3. dans **Build and deployment**, sélectionne **GitHub Actions** comme source ;
4. ouvre l’onglet **Actions** et attends la fin du workflow **Deploy Framed Local to Pages**.

Le site sera ensuite disponible à cette adresse :

```text
https://VOTRE-NOM.github.io/framed-local/
```

Chaque nouveau `git push` republiera automatiquement la dernière version.

---

## Structure du projet

```text
.
├── .github/workflows/pages.yml  # Déploiement automatique
├── index.html                   # Interface du jeu
├── styles.css                   # Direction artistique et responsive
├── app.js                       # Logique, navigation et statistiques
├── movies.js                    # Catalogue généré de 7 466 films
└── README.md                    # Documentation
```

---

## Vie privée

- Aucun compte n’est demandé.
- Aucun outil publicitaire ou analytique n’est intégré.
- Les statistiques restent dans le navigateur.
- Les exports Letterboxd, CSV et fichiers de génération sont exclus de Git par le `.gitignore`.
- Aucune note personnelle ni URL Letterboxd n’est stockée dans le catalogue publié.

---

## Données et images

Le catalogue local contient les titres, années, réalisateurs et informations nécessaires au jeu. Les images sont chargées à la demande depuis leurs sources distantes et nécessitent donc une connexion internet.

Les affiches, photogrammes, titres et marques cités restent la propriété de leurs ayants droit respectifs. Ce projet est personnel, non commercial et réalisé à des fins ludiques autour du cinéma.

---

<div align="center">

**Bon jeu — et attention aux remakes.**

</div>
