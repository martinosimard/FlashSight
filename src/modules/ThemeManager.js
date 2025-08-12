/**
 * Gestionnaire de thèmes avancé pour FlashSight
 * Support des thèmes multiples et adaptatifs
 */
class ThemeManager {
    constructor(stateManager) {
        this.stateManager = stateManager;
        this.themes = {
            light: {
                name: 'Clair',
                colors: {
                    background: '#ffffff',
                    surface: '#f5f5f5',
                    primary: '#007acc',
                    secondary: '#6c757d',
                    text: '#212529',
                    textSecondary: '#6c757d',
                    border: '#dee2e6',
                    accent: '#007acc'
                }
            },
            dark: {
                name: 'Sombre',
                colors: {
                    background: '#1a1a1a',
                    surface: '#2d2d2d',
                    primary: '#4fc3f7',
                    secondary: '#adb5bd',
                    text: '#ffffff',
                    textSecondary: '#adb5bd',
                    border: '#404040',
                    accent: '#4fc3f7'
                }
            },
            sepia: {
                name: 'Sépia (Lecture)',
                colors: {
                    background: '#f4f3e8',
                    surface: '#ebe8d8',
                    primary: '#8b4513',
                    secondary: '#a0522d',
                    text: '#5d4e37',
                    textSecondary: '#8b7355',
                    border: '#d2b48c',
                    accent: '#cd853f'
                }
            },
            contrast: {
                name: 'Contraste Élevé',
                colors: {
                    background: '#000000',
                    surface: '#1a1a1a',
                    primary: '#ffff00',
                    secondary: '#ffffff',
                    text: '#ffffff',
                    textSecondary: '#ffff00',
                    border: '#ffffff',
                    accent: '#00ff00'
                }
            },
            blue: {
                name: 'Bleu Apaisant',
                colors: {
                    background: '#f0f4ff',
                    surface: '#e3f2fd',
                    primary: '#1976d2',
                    secondary: '#42a5f5',
                    text: '#0d47a1',
                    textSecondary: '#1565c0',
                    border: '#bbdefb',
                    accent: '#2196f3'
                }
            }
        };
        
        this.currentTheme = 'auto';
        this.init();
    }

    init() {
        this.loadThemePreference();
        this.setupSystemThemeDetection();
        this.applyCurrentTheme();
        this.setupThemeStyles();
    }

    /**
     * Charge la préférence de thème depuis l'état
     */
    loadThemePreference() {
        const savedTheme = this.stateManager.getState('theme');
        this.currentTheme = savedTheme || 'auto';
    }

    /**
     * Configure la détection du thème système
     */
    setupSystemThemeDetection() {
        const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const contrastQuery = window.matchMedia('(prefers-contrast: high)');
        
        darkModeQuery.addEventListener('change', () => {
            if (this.currentTheme === 'auto') {
                this.applyCurrentTheme();
            }
        });
        
        contrastQuery.addEventListener('change', () => {
            if (this.currentTheme === 'auto') {
                this.applyCurrentTheme();
            }
        });
    }

    /**
     * Détermine le thème automatique selon les préférences système
     */
    getAutoTheme() {
        const darkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const highContrast = window.matchMedia('(prefers-contrast: high)').matches;
        
        if (highContrast) {
            return 'contrast';
        }
        
        return darkMode ? 'dark' : 'light';
    }

    /**
     * Applique un thème
     */
    setTheme(themeName) {
        this.currentTheme = themeName;
        this.applyCurrentTheme();
        
        // Sauvegarder dans l'état
        this.stateManager.setState({ theme: themeName });
    }

    /**
     * Applique le thème actuel
     */
    applyCurrentTheme() {
        const effectiveTheme = this.currentTheme === 'auto' ? 
            this.getAutoTheme() : this.currentTheme;
        
        const theme = this.themes[effectiveTheme] || this.themes.light;
        
        // Appliquer les variables CSS
        this.applyCSSVariables(theme.colors);
        
        // Appliquer les classes
        this.applyThemeClasses(effectiveTheme);
        
        // Notifier le changement
        this.notifyThemeChange(effectiveTheme, theme);
    }

    /**
     * Applique les variables CSS du thème
     */
    applyCSSVariables(colors) {
        const root = document.documentElement;
        
        Object.entries(colors).forEach(([property, value]) => {
            root.style.setProperty(`--theme-${property}`, value);
        });
        
        // Variables compatibles VS Code
        root.style.setProperty('--vscode-background', colors.background);
        root.style.setProperty('--vscode-surface', colors.surface);
        root.style.setProperty('--vscode-primary', colors.primary);
        root.style.setProperty('--vscode-text', colors.text);
        root.style.setProperty('--vscode-border', colors.border);
    }

    /**
     * Applique les classes CSS du thème
     */
    applyThemeClasses(themeName) {
        const body = document.body;
        
        // Supprimer toutes les classes de thème existantes
        Object.keys(this.themes).forEach(name => {
            body.classList.remove(`theme-${name}`);
        });
        
        // Ajouter la classe du thème actuel
        body.classList.add(`theme-${themeName}`);
        
        // Classes spéciales
        body.classList.toggle('theme-dark', ['dark', 'contrast'].includes(themeName));
        body.classList.toggle('theme-high-contrast', themeName === 'contrast');
        body.classList.toggle('theme-reading', themeName === 'sepia');
    }

    /**
     * Configure les styles de base pour les thèmes
     */
    setupThemeStyles() {
        const style = document.createElement('style');
        style.id = 'theme-manager-styles';
        style.textContent = `
            /* Variables de thème par défaut */
            :root {
                --theme-transition: all 0.3s ease;
            }
            
            /* Transitions fluides pour les changements de thème */
            body,
            .sidebar,
            .tab,
            .tab-content,
            button,
            input,
            select {
                transition: var(--theme-transition);
            }
            
            /* Thème clair */
            .theme-light {
                color-scheme: light;
            }
            
            /* Thème sombre */
            .theme-dark {
                color-scheme: dark;
            }
            
            /* Thème sépia */
            .theme-sepia {
                filter: sepia(10%);
            }
            
            .theme-sepia .flashsight-bold {
                color: var(--theme-primary) !important;
            }
            
            /* Thème contraste élevé */
            .theme-contrast {
                filter: contrast(150%);
            }
            
            .theme-contrast * {
                text-shadow: none !important;
                box-shadow: none !important;
            }
            
            .theme-contrast .flashsight-bold {
                background-color: var(--theme-accent) !important;
                color: var(--theme-background) !important;
            }
            
            /* Thème bleu */
            .theme-blue {
                filter: hue-rotate(10deg) saturate(110%);
            }
            
            /* Adaptations spéciales pour le mode lecture */
            .theme-reading p,
            .theme-reading li {
                line-height: 1.7;
                margin-bottom: 1em;
            }
            
            .theme-reading h1,
            .theme-reading h2,
            .theme-reading h3 {
                color: var(--theme-primary);
                border-bottom: 1px solid var(--theme-border);
                padding-bottom: 0.3em;
            }
            
            /* Animations pour les changements de thème */
            @keyframes themeTransition {
                0% { opacity: 0.8; }
                100% { opacity: 1; }
            }
            
            .theme-transition {
                animation: themeTransition 0.5s ease;
            }
        `;
        
        document.head.appendChild(style);
    }

    /**
     * Crée un sélecteur de thème
     */
    createThemeSelector(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const selectorHTML = `
            <div class="theme-selector">
                <label for="theme-select">Thème:</label>
                <select id="theme-select" class="theme-select">
                    <option value="auto">Automatique</option>
                    ${Object.entries(this.themes).map(([key, theme]) => 
                        `<option value="${key}" ${this.currentTheme === key ? 'selected' : ''}>${theme.name}</option>`
                    ).join('')}
                </select>
            </div>
        `;
        
        container.innerHTML = selectorHTML;
        
        // Ajouter les styles du sélecteur
        this.addThemeSelectorStyles();
        
        // Event listener
        const select = container.querySelector('#theme-select');
        select.addEventListener('change', (e) => {
            this.setTheme(e.target.value);
        });
    }

    /**
     * Ajoute les styles pour le sélecteur de thème
     */
    addThemeSelectorStyles() {
        if (document.getElementById('theme-selector-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'theme-selector-styles';
        style.textContent = `
            .theme-selector {
                margin: 10px 0;
            }
            
            .theme-selector label {
                display: block;
                margin-bottom: 5px;
                font-weight: 500;
                color: var(--theme-text);
            }
            
            .theme-select {
                width: 100%;
                padding: 8px 12px;
                border: 1px solid var(--theme-border);
                border-radius: 4px;
                background: var(--theme-surface);
                color: var(--theme-text);
                font-size: 14px;
            }
            
            .theme-select:focus {
                outline: none;
                border-color: var(--theme-primary);
                box-shadow: 0 0 0 2px rgba(0, 122, 204, 0.2);
            }
            
            .theme-preview {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
                gap: 10px;
                margin-top: 10px;
            }
            
            .theme-preview-item {
                padding: 10px;
                border: 2px solid transparent;
                border-radius: 4px;
                cursor: pointer;
                text-align: center;
                font-size: 12px;
                transition: border-color 0.2s ease;
            }
            
            .theme-preview-item:hover {
                border-color: var(--theme-primary);
            }
            
            .theme-preview-item.active {
                border-color: var(--theme-accent);
                background: var(--theme-primary);
                color: var(--theme-background);
            }
        `;
        
        document.head.appendChild(style);
    }

    /**
     * Crée un aperçu des thèmes
     */
    createThemePreview(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const previewHTML = `
            <div class="theme-preview">
                <div class="theme-preview-item" data-theme="auto">
                    <div style="background: linear-gradient(45deg, #fff 50%, #1a1a1a 50%); width: 20px; height: 20px; margin: 0 auto 5px; border-radius: 2px;"></div>
                    Auto
                </div>
                ${Object.entries(this.themes).map(([key, theme]) => `
                    <div class="theme-preview-item ${this.currentTheme === key ? 'active' : ''}" data-theme="${key}">
                        <div style="background: ${theme.colors.background}; border: 1px solid ${theme.colors.border}; width: 20px; height: 20px; margin: 0 auto 5px; border-radius: 2px;">
                            <div style="background: ${theme.colors.primary}; width: 8px; height: 8px; margin: 2px; border-radius: 1px;"></div>
                        </div>
                        ${theme.name}
                    </div>
                `).join('')}
            </div>
        `;
        
        container.innerHTML = previewHTML;
        
        // Event listeners
        container.querySelectorAll('.theme-preview-item').forEach(item => {
            item.addEventListener('click', () => {
                const themeName = item.dataset.theme;
                this.setTheme(themeName);
                this.updatePreviewSelection(container, themeName);
            });
        });
    }

    /**
     * Met à jour la sélection dans l'aperçu
     */
    updatePreviewSelection(container, selectedTheme) {
        container.querySelectorAll('.theme-preview-item').forEach(item => {
            item.classList.toggle('active', item.dataset.theme === selectedTheme);
        });
    }

    /**
     * Notifie le changement de thème
     */
    notifyThemeChange(themeName, theme) {
        // Événement personnalisé
        const event = new CustomEvent('themeChanged', {
            detail: { themeName, theme }
        });
        window.dispatchEvent(event);
        
        // Animation de transition
        document.body.classList.add('theme-transition');
        setTimeout(() => {
            document.body.classList.remove('theme-transition');
        }, 500);
    }

    /**
     * Obtient le thème actuel
     */
    getCurrentTheme() {
        const effectiveTheme = this.currentTheme === 'auto' ? 
            this.getAutoTheme() : this.currentTheme;
        
        return {
            name: this.currentTheme,
            effective: effectiveTheme,
            data: this.themes[effectiveTheme]
        };
    }

    /**
     * Obtient la liste des thèmes disponibles
     */
    getAvailableThemes() {
        return Object.entries(this.themes).map(([key, theme]) => ({
            key,
            name: theme.name,
            colors: theme.colors
        }));
    }

    /**
     * Nettoie les ressources
     */
    destroy() {
        // Supprimer les styles
        const styles = document.getElementById('theme-manager-styles');
        if (styles) styles.remove();
        
        const selectorStyles = document.getElementById('theme-selector-styles');
        if (selectorStyles) selectorStyles.remove();
    }
}

// Export pour utilisation globale
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ThemeManager;
} else {
    window.ThemeManager = ThemeManager;
}
