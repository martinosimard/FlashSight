<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Instructions Copilot pour FlashSight Reader App

## Contexte du projet
Cette application Electron implémente la méthode de **Bionic Reading** pour améliorer la vitesse et la compréhension de lecture. Elle permet d'afficher des sites web et des PDFs avec une transformation qui met en gras la première partie des mots.

## Architecture
- **main.js** : Processus principal Electron avec gestion des menus et fenêtres
- **src/flash-sight-engine.js** : Moteur principal de transformation FlashSight Reading
- **src/app.js** : Logique de l'interface utilisateur et coordination
- **src/index.html** : Interface utilisateur principale
- **src/styles.css** : Styles avec classes spéciales pour le FlashSight Reading

## Principes de développement

### FlashSight Reading Algorithm
- Utiliser la classe `FlashSightEngine` pour toutes les transformations
- Respecter les paramètres d'intensité (0.1 à 0.8)
- Préserver la ponctuation et la structure HTML
- Éviter de transformer les éléments `<script>`, `<style>`, `<code>`, etc.

### Gestion des modes
- **Mode Web** : Utiliser WebView avec injection de scripts
- **Mode PDF** : Transformation directe du DOM après extraction du texte
- **Mode Texte** : Transformation locale du contenu

### Styles CSS
- Classes principales : `.flashsight-word`, `.flashsight-bold`, `.flashsight-normal`
- Maintenir l'accessibilité et la lisibilité
- Utiliser des transitions fluides pour les changements d'état

### Performance
- Éviter de re-transformer le contenu déjà transformé
- Nettoyer les transformations précédentes avant d'en appliquer de nouvelles
- Utiliser `TreeWalker` pour parcourir efficacement le DOM

## Patterns de code préférés
- Classes ES6 pour l'organisation du code
- Event listeners avec arrow functions
- IPC pour la communication entre processus
- Gestion d'erreurs avec try/catch
- Documentation JSDoc pour les fonctions importantes

## Tests et débogage
- Utiliser la console du processus principal et du renderer
- Tester avec différents types de contenu (texte simple, HTML complexe, PDFs)
- Vérifier la performance sur de gros documents
- Tester les raccourcis clavier et la navigation

## Améliorations suggérées
Lors de l'ajout de nouvelles fonctionnalités, considérer :
- Support de nouveaux formats (EPUB, TXT)
- Préférences utilisateur persistantes
- Thèmes visuels personnalisables
- Analytics sur l'utilisation du FlashSight Reading
- Export de contenu transformé
