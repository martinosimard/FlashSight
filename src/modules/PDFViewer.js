/**
 * Visualiseur PDF intégré avec FlashSight et thèmes
 * Version 1.1.0 - Support complet PDF avec thèmes clair/sombre
 */

class PDFViewer {
    constructor(container, stateManager = null, themeManager = null) {
        // Validation stricte du conteneur
        if (!container) {
            throw new Error('Container is required for PDFViewer');
        }
        
        if (!container.appendChild) {
            throw new Error('Container must be a valid DOM element');
        }
        
        this.container = container;
        this.stateManager = stateManager || (window.flashSightApp ? window.flashSightApp.stateManager : null);
        this.themeManager = themeManager || (window.flashSightApp ? window.flashSightApp.themeManager : null);
        this.pdfDoc = null;
        this.currentPage = 1;
        this.scale = 1.0;
        this.textContent = '';
        this.pages = [];
        this.isLoading = false;
        this.textContentCache = new Map();
        this.transformedTextCache = new Map();
        this.isInitialized = false;
        
        // Configuration de police pour PDF
        this.fontConfig = {
            size: 16,
            family: 'Arial, sans-serif',
            lineHeight: 1.5
        };
        
        console.log('PDFViewer constructeur:');
        console.log('- Container:', this.container ? 'OK' : 'NULL');
        console.log('- Container type:', this.container ? this.container.constructor.name : 'N/A');
        console.log('- StateManager:', this.stateManager ? 'OK' : 'NULL');
        console.log('- ThemeManager:', this.themeManager ? 'OK' : 'NULL');
        
        this.setupKeyboardShortcuts();
        // this.setupThemeListener(); // Désactivé temporairement pour éviter l'erreur
    }

    /**
     * Crée l'interface du visualiseur PDF
     */
    createInterface() {
        if (!this.container) {
            console.error('PDFViewer: Pas de conteneur pour créer l\'interface');
            return;
        }
        
        console.log('Création de l\'interface PDF...');
        
        this.container.innerHTML = `
            <div class="pdf-toolbar">
                <div class="pdf-toolbar-left">
                    <button id="pdf-prev" class="pdf-btn" title="Page précédente (←)">
                        <span>←</span>
                    </button>
                    <span class="pdf-page-info">
                        <input type="number" id="pdf-page-input" value="1" min="1" max="1" class="pdf-page-input">
                        <span id="pdf-page-total">/ 1</span>
                    </span>
                    <button id="pdf-next" class="pdf-btn" title="Page suivante (→)">
                        <span>→</span>
                    </button>
                </div>
                
                <div class="pdf-toolbar-center">
                    <button id="pdf-zoom-out" class="pdf-btn" title="Zoom arrière (-)">-</button>
                    <span id="pdf-zoom-level" class="pdf-zoom-level">100%</span>
                    <button id="pdf-zoom-in" class="pdf-btn" title="Zoom avant (+)">+</button>
                    <button id="pdf-fit-width" class="pdf-btn" title="Ajuster à la largeur">⊞</button>
                </div>
                
                <div class="pdf-toolbar-right">
                    <label class="pdf-font-size-label">
                        Taille: 
                        <input type="range" id="pdf-font-size" min="12" max="24" value="16" class="pdf-font-slider">
                        <span id="pdf-font-size-value">16px</span>
                    </label>
                    <button id="pdf-theme-toggle" class="pdf-btn" title="Basculer thème sombre">🌙</button>
                    <button id="pdf-flashsight-toggle" class="pdf-btn active" title="Activer/Désactiver FlashSight">⚡ FlashSight</button>
                    <button id="pdf-download" class="pdf-btn" title="Télécharger PDF">💾</button>
                </div>
            </div>
            
            <div class="pdf-content-wrapper">
                <div class="pdf-text-content" id="pdf-text-content">
                    <div class="pdf-loading">
                        <div class="pdf-spinner"></div>
                        <p>Chargement du PDF...</p>
                    </div>
                </div>
                <div class="pdf-scroll-indicator">
                    <div class="pdf-scroll-track">
                        <div class="pdf-scroll-thumb"></div>
                    </div>
                </div>
            </div>
        `;
        
        // Configurer les contrôles après création du HTML
        this.setupPDFControls();
        this.setupScrollIndicator();
        
        this.isInitialized = true;
        console.log('Interface PDF créée avec succès');
    }

    /**
     * Crée le conteneur du visualiseur PDF
     */
    createPDFContainer(tabContent) {
        this.container = document.createElement('div');
        this.container.className = 'pdf-viewer-container';
        
        this.container.innerHTML = `
            <div class="pdf-toolbar">
                <div class="pdf-toolbar-left">
                    <button id="pdf-prev" class="pdf-btn" title="Page précédente (←)">
                        <span>←</span>
                    </button>
                    <span class="pdf-page-info">
                        <input type="number" id="pdf-page-input" value="1" min="1" max="1" class="pdf-page-input">
                        <span id="pdf-page-total">/ 1</span>
                    </span>
                    <button id="pdf-next" class="pdf-btn" title="Page suivante (→)">
                        <span>→</span>
                    </button>
                </div>
                
                <div class="pdf-toolbar-center">
                    <button id="pdf-zoom-out" class="pdf-btn" title="Zoom arrière (-)">-</button>
                    <span id="pdf-zoom-level" class="pdf-zoom-level">100%</span>
                    <button id="pdf-zoom-in" class="pdf-btn" title="Zoom avant (+)">+</button>
                    <button id="pdf-fit-width" class="pdf-btn" title="Ajuster à la largeur">⊞</button>
                </div>
                
                <div class="pdf-toolbar-right">
                    <label class="pdf-font-size-label">
                        Taille: 
                        <input type="range" id="pdf-font-size" min="12" max="24" value="16" class="pdf-font-slider">
                        <span id="pdf-font-size-value">16px</span>
                    </label>
                    <button id="pdf-theme-toggle" class="pdf-btn" title="Basculer thème sombre">🌙</button>
                                        <button id="pdf-flashsight-toggle" class="pdf-btn active" title="Activer/Désactiver FlashSight">⚡ FlashSight</button>
                    <button id="pdf-download" class="pdf-btn" title="Télécharger PDF">💾</button>
                </div>
            </div>
            
            <div class="pdf-content-wrapper">
                <div class="pdf-text-content" id="pdf-text-content">
                    <div class="pdf-loading">
                        <div class="pdf-spinner"></div>
                        <p>Chargement du PDF...</p>
                    </div>
                </div>
                <div class="pdf-scroll-indicator">
                    <div class="pdf-scroll-track">
                        <div class="pdf-scroll-thumb"></div>
                    </div>
                </div>
            </div>
        `;
        
        tabContent.appendChild(this.container);
        this.setupPDFControls();
        this.setupScrollIndicator();
        
        return this.container;
    }

    /**
     * Configure les contrôles PDF
     */
    setupPDFControls() {
        if (!this.container) {
            console.error('PDFViewer: Container non disponible pour setupPDFControls');
            return;
        }
        
        // Helper pour ajouter des event listeners de façon sécurisée
        const addSafeListener = (selector, event, callback) => {
            const element = this.container.querySelector(selector);
            if (element) {
                element.addEventListener(event, callback);
            } else {
                console.warn(`PDFViewer: Élément ${selector} non trouvé`);
            }
        };
        
        // Navigation
        addSafeListener('#pdf-prev', 'click', () => this.previousPage());
        addSafeListener('#pdf-next', 'click', () => this.nextPage());
        addSafeListener('#pdf-page-input', 'change', (e) => this.goToPage(parseInt(e.target.value)));
        
        // Zoom
        addSafeListener('#pdf-zoom-out', 'click', () => this.changeZoom(-0.2));
        addSafeListener('#pdf-zoom-in', 'click', () => this.changeZoom(0.2));
        addSafeListener('#pdf-fit-width', 'click', () => this.fitToWidth());
        
        // Police
        addSafeListener('#pdf-font-size', 'input', (e) => this.changeFontSize(parseInt(e.target.value)));
        
        // Thème
        addSafeListener('#pdf-theme-toggle', 'click', () => this.togglePDFTheme());
        
        // FlashSight
        addSafeListener('#pdf-flashsight-toggle', 'click', () => this.toggleFlashSight());
        
        // Téléchargement
        addSafeListener('#pdf-download', 'click', () => this.downloadPDF());
    }

    /**
     * Configure l'indicateur de scroll personnalisé
     */
    setupScrollIndicator() {
        if (!this.container) {
            console.error('PDFViewer: Container non disponible pour setupScrollIndicator');
            return;
        }
        
        const content = this.container.querySelector('#pdf-text-content');
        const track = this.container.querySelector('.pdf-scroll-track');
        const thumb = this.container.querySelector('.pdf-scroll-thumb');
        
        if (!content || !track || !thumb) {
            console.warn('PDFViewer: Éléments de scroll non trouvés');
            return;
        }
        
        let isDragging = false;
        
        // S'assurer que le conteneur peut recevoir le focus pour les événements de scroll
        content.setAttribute('tabindex', '0');
        
        // Mise à jour de la position du thumb
        content.addEventListener('scroll', () => {
            if (!isDragging) {
                this.updateScrollThumb();
            }
        });
        
        // Événement de roue de souris pour forcer le scroll
        content.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 50 : -50;
            content.scrollTop += delta;
        });
        
        // Événements clavier pour scroll
        content.addEventListener('keydown', (e) => {
            switch(e.key) {
                case 'ArrowUp':
                    e.preventDefault();
                    content.scrollTop -= 50;
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    content.scrollTop += 50;
                    break;
                case 'PageUp':
                    e.preventDefault();
                    content.scrollTop -= content.clientHeight * 0.8;
                    break;
                case 'PageDown':
                    e.preventDefault();
                    content.scrollTop += content.clientHeight * 0.8;
                    break;
                case 'Home':
                    e.preventDefault();
                    content.scrollTop = 0;
                    break;
                case 'End':
                    e.preventDefault();
                    content.scrollTop = content.scrollHeight;
                    break;
            }
        });
        
        // Glisser-déposer du thumb
        thumb.addEventListener('mousedown', (e) => {
            isDragging = true;
            const startY = e.clientY;
            const thumbRect = thumb.getBoundingClientRect();
            const trackRect = track.getBoundingClientRect();
            
            const handleMouseMove = (e) => {
                const deltaY = e.clientY - startY;
                const newTop = Math.max(0, Math.min(trackRect.height - thumbRect.height, deltaY));
                const scrollRatio = newTop / (trackRect.height - thumbRect.height);
                content.scrollTop = scrollRatio * (content.scrollHeight - content.clientHeight);
            };
            
            const handleMouseUp = () => {
                isDragging = false;
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
            
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        });
        
        // Clic sur la track
        track.addEventListener('click', (e) => {
            if (e.target === track) {
                const trackRect = track.getBoundingClientRect();
                const clickRatio = (e.clientY - trackRect.top) / trackRect.height;
                content.scrollTop = clickRatio * (content.scrollHeight - content.clientHeight);
            }
        });
        
        // Donner le focus au conteneur pour permettre les événements clavier
        content.focus();
    }

    /**
     * Met à jour la position du thumb de scroll
     */
    updateScrollThumb() {
        const content = this.container.querySelector('#pdf-text-content');
        const thumb = this.container.querySelector('.pdf-scroll-thumb');
        
        if (!content || !thumb) return;
        
        const scrollRatio = content.scrollTop / (content.scrollHeight - content.clientHeight) || 0;
        const thumbHeight = Math.max(20, (content.clientHeight / content.scrollHeight) * 100);
        const thumbTop = scrollRatio * (100 - thumbHeight);
        
        thumb.style.height = thumbHeight + '%';
        thumb.style.top = thumbTop + '%';
    }

    /**
     * Charge un PDF depuis une URL
     */
    async loadPDF(pdfUrl) {
        if (this.isLoading) {
            console.warn('PDFViewer: Chargement déjà en cours, ignoré');
            return;
        }
        
        console.log('PDFViewer.loadPDF appelé avec:', pdfUrl);
        console.log('Container état:', this.container ? 'OK' : 'NULL');
        
        // Créer l'interface si elle n'existe pas encore
        if (!this.isInitialized || !this.container.innerHTML.trim()) {
            console.log('Création de l\'interface PDF...');
            try {
                this.createInterface();
            } catch (error) {
                console.error('Erreur lors de la création de l\'interface:', error);
                this.container.innerHTML = `
                    <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: red; flex-direction: column; text-align: center; padding: 20px;">
                        <h3>❌ Erreur d'interface</h3>
                        <p>Impossible de créer l'interface PDF: ${error.message}</p>
                        <button onclick="location.reload()" style="margin-top: 10px; padding: 8px 16px; background: #007acc; color: white; border: none; border-radius: 4px; cursor: pointer;">
                            Recharger
                        </button>
                    </div>
                `;
                return;
            }
        }
        
        this.isLoading = true;
        const loadingEl = this.container.querySelector('.pdf-loading');
        const contentEl = this.container.querySelector('#pdf-text-content');
        
        if (!loadingEl || !contentEl) {
            console.error('PDFViewer: Éléments d\'interface non trouvés après création');
            console.log('loadingEl:', !!loadingEl, 'contentEl:', !!contentEl);
            this.container.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: red; flex-direction: column; text-align: center; padding: 20px;">
                    <h3>❌ Interface incomplète</h3>
                    <p>Éléments d'interface manquants</p>
                    <p style="font-size: 12px;">Loading: ${!!loadingEl}, Content: ${!!contentEl}</p>
                    <button onclick="location.reload()" style="margin-top: 10px; padding: 8px 16px; background: #007acc; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        Recharger
                    </button>
                </div>
            `;
            this.isLoading = false;
            return;
        }
        
        try {
            loadingEl.style.display = 'flex';
            
            // Simulation du chargement PDF avec extraction de texte
            await this.simulatePDFLoading(pdfUrl);
            
            // Affichage du contenu
            this.displayPDFContent();
            this.updateUI();
            
            loadingEl.style.display = 'none';
            
        } catch (error) {
            console.error('Erreur lors du chargement du PDF:', error);
            contentEl.innerHTML = `
                <div class="pdf-error">
                    <h3>❌ Erreur de chargement</h3>
                    <p>Impossible de charger le PDF: ${pdfUrl}</p>
                    <p class="error-details">${error.message}</p>
                    <button onclick="location.reload()" class="pdf-btn">Réessayer</button>
                </div>
            `;
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Simule le chargement et l'extraction de texte d'un PDF
     */
    async simulatePDFLoading(pdfUrl) {
        console.log('Chargement du contenu pour:', pdfUrl);
        
        try {
            // Si c'est un de nos fichiers de test, on charge le contenu réel
            if (pdfUrl.endsWith('.txt') || pdfUrl.endsWith('.md') || 
                pdfUrl === 'test-flashsight.txt' || pdfUrl === 'test-flashsight-2.txt' ||
                pdfUrl === 'document-a.md' || pdfUrl === 'document-b.md') {
                
                console.log('Tentative de chargement du fichier:', pdfUrl);
                const response = await fetch(pdfUrl);
                
                if (response.ok) {
                    const textContent = await response.text();
                    console.log('Contenu chargé avec succès, taille:', textContent.length);
                    console.log('Aperçu du contenu:', textContent.substring(0, 100) + '...');
                    
                    // Diviser le contenu en pages (environ 2000 caractères par page)
                    const pageSize = 2000;
                    const pages = [];
                    
                    if (textContent.length <= pageSize) {
                        // Contenu court, une seule page
                        pages.push({
                            pageNumber: 1,
                            text: textContent
                        });
                    } else {
                        // Diviser en pages multiples en préservant les paragraphes
                        const paragraphs = textContent.split('\n\n');
                        let currentPage = '';
                        let pageNumber = 1;
                        
                        for (const paragraph of paragraphs) {
                            if (currentPage.length + paragraph.length + 2 > pageSize && currentPage.length > 0) {
                                // Créer une nouvelle page
                                pages.push({
                                    pageNumber: pageNumber,
                                    text: currentPage.trim()
                                });
                                currentPage = paragraph;
                                pageNumber++;
                            } else {
                                if (currentPage.length > 0) {
                                    currentPage += '\n\n' + paragraph;
                                } else {
                                    currentPage = paragraph;
                                }
                            }
                        }
                        
                        // Ajouter la dernière page
                        if (currentPage.trim().length > 0) {
                            pages.push({
                                pageNumber: pageNumber,
                                text: currentPage.trim()
                            });
                        }
                    }
                    
                    this.pages = pages;
                    this.totalPages = pages.length;
                    console.log(`Contenu divisé en ${this.totalPages} page(s)`);
                    return;
                }
            }
            
            // Pour les vrais PDFs, afficher un contenu spécifique au fichier
            if (pdfUrl.toLowerCase().endsWith('.pdf')) {
                console.log('Chargement d\'un vrai PDF:', pdfUrl);
                await this.loadActualPDFContent(pdfUrl);
                return;
            }
            
            // Fallback: contenu de démonstration générique
            console.log('Utilisation du contenu de démonstration pour:', pdfUrl);
            this.loadFallbackContent(pdfUrl);
            
        } catch (error) {
            console.error('Erreur lors du chargement du fichier:', error);
            this.loadFallbackContent(pdfUrl);
        }
    }

    /**
     * Charge le contenu d'un vrai PDF (simulation avancée)
     */
    loadRealPDFContent(pdfUrl) {
        const fileName = pdfUrl.split(/[\\\/]/).pop() || 'document.pdf';
        const fileNameWithoutExt = fileName.replace('.pdf', '');
        const filePath = pdfUrl.replace(/\\/g, '/');
        
        console.log('Traitement du PDF:', fileName);
        
        this.pages = [
            {
                pageNumber: 1,
                text: `# ${fileNameWithoutExt}

## Informations sur le document

**Nom du fichier :** ${fileName}
**Chemin complet :** ${filePath}
**Type :** Document PDF
**Statut :** Chargé dans FlashSight Reader

---

## FlashSight PDF Reader - Version d'évaluation

Ce visualiseur PDF FlashSight présente actuellement une **version d'évaluation** qui affiche des informations sur le document plutôt que son contenu complet.

### Fonctionnalités disponibles

✅ **Interface PDF complète**
- Navigation par pages avec contrôles intuitifs
- Zoom et ajustement de la taille de police
- Thèmes clair et sombre adaptatifs
- Scrollbar personnalisée pour navigation fluide

✅ **FlashSight Reading intégré**
- Transformation automatique du texte pour lecture rapide
- Intensité réglable selon vos préférences
- Mise en évidence intelligente des premières lettres
- Amélioration prouvée de la vitesse de lecture

✅ **Gestion multi-documents**
- Ouverture de plusieurs PDFs simultanément
- Onglets indépendants avec contrôles séparés
- Historique de navigation intégré
- Support des raccourcis clavier

### Développements futurs

🔄 **Extraction de texte PDF native**
- Intégration d'une bibliothèque d'extraction PDF
- Support complet des formats PDF standard
- Préservation de la mise en forme originale
- Gestion des images et tableaux

🔄 **Fonctionnalités avancées**
- Recherche dans le document
- Annotations et surlignage
- Export vers autres formats
- Synchronisation cloud

### Note technique

Pour une extraction complète du contenu PDF, cette version nécessiterait l'intégration d'une bibliothèque spécialisée comme PDF.js ou pdf-parse. Actuellement, le système affiche ce contenu d'évaluation pour démontrer les capacités de l'interface FlashSight.

**Le document "${fileName}" a été détecté et chargé avec succès dans le système.**`
            },
            {
                pageNumber: 2,
                text: `# Démonstration FlashSight avec ${fileNameWithoutExt}

## Simulation de contenu PDF

Cette page démontre comment FlashSight transformerait le contenu de votre document "${fileName}" une fois l'extraction PDF complète implémentée.

### Exemple de transformation FlashSight

Voici un exemple de texte transformé par l'algorithme FlashSight pour illustrer les capacités de lecture bionique :

**Texte original :**
"Les retours d'expérience Salesforce montrent une amélioration significative de la productivité des équipes commerciales grâce à l'automatisation des processus de vente et au suivi client personnalisé."

**Avec FlashSight activé :**
Ce même texte apparaîtrait avec les premières lettres de chaque mot en gras, facilitant la lecture rapide et la compréhension.

### Avantages de FlashSight pour les documents professionnels

📈 **Augmentation de productivité**
- Lecture 25-40% plus rapide des rapports
- Meilleure rétention des informations clés
- Réduction de la fatigue oculaire
- Traitement plus efficace des données

📊 **Optimisation pour les documents métier**
- Adaptation automatique aux terminologies techniques
- Préservation de la structure des tableaux
- Respect de la hiérarchie des informations
- Support des annexes et références

🎯 **Personnalisation avancée**
- Ajustement de l'intensité selon le type de contenu
- Thèmes adaptés à l'environnement de travail
- Contrôles ergonomiques pour sessions prolongées
- Intégration avec les outils de productivité

### Votre document : ${fileName}

Ce document semble contenir des informations importantes sur Salesforce. Avec FlashSight pleinement intégré, vous pourriez :

- Parcourir rapidement les retours d'expérience
- Identifier les points clés plus efficacement  
- Assimiler les recommandations plus rapidement
- Améliorer votre compréhension globale

La technologie FlashSight transformerait votre expérience de lecture de ce type de documentation professionnelle, vous permettant d'extraire l'information critique plus rapidement.`
            }
        ];
        
        this.totalPages = this.pages.length;
    }

    /**
     * Charge le contenu d'un vrai PDF en utilisant IPC vers le main process
     */
    async loadActualPDFContent(pdfUrl) {
        const fileName = pdfUrl.split(/[\\\/]/).pop() || 'document.pdf';
        const fileNameWithoutExt = fileName.replace('.pdf', '');
        
        console.log('Extraction du contenu PDF via IPC:', fileName);
        
        try {
            // Utiliser IPC pour demander l'extraction du PDF au main process
            const { ipcRenderer } = require('electron');
            
            // Envoyer une requête au main process pour extraire le PDF
            const pdfData = await ipcRenderer.invoke('extract-pdf-content', pdfUrl);
            
            if (!pdfData || !pdfData.success) {
                throw new Error(pdfData ? pdfData.error : 'Erreur inconnue lors de l\'extraction PDF');
            }
            
            const { text: extractedText, numpages, fileSize } = pdfData;
            
            console.log('Texte extrait avec succès, longueur:', extractedText.length);
            console.log('Nombre de pages dans le PDF:', numpages);
            console.log('Aperçu du texte:', extractedText.substring(0, 200) + '...');
            
            if (!extractedText || extractedText.trim().length === 0) {
                console.warn('Aucun texte extrait du PDF, utilisation du fallback');
                this.loadFallbackContent(pdfUrl);
                return;
            }
            
            // Diviser le contenu en pages (environ 2000 caractères par page pour une lecture confortable)
            const pageSize = 2000;
            const pages = [];
            
            // Ajouter une page de titre avec les métadonnées
            pages.push({
                pageNumber: 1,
                text: `# ${fileNameWithoutExt}

## Informations sur le document

**Nom du fichier :** ${fileName}
**Nombre de pages dans le PDF original :** ${numpages}
**Taille du fichier :** ${Math.round(fileSize / 1024)} KB
**Contenu extrait :** ${extractedText.length} caractères

---

## Contenu du document

Le contenu suivant a été extrait automatiquement de votre document PDF et est prêt pour la lecture FlashSight.

*Conseil : Utilisez les contrôles de navigation pour parcourir le document et activez FlashSight pour une lecture plus rapide.*

---`
            });
            
            // Diviser le texte extrait en pages
            if (extractedText.length <= pageSize) {
                // Contenu court, ajouter directement après la page de titre
                pages.push({
                    pageNumber: 2,
                    text: extractedText
                });
            } else {
                // Diviser en pages multiples en préservant les paragraphes
                const paragraphs = extractedText.split('\n\n');
                let currentPage = '';
                let pageNumber = 2; // Commencer à 2 car la page 1 est la page de titre
                
                for (const paragraph of paragraphs) {
                    const trimmedParagraph = paragraph.trim();
                    if (!trimmedParagraph) continue;
                    
                    if (currentPage.length + trimmedParagraph.length + 2 > pageSize && currentPage.length > 0) {
                        // Créer une nouvelle page
                        pages.push({
                            pageNumber: pageNumber,
                            text: currentPage.trim()
                        });
                        currentPage = trimmedParagraph;
                        pageNumber++;
                    } else {
                        if (currentPage.length > 0) {
                            currentPage += '\n\n' + trimmedParagraph;
                        } else {
                            currentPage = trimmedParagraph;
                        }
                    }
                }
                
                // Ajouter la dernière page
                if (currentPage.trim().length > 0) {
                    pages.push({
                        pageNumber: pageNumber,
                        text: currentPage.trim()
                    });
                }
            }
            
            this.pages = pages;
            this.totalPages = pages.length;
            
            console.log(`PDF traité avec succès: ${this.totalPages} pages créées`);
            
        } catch (error) {
            console.error('Erreur lors de l\'extraction du PDF:', error);
            console.error('Détails de l\'erreur:', error.message);
            
            // En cas d'erreur, afficher un message informatif
            this.pages = [
                {
                    pageNumber: 1,
                    text: `# Erreur de lecture PDF

## ${fileNameWithoutExt}

**Erreur rencontrée :** ${error.message}

### Causes possibles

1. **Format PDF non supporté** - Certains PDFs peuvent utiliser des encodages spéciaux
2. **Fichier corrompu** - Le fichier PDF pourrait être endommagé
3. **Permissions insuffisantes** - Problème d'accès au fichier
4. **PDF protégé** - Le document pourrait être protégé par mot de passe

### Solutions suggérées

- Vérifiez que le fichier PDF s'ouvre correctement dans d'autres lecteurs
- Essayez d'exporter le PDF dans un format plus standard
- Assurez-vous que le fichier n'est pas protégé par mot de passe

### Support technique

Cette version de FlashSight utilise la bibliothèque pdf-parse pour l'extraction de texte. Pour des PDFs complexes, il pourrait être nécessaire d'utiliser d'autres outils ou formats.

**Chemin du fichier :** ${pdfUrl}`
                }
            ];
            
            this.totalPages = 1;
        }
    }

    /**
     * Charge un contenu de démonstration générique
     */
    loadFallbackContent(pdfUrl) {
        const fileName = pdfUrl.split('/').pop() || 'document';
        
        this.pages = [
            {
                pageNumber: 1,
                text: `# ${fileName}

Ce document démontre les capacités du visualiseur PDF FlashSight avec support des thèmes clair et sombre.

## Fonctionnalités principales

Le visualiseur PDF de FlashSight offre une expérience de lecture optimisée avec les fonctionnalités suivantes :

### Navigation fluide
- Navigation par pages avec boutons précédent/suivant
- Saisie directe du numéro de page
- Raccourcis clavier (flèches gauche/droite)

### Contrôles de zoom avancés
- Zoom avant/arrière avec boutons + et -
- Ajustement automatique à la largeur de l'écran
- Niveaux de zoom de 50% à 300%

### Personnalisation de la lecture
- Ajustement de la taille de police (12px à 24px)
- Thèmes clair et sombre adaptatifs
- Support complet de FlashSight pour la lecture bionique

### Interface optimisée
- Barre d'outils ergonomique avec icônes intuitives
- Scrollbar personnalisée pour une navigation précise
- Indicateur de progression de lecture

L'algorithme FlashSight transforme automatiquement le texte pour améliorer la vitesse de lecture en mettant en évidence les premières lettres de chaque mot selon un ratio personnalisable.

Cette approche scientifique de la lecture bionique permet d'augmenter significativement la vitesse de lecture tout en maintenant un excellent niveau de compréhension.`
            }
        ];
        
        this.totalPages = this.pages.length;
    }

    /**
     * Affiche le contenu PDF
     */
    displayPDFContent() {
        const contentEl = this.container.querySelector('#pdf-text-content');
        const currentPageData = this.pages[this.currentPage - 1];
        
        if (!currentPageData) return;
        
        // Récupérer le texte de la page
        let text = currentPageData.text;
        
        // Vérifier si FlashSight doit être appliqué
        const flashSightToggle = this.container.querySelector('#pdf-flashsight-toggle');
        const shouldApplyFlashSight = flashSightToggle && flashSightToggle.classList.contains('active');
        
        console.log('FlashSight toggle status:', shouldApplyFlashSight); // Debug
        
        // Appliquer FlashSight si activé
        if (shouldApplyFlashSight) {
            text = this.applyFlashSightToPDF(text);
            console.log('FlashSight appliqué au PDF'); // Debug
        } else {
            console.log('FlashSight non appliqué au PDF'); // Debug
        }
        
        // Conversion markdown basique vers HTML
        text = this.markdownToHTML(text);
        
        contentEl.innerHTML = `
            <div class="pdf-page-content">
                ${text}
                <div class="pdf-page-footer">
                    Page ${this.currentPage} sur ${this.totalPages}
                </div>
            </div>
        `;
        
        // Appliquer le thème et la police
        this.applyPDFStyling();
        
        // Mettre à jour le scroll
        setTimeout(() => this.updateScrollThumb(), 100);
    }

    /**
     * Applique FlashSight au contenu PDF
     */
    applyFlashSightToPDF(text) {
        // Obtenir l'intensité avec fallback
        let intensity = 0.5; // Valeur par défaut
        
        try {
            if (this.stateManager && this.stateManager.getState) {
                intensity = this.stateManager.getState('intensity') || 0.5;
            }
        } catch (error) {
            console.warn('Impossible d\'obtenir l\'intensité du stateManager, utilisation de 0.5');
        }
        
        const cacheKey = `${this.currentPage}-${intensity}`;
        
        if (this.transformedTextCache.has(cacheKey)) {
            return this.transformedTextCache.get(cacheKey);
        }
        
        const transformWord = (word) => {
            // Garder uniquement les mots avec des lettres
            const wordMatch = word.match(/^(\W*)([\w']+)(\W*)$/);
            if (!wordMatch || wordMatch[2].length < 2) return word;
            
            const [, prefix, cleanWord, suffix] = wordMatch;
            const boldLength = Math.max(1, Math.min(cleanWord.length - 1, Math.ceil(cleanWord.length * intensity)));
            const boldPart = cleanWord.substring(0, boldLength);
            const normalPart = cleanWord.substring(boldLength);
            
            return `${prefix}<span class="flashsight-word"><span class="flashsight-bold">${boldPart}</span><span class="flashsight-normal">${normalPart}</span></span>${suffix}`;
        };
        
        // Transformer le texte en préservant la structure markdown
        const transformedText = text.replace(/([^\n#*`]+)/g, (match) => {
            return match.split(/(\s+)/).map(word => {
                return /^\s+$/.test(word) ? word : transformWord(word);
            }).join('');
        });
        
        this.transformedTextCache.set(cacheKey, transformedText);
        return transformedText;
    }

    /**
     * Conversion markdown basique vers HTML avec préservation des paragraphes
     */
    markdownToHTML(text) {
        // Nettoyer le texte et préserver la structure
        const cleanText = text
            .trim()
            .replace(/\r\n/g, '\n')  // Normaliser les retours à la ligne
            .replace(/\r/g, '\n');   // Normaliser les retours à la ligne Mac
            
        return cleanText
            .replace(/^### (.*$)/gm, '<h3>$1</h3>')
            .replace(/^## (.*$)/gm, '<h2>$1</h2>')
            .replace(/^# (.*$)/gm, '<h1>$1</h1>')
            .replace(/^\*\* (.*$)/gm, '<strong>$1</strong>')  // Texte en gras
            .replace(/^\* (.*$)/gm, '<li>$1</li>')            // Listes
            .replace(/^\- (.*$)/gm, '<li>$1</li>')            // Listes avec tirets
            .split('\n\n')                                     // Diviser en paragraphes
            .map(paragraph => {
                paragraph = paragraph.trim();
                if (!paragraph) return '';
                
                // Si c'est déjà un élément HTML, le garder tel quel
                if (paragraph.match(/^<(h[1-6]|ul|ol|li)/)) {
                    return paragraph;
                }
                
                // Gérer les listes
                if (paragraph.includes('<li>')) {
                    return '<ul>' + paragraph + '</ul>';
                }
                
                // Sinon, c'est un paragraphe normal
                return '<p>' + paragraph.replace(/\n/g, '<br>') + '</p>';
            })
            .filter(p => p.length > 0)                        // Supprimer les paragraphes vides
            .join('\n');                                       // Rejoindre avec des sauts de ligne
    }

    /**
     * Applique les styles PDF (thème et police)
     */
    applyPDFStyling() {
        const contentEl = this.container.querySelector('#pdf-text-content');
        if (!contentEl) return;
        
        // Appliquer la taille de police
        contentEl.style.fontSize = this.fontConfig.size + 'px';
        contentEl.style.fontFamily = this.fontConfig.family;
        contentEl.style.lineHeight = this.fontConfig.lineHeight;
        
        // Le thème sera appliqué via CSS
    }

    /**
     * Navigation - Page précédente
     */
    previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.displayPDFContent();
            this.updateUI();
        }
    }

    /**
     * Navigation - Page suivante
     */
    nextPage() {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
            this.displayPDFContent();
            this.updateUI();
        }
    }

    /**
     * Va à une page spécifique
     */
    goToPage(pageNum) {
        if (pageNum >= 1 && pageNum <= this.totalPages) {
            this.currentPage = pageNum;
            this.displayPDFContent();
            this.updateUI();
        }
    }

    /**
     * Change le niveau de zoom
     */
    changeZoom(delta) {
        this.scale = Math.max(0.5, Math.min(3.0, this.scale + delta));
        this.applyZoom();
        this.updateUI();
    }

    /**
     * Ajuste à la largeur
     */
    fitToWidth() {
        this.scale = 1.0;
        this.applyZoom();
        this.updateUI();
    }

    /**
     * Applique le zoom
     */
    applyZoom() {
        const contentEl = this.container.querySelector('#pdf-text-content');
        if (contentEl) {
            contentEl.style.transform = `scale(${this.scale})`;
            contentEl.style.transformOrigin = 'top left';
        }
    }

    /**
     * Change la taille de police
     */
    changeFontSize(size) {
        this.fontConfig.size = size;
        this.applyPDFStyling();
        this.updateUI();
    }

    /**
     * Bascule le thème PDF
     */
    togglePDFTheme() {
        const isDark = this.container.classList.contains('pdf-dark-theme');
        
        if (isDark) {
            this.container.classList.remove('pdf-dark-theme');
            this.container.querySelector('#pdf-theme-toggle').textContent = '🌙';
        } else {
            this.container.classList.add('pdf-dark-theme');
            this.container.querySelector('#pdf-theme-toggle').textContent = '☀️';
        }
    }

    /**
     * Bascule FlashSight
     */
    toggleFlashSight() {
        const toggle = this.container.querySelector('#pdf-flashsight-toggle');
        toggle.classList.toggle('active');
        
        // Debug logs
        const isActive = toggle.classList.contains('active');
        console.log('FlashSight toggle:', isActive ? 'ON' : 'OFF');
        
        // Vider le cache de transformation
        this.transformedTextCache.clear();
        
        // Réafficher le contenu
        this.displayPDFContent();
    }

    /**
     * Télécharge le PDF (simulation)
     */
    downloadPDF() {
        // Simulation du téléchargement
        const link = document.createElement('a');
        link.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(this.pages.map(p => p.text).join('\n\n'));
        link.download = 'document-flashsight.txt';
        link.click();
    }

    /**
     * Met à jour l'interface utilisateur
     */
    updateUI() {
        // Mise à jour des contrôles de page
        const pageInput = this.container.querySelector('#pdf-page-input');
        const pageTotal = this.container.querySelector('#pdf-page-total');
        const prevBtn = this.container.querySelector('#pdf-prev');
        const nextBtn = this.container.querySelector('#pdf-next');
        
        if (pageInput) {
            pageInput.value = this.currentPage;
            pageInput.max = this.totalPages;
        }
        if (pageTotal) pageTotal.textContent = `/ ${this.totalPages}`;
        if (prevBtn) prevBtn.disabled = this.currentPage <= 1;
        if (nextBtn) nextBtn.disabled = this.currentPage >= this.totalPages;
        
        // Mise à jour du zoom
        const zoomLevel = this.container.querySelector('#pdf-zoom-level');
        if (zoomLevel) zoomLevel.textContent = Math.round(this.scale * 100) + '%';
        
        // Mise à jour de la taille de police
        const fontSizeValue = this.container.querySelector('#pdf-font-size-value');
        const fontSizeSlider = this.container.querySelector('#pdf-font-size');
        if (fontSizeValue) fontSizeValue.textContent = this.fontConfig.size + 'px';
        if (fontSizeSlider) fontSizeSlider.value = this.fontConfig.size;
    }

    /**
     * Configure les raccourcis clavier
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (!this.container || !this.container.offsetParent) return;
            
            switch(e.key) {
                case 'ArrowLeft':
                    e.preventDefault();
                    this.previousPage();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.nextPage();
                    break;
                case '+':
                case '=':
                    e.preventDefault();
                    this.changeZoom(0.2);
                    break;
                case '-':
                    e.preventDefault();
                    this.changeZoom(-0.2);
                    break;
                case '0':
                    e.preventDefault();
                    this.fitToWidth();
                    break;
            }
        });
    }

    /**
     * Écoute les changements de thème global
     */
    setupThemeListener() {
        // Écouter les événements de changement de thème
        this.themeChangeHandler = (event) => {
            const { themeName } = event.detail;
            // Synchroniser le thème PDF avec le thème global
            const isDark = ['dark', 'contrast'].includes(themeName);
            if (isDark) {
                this.container?.classList.add('pdf-dark-theme');
            } else {
                this.container?.classList.remove('pdf-dark-theme');
            }
            
            // Mettre à jour l'icône du bouton de thème
            const themeToggle = this.container?.querySelector('#pdf-theme-toggle');
            if (themeToggle) {
                themeToggle.textContent = isDark ? '☀️' : '🌙';
            }
        };

        // Ajouter l'event listener
        window.addEventListener('themeChanged', this.themeChangeHandler);
        
        // Appliquer le thème initial si disponible
        if (this.themeManager && this.themeManager.getCurrentTheme) {
            const currentThemeData = this.themeManager.getCurrentTheme();
            const currentTheme = currentThemeData.effective;
            const isDark = ['dark', 'contrast'].includes(currentTheme);
            if (isDark) {
                this.container?.classList.add('pdf-dark-theme');
            }
        }
    }

    /**
     * Nettoie les ressources
     */
    destroy() {
        // Nettoyer l'event listener de thème
        if (this.themeChangeHandler) {
            window.removeEventListener('themeChanged', this.themeChangeHandler);
            this.themeChangeHandler = null;
        }
        
        this.textContentCache.clear();
        this.transformedTextCache.clear();
        this.container = null;
        this.pdfDoc = null;
    }
}

// Export pour utilisation
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PDFViewer;
} else {
    window.PDFViewer = PDFViewer;
}
