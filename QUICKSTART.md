# Guide de Démarrage Rapide - FlashSight Reader App

## 🚀 Lancement de l'application

### Option 1 : Via npm (recommandé)
```bash
npm start
```

### Option 2 : Via les fichiers de lancement
- **Windows** : Double-cliquez sur `launch.bat`
- **PowerShell** : Exécutez `launch.ps1`

### Option 3 : Via VS Code
1. Ouvrez le terminal intégré (`Ctrl+``)
2. Tapez `npm start`

## ✅ Vérification de l'installation

1. **Vérifiez Node.js** :
   ```bash
   node --version
   npm --version
   ```

2. **Installez les dépendances** (si nécessaire) :
   ```bash
   npm install
   ```

3. **Lancez l'application** :
   ```bash
   npm start
   ```

## 🎯 Première utilisation

1. **L'application s'ouvre** avec une page d'accueil
2. **Utilisez la barre de recherche** directement sur la page d'accueil :
   - Tapez une URL ou recherchez quelque chose
   - Appuyez sur Entrée ou cliquez sur 🔍
3. **Créez des nouveaux onglets** en cliquant sur le bouton "+" - ils utilisent la même page d'accueil
4. **Testez Flash Sight** :
   - Naviguez vers un site web comme `wikipedia.org`
   - Le texte sera automatiquement transformé avec Flash Sight

5. **Ajustez les paramètres** :
   - Utilisez le curseur d'intensité dans la sidebar
   - Activez/désactivez avec la checkbox
   - Ouvrez la sidebar avec le bouton burger (☰)

## 🔧 Dépannage

### L'application ne se lance pas
- Vérifiez que Node.js est installé (version 16+)
- Exécutez `npm install` dans le dossier du projet
- Vérifiez les permissions d'exécution

### Electron non trouvé
```bash
npm install electron --save-dev
```

### Erreurs de dépendances
```bash
npm audit fix
```

## 📁 Structure des fichiers
```
BReaderApp/
├── main.js              # Point d'entrée Electron
├── package.json          # Configuration du projet
├── launch.bat           # Lanceur Windows
├── launch.ps1           # Lanceur PowerShell
├── test.html            # Page de test
└── src/
    ├── index.html       # Interface principale
    ├── app.js           # Logique de l'application
    ├── flashsight-engine.js # Moteur FlashSight Reading
    └── styles.css       # Styles CSS
```

## 🎮 Raccourcis clavier essentiels
- `Ctrl+B` : Activer/désactiver FlashSight Reading
- `Ctrl+U` : Ouvrir une URL
- `Ctrl+O` : Ouvrir un PDF
- `F12` : Outils de développement
- `F11` : Plein écran

## 🌐 Sites de test recommandés

- Wikipedia (articles longs)
- Sites d'actualités  
- Blogs techniques
- Documentation en ligne

L'application transformera automatiquement le texte avec Flash Sight !

## ✨ Nouvelle fonctionnalité : Barre de recherche intégrée

- **Recherche directe** : Tapez directement sur la page d'accueil
- **URLs et recherches** : Détection automatique du type de contenu
- **Navigation simplifiée** : Plus besoin de dialogue séparé
- **Interface unifiée** : Tous les onglets utilisent la même page d'accueil

---

**Besoin d'aide ?** Consultez le README.md complet pour plus de détails.
