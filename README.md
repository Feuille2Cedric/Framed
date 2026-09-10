<div align="center">

# 🎬 FRAMED LOCAL

### Six images ou une affiche floutée. Un seul film à retrouver.

**Une adaptation locale du jeu de cinéma, avec 7 761 films issus du monde entier et de toutes les époques.**

link : https://feuille2cedric.github.io/Framed/

`100 % STATIQUE` · `SANS COMPTE` · `SANS TRAQUEUR` · `COMPATIBLE GITHUB PAGES`

</div>

---

## Les deux jeux

Choisis ton défi depuis les deux boutons placés au-dessus du jeu :

| Jeu | Principe | Essais |
|---|---|---:|
| **6 images** | Une nouvelle scène apparaît après chaque erreur, de la plus difficile à la plus reconnaissable. | 6 |
| **Affiche floutée** | La même affiche devient progressivement plus nette après chaque erreur. | 4 |

Après la victoire ou la défaite, le titre et le nom du réalisateur sont révélés. Les images débloquées restent consultables et l’affiche apparaît entièrement nette.

---

## Règles du jeu

1. Choisis **6 images** ou **Affiche floutée**.
2. Observe la première scène ou l’affiche très floutée.
3. Commence à saisir le titre d’un film dans le champ de recherche.
4. Choisis le film dans les suggestions avec la souris ou les flèches du clavier.
5. Valide ta proposition — ou valide un champ vide pour passer.
6. Une mauvaise réponse révèle la scène suivante ou réduit le flou de l’affiche.
7. Retrouve le film avant la fin des six ou quatre essais selon le jeu choisi.

### Saisie des réponses

- Le titre et l’année apparaissent dans les suggestions pour distinguer les remakes et les homonymes.
- Si un seul film porte ce titre, écrire le titre sans l’année suffit.
- Lorsqu’un titre correspond à plusieurs films, sélectionne la bonne année dans la liste.
- Utilise `↑` et `↓` pour parcourir les suggestions, puis `Entrée` pour choisir.

### Après la partie

- Les boutons `1` à `6`, ou `1` à `4` pour l’affiche, permettent de revoir tous les niveaux débloqués.
- La réponse prend la forme **Titre — Réalisateur**.
- Le bouton **Autre film** lance le film suivant de la sélection active.
- Le résultat peut être copié pour être partagé sans révéler la réponse.

---

## Les modes

| Mode | Fonctionnement |
|---|---|
| **Film du jour** | Le même film est proposé pendant toute la journée. |
| **Film aléatoire** | Un film est choisi parmi l’ensemble du catalogue. |
| **Carnet** | Choisis directement un numéro ou construis une sélection avec les filtres. |

---

## Le carnet des films

Le carnet permet de parcourir les **7 761 films sans afficher leur titre avant la partie**.

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

Le type de jeu choisi est conservé dans l’URL avec `?jeu=affiche`, ce qui permet de partager directement le défi d’affiche.

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
├── movies.js                    # Catalogue généré de 7 761 films
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

Le catalogue local contient les titres, années, réalisateurs et informations nécessaires au jeu. Les photogrammes sont chargés depuis leurs sources publiques et les affiches depuis [MetaHub](https://www.metahub.space/), à la demande : une connexion internet reste nécessaire.

Les affiches, photogrammes, titres et marques cités restent la propriété de leurs ayants droit respectifs. Ce projet est personnel, non commercial et réalisé à des fins ludiques autour du cinéma.

---

<div align="center">

**Bon jeu — et attention aux remakes.**

</div>
