# FlashSight Reader App

Une application de bureau basée sur Chromium/Electron pour appliquer la méthode de **Bionic Reading** aux sites web et fichiers PDF.

## 🌟 Fonctionnalités

- **Navigation Web** avec transformation FlashSight Reading en temps réel
- **Lecture de PDF** avec application de la méthode FlashSight Reading
- **Contrôles personnalisables** pour ajuster l'intensité de la transformation
- **Interface intuitive** avec barre d'outils complète
- **Raccourcis clavier** pour une utilisation rapide

## 🚀 Installation et lancement

### Prérequis
- Node.js (version 16 ou supérieure)
- npm

### Installation des dépendances
```bash
npm install
```

### Lancer l'application
```bash
npm start
```

### Mode développement
```bash
npm run dev
```

## 📖 Utilisation

### Navigation Web
1. Entrez une URL dans la barre d'adresse ou utilisez le bouton "Ouvrir URL"
2. L'application appliquera automatiquement le FlashSight Reading au contenu
3. Utilisez les boutons de navigation (précédent, suivant, actualiser)

### Lecture de PDF
1. Cliquez sur "Ouvrir PDF" ou utilisez le menu Fichier > Ouvrir PDF
2. Sélectionnez votre fichier PDF
3. Le contenu sera affiché avec la transformation FlashSight Reading

### Contrôles FlashSight Reading

#### Boutons de contrôle
- **Checkbox FlashSight Reading** : Active/désactive la transformation
- **Curseur d'intensité** : Ajuste la proportion de caractères mis en gras (10% à 80%)

#### Raccourcis clavier
- `Ctrl+B` (ou `Cmd+B` sur Mac) : Activer/désactiver le FlashSight Reading
- `Ctrl++` : Augmenter l'intensité
- `Ctrl+-` : Diminuer l'intensité
- `Ctrl+O` : Ouvrir un fichier PDF
- `Ctrl+U` : Ouvrir une URL
- `Ctrl+R` : Actualiser le contenu
- `F11` : Mode plein écran
- `F12` : Outils de développement

## 🔧 Comment fonctionne le FlashSight Reading

Le FlashSight Reading est une méthode qui met en évidence la première partie des mots pour faciliter la lecture. L'algorithme :

1. **Analyse chaque mot** du texte
2. **Calcule la longueur optimale** de la partie à mettre en gras selon :
   - La longueur du mot
   - L'intensité sélectionnée
   - Des règles spécifiques pour optimiser la lisibilité
3. **Applique la transformation** en HTML avec les classes CSS appropriées

### Exemple de transformation
- Texte original : "Le renard brun saute par-dessus le chien paresseux"
- Avec FlashSight Reading : "**Le** re**na**rd **br**un **sa**ute **par**-des**sus** **le** ch**ien** par**es**seux"

## 🎨 Personnalisation

### Intensité de lecture
- **10-30%** : Idéal pour les textes complexes ou techniques
- **40-60%** : Recommandé pour la lecture générale
- **70-80%** : Pour une lecture très rapide

### Styles CSS
Les styles du FlashSight Reading peuvent être personnalisés dans `src/styles.css` :
- `.flashsight-bold` : Style pour les parties en gras
- `.flashsight-normal` : Style pour les parties normales
- `.flashsight-word` : Conteneur pour chaque mot transformé

## 🏗️ Architecture du projet

```
BReaderApp/
├── main.js                 # Processus principal Electron
├── src/
│   ├── index.html          # Interface utilisateur principale
│   ├── styles.css          # Styles CSS
│   ├── app.js              # Logique de l'application
│   └── flash-sight-engine.js    # Moteur de transformation FlashSight Reading
├── assets/                 # Ressources (icônes, images)
└── package.json           # Configuration du projet
```

## 🔧 Développement

### Ajouter de nouvelles fonctionnalités

1. **Nouveau mode de lecture** : Étendre la classe `FlashSightReaderApp` dans `app.js`
2. **Algorithme personnalisé** : Modifier `FlashSightEngine` dans `flash-sight-engine.js`
3. **Interface utilisateur** : Ajouter des éléments dans `index.html` et `styles.css`

### Débogage
- Utilisez `F12` pour ouvrir les outils de développement
- Les logs sont disponibles dans la console
- Le mode développement (`npm run dev`) active des fonctionnalités de débogage supplémentaires

## 📦 Construction d'exécutables

### Installer electron-builder
```bash
npm install electron-builder --save-dev
```

### Créer un exécutable
```bash
# Pour Windows
npm run build -- --win

# Pour macOS
npm run build -- --mac

# Pour Linux
npm run build -- --linux
```

## 🐛 Problèmes connus

1. **WebView et CORS** : Certains sites peuvent bloquer l'injection de scripts
2. **PDF complexes** : Les PDF avec mise en page complexe peuvent nécessiter des ajustements
3. **Performance** : Les pages très larges peuvent prendre du temps à transformer

## 🤝 Contribution

Les contributions sont les bienvenues ! Veuillez :

1. Fork le projet
2. Créer une branche pour votre fonctionnalité
3. Commiter vos changements
4. Pousser vers la branche
5. Ouvrir une Pull Request

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 🙏 Remerciements

- [Bionic Reading](https://bionic-reading.com/) pour l'inspiration de la méthode
- [Electron](https://electronjs.org/) pour le framework
- La communauté open source pour les bibliothèques utilisées

## 📞 Support

Si vous rencontrez des problèmes ou avez des questions :
- Ouvrez une issue sur GitHub
- Consultez la documentation
- Vérifiez les problèmes connus ci-dessus
