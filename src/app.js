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
        this.toolbarTemplate = document.getElementById('tab-toolbar-template');
        
        this.setupEventListeners();
        this.initializeDefaultTab();
    }

    setupEventListeners() {
        this.addTabButton.addEventListener('click', () => {
            this.createNewTab();
        });

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
        this.createNewTab('welcome.html', 'Accueil');
    }

    createNewTab(url = '', title = 'Nouvel onglet', forcePDF = false) {
        const tabId = this.nextTabId++;
        
        const isWelcome = url === 'welcome.html';
        const isPDF = forcePDF || (!isWelcome && url && (
            url.toLowerCase().endsWith('.pdf') || 
            url.toLowerCase().includes('pdf') ||
            url.toLowerCase().endsWith('.txt') || 
            url.toLowerCase().endsWith('.md')
        ));
        
        const displayUrl = isWelcome ? '' : url;
        const webviewUrl = url === '' ? 'about:blank' : url;
        
        const tabElement = document.createElement('div');
        tabElement.className = 'tab';
        tabElement.dataset.tabId = tabId;
        
        let icon = isWelcome ? '🏠' : (isPDF ? '📄' : '🌐');
        
        tabElement.innerHTML = `
            <span class="tab-icon">${icon}</span>
            <span class="tab-title">${title}</span>
            <span class="tab-close" title="Fermer l'onglet">×</span>
        `;

        this.tabBar.insertBefore(tabElement, this.addTabButton);

        const tabContent = document.createElement('div');
        tabContent.id = `tab-content-${tabId}`;
        tabContent.className = 'tab-content';
        
        const webviewContainer = document.createElement('div');
        webviewContainer.className = 'webview-container';

        if (isWelcome) {
            webviewContainer.innerHTML = `<iframe src="welcome.html" style="width: 100%; height: 100%; border: none;"></iframe>`;
            const iframe = webviewContainer.querySelector('iframe');
            iframe.addEventListener('load', () => {
                setTimeout(() => {
                    if (window.flashSightApp && window.flashSightApp.bionicToggle.checked) {
                        window.flashSightApp.applyFlashSightToWelcomePage();
                    }
                }, 100);
            });
        } else if (isPDF) {
            // Ajouter une barre d'outils pour les PDFs aussi
            const toolbarClone = this.toolbarTemplate.content.cloneNode(true);
            toolbarClone.querySelector('.tab-url-input').value = displayUrl;
            tabContent.appendChild(toolbarClone);
            
            // Créer le PDF viewer intégré
            const pdfViewerContainer = document.createElement('div');
            pdfViewerContainer.className = 'pdf-viewer-container';
            pdfViewerContainer.id = `pdf-viewer-${tabId}`;
            webviewContainer.appendChild(pdfViewerContainer);
            
            // Charger et initialiser le PDF viewer via l'instance globale
            if (window.flashSightApp && window.flashSightApp.initializePDFViewer) {
                window.flashSightApp.initializePDFViewer(pdfViewerContainer, url);
            } else {
                console.error('FlashSightApp non disponible pour initialiser le PDF viewer');
                pdfViewerContainer.innerHTML = `
                    <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: red;">
                        Erreur: Application non initialisée
                    </div>
                `;
            }
        } else {
            const toolbarClone = this.toolbarTemplate.content.cloneNode(true);
            toolbarClone.querySelector('.tab-url-input').value = displayUrl;
            tabContent.appendChild(toolbarClone);
            
            webviewContainer.innerHTML = `
                <webview id="webview-${tabId}" 
                         src="${webviewUrl}"
                         style="width: 100%; height: 100%;">
                </webview>
            `;
        }
        
        tabContent.appendChild(webviewContainer);
        this.tabsContainer.appendChild(tabContent);

        const tab = {
            id: tabId,
            title: title,
            icon: icon,
            url: displayUrl,
            isPDF: isPDF,
            isWelcome: isWelcome,
            webview: (isWelcome || isPDF) ? null : tabContent.querySelector(`#webview-${tabId}`),
            pdfViewer: isPDF ? tabContent.querySelector(`#pdf-viewer-${tabId}`) : null,
            contentEl: tabContent
        };

        this.tabs.set(tabId, tab);
        
        // Configurer les listeners de la toolbar pour tous les onglets sauf la page d'accueil
        if (!isWelcome) {
            this.setupTabToolbarListeners(tabContent, tabId);
        }
        
        // Configurer les listeners WebView seulement pour les onglets web
        if (!isWelcome && !isPDF && tab.webview) {
            window.flashSightApp.setupWebviewListeners(tab.webview, tabId);
        }

        this.switchToTab(tabId);
        return tab;
    }

    closeTab(tabId) {
        if (this.tabs.size <= 1) return;

        const tab = this.tabs.get(tabId);
        if (!tab) return;

        const tabElement = document.querySelector(`[data-tab-id="${tabId}"]`);
        if (tabElement) tabElement.remove();
        if (tab.contentEl) tab.contentEl.remove();

        this.tabs.delete(tabId);

        if (this.activeTabId === tabId) {
            const remainingTabs = Array.from(this.tabs.keys());
            this.switchToTab(remainingTabs.length > 0 ? remainingTabs[0] : null);
        }
    }

    switchToTab(tabId) {
        if (tabId === null) {
            this.activeTabId = null;
            return;
        }
        
        const tab = this.tabs.get(tabId);
        if (!tab) return;

        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));

        const tabElement = document.querySelector(`[data-tab-id="${tabId}"]`);
        if (tabElement) tabElement.classList.add('active');
        if (tab.contentEl) tab.contentEl.classList.add('active');

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

    setupTabToolbarListeners(tabContent, tabId) {
        const toolbar = tabContent.querySelector('.tab-toolbar');
        if (!toolbar) return;

        const backButton = toolbar.querySelector('.back-button');
        const forwardButton = toolbar.querySelector('.forward-button');
        const refreshButton = toolbar.querySelector('.refresh-button');
        const homeButton = toolbar.querySelector('.home-button');
        const urlInput = toolbar.querySelector('.tab-url-input');
        const goButton = toolbar.querySelector('.tab-go-button');

        const getWebview = () => this.tabs.get(tabId)?.webview;

        if (backButton) {
            backButton.addEventListener('click', () => getWebview()?.goBack());
        }
        if (forwardButton) {
            forwardButton.addEventListener('click', () => getWebview()?.goForward());
        }
        if (refreshButton) {
            refreshButton.addEventListener('click', () => getWebview()?.reload());
        }
        if (homeButton) {
            homeButton.addEventListener('click', () => this.navigateTab(tabId, 'welcome.html'));
        }

        const handleNavigation = () => {
            const url = urlInput.value.trim();
            if (!url) return;
            this.navigateTab(tabId, url);
        };

        goButton.addEventListener('click', handleNavigation);
        urlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleNavigation();
            }
        });

        // Améliorer l'expérience utilisateur avec le champ URL
        urlInput.addEventListener('focus', () => {
            // Si le champ contient about:blank ou est vide, le vider et afficher le placeholder
            if (urlInput.value.startsWith('about:') || urlInput.value.trim() === '') {
                urlInput.value = '';
            }
        });

        urlInput.addEventListener('input', () => {
            // Si l'utilisateur commence à taper et que le champ contenait about:blank, le vider
            if (urlInput.value.startsWith('about:')) {
                urlInput.value = urlInput.value.replace(/^about:[^/]*\/*/, '');
            }
        });

        const historyDropdown = window.flashSightApp?.historyDropdown;
        if (historyDropdown && urlInput) {
            historyDropdown.attachToInput(urlInput);
        }
    }

    navigateTab(tabId, url) {
        const tab = this.tabs.get(tabId);
        if (!tab) return;

        const isWelcome = url === 'welcome.html';
        const isPDF = !isWelcome && url.toLowerCase().endsWith('.pdf');
        let finalUrl = url;

        if (!isWelcome && !isPDF && !url.startsWith('http') && !url.startsWith('file')) {
            finalUrl = 'https://' + url;
        } else if (isPDF && !url.startsWith('file')) {
            finalUrl = 'file://' + path.resolve(finalUrl);
        }

        tab.url = finalUrl;
        tab.isPDF = isPDF;
        tab.isWelcome = isWelcome;

        const tabIconEl = document.querySelector(`[data-tab-id="${tabId}"] .tab-icon`);
        if (tabIconEl) {
            tabIconEl.textContent = isWelcome ? '🏠' : (isPDF ? '📄' : '🌐');
        }

        const container = tab.contentEl.querySelector('.webview-container');
        container.innerHTML = ''; // Clear previous content

        if (isWelcome) {
            container.innerHTML = `<iframe src="welcome.html" style="width: 100%; height: 100%; border: none;"></iframe>`;
            tab.webview = null;
        } else if (isPDF) {
            // Utiliser le nouveau visualiseur PDF intégré
            tab.pdfViewer = new PDFViewer(window.flashSightApp.stateManager, window.flashSightApp.themeManager);
            tab.pdfViewer.createPDFContainer(tab.contentEl.querySelector('.webview-container'));
            tab.pdfViewer.loadPDF(finalUrl);
            tab.webview = null;
        } else {
            const webview = document.createElement('webview');
            webview.id = `webview-${tabId}`;
            webview.src = finalUrl;
            webview.style.width = '100%';
            webview.style.height = '100%';
            container.appendChild(webview);
            
            tab.webview = webview;
            window.flashSightApp.setupWebviewListeners(webview, tabId);
        }

        const fallbackTitle = this.extractDomainFromUrl(url) || (isPDF ? 'PDF' : 'Nouvel Onglet');
        this.updateTabTitle(tabId, fallbackTitle);

        if (window.flashSightApp?.urlHistory && !isWelcome) {
            window.flashSightApp.urlHistory.addUrl(finalUrl, fallbackTitle);
        }
    }

    extractDomainFromUrl(url) {
        if (!url || url === 'welcome.html' || url.startsWith('about:')) return null;
        try {
            let processedUrl = url;
            if (!url.startsWith('http') && !url.startsWith('file')) {
                processedUrl = 'https://' + url;
            }
            const urlObj = new URL(processedUrl);
            if (urlObj.protocol === 'file:') {
                return path.basename(url);
            }
            let hostname = urlObj.hostname.replace(/^www\./, '');
            return hostname.charAt(0).toUpperCase() + hostname.slice(1);
        } catch (e) {
            return path.basename(url).split('?')[0].split('#')[0];
        }
    }
}

class FlashSightReaderApp {
    constructor() {
        this.pdfContent = null;
        this.isLoading = false;
        this._isUserInteracting = false; // Protection contre les boucles de synchronisation
        this._userInteractionTimeout = null; // Timer pour le verrou d'interaction
        this._intensityTimeout = null; // Timer pour debounce du slider d'intensité
        
        this.stateManager = new FlashSightStateManager();
        this.accessibilityManager = new AccessibilityManager(this.stateManager);
        this.themeManager = new ThemeManager(this.stateManager);
        this.immersiveMode = new ImmersiveMode(this.stateManager, this.accessibilityManager);
        this.readingAnalytics = new ReadingAnalytics(this.stateManager);
        this.errorHandler = new ErrorHandler(this.stateManager, this.accessibilityManager);
        
        this.urlHistory = null;
        this.historyDropdown = null;
        this.initializeHistoryModules();
        
        this.lazyTransform = null;
        this.lastAnalyticsUpdate = 0;
        
        // Rendre accessible globalement AVANT d'initialiser TabManager
        window.flashSightApp = this;
        this.tabManager = new TabManager();

        this.initializeElements();
        this.initializeDefaultValues();
        this.setupEventListeners();
        this.setupIpcListeners();
        this.setupStateSubscriptions();
        this.setupEnhancedFeatures();
        
        // Synchroniser l'interface avec l'état sauvegardé APRÈS la configuration
        this.syncUIWithState(this.stateManager.getState());
        
        // Initialiser le mode immersif selon l'état sauvegardé (après que tout soit configuré)
        this.initializeImmersiveMode();
        
        this.applySystemAccessibilityPreferences();
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => this.applySystemAccessibilityPreferences());
        window.matchMedia('(prefers-contrast: more)').addEventListener('change', () => this.applySystemAccessibilityPreferences());
    }

    initializeHistoryModules() {
        try {
            // Utiliser les vrais modules d'historique
            if (typeof SimpleUrlHistory !== 'undefined' && typeof UrlHistoryDropdown !== 'undefined') {
                this.urlHistory = new SimpleUrlHistory(20);
                this.historyDropdown = new UrlHistoryDropdown(this.urlHistory);
                console.log('✅ Modules d\'historique initialisés avec succès');
            } else {
                // Fallback vers l'implémentation simple
                this.urlHistory = this.createSimpleHistory();
                this.historyDropdown = this.createHistoryDropdown();
                console.warn('⚠️ Utilisation du fallback pour l\'historique');
            }
        } catch (error) {
            console.error('❌ Erreur lors de l\'initialisation de l\'historique:', error);
            // Historique modules loading error handled gracefully
        }
    }

    createSimpleHistory() {
        return {
            maxHistory: 20,
            historyKey: 'simpleUrlHistory',
            getHistory: function() {
                try {
                    const stored = localStorage.getItem(this.historyKey);
                    return stored ? JSON.parse(stored) : [];
                } catch (e) { return []; }
            },
            addUrl: function(url, title) {
                if (!url || typeof url !== 'string' || url.startsWith('about:')) return;
                let history = this.getHistory();
                const entry = { url, title, timestamp: Date.now() };
                history = history.filter(item => item.url !== url);
                history.unshift(entry);
                history.splice(this.maxHistory);
                localStorage.setItem(this.historyKey, JSON.stringify(history));
            },
            searchHistory: function(query) {
                if (!query) return this.getHistory();
                const lowerQuery = query.toLowerCase();
                return this.getHistory().filter(item => 
                    item.title.toLowerCase().includes(lowerQuery) ||
                    item.url.toLowerCase().includes(lowerQuery)
                );
            }
        };
    }

    createHistoryDropdown() {
        const self = this;
        return {
            activeDropdown: null,
            currentInput: null,
            attachToInput: function(input) {
                if (!input || !self.urlHistory) return;
                input.addEventListener('focus', () => this.showDropdown(input));
                input.addEventListener('blur', e => {
                    setTimeout(() => {
                        if (!e.relatedTarget || !e.relatedTarget.closest('.url-history-dropdown')) {
                            this.hideDropdown();
                        }
                    }, 150);
                });
                input.addEventListener('input', e => this.filterDropdown(e.target.value));
                input.addEventListener('keydown', e => this.handleKeyboard(e));
            },
            showDropdown: function(input) {
                this.currentInput = input;
                this.hideDropdown();
                const history = self.urlHistory.searchHistory(input.value);
                if (history.length === 0) return;

                const dropdown = document.createElement('div');
                dropdown.className = 'url-history-dropdown';
                input.parentElement.style.position = 'relative';
                input.parentElement.appendChild(dropdown);
                this.activeDropdown = dropdown;

                history.forEach(item => {
                    const itemEl = document.createElement('div');
                    itemEl.className = 'history-item';
                    itemEl.innerHTML = `
                        <div class="history-item-title">${item.title}</div>
                        <div class="history-item-url">${item.url}</div>
                    `;
                    itemEl.addEventListener('mousedown', () => {
                        input.value = item.url;
                        this.hideDropdown();
                        const tabContent = input.closest('.tab-content');
                        if (tabContent) {
                            const tabId = parseInt(tabContent.id.replace('tab-content-', ''));
                            self.tabManager.navigateTab(tabId, item.url);
                        }
                    });
                    dropdown.appendChild(itemEl);
                });
            },
            hideDropdown: function() {
                if (this.activeDropdown) {
                    this.activeDropdown.remove();
                    this.activeDropdown = null;
                }
            },
            filterDropdown: function(query) {
                this.showDropdown(this.currentInput);
            },
            handleKeyboard: function(e) {
                if (!this.activeDropdown) return;
                if (e.key === 'Escape') this.hideDropdown();
            }
        };
    }

    applySystemAccessibilityPreferences() {
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const isHighContrast = window.matchMedia('(prefers-contrast: more)').matches;
        document.body.classList.toggle('theme-dark', isDark);
        document.body.classList.toggle('theme-contrast', isHighContrast);
    }

    initializeElements() {
        this.sidebarToggle = document.getElementById('sidebarToggle');
        this.bionicToggle = document.getElementById('bionicToggle');
        this.cleanModeToggle = document.getElementById('cleanModeToggle');
        this.intensitySlider = document.getElementById('intensitySlider');
        this.intensityValue = document.getElementById('intensityValue');
        this.openPdfButton = document.getElementById('openPdfButton');
        this.openUrlButton = document.getElementById('openUrlButton');
        this.toggleConsoleButton = document.getElementById('toggleConsoleButton');
        this.urlDialog = document.getElementById('url-dialog');
        this.dialogUrlInput = document.getElementById('dialog-url-input');
        this.dialogOk = document.getElementById('dialog-ok');
        this.dialogCancel = document.getElementById('dialog-cancel');
        this.zoomSlider = document.getElementById('zoomSlider');
        this.zoomValue = document.getElementById('zoomValue');
        this.zoomInButton = document.getElementById('zoomInButton');
        this.zoomOutButton = document.getElementById('zoomOutButton');
        this.zoomResetButton = document.getElementById('zoomResetButton');
        this.fontOptimizeToggle = document.getElementById('fontOptimizeToggle');
        this.fontSelect = document.getElementById('fontSelect');
        this.fontSizeSlider = document.getElementById('fontSizeSlider');
        this.fontSizeValue = document.getElementById('fontSizeValue');
        this.accessibilityToggle = document.getElementById('accessibilityToggle');
        this.immersiveModeToggle = document.getElementById('immersiveModeToggle');
        this.lazyLoadingToggle = document.getElementById('lazyLoadingToggle');
        this.readingTime = document.getElementById('readingTime');
        this.wordsRead = document.getElementById('wordsRead');
        this.readingSpeed = document.getElementById('readingSpeed');
        this.readingEfficiency = document.getElementById('readingEfficiency');
        this.resetAnalyticsButton = document.getElementById('resetAnalyticsButton');
        this.exportAnalyticsButton = document.getElementById('exportAnalyticsButton');
        this.cacheStats = document.getElementById('cacheStats');
        this.resetCacheButton = document.getElementById('resetCacheButton');
    }

    initializeDefaultValues() {
        if (this.zoomSlider) this.zoomSlider.value = 1;
        if (this.zoomValue) this.zoomValue.textContent = '100%';
        if (this.fontSizeSlider) this.fontSizeSlider.value = 16;
        if (this.fontSizeValue) this.fontSizeValue.textContent = '16px';
        if (this.intensityValue) this.intensityValue.textContent = Math.round(parseFloat(this.intensitySlider.value) * 100) + '%';
        if (this.cacheStats) this.cacheStats.textContent = 'Cache: Calcul en cours...';
        
        // Cacher la sidebar par défaut à l'ouverture
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.classList.add('collapsed');
        }
    }

    setupEventListeners() {
        // La navigation est maintenant gérée par onglet dans TabManager
        
        if (this.sidebarToggle) {
            this.sidebarToggle.addEventListener('click', () => {
                const sidebar = document.getElementById('sidebar');
                if (sidebar) {
                    sidebar.classList.toggle('collapsed');
                    // Mettre à jour l'attribut aria-pressed pour l'accessibilité
                    const isCollapsed = sidebar.classList.contains('collapsed');
                    this.sidebarToggle.setAttribute('aria-pressed', !isCollapsed);
                }
            });
        }

        this.bionicToggle.addEventListener('change', () => {
            // Marquer que l'utilisateur interagit pour éviter les conflits de synchronisation
            this._isUserInteracting = true;
            clearTimeout(this._userInteractionTimeout);
            
            // Mettre à jour l'état avant d'appliquer les changements
            this.stateManager.setState({ enabled: this.bionicToggle.checked });
            // Réappliquer immédiatement
            if (this.bionicToggle.checked) this.forceBionicReading();
            else this.removeBionicReading();
            
            // Libérer le verrou après un délai
            this._userInteractionTimeout = setTimeout(() => { 
                this._isUserInteracting = false; 
            }, 200);
        });

        this.intensitySlider.addEventListener('input', () => {
            const intensity = parseFloat(this.intensitySlider.value);
            this.intensityValue.textContent = Math.round(intensity * 100) + '%';
            
            // Marquer que l'utilisateur interagit
            this._isUserInteracting = true;
            clearTimeout(this._userInteractionTimeout);
            
            // Debounce pour éviter trop d'appels pendant le glissement
            clearTimeout(this._intensityTimeout);
            this._intensityTimeout = setTimeout(() => {
                // Mettre à jour l'état
                this.stateManager.setState({ intensity: intensity });
                // Réappliquer immédiatement si Flash Sight est activé
                if (this.bionicToggle.checked) this.forceBionicReading();
            }, 150);
            
            // Libérer le verrou après un délai
            this._userInteractionTimeout = setTimeout(() => { 
                this._isUserInteracting = false; 
            }, 300);
        });

        this.fontOptimizeToggle?.addEventListener('change', () => this.applyFontSettings());
        this.fontSelect?.addEventListener('change', () => this.applyFontSettings());
        this.fontSizeSlider?.addEventListener('input', () => {
            if (this.fontSizeValue) this.fontSizeValue.textContent = this.fontSizeSlider.value + 'px';
            this.applyFontSettings();
        });

        this.zoomSlider?.addEventListener('input', () => {
            if (this.zoomValue) this.zoomValue.textContent = Math.round(parseFloat(this.zoomSlider.value) * 100) + '%';
            this.applyZoomSettings();
        });
        this.zoomInButton?.addEventListener('click', () => this.updateZoom(0.1));
        this.zoomOutButton?.addEventListener('click', () => this.updateZoom(-0.1));
        this.zoomResetButton?.addEventListener('click', () => this.updateZoom(0, true));

        this.openPdfButton.addEventListener('click', () => ipcRenderer.invoke('open-pdf-dialog'));
        this.openUrlButton.addEventListener('click', () => this.showUrlDialog());
        this.toggleConsoleButton.addEventListener('click', () => this.toggleDevConsole());

        this.dialogOk.addEventListener('click', () => {
            const url = this.dialogUrlInput.value.trim();
            if (url) {
                this.hideUrlDialog();
                this.tabManager.createNewTab(url, this.tabManager.extractDomainFromUrl(url));
            }
        });
        this.dialogCancel.addEventListener('click', () => this.hideUrlDialog());
        this.dialogUrlInput.addEventListener('keypress', e => {
            if (e.key === 'Enter') this.dialogOk.click();
        });

        this.accessibilityToggle?.addEventListener('change', e => {
            this._isUserInteracting = true;
            clearTimeout(this._userInteractionTimeout);
            this.stateManager.setState({ accessibility: { highContrast: e.target.checked } });
            this._userInteractionTimeout = setTimeout(() => { 
                this._isUserInteracting = false; 
            }, 200);
        });
        this.immersiveModeToggle?.addEventListener('change', e => {
            this._isUserInteracting = true;
            clearTimeout(this._userInteractionTimeout);
            
            if (e.target.checked) {
                this.immersiveMode.enable();
            } else {
                this.immersiveMode.disable();
            }
            
            this._userInteractionTimeout = setTimeout(() => { 
                this._isUserInteracting = false; 
            }, 200);
        });
        this.lazyLoadingToggle?.addEventListener('change', e => {
            this._isUserInteracting = true;
            clearTimeout(this._userInteractionTimeout);
            this.stateManager.setState({ performance: { lazyLoading: e.target.checked } });
            this.setupLazyLoading();
            this._userInteractionTimeout = setTimeout(() => { 
                this._isUserInteracting = false; 
            }, 200);
        });

        this.resetAnalyticsButton?.addEventListener('click', () => this.resetAllAnalytics());
        this.exportAnalyticsButton?.addEventListener('click', () => this.exportAnalytics());
        this.resetCacheButton?.addEventListener('click', () => this.clearCache());
    }
    
    updateZoom(delta, reset = false) {
        const currentZoom = parseFloat(this.zoomSlider.value);
        const newZoom = reset ? 1.0 : Math.max(0.5, Math.min(3.0, currentZoom + delta));
        this.zoomSlider.value = newZoom;
        this.zoomValue.textContent = Math.round(newZoom * 100) + '%';
        this.applyZoomSettings();
    }

    updateTabUrlBar(tabId, url) {
        const tab = this.tabManager.tabs.get(tabId);
        if (!tab || !tab.contentEl) return;

        const urlInput = tab.contentEl.querySelector('.tab-url-input');
        if (urlInput && url && !url.startsWith('about:')) {
            urlInput.value = url;
            // Mettre à jour aussi l'URL stockée dans l'objet tab
            tab.url = url;
        }
    }

    setupWebviewListeners(webview, tabId) {
        if (!webview) return;

        webview.addEventListener('dom-ready', () => {
            if (this.bionicToggle.checked) {
                setTimeout(() => {
                    this.applyBionicReadingToWebView(webview);
                }, 500);
            }
            
            // Initialiser les analytics pour cette webview
            this.setupWebviewAnalytics(webview, tabId);
        });

        webview.addEventListener('did-stop-loading', () => {
            if (this.bionicToggle.checked) {
                setTimeout(() => {
                    this.applyBionicReadingToWebView(webview);
                }, 1000);
            }
            
            // Mettre à jour les analytics avec le nouveau contenu (avec attente intelligente)
            this.waitForWebViewReady(webview, () => {
                this.updateWebviewAnalytics(webview, tabId);
            });
        });

        // Réappliquer Flash Sight après navigation
        webview.addEventListener('did-navigate', (e) => {
            const fallbackTitle = this.tabManager.extractDomainFromUrl(e.url);
            this.tabManager.updateTabTitle(tabId, fallbackTitle);
            
            // Mettre à jour l'URL dans la barre d'adresse de l'onglet
            this.updateTabUrlBar(tabId, e.url);
            
            // Mettre à jour l'historique avec la nouvelle URL
            if (this.urlHistory) {
                this.urlHistory.addUrl(e.url, fallbackTitle);
            }
            
            // Mettre à jour l'affichage du cache
            this.updateCacheDisplay();
            
            // Reset et redémarrer les analytics pour la nouvelle page
            this.resetWebviewAnalytics(webview, tabId);
            
            // Réappliquer Flash Sight après navigation
            if (this.bionicToggle.checked) {
                setTimeout(() => {
                    this.applyBionicReadingToWebView(webview);
                }, 1500);
            }
        });

        webview.addEventListener('did-navigate-in-page', (e) => {
            // Pour les navigations SPA (Single Page Applications)
            // Mettre à jour l'URL dans la barre d'adresse de l'onglet
            this.updateTabUrlBar(tabId, e.url);
            
            if (this.bionicToggle.checked) {
                setTimeout(() => {
                    this.applyBionicReadingToWebView(webview);
                }, 800);
            }
        });

        // Mettre à jour le titre de l'onglet quand la page change
        webview.addEventListener('page-title-updated', (e) => {
            this.tabManager.updateTabTitle(tabId, e.title);
            
            // Mettre à jour l'historique avec le vrai titre
            if (this.urlHistory) {
                const tab = this.tabManager.tabs.get(tabId);
                if (tab && tab.url) {
                    this.urlHistory.addUrl(tab.url, e.title);
                }
            }
        });
    }

    extractDomainFromUrl(url) {
        return this.tabManager.extractDomainFromUrl(url);
    }

    setupIpcListeners() {
        // Écouter les événements du processus principal
        ipcRenderer.on('load-pdf', (event, filePath) => {
            const fileName = filePath.split('\\').pop().split('/').pop();
            // Créer un nouvel onglet avec le PDF viewer intégré
            this.tabManager.createNewTab(filePath, fileName, true); // true = isPDF
        });

        ipcRenderer.on('navigate-to-url', (event, url) => {
            const tempTitle = this.extractDomainFromUrl(url);
            this.tabManager.createNewTab(url, tempTitle);
            // L'historique sera ajouté automatiquement par navigateTab
        });
    }

    applyBionicReadingToWebView(webview) {
        if (!webview || !this.bionicToggle.checked) return;

        // Utiliser la fonction d'attente intelligente
        this.waitForWebViewReady(webview, () => {

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
                
            } catch (error) {
                // Error in Flash Sight injection handled silently
            }
        `;
        
        webview.executeJavaScript(script).catch(error => {
            // Error executing Flash Sight script handled silently
        });
        }); // Fermeture de waitForWebViewReady
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
                // Cannot access iframe content due to same-origin policy
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
            // Utiliser la fonction d'attente intelligente
            this.waitForWebViewReady(currentTab.webview, () => {
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
                    
                } catch (error) {
                    // Error removing Flash Sight handled silently
                }
                `;
                currentTab.webview.executeJavaScript(script).catch(error => {
                    // Error executing script handled silently
                });
            });
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
                // Cannot access iframe content for cleanup
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
            // Error toggling dev console handled silently
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
            } catch (error) {
                // Error applying font settings handled silently
            }
        `;
        
        currentTab.webview.executeJavaScript(script).catch(error => {
            // Error executing font script handled silently
        });
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
                // Cannot access iframe for font settings
            }
        });
    }

    applyZoomSettings() {
        const currentTab = this.tabManager.getCurrentTab();
        if (!currentTab || !currentTab.webview) return;

        const zoomLevel = this.zoomSlider ? parseFloat(this.zoomSlider.value) : 1.0;
        
        try {
            currentTab.webview.setZoomFactor(zoomLevel);
        } catch (error) {
            // Error setting zoom handled silently
        }
    }

    // ===== NOUVELLES MÉTHODES AMÉLIORÉES =====

    /**
     * Initialise le mode immersif selon l'état sauvegardé
     */
    initializeImmersiveMode() {
        const savedImmersiveState = this.stateManager.getState('accessibility.immersiveMode');
        
        if (savedImmersiveState === true && !this.immersiveMode.isActive) {
            // Forcer l'activation du mode immersif sans déclencher de mise à jour d'état
            this.immersiveMode.enable(false);
        } else if (savedImmersiveState === false && this.immersiveMode.isActive) {
            // S'assurer que le mode est désactivé
            this.immersiveMode.disable(false);
        }
        
        // S'assurer que l'interface correspond à l'état réel
        if (this.immersiveModeToggle) {
            this.immersiveModeToggle.checked = this.immersiveMode.isActive;
        }
    }

    /**
     * Initialise un viewer PDF dans le conteneur spécifié
     */
    async initializePDFViewer(container, pdfPath) {
        console.log('Initialisation du PDF viewer pour:', pdfPath);
        
        try {
            // Vérifier si PDFViewer est déjà disponible
            if (window.PDFViewer) {
                console.log('PDFViewer déjà disponible, création directe');
                this.createPDFViewer(container, pdfPath);
                return;
            }
            
            // Vérifier si le script est déjà en cours de chargement
            if (window._pdfViewerLoading) {
                console.log('PDFViewer en cours de chargement, attente...');
                // Attendre que le script soit chargé
                const checkInterval = setInterval(() => {
                    if (window.PDFViewer) {
                        clearInterval(checkInterval);
                        console.log('PDFViewer maintenant disponible après attente');
                        this.createPDFViewer(container, pdfPath);
                    }
                }, 100);
                
                // Timeout après 5 secondes
                setTimeout(() => {
                    clearInterval(checkInterval);
                    if (!window.PDFViewer) {
                        console.error('Timeout lors du chargement de PDFViewer');
                        container.innerHTML = `
                            <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: red; flex-direction: column; text-align: center; padding: 20px;">
                                <h3>⏱️ Timeout de chargement</h3>
                                <p>Le module PDF met trop de temps à charger</p>
                                <button onclick="location.reload()" style="margin-top: 10px; padding: 8px 16px; background: #007acc; color: white; border: none; border-radius: 4px; cursor: pointer;">
                                    Recharger l'application
                                </button>
                            </div>
                        `;
                    }
                }, 5000);
                return;
            }
            
            // Marquer comme en cours de chargement
            window._pdfViewerLoading = true;
            
            // Créer un script pour charger le PDFViewer
            const script = document.createElement('script');
            script.src = './modules/PDFViewer.js';
            
            script.onload = () => {
                console.log('Module PDFViewer chargé avec succès');
                window._pdfViewerLoading = false;
                this.createPDFViewer(container, pdfPath);
            };
            
            script.onerror = (error) => {
                console.error('Erreur lors du chargement du module PDFViewer:', error);
                window._pdfViewerLoading = false;
                container.innerHTML = `
                    <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: red; flex-direction: column; text-align: center; padding: 20px;">
                        <h3>❌ Module PDF non disponible</h3>
                        <p>Impossible de charger le module PDFViewer.js</p>
                        <p style="font-size: 12px; color: #666; margin-top: 10px;">
                            Fichier: ${pdfPath}
                        </p>
                        <button onclick="location.reload()" style="margin-top: 10px; padding: 8px 16px; background: #007acc; color: white; border: none; border-radius: 4px; cursor: pointer;">
                            Recharger l'application
                        </button>
                    </div>
                `;
            };
            
            document.head.appendChild(script);
            
        } catch (error) {
            console.error('Erreur lors de l\'initialisation du PDF viewer:', error);
            container.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: red; flex-direction: column; text-align: center; padding: 20px;">
                    <h3>❌ Erreur système</h3>
                    <p>Erreur lors de l'initialisation: ${error.message}</p>
                    <button onclick="location.reload()" style="margin-top: 10px; padding: 8px 16px; background: #007acc; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        Recharger l'application
                    </button>
                </div>
            `;
        }
    }
    
    /**
     * Crée et configure une instance de PDFViewer
     */
    createPDFViewer(container, pdfPath) {
        try {
            console.log('Création de l\'instance PDFViewer pour:', pdfPath);
            console.log('Container disponible:', !!container);
            console.log('PDFViewer class disponible:', typeof PDFViewer);
            
            if (!container) {
                throw new Error('Container non fourni pour PDFViewer');
            }
            
            if (typeof PDFViewer === 'undefined') {
                throw new Error('Classe PDFViewer non disponible');
            }
            
            // Créer une nouvelle instance avec validation
            const pdfViewer = new PDFViewer(container);
            console.log('Instance PDFViewer créée avec succès');
            
            // Stocker la référence pour debug
            container._pdfViewer = pdfViewer;
            
            // Charger le PDF
            if (pdfPath) {
                console.log('Chargement du PDF:', pdfPath);
                pdfViewer.loadPDF(pdfPath).catch(error => {
                    console.error('Erreur lors du chargement du PDF:', error);
                    container.innerHTML = `
                        <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: red; flex-direction: column; text-align: center; padding: 20px;">
                            <h3>❌ Erreur lors du chargement du PDF</h3>
                            <p>${error.message}</p>
                            <p style="font-size: 12px; color: #666; margin-top: 10px;">
                                Fichier: ${pdfPath}
                            </p>
                            <button onclick="this.parentElement.parentElement.innerHTML='<div style=\\'text-align: center; padding: 40px;\\'>Chargement annulé</div>'" 
                                   style="margin-top: 10px; padding: 8px 16px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">
                                Fermer
                            </button>
                        </div>
                    `;
                });
            }
        } catch (error) {
            console.error('Erreur lors de la création du PDFViewer:', error);
            container.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: red; flex-direction: column; text-align: center; padding: 20px;">
                    <h3>❌ Erreur de création</h3>
                    <p>Impossible de créer le viewer PDF: ${error.message}</p>
                    <button onclick="location.reload()" style="margin-top: 10px; padding: 8px 16px; background: #007acc; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        Recharger l'application
                    </button>
                </div>
            `;
        }
    }
    
    /**
     * Configure les abonnements aux changements d'état
     */
    setupStateSubscriptions() {
        this.stateManager.subscribe((newState, oldState) => {
            // Éviter la synchronisation si l'utilisateur est en train d'interagir
            if (this._isUserInteracting) return;
            
            // Synchroniser l'interface avec l'état
            this.syncUIWithState(newState);
            
            // Appliquer les changements automatiquement
            if (newState.intensity !== oldState.intensity) {
                this.forceBionicReading();
            }
            
            if (newState.enabled !== oldState.enabled) {
                if (newState.enabled) {
                    this.forceBionicReading();
                } else {
                    this.removeBionicReading();
                }
            }
            
            // Synchroniser le mode immersif
            if (newState.accessibility?.immersiveMode !== oldState.accessibility?.immersiveMode) {
                if (newState.accessibility.immersiveMode && !this.immersiveMode.isActive) {
                    this.immersiveMode.enable(false); // false pour éviter la boucle
                } else if (!newState.accessibility.immersiveMode && this.immersiveMode.isActive) {
                    this.immersiveMode.disable(false); // false pour éviter la boucle
                }
            }
        });
    }

    /**
     * Synchronise l'interface avec l'état
     */
    syncUIWithState(state) {
        if (this.bionicToggle) this.bionicToggle.checked = state.enabled;
        if (this.intensitySlider) this.intensitySlider.value = state.intensity;
        if (this.intensityValue) this.intensityValue.textContent = Math.round(state.intensity * 100) + '%';
        if (this.accessibilityToggle) this.accessibilityToggle.checked = state.accessibility.highContrast;
        if (this.immersiveModeToggle) this.immersiveModeToggle.checked = state.accessibility.immersiveMode;
        if (this.lazyLoadingToggle) this.lazyLoadingToggle.checked = state.performance.lazyLoading;
    }

    /**
     * Configure les fonctionnalités améliorées
     */
    setupEnhancedFeatures() {
        // Initialiser le sélecteur de thème
        this.themeManager.createThemeSelector('theme-selector-container');
        
        // Configurer le lazy loading
        this.setupLazyLoading();
        
        // Démarrer les analytics
        this.readingAnalytics.startReading();
        
        // Mettre à jour l'affichage analytics périodiquement
        this.startAnalyticsUpdater();
        
        // Mettre à jour l'affichage du cache
        this.updateCacheDisplay();
        
    }

    /**
     * Configure le lazy loading
     */
    setupLazyLoading() {
        const enabled = this.stateManager.getState('performance.lazyLoading');
        
        if (enabled && !this.lazyTransform) {
            this.lazyTransform = new LazyFlashSightTransform(window.flashSightEngine);
        } else if (!enabled && this.lazyTransform) {
            this.lazyTransform.disconnect();
            this.lazyTransform = null;
        }
    }

    /**
     * Démarre la mise à jour périodique des analytics
     */
    startAnalyticsUpdater() {
        setInterval(() => {
            this.updateAnalyticsDisplay();
            this.updateCacheDisplay();
        }, 5000); // Mise à jour toutes les 5 secondes
    }

    /**
     * Met à jour l'affichage des analytics
     */
    updateAnalyticsDisplay() {
        if (!this.readingAnalytics) return;

        // Récupérer les stats depuis la webview active si possible (avec throttling)
        const currentTab = this.tabManager.getCurrentTab();
        if (currentTab && currentTab.webview) {
            // Éviter les appels trop fréquents
            const now = Date.now();
            if (!this.lastAnalyticsUpdate || now - this.lastAnalyticsUpdate > 2000) {
                this.lastAnalyticsUpdate = now;
                this.updateWebviewAnalytics(currentTab.webview, currentTab.id);
            }
        }

        const stats = this.readingAnalytics.getDetailedStats();
        
        if (this.readingTime) {
            const minutes = Math.floor(stats.readingTime / 60000);
            const seconds = Math.floor((stats.readingTime % 60000) / 1000);
            this.readingTime.textContent = `${minutes}m ${seconds}s`;
        }
        
        if (this.wordsRead) {
            this.wordsRead.textContent = stats.wordsRead.toString();
        }
        
        if (this.readingSpeed) {
            this.readingSpeed.textContent = stats.averageSpeed.toString();
        }
        
        if (this.readingEfficiency) {
            this.readingEfficiency.textContent = stats.efficiency + '%';
        }
    }

    /**
     * Met à jour l'affichage du cache
     */
    updateCacheDisplay() {
        if (!this.cacheStats) return;

        try {
            // Calculer la taille du cache localStorage
            let totalSize = 0;
            let itemCount = 0;
            
            for (let key in localStorage) {
                if (localStorage.hasOwnProperty(key)) {
                    totalSize += localStorage[key].length + key.length;
                    itemCount++;
                }
            }
            
            // Calculer la taille du cache sessionStorage
            let sessionSize = 0;
            let sessionCount = 0;
            
            for (let key in sessionStorage) {
                if (sessionStorage.hasOwnProperty(key)) {
                    sessionSize += sessionStorage[key].length + key.length;
                    sessionCount++;
                }
            }
            
            // Formatage des tailles
            const formatBytes = (bytes) => {
                if (bytes === 0) return '0 B';
                const k = 1024;
                const sizes = ['B', 'KB', 'MB'];
                const i = Math.floor(Math.log(bytes) / Math.log(k));
                return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
            };
            
            const totalItems = itemCount + sessionCount;
            const totalSizeBytes = totalSize + sessionSize;
            
            this.cacheStats.textContent = `Cache: ${totalItems} éléments (${formatBytes(totalSizeBytes)})`;
            
        } catch (error) {
            // Error calculating cache handled silently
            this.cacheStats.textContent = 'Cache: Erreur de calcul';
        }
    }

    /**
     * Vide le cache de l'application
     */
    clearCache() {
        try {
            // Sauvegarder les préférences importantes avant de vider
            const importantKeys = [
                'flashsight-preferences',
                'flashsight-state',
                'simpleUrlHistory'
            ];
            
            const savedData = {};
            importantKeys.forEach(key => {
                if (localStorage.getItem(key)) {
                    savedData[key] = localStorage.getItem(key);
                }
            });
            
            // Vider le cache
            localStorage.clear();
            sessionStorage.clear();
            
            // Restaurer les données importantes
            Object.keys(savedData).forEach(key => {
                localStorage.setItem(key, savedData[key]);
            });
            
            // Vider le cache des webviews
            const currentTab = this.tabManager.getCurrentTab();
            if (currentTab && currentTab.webview) {
                currentTab.webview.executeJavaScript(`
                    try {
                        // Vider les caches web
                        if ('caches' in window) {
                            caches.keys().then(names => {
                                names.forEach(name => {
                                    caches.delete(name);
                                });
                            });
                        }
                        
                        // Vider localStorage et sessionStorage de la page
                        localStorage.clear();
                        sessionStorage.clear();
                        
                    } catch (error) {
                        // Error clearing web cache handled silently
                    }
                `).catch(error => {
                    // Error executing cache clearing script handled silently
                });
            }
            
            // Mettre à jour l'affichage
            this.updateCacheDisplay();
            this.showNotification('Cache vidé avec succès', 'success');
            
        } catch (error) {
            // Error clearing cache handled silently
            this.showNotification('Erreur lors du vidage du cache', 'error');
        }
    }

    /**
     * Attend que la WebView soit prête avant d'exécuter une fonction
     */
    waitForWebViewReady(webview, callback, maxAttempts = 10, currentAttempt = 0) {
        if (!webview || !callback) return;

        // Vérifier si on a atteint le maximum de tentatives
        if (currentAttempt >= maxAttempts) {
            console.warn('WebView toujours pas prête après', maxAttempts, 'tentatives');
            return;
        }

        try {
            // Vérifier si la WebView est attachée au DOM
            if (!webview.offsetParent && !document.body.contains(webview)) {
                // WebView pas dans le DOM
                setTimeout(() => {
                    this.waitForWebViewReady(webview, callback, maxAttempts, currentAttempt + 1);
                }, 500);
                return;
            }

            // Vérifier si la WebView a un WebContentsId
            const webContentsId = webview.getWebContentsId();
            if (!webContentsId || webContentsId <= 0) {
                // WebContents pas encore créé
                setTimeout(() => {
                    this.waitForWebViewReady(webview, callback, maxAttempts, currentAttempt + 1);
                }, 500);
                return;
            }

            // Vérifier si la WebView a fini de charger
            if (webview.isLoading && webview.isLoading()) {
                // Encore en cours de chargement
                setTimeout(() => {
                    this.waitForWebViewReady(webview, callback, maxAttempts, currentAttempt + 1);
                }, 500);
                return;
            }

            // WebView prête, exécuter le callback
            callback();

        } catch (error) {
            // WebView pas encore prête, réessayer
            setTimeout(() => {
                this.waitForWebViewReady(webview, callback, maxAttempts, currentAttempt + 1);
            }, 500);
        }
    }

    /**
     * Configure les analytics pour une webview (version simplifiée)
     */
    setupWebviewAnalytics(webview, tabId) {
        if (!webview || !this.readingAnalytics) return;

        // Utiliser la fonction d'attente intelligente
        this.waitForWebViewReady(webview, () => {
            // Version ultra-simplifiée qui ne risque pas d'échouer
            const script = `
                window.simpleAnalytics = { wordsRead: 0, startTime: Date.now() };
            `;

            webview.executeJavaScript(script).catch(() => {
                // Ignorer silencieusement les erreurs
            });
        });
    }

    /**
     * Met à jour les analytics depuis une webview (version simplifiée)
     */
    updateWebviewAnalytics(webview, tabId) {
        if (!webview || !this.readingAnalytics) return;

        // Utiliser la fonction d'attente intelligente
        this.waitForWebViewReady(webview, () => {
            // Version ultra-simplifiée
            const script = `
                (function() {
                    try {
                        const textContent = document.body.textContent || '';
                        const words = textContent.trim().split(/\\s+/).filter(w => w.length > 0);
                        const wordsCount = Math.min(words.length, 5000); // Limiter
                        return { wordsRead: wordsCount, readingTime: 0, averageSpeed: 0, efficiency: 0 };
                    } catch (e) {
                        return { wordsRead: 0, readingTime: 0, averageSpeed: 0, efficiency: 0 };
                    }
                })();
            `;

            webview.executeJavaScript(script).then(stats => {
                if (stats && typeof stats === 'object' && stats.wordsRead > 0) {
                    this.readingAnalytics.metrics.wordsRead = stats.wordsRead;
                    // Calculer une vitesse approximative
                    const minutes = (Date.now() - this.readingAnalytics.metrics.sessionStartTime) / 60000;
                    if (minutes > 0) {
                        this.readingAnalytics.metrics.averageSpeed = Math.round(stats.wordsRead / minutes);
                    }
                }
            }).catch(() => {
                // Ignorer silencieusement les erreurs
            });
        });
    }

    /**
     * Reset les analytics pour une nouvelle page (version simplifiée)
     */
    resetWebviewAnalytics(webview, tabId) {
        if (!webview) return;

        // Vérifier que la webview est prête
        try {
            if (!webview.getWebContentsId) {
                return;
            }
        } catch (error) {
            return;
        }

        const script = `if (window.simpleAnalytics) { window.simpleAnalytics = { wordsRead: 0, startTime: Date.now() }; }`;
        webview.executeJavaScript(script).catch(() => {
            // Ignorer les erreurs
        });
    }

    /**
     * Reset complètement toutes les analytics
     */
    resetAllAnalytics() {
        // Reset du module principal
        if (this.readingAnalytics) {
            this.readingAnalytics.resetSession();
        }

        // Reset de toutes les webviews ouvertes
        this.tabManager.tabs.forEach((tab, tabId) => {
            if (tab.webview) {
                this.resetWebviewAnalytics(tab.webview, tabId);
            }
        });

        // Mise à jour immédiate de l'affichage
        setTimeout(() => {
            this.updateAnalyticsDisplay();
        }, 100);

        this.showNotification('Analytics remises à zéro', 'success');
    }

    /**
     * Exporte les analytics
     */
    exportAnalytics() {
        try {
            const data = this.readingAnalytics.exportStats();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `flashsight-analytics-${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
            
            this.showNotification('Analytics exportées avec succès', 'success');
        } catch (error) {
            // Error exporting analytics handled silently
            this.showNotification('Erreur lors de l\'export', 'error');
        }
    }

    /**
     * Améliore la transformation Flash Sight avec les nouvelles fonctionnalités
     */
    forceBionicReading() {
        const currentTab = this.tabManager.getCurrentTab();
        if (currentTab && currentTab.webview && this.stateManager.getState('enabled')) {
            // Enregistrer la transformation dans les analytics
            if (this.readingAnalytics) {
                this.readingAnalytics.recordTransformation();
            }
            
            // Appliquer avec lazy loading si activé
            if (this.stateManager.getState('performance.lazyLoading') && this.lazyTransform) {
                this.applyBionicReadingWithLazyLoading(currentTab.webview);
            } else {
                this.applyBionicReadingToWebView(currentTab.webview);
            }
            
            // Mettre à jour les analytics après transformation
            setTimeout(() => {
                this.updateWebviewAnalytics(currentTab.webview, currentTab.id);
            }, 1000);
        }
        
        // Appliquer aussi aux pages d'accueil
        this.applyFlashSightToWelcomePage();
    }

    /**
     * Applique Flash Sight avec lazy loading
     */
    applyBionicReadingWithLazyLoading(webview) {
        const script = `
            try {
                // Initialiser le lazy loading dans la webview
                if (window.LazyFlashSightTransform && window.flashSightEngine) {
                    const lazyTransform = new LazyFlashSightTransform(window.flashSightEngine);
                    lazyTransform.observeElements();
                } else {
                    // Fallback vers transformation normale
                    ${this.getFlashSightScript()}
                }
            } catch (error) {
                // Error lazy FlashSight handled silently
            }
        `;
        
        webview.executeJavaScript(script).catch(error => {
            // Error executing script handled silently
        });
    }

    /**
     * Retourne le script Flash Sight simplifié
     */
    getFlashSightScript() {
        return `
            // Script Flash Sight existant
            document.querySelectorAll('.flashsight-word').forEach(word => {
                word.parentNode.replaceChild(document.createTextNode(word.textContent), word);
            });
            
            class SimpleFlashSight {
                constructor(intensity = ${this.stateManager.getState('intensity')}) {
                    this.intensity = intensity;
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
                
                transformPage() {
                    const selectors = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'td', 'th', 'blockquote'];
                    selectors.forEach(selector => {
                        document.querySelectorAll(selector).forEach(el => {
                            if (el.textContent.trim() && !el.querySelector('.flashsight-word')) {
                                const words = el.textContent.split(/(\\s+)/);
                                const transformedWords = words.map(word => {
                                    return /^\\s+$/.test(word) ? word : this.transformWord(word);
                                });
                                el.innerHTML = transformedWords.join('');
                            }
                        });
                    });
                }
            }
            
            const engine = new SimpleFlashSight();
            engine.transformPage();
        `;
    }

    /**
     * Affiche une notification utilisateur
     */
    showNotification(message, type = 'info') {
        if (this.accessibilityManager) {
            this.accessibilityManager.announce(message);
        }
        
        // Notification visuelle
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        const style = document.createElement('style');
        style.textContent = `
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 12px 20px;
                border-radius: 4px;
                color: white;
                font-weight: bold;
                z-index: 9999;
                animation: slideIn 0.3s ease;
            }
            .notification-success { background: #4caf50; }
            .notification-error { background: #f44336; }
            .notification-info { background: #2196f3; }
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideIn 0.3s ease reverse';
            setTimeout(() => {
                notification.remove();
                style.remove();
            }, 300);
        }, 3000);
    }

    /**
     * Nettoie les ressources lors de la fermeture
     */
    destroy() {
        if (this.readingAnalytics) {
            this.readingAnalytics.destroy();
        }
        
        if (this.errorHandler) {
            this.errorHandler.destroy();
        }
        
        if (this.themeManager) {
            this.themeManager.destroy();
        }
        
        if (this.accessibilityManager) {
            this.accessibilityManager.destroy();
        }
        
        if (this.urlHistoryManager) {
            this.urlHistoryManager.destroy();
        }
        
        if (this.urlHistoryUI) {
            this.urlHistoryUI.destroy();
        }
        
        if (this.lazyTransform) {
            this.lazyTransform.disconnect();
        }
    }
}

// Initialiser l'application quand le DOM est prêt
document.addEventListener('DOMContentLoaded', () => {
    // Vérifier que le moteur Flash Sight est disponible
    if (typeof window.flashSightEngine === 'undefined') {
        // Flash Sight Engine not loaded, using simplified version
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

            // Initialiser l'état depuis les préférences sauvegardées
            window.app.stateManager.setState({
                enabled: bionicToggle?.checked || true
            });
            
        } catch (error) {
            // Error initializing Flash Sight App handled silently
            
            // Fallback d'urgence
            if (window.ErrorHandler) {
                const errorHandler = new ErrorHandler();
                errorHandler.handleError({
                    type: 'initialization',
                    message: error.message,
                    error: error,
                    timestamp: Date.now()
                });
            }
        }
    }, 100);

    // Nettoyer lors de la fermeture
    window.addEventListener('beforeunload', () => {
        if (window.app && window.app.destroy) {
            window.app.destroy();
        }
    });
});
