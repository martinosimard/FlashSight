// Version de debug ultra-simple pour tester le menu contextuel
class ContextMenuDebug {
    constructor() {
        console.log('ContextMenuDebug: Initialisation');
        this.createMenu();
        this.setupGlobalListeners();
    }

    createMenu() {
        // Créer un menu ultra-simple
        this.menu = document.createElement('div');
        this.menu.style.cssText = `
            position: fixed;
            top: -9999px;
            left: -9999px;
            background: red;
            color: white;
            border: 2px solid yellow;
            padding: 10px;
            z-index: 999999;
            font-size: 14px;
            font-weight: bold;
        `;
        this.menu.innerHTML = 'MENU DE DEBUG - CLIQUE ICI POUR FERMER';
        this.menu.addEventListener('click', () => this.hideMenu());
        document.body.appendChild(this.menu);
        console.log('ContextMenuDebug: Menu créé');
    }

    setupGlobalListeners() {
        // Test 1: Écouter TOUS les clics droits dans le document
        document.addEventListener('contextmenu', (e) => {
            console.log('ContextMenuDebug: Clic droit global détecté sur:', e.target.tagName, e.target.className);
            e.preventDefault();
            this.showMenu(e.clientX, e.clientY);
        }, true); // true = capture phase

        // Test 2: Surveiller l'apparition des WebViews avec un observer
        this.watchForWebViews();

        // Test 3: Vérification périodique
        this.periodicCheck();
    }

    watchForWebViews() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Chercher les webviews dans le nouveau noeud
                        if (node.tagName === 'WEBVIEW') {
                            console.log('ContextMenuDebug: WebView détectée par observer:', node);
                            this.setupWebViewListeners(node);
                        }
                        // Chercher dans les enfants
                        const webviews = node.querySelectorAll ? node.querySelectorAll('webview') : [];
                        webviews.forEach(webview => {
                            console.log('ContextMenuDebug: WebView enfant détectée:', webview);
                            this.setupWebViewListeners(webview);
                        });
                    }
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        console.log('ContextMenuDebug: Observer configuré pour surveiller les WebViews');
    }

    periodicCheck() {
        // Vérification toutes les 2 secondes
        setInterval(() => {
            const webviewContainers = document.querySelectorAll('.webview-container');
            const webviews = document.querySelectorAll('webview');
            console.log(`ContextMenuDebug: Check périodique - Conteneurs: ${webviewContainers.length}, WebViews: ${webviews.length}`);
            
            webviews.forEach((webview, index) => {
                if (!webview.hasContextMenuSetup) {
                    console.log(`ContextMenuDebug: Nouvelle WebView ${index} trouvée, configuration...`);
                    this.setupWebViewListeners(webview);
                    webview.hasContextMenuSetup = true;
                }
            });
        }, 2000);
    }

    setupWebViewListeners(webview) {
        console.log('ContextMenuDebug: Configuration WebView:', webview);
        
        // Tous les types d'événements possibles
        const events = ['contextmenu', 'mousedown', 'mouseup', 'click'];
        
        events.forEach(eventType => {
            webview.addEventListener(eventType, (e) => {
                if (eventType === 'contextmenu' || (eventType === 'mouseup' && e.button === 2)) {
                    console.log(`ContextMenuDebug: ${eventType} détecté sur WebView`);
                    e.preventDefault();
                    this.showMenu(e.clientX, e.clientY);
                }
                console.log(`ContextMenuDebug: ${eventType} sur WebView - bouton:`, e.button);
            }, true);
        });

        // Test spécial Electron
        if (webview.addEventListener) {
            try {
                webview.addEventListener('context-menu', (e) => {
                    console.log('ContextMenuDebug: context-menu Electron détecté:', e);
                    this.showMenu(e.params?.x || 100, e.params?.y || 100);
                });
            } catch (err) {
                console.log('ContextMenuDebug: Erreur context-menu Electron:', err);
            }
        }
    }

    showMenu(x, y) {
        console.log('ContextMenuDebug: Affichage menu aux coordonnées:', x, y);
        this.menu.style.left = x + 'px';
        this.menu.style.top = y + 'px';
        this.menu.style.display = 'block';
        
        // Auto-masquer après 3 secondes
        setTimeout(() => this.hideMenu(), 3000);
    }

    hideMenu() {
        console.log('ContextMenuDebug: Masquage menu');
        this.menu.style.top = '-9999px';
        this.menu.style.left = '-9999px';
    }
}

// Auto-init
document.addEventListener('DOMContentLoaded', () => {
    window.contextMenuDebug = new ContextMenuDebug();
});
