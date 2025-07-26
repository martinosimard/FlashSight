const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

class TabManager {
    constructor() {
        this.tabs = new Map();
        this.activeTabId = 0;
        this.nextTabId = 1;
        this.tabBar = document.getElementById('tab-bar');
        this.tabsContainer = document.getElementById('tabs-container');
        this.addTabButton = document.getElementById('addTabButton');
        
        this.setupEventListeners();
        this.initializeDefaultTab();
    }

    setupEventListeners() {
        this.addTabButton.addEventListener('click', () => {
            this.createNewTab();
        });

        // Délégation d'événements pour les onglets
        this.tabBar.addEventListener('click', (e) => {
            if (e.target.classList.contains('tab-close')) {
                e.stopPropagation();
                const tabId = parseInt(e.target.closest('.tab').dataset.tabId);
                this.closeTab(tabId);
            } else if (e.target.closest('.tab') && !e.target.closest('.tab-add')) {
                const tabId = parseInt(e.target.closest('.tab').dataset.tabId);
                this.switchToTab(tabId);
            }
        });
    }

    initializeDefaultTab() {
        // Créer l'onglet de bienvenue au démarrage
        this.createNewTab('welcome.html', 'Accueil');
    }

    createNewTab(url = '', title = 'Nouvel onglet') {
        const tabId = this.nextTabId++;
        
        // Déterminer le type de contenu
        const isPDF = url !== 'welcome.html' && url !== '' && (url.toLowerCase().includes('.pdf') || url.toLowerCase().includes('pdf'));
        const isWelcome = url === 'welcome.html';
        
        // Pour les nouveaux onglets vides, garder url vide pour l'interface mais utiliser about:blank pour la webview
        const displayUrl = url === '' && !isWelcome ? '' : url;
        const webviewUrl = url === '' && !isWelcome ? 'about:blank' : url;
        
        // Créer l'élément onglet
        const tabElement = document.createElement('div');
        tabElement.className = 'tab';
        tabElement.dataset.tabId = tabId;
        
        let icon = '🏠';
        if (!isWelcome) {
            icon = isPDF ? '📄' : '🌐';
        }
        
        tabElement.innerHTML = `
            <span class="tab-icon">${icon}</span>
            <span class="tab-title">${title}</span>
            <span class="tab-close" title="Fermer l'onglet">×</span>
        `;

        // Insérer avant le bouton +
        this.tabBar.insertBefore(tabElement, this.addTabButton);

        // Créer le contenu de l'onglet
        const tabContent = document.createElement('div');
        tabContent.id = `tab-content-${tabId}`;
        tabContent.className = 'tab-content';
        
        if (isWelcome) {
            // Contenu d'accueil
            tabContent.innerHTML = `
                <div class="welcome-content">
                    <iframe src="welcome.html" style="width: 100%; height: 100%; border: none;"></iframe>
                </div>
            `;
            
            // Appliquer Flash Sight une fois l'iframe chargé
            const iframe = tabContent.querySelector('iframe');
            iframe.addEventListener('load', () => {
                setTimeout(() => {
                    if (window.flashSightApp && window.flashSightApp.bionicToggle.checked) {
                        window.flashSightApp.applyFlashSightToWelcomePage();
                    }
                }, 100);
            });
        } else {
            // Contenu normal avec barre d'URL
            const urlBarHtml = `
                <div class="tab-url-bar">
                    <select class="tab-type-select">
                        <option value="web">Web</option>
                        <option value="pdf">PDF</option>
                    </select>
                    <input type="text" class="tab-url-input" placeholder="Entrer une URL..." value="${displayUrl}">
                    <button class="tab-go-button">→</button>
                </div>
            `;
            
            tabContent.innerHTML = urlBarHtml + `
                <div class="webview-container">
                    <webview id="webview-${tabId}" 
                             src="${webviewUrl}"
                             style="width: 100%; height: 100%;">
                    </webview>
                </div>
            `;
            
            // Configurer les listeners pour cette barre d'URL
            this.setupTabUrlListeners(tabContent, tabContent.querySelector('.tab-url-bar'), tabId);
        }

        this.tabsContainer.appendChild(tabContent);

        // Créer l'objet onglet
        const tab = {
            id: tabId,
            title: title,
            icon: icon,
            url: displayUrl, // Utiliser l'URL d'affichage, pas celle de la webview
            isPDF: isPDF,
            webview: isPDF ? null : tabContent.querySelector(`#webview-${tabId}`)
        };

        this.tabs.set(tabId, tab);
        this.switchToTab(tabId);

        return tab;
    }

    closeTab(tabId) {
        if (this.tabs.size <= 1) return; // Ne pas fermer le dernier onglet

        const tab = this.tabs.get(tabId);
        if (!tab) return;

        // Supprimer les éléments DOM
        const tabElement = document.querySelector(`[data-tab-id="${tabId}"]`);
        const tabContent = document.getElementById(`tab-content-${tabId}`);
        
        if (tabElement) tabElement.remove();
        if (tabContent) tabContent.remove();

        // Supprimer de la Map
        this.tabs.delete(tabId);

        // Si c'était l'onglet actif, activer un autre onglet
        if (this.activeTabId === tabId) {
            const remainingTabs = Array.from(this.tabs.keys());
            if (remainingTabs.length > 0) {
                this.switchToTab(remainingTabs[0]);
            }
        }
    }

    switchToTab(tabId) {
        const tab = this.tabs.get(tabId);
        if (!tab) return;

        // Désactiver tous les onglets
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));

        // Activer l'onglet sélectionné
        const tabElement = document.querySelector(`[data-tab-id="${tabId}"]`);
        const tabContent = document.getElementById(`tab-content-${tabId}`);

        if (tabElement) tabElement.classList.add('active');
        if (tabContent) tabContent.classList.add('active');

        this.activeTabId = tabId;
    }

    updateTabTitle(tabId, title) {
        const tab = this.tabs.get(tabId);
        if (!tab) return;

        tab.title = title;
        const tabElement = document.querySelector(`[data-tab-id="${tabId}"] .tab-title`);
        if (tabElement) {
            tabElement.textContent = title;
        }
    }

    getCurrentTab() {
        return this.tabs.get(this.activeTabId);
    }

    setupTabUrlListeners(tabContent, urlBar, tabId) {
        const typeSelect = urlBar.querySelector('.tab-type-select');
        const urlInput = urlBar.querySelector('.tab-url-input');
        const goButton = urlBar.querySelector('.tab-go-button');

        const handleNavigation = () => {
            const url = urlInput.value.trim();
            const type = typeSelect.value;
            
            if (!url) return;

            // Formatage de l'URL si nécessaire
            let finalUrl = url;
            if (type === 'web' && !url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('file://')) {
                finalUrl = 'https://' + url;
            }

            this.navigateTab(tabId, finalUrl, type);
        };

        goButton.addEventListener('click', handleNavigation);
        urlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleNavigation();
            }
        });
    }

    navigateTab(tabId, url, type = 'web') {
        const tab = this.tabs.get(tabId);
        if (!tab) return;

        const tabContent = document.getElementById(`tab-content-${tabId}`);
        const container = tabContent.querySelector('.webview-container');
        
        // Mettre à jour l'onglet
        tab.url = url;
        tab.isPDF = (type === 'pdf');
        
        // Mettre à jour l'icône
        const tabIcon = document.querySelector(`[data-tab-id="${tabId}"] .tab-icon`);
        if (tabIcon) {
            tabIcon.textContent = tab.isPDF ? '📄' : '🌐';
        }

        // Mettre à jour le contenu
        if (tab.isPDF) {
            tabContent.classList.add('pdf');
            tabContent.classList.remove('web');
            container.innerHTML = `<iframe src="${url}" style="width: 100%; height: 100%; border: none; background: white;"></iframe>`;
            tab.webview = null;
        } else {
            tabContent.classList.add('web');
            tabContent.classList.remove('pdf');
            container.innerHTML = `
                <webview id="webview-${tabId}" 
                         src="${url}"
                         style="width: 100%; height: 100%;">
                </webview>
            `;
            tab.webview = container.querySelector(`#webview-${tabId}`);
            
            // Configurer les listeners pour le nouveau webview
            if (tab.webview && window.flashSightApp) {
                window.flashSightApp.setupWebviewListeners(tab.webview, tabId);
            }
        }

        // Mettre à jour le titre de l'onglet
        try {
            const fallbackTitle = this.extractDomainFromUrl(url);
            this.updateTabTitle(tabId, fallbackTitle);
        } catch (e) {
            this.updateTabTitle(tabId, tab.isPDF ? 'PDF' : 'Chargement...');
        }
    }

    extractDomainFromUrl(url) {
        try {
            let processedUrl = url;
            if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('file://')) {
                processedUrl = url.startsWith('www.') ? `https://${url}` : `https://www.${url}`;
            }
            
            const urlObj = new URL(processedUrl);
            let hostname = urlObj.hostname;
            
            if (hostname.startsWith('www.')) {
                hostname = hostname.substring(4);
            }
            
            if (hostname.length > 0) {
                hostname = hostname.charAt(0).toUpperCase() + hostname.slice(1);
            }
            
            return hostname || 'Page Web';
        } catch (e) {
            let cleanUrl = url.replace(/^https?:\/\//, '').replace(/^www\./, '');
            const firstSlash = cleanUrl.indexOf('/');
            if (firstSlash !== -1) {
                cleanUrl = cleanUrl.substring(0, firstSlash);
            }
            
            if (cleanUrl.length > 0) {
                return cleanUrl.charAt(0).toUpperCase() + cleanUrl.slice(1);
            }
            
            return 'Page Web';
        }
    }
}

class FlashSightReaderApp {
    constructor() {
        this.pdfContent = null;
        this.isLoading = false;
        this.tabManager = new TabManager();
        
        this.initializeElements();
        this.initializeDefaultValues();
        this.setupEventListeners();
        this.setupIpcListeners();
        
        // Rendre accessible globalement pour le TabManager
        window.flashSightApp = this;
    }

    initializeElements() {
        // Éléments de l'interface
        this.backButton = document.getElementById('backButton');
        this.forwardButton = document.getElementById('forwardButton');
        this.refreshButton = document.getElementById('refreshButton');
        this.sidebarToggle = document.getElementById('sidebarToggle');
        
        this.bionicToggle = document.getElementById('bionicToggle');
        this.cleanModeToggle = document.getElementById('cleanModeToggle');
        this.intensitySlider = document.getElementById('intensitySlider');
        this.intensityValue = document.getElementById('intensityValue');
        
        this.openPdfButton = document.getElementById('openPdfButton');
        this.openUrlButton = document.getElementById('openUrlButton');
        
        // Debug
        this.toggleConsoleButton = document.getElementById('toggleConsoleButton');
        
        // Dialogue
        this.urlDialog = document.getElementById('url-dialog');
        this.dialogUrlInput = document.getElementById('dialog-url-input');
        this.dialogOk = document.getElementById('dialog-ok');
        this.dialogCancel = document.getElementById('dialog-cancel');

        // Éléments de zoom
        this.zoomSlider = document.getElementById('zoomSlider');
        this.zoomValue = document.getElementById('zoomValue');
        this.zoomInButton = document.getElementById('zoomInButton');
        this.zoomOutButton = document.getElementById('zoomOutButton');
        this.zoomResetButton = document.getElementById('zoomResetButton');

        // Éléments de police
        this.fontOptimizeToggle = document.getElementById('fontOptimizeToggle');
        this.fontSelect = document.getElementById('fontSelect');
        this.fontSizeSlider = document.getElementById('fontSizeSlider');
        this.fontSizeValue = document.getElementById('fontSizeValue');
    }

    initializeDefaultValues() {
        // Initialiser les valeurs par défaut des contrôles
        if (this.zoomSlider && this.zoomValue) {
            this.zoomSlider.value = 1; // Facteur 1.0 = 100%
            this.zoomValue.textContent = '100%';
        }

        if (this.fontSizeSlider && this.fontSizeValue) {
            this.fontSizeSlider.value = 16;
            this.fontSizeValue.textContent = '16px';
        }

        if (this.intensityValue) {
            const intensity = this.intensitySlider ? parseFloat(this.intensitySlider.value) : 0.5;
            this.intensityValue.textContent = Math.round(intensity * 100) + '%';
        }
    }

    setupEventListeners() {
        // Navigation
        this.backButton.addEventListener('click', () => {
            const currentTab = this.tabManager.getCurrentTab();
            if (currentTab && currentTab.webview) {
                currentTab.webview.goBack();
            }
        });
        
        this.forwardButton.addEventListener('click', () => {
            const currentTab = this.tabManager.getCurrentTab();
            if (currentTab && currentTab.webview) {
                currentTab.webview.goForward();
            }
        });
        
        this.refreshButton.addEventListener('click', () => {
            this.refreshCurrentContent();
        });

        // Basculer la sidebar
        if (this.sidebarToggle) {
            this.sidebarToggle.addEventListener('click', () => {
                const sidebar = document.getElementById('sidebar');
                if (sidebar) {
                    sidebar.classList.toggle('collapsed');
                }
            });
        }

        // Initialiser la sidebar comme rétractée au démarrage
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.classList.add('collapsed');
        }

        // Contrôles Flash Sight
        this.bionicToggle.addEventListener('change', () => {
            if (this.bionicToggle.checked) {
                this.forceBionicReading();
            } else {
                this.removeBionicReading();
            }
        });

        this.intensitySlider.addEventListener('input', () => {
            const intensity = parseFloat(this.intensitySlider.value);
            this.intensityValue.textContent = Math.round(intensity * 100) + '%';
            this.forceBionicReading();
        });

        // Contrôles de police
        if (this.fontOptimizeToggle) {
            this.fontOptimizeToggle.addEventListener('change', () => {
                this.applyFontSettings();
            });
        }

        if (this.fontSelect) {
            this.fontSelect.addEventListener('change', () => {
                this.applyFontSettings();
            });
        }

        if (this.fontSizeSlider) {
            this.fontSizeSlider.addEventListener('input', () => {
                const fontSize = parseInt(this.fontSizeSlider.value);
                if (this.fontSizeValue) {
                    this.fontSizeValue.textContent = fontSize + 'px';
                }
                this.applyFontSettings();
            });
        }

        // Contrôles de zoom
        if (this.zoomSlider) {
            this.zoomSlider.addEventListener('input', () => {
                const zoomFactor = parseFloat(this.zoomSlider.value);
                const zoomPercent = Math.round(zoomFactor * 100);
                if (this.zoomValue) {
                    this.zoomValue.textContent = zoomPercent + '%';
                }
                this.applyZoomSettings();
            });
        }

        if (this.zoomInButton) {
            this.zoomInButton.addEventListener('click', () => {
                const currentZoom = parseFloat(this.zoomSlider.value);
                const newZoom = Math.min(3.0, currentZoom + 0.1);
                this.zoomSlider.value = newZoom;
                this.zoomValue.textContent = Math.round(newZoom * 100) + '%';
                this.applyZoomSettings();
            });
        }

        if (this.zoomOutButton) {
            this.zoomOutButton.addEventListener('click', () => {
                const currentZoom = parseFloat(this.zoomSlider.value);
                const newZoom = Math.max(0.5, currentZoom - 0.1);
                this.zoomSlider.value = newZoom;
                this.zoomValue.textContent = Math.round(newZoom * 100) + '%';
                this.applyZoomSettings();
            });
        }

        if (this.zoomResetButton) {
            this.zoomResetButton.addEventListener('click', () => {
                this.zoomSlider.value = 1.0;
                this.zoomValue.textContent = '100%';
                this.applyZoomSettings();
            });
        }

        // Boutons d'ouverture
        this.openPdfButton.addEventListener('click', () => {
            ipcRenderer.invoke('open-pdf-dialog');
        });

        this.openUrlButton.addEventListener('click', () => {
            this.showUrlDialog();
        });

        // Debug
        this.toggleConsoleButton.addEventListener('click', () => {
            this.toggleDevConsole();
        });

        // Dialogue URL
        this.dialogOk.addEventListener('click', () => {
            const url = this.dialogUrlInput.value.trim();
            if (url) {
                this.hideUrlDialog();
                const tempTitle = this.extractDomainFromUrl(url);
                this.tabManager.createNewTab(url, tempTitle);
            }
        });

        this.dialogCancel.addEventListener('click', () => {
            this.hideUrlDialog();
        });

        this.dialogUrlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.dialogOk.click();
            }
        });
    }

    setupWebviewListeners(webview, tabId) {
        if (!webview) return;

        webview.addEventListener('dom-ready', () => {
            if (this.bionicToggle.checked) {
                setTimeout(() => {
                    this.applyBionicReadingToWebView(webview);
                }, 500);
            }
        });

        webview.addEventListener('did-stop-loading', () => {
            if (this.bionicToggle.checked) {
                setTimeout(() => {
                    this.applyBionicReadingToWebView(webview);
                }, 1000);
            }
        });

        // Réappliquer Flash Sight après navigation
        webview.addEventListener('did-navigate', (e) => {
            const fallbackTitle = this.tabManager.extractDomainFromUrl(e.url);
            this.tabManager.updateTabTitle(tabId, fallbackTitle);
            
            // Réappliquer Flash Sight après navigation
            if (this.bionicToggle.checked) {
                setTimeout(() => {
                    this.applyBionicReadingToWebView(webview);
                }, 1500);
            }
        });

        webview.addEventListener('did-navigate-in-page', () => {
            // Pour les navigations SPA (Single Page Applications)
            if (this.bionicToggle.checked) {
                setTimeout(() => {
                    this.applyBionicReadingToWebView(webview);
                }, 800);
            }
        });

        // Mettre à jour le titre de l'onglet quand la page change
        webview.addEventListener('page-title-updated', (e) => {
            this.tabManager.updateTabTitle(tabId, e.title);
        });
    }

    extractDomainFromUrl(url) {
        return this.tabManager.extractDomainFromUrl(url);
    }

    setupIpcListeners() {
        // Écouter les événements du processus principal
        ipcRenderer.on('load-pdf', (event, filePath) => {
            const fileName = filePath.split('\\').pop().split('/').pop();
            this.tabManager.createNewTab(`file://${filePath}`, fileName);
        });

        ipcRenderer.on('navigate-to-url', (event, url) => {
            const tempTitle = this.extractDomainFromUrl(url);
            this.tabManager.createNewTab(url, tempTitle);
        });
    }

    applyBionicReadingToWebView(webview) {
        if (!webview || !this.bionicToggle.checked) return;

        // Version améliorée du script d'injection avec surveillance DOM
        const script = `
            try {
                // Nettoyer les transformations précédentes
                document.querySelectorAll('.flashsight-word').forEach(word => {
                    word.parentNode.replaceChild(document.createTextNode(word.textContent), word);
                });
                
                // Moteur Flash Sight simplifié
                class SimpleFlashSight {
                    constructor(intensity = 0.5) {
                        this.intensity = intensity;
                        this.observer = null;
                        this.isTransforming = false;
                    }
                    
                    transformWord(word) {
                        const wordMatch = word.match(/^(\\W*)([\\w']+)(\\W*)$/);
                        if (!wordMatch || wordMatch[2].length < 3) return word;
                        
                        const [, prefix, cleanWord, suffix] = wordMatch;
                        const boldLength = Math.max(1, Math.min(cleanWord.length - 1, Math.ceil(cleanWord.length * this.intensity)));
                        const boldPart = cleanWord.substring(0, boldLength);
                        const normalPart = cleanWord.substring(boldLength);
                        
                        return prefix + '<span class="flashsight-word"><span class="flashsight-bold">' + boldPart + '</span><span class="flashsight-normal">' + normalPart + '</span></span>' + suffix;
                    }
                    
                    transformElement(element) {
                        // Éviter de transformer des éléments déjà transformés ou non-textuels
                        if (element.querySelector('.flashsight-word') || 
                            !element.textContent.trim() ||
                            ['SCRIPT', 'STYLE', 'CODE', 'PRE', 'NOSCRIPT'].includes(element.tagName)) {
                            return;
                        }
                        
                        // Si l'élément a des enfants, transformer récursivement
                        if (element.children.length > 0) {
                            Array.from(element.childNodes).forEach(child => {
                                if (child.nodeType === Node.TEXT_NODE && child.textContent.trim()) {
                                    // Transformer les nœuds texte directement
                                    const words = child.textContent.split(/(\\s+)/);
                                    const transformedWords = words.map(word => {
                                        return /^\\s+$/.test(word) ? word : this.transformWord(word);
                                    });
                                    
                                    const transformedText = transformedWords.join('');
                                    if (transformedText !== child.textContent) {
                                        const tempDiv = document.createElement('div');
                                        tempDiv.innerHTML = transformedText;
                                        while (tempDiv.firstChild) {
                                            child.parentNode.insertBefore(tempDiv.firstChild, child);
                                        }
                                        child.parentNode.removeChild(child);
                                    }
                                } else if (child.nodeType === Node.ELEMENT_NODE) {
                                    // Récursion sur les éléments enfants
                                    this.transformElement(child);
                                }
                            });
                        } else {
                            // Élément simple sans enfants
                            const words = element.textContent.split(/(\\s+)/);
                            const transformedWords = words.map(word => {
                                return /^\\s+$/.test(word) ? word : this.transformWord(word);
                            });
                            
                            const transformedText = transformedWords.join('');
                            if (transformedText !== element.textContent) {
                                element.innerHTML = transformedText;
                            }
                        }
                    }
                    
                    transformPage() {
                        if (this.isTransforming) return;
                        this.isTransforming = true;
                        
                        try {
                            // Sélecteurs pour les conteneurs principaux
                            const selectors = [
                                'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 
                                'li', 'td', 'th', 'blockquote', 'figcaption',
                                'article', 'section', 'div[class*="content"]',
                                'div[class*="text"]', 'div[class*="article"]'
                            ];
                            
                            selectors.forEach(selector => {
                                document.querySelectorAll(selector).forEach(el => {
                                    if (el.textContent.trim()) {
                                        this.transformElement(el);
                                    }
                                });
                            });
                        } finally {
                            this.isTransforming = false;
                        }
                    }
                    
                    startObserver() {
                        // Observer les changements DOM pour appliquer Flash Sight au nouveau contenu
                        if (this.observer) this.observer.disconnect();
                        
                        this.observer = new MutationObserver((mutations) => {
                            let hasNewContent = false;
                            mutations.forEach(mutation => {
                                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                                    hasNewContent = true;
                                }
                            });
                            
                            if (hasNewContent) {
                                setTimeout(() => this.transformPage(), 100);
                            }
                        });
                        
                        this.observer.observe(document.body, {
                            childList: true,
                            subtree: true
                        });
                    }
                }
                
                // Ajouter les styles améliorés
                if (!document.getElementById('flashsight-styles')) {
                    const style = document.createElement('style');
                    style.id = 'flashsight-styles';
                    style.textContent = \`
                        .flashsight-word { 
                            display: inline; 
                        } 
                        .flashsight-bold { 
                            font-weight: bold; 
                            color: inherit;
                        } 
                        .flashsight-normal { 
                            font-weight: normal; 
                            color: inherit;
                            opacity: 0.8;
                        }
                    \`;
                    document.head.appendChild(style);
                }
                
                // Créer et démarrer le moteur Flash Sight
                const engine = new SimpleFlashSight(${this.intensitySlider.value});
                engine.transformPage();
                engine.startObserver();
                
                // Stocker l'instance pour réutilisation
                window.flashSightEngine = engine;
                
                console.log('✅ Flash Sight applied successfully');
                
            } catch (error) {
                console.error('❌ Error in Flash Sight injection:', error);
            }
        `;
        
        webview.executeJavaScript(script).catch(error => {
            console.error('Error executing Flash Sight script:', error);
        });
    }

    applyFlashSightToWelcomePage() {
        // Appliquer Flash Sight aux iframes de bienvenue
        const welcomeIframes = document.querySelectorAll('iframe[src="welcome.html"]');
        welcomeIframes.forEach(iframe => {
            try {
                const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                if (iframeDoc && iframeDoc.readyState === 'complete') {
                    this.transformWelcomePageContent(iframeDoc);
                }
            } catch (error) {
                console.warn('Cannot access iframe content (same-origin policy):', error);
            }
        });
    }

    transformWelcomePageContent(doc) {
        if (!this.bionicToggle.checked) return;

        // Nettoyer les transformations précédentes
        doc.querySelectorAll('.flashsight-word').forEach(word => {
            word.parentNode.replaceChild(doc.createTextNode(word.textContent), word);
        });

        // Appliquer la transformation Flash Sight
        const intensity = parseFloat(this.intensitySlider.value);
        const transformWord = (word) => {
            const wordMatch = word.match(/^(\W*)([\w']+)(\W*)$/);
            if (!wordMatch || wordMatch[2].length < 3) return word;
            
            const [, prefix, cleanWord, suffix] = wordMatch;
            const boldLength = Math.max(1, Math.min(cleanWord.length - 1, Math.ceil(cleanWord.length * intensity)));
            const boldPart = cleanWord.substring(0, boldLength);
            const normalPart = cleanWord.substring(boldLength);
            
            return prefix + '<span class="flashsight-word"><span class="flashsight-bold">' + boldPart + '</span><span class="flashsight-normal">' + normalPart + '</span></span>' + suffix;
        };

        const transformElement = (element) => {
            if (element.children.length === 0 && element.textContent.trim()) {
                const words = element.textContent.split(/(\s+)/);
                const transformedWords = words.map(word => {
                    return /^\s+$/.test(word) ? word : transformWord(word);
                });
                
                const transformedText = transformedWords.join('');
                if (transformedText !== element.textContent) {
                    element.innerHTML = transformedText;
                }
            }
        };

        // Appliquer aux éléments textuels
        const selectors = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li'];
        selectors.forEach(selector => {
            doc.querySelectorAll(selector).forEach(el => transformElement(el));
        });
    }

    forceBionicReading() {
        const currentTab = this.tabManager.getCurrentTab();
        if (currentTab && currentTab.webview && this.bionicToggle.checked) {
            this.applyBionicReadingToWebView(currentTab.webview);
        }
        
        // Appliquer aussi aux pages d'accueil
        this.applyFlashSightToWelcomePage();
    }

    removeBionicReading() {
        const currentTab = this.tabManager.getCurrentTab();
        if (currentTab && currentTab.webview) {
            const script = `
                try {
                    // Arrêter l'observer si il existe
                    if (window.flashSightEngine && window.flashSightEngine.observer) {
                        window.flashSightEngine.observer.disconnect();
                        window.flashSightEngine = null;
                    }
                    
                    // Nettoyer toutes les transformations
                    document.querySelectorAll('.flashsight-word').forEach(word => {
                        word.parentNode.replaceChild(document.createTextNode(word.textContent), word);
                    });
                    
                    console.log('✅ Flash Sight removed successfully');
                } catch (error) {
                    console.error('❌ Error removing Flash Sight:', error);
                }
            `;
            currentTab.webview.executeJavaScript(script).catch(console.error);
        }
        
        // Nettoyer aussi les pages d'accueil
        this.removeFlashSightFromWelcomePage();
    }

    removeFlashSightFromWelcomePage() {
        const welcomeIframes = document.querySelectorAll('iframe[src="welcome.html"]');
        welcomeIframes.forEach(iframe => {
            try {
                const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                if (iframeDoc && iframeDoc.readyState === 'complete') {
                    iframeDoc.querySelectorAll('.flashsight-word').forEach(word => {
                        word.parentNode.replaceChild(iframeDoc.createTextNode(word.textContent), word);
                    });
                }
            } catch (error) {
                console.warn('Cannot access iframe content for cleanup:', error);
            }
        });
    }

    refreshCurrentContent() {
        const currentTab = this.tabManager.getCurrentTab();
        if (currentTab && currentTab.webview) {
            currentTab.webview.reload();
        }
    }

    showUrlDialog() {
        this.urlDialog.style.display = 'flex';
        this.dialogUrlInput.focus();
        this.dialogUrlInput.select();
    }

    hideUrlDialog() {
        this.urlDialog.style.display = 'none';
        this.dialogUrlInput.value = '';
    }

    toggleDevConsole() {
        ipcRenderer.invoke('toggle-dev-console').then((isOpen) => {
            const buttonText = isOpen ? '📟 Fermer Console' : '📟 Console DevTools';
            this.toggleConsoleButton.textContent = buttonText;
        }).catch((error) => {
            console.error('Error toggling dev console:', error);
        });
    }

    applyFontSettings() {
        const currentTab = this.tabManager.getCurrentTab();
        if (!currentTab || !currentTab.webview) {
            this.applyFontToWelcomePage();
            return;
        }

        const fontFamily = this.fontSelect ? this.fontSelect.value : 'inherit';
        const fontSize = this.fontSizeSlider ? this.fontSizeSlider.value + 'px' : 'inherit';
        const optimizeFont = this.fontOptimizeToggle ? this.fontOptimizeToggle.checked : false;

        const script = `
            try {
                if (!document.getElementById('custom-font-styles')) {
                    const style = document.createElement('style');
                    style.id = 'custom-font-styles';
                    document.head.appendChild(style);
                }
                
                const fontStyles = document.getElementById('custom-font-styles');
                let cssRules = '';
                
                if ('${fontFamily}' !== 'inherit') {
                    cssRules += 'body, p, h1, h2, h3, h4, h5, h6, li, td, th, span, div, article { font-family: ${fontFamily} !important; }';
                }
                
                if ('${fontSize}' !== 'inherit') {
                    cssRules += 'body, p, li, td, th, span, div { font-size: ${fontSize} !important; }';
                }
                
                if (${optimizeFont}) {
                    cssRules += 'body { text-rendering: optimizeLegibility !important; -webkit-font-smoothing: antialiased !important; -moz-osx-font-smoothing: grayscale !important; }';
                }
                
                fontStyles.textContent = cssRules;
                console.log('✅ Font settings applied');
            } catch (error) {
                console.error('❌ Error applying font settings:', error);
            }
        `;
        
        currentTab.webview.executeJavaScript(script).catch(console.error);
        this.applyFontToWelcomePage();
    }

    applyFontToWelcomePage() {
        const welcomeIframes = document.querySelectorAll('iframe[src="welcome.html"]');
        welcomeIframes.forEach(iframe => {
            try {
                const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                if (iframeDoc && iframeDoc.readyState === 'complete') {
                    const fontFamily = this.fontSelect ? this.fontSelect.value : 'inherit';
                    const fontSize = this.fontSizeSlider ? this.fontSizeSlider.value + 'px' : 'inherit';
                    const optimizeFont = this.fontOptimizeToggle ? this.fontOptimizeToggle.checked : false;

                    let existingStyle = iframeDoc.getElementById('custom-font-styles');
                    if (!existingStyle) {
                        existingStyle = iframeDoc.createElement('style');
                        existingStyle.id = 'custom-font-styles';
                        iframeDoc.head.appendChild(existingStyle);
                    }

                    let cssRules = '';
                    if (fontFamily !== 'inherit') {
                        cssRules += `body, p, h1, h2, h3, h4, h5, h6, li, td, th, span, div, article { font-family: ${fontFamily} !important; }`;
                    }
                    if (fontSize !== 'inherit') {
                        cssRules += `body, p, li, td, th, span, div { font-size: ${fontSize} !important; }`;
                    }
                    if (optimizeFont) {
                        cssRules += 'body { text-rendering: optimizeLegibility !important; -webkit-font-smoothing: antialiased !important; -moz-osx-font-smoothing: grayscale !important; }';
                    }

                    existingStyle.textContent = cssRules;
                }
            } catch (error) {
                console.warn('Cannot access iframe for font settings:', error);
            }
        });
    }

    applyZoomSettings() {
        const currentTab = this.tabManager.getCurrentTab();
        if (!currentTab || !currentTab.webview) return;

        const zoomLevel = this.zoomSlider ? parseFloat(this.zoomSlider.value) : 1.0;
        
        try {
            currentTab.webview.setZoomFactor(zoomLevel);
            console.log(`✅ Zoom set to ${Math.round(zoomLevel * 100)}%`);
        } catch (error) {
            console.error('❌ Error setting zoom:', error);
        }
    }
}

// Initialiser l'application quand le DOM est prêt
document.addEventListener('DOMContentLoaded', () => {
    // Vérifier que le moteur Flash Sight est disponible
    if (typeof window.flashSightEngine === 'undefined') {
        console.warn('Flash Sight Engine not loaded, using simplified version');
    }
    
    // Attendre un peu pour s'assurer que le DOM est entièrement prêt
    setTimeout(() => {
        try {
            window.app = new FlashSightReaderApp();
            
            // S'assurer que la case "Activé" est cochée par défaut
            const bionicToggle = document.getElementById('bionicToggle');
            if (bionicToggle) {
                bionicToggle.checked = true;
            }
            
        } catch (error) {
            console.error('❌ Error initializing Flash Sight App:', error);
        }
    }, 100);
});
