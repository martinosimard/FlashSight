/**
 * Composant dropdown d'historique pour les barres d'URL (style Chrome)
 */
class UrlHistoryDropdown {
    constructor(simpleUrlHistory) {
        this.history = simpleUrlHistory;
        this.activeDropdown = null;
        this.currentInput = null;
        
        this.setupStyles();
    }

    /**
     * Ajoute les styles CSS pour le dropdown
     */
    setupStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .url-history-dropdown {
                position: absolute;
                top: 100%;
                left: 0;
                right: 0;
                background: var(--bg-primary, #ffffff);
                border: 1px solid var(--border-color, #e0e0e0);
                border-top: none;
                border-radius: 0 0 6px 6px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                max-height: 200px;
                overflow-y: auto;
                z-index: 1000;
                display: none;
            }
            
            .url-history-dropdown.visible {
                display: block;
            }
            
            .history-item {
                padding: 8px 12px;
                cursor: pointer;
                border-bottom: 1px solid var(--border-light, #f0f0f0);
                transition: background-color 0.2s;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .history-item:hover,
            .history-item.selected {
                background: var(--bg-hover, #f5f5f5);
            }
            
            .history-item:last-child {
                border-bottom: none;
            }
            
            .history-icon {
                font-size: 14px;
                opacity: 0.7;
                flex-shrink: 0;
            }
            
            .history-content {
                flex: 1;
                min-width: 0;
            }
            
            .history-title {
                font-size: 13px;
                font-weight: 500;
                color: var(--text-primary, #333);
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            
            .history-url {
                font-size: 11px;
                color: var(--text-secondary, #666);
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                margin-top: 2px;
            }
            
            .history-remove {
                opacity: 0;
                transition: opacity 0.2s;
                padding: 4px;
                border-radius: 3px;
                font-size: 12px;
                color: var(--text-tertiary, #999);
                flex-shrink: 0;
            }
            
            .history-item:hover .history-remove {
                opacity: 1;
            }
            
            .history-remove:hover {
                background: var(--bg-danger, #ff4444);
                color: white;
            }
            
            .history-empty {
                padding: 16px;
                text-align: center;
                color: var(--text-secondary, #666);
                font-size: 13px;
            }
            
            .history-clear {
                padding: 8px 12px;
                text-align: center;
                border-top: 1px solid var(--border-light, #f0f0f0);
                font-size: 12px;
                color: var(--text-secondary, #666);
                cursor: pointer;
                transition: background-color 0.2s;
            }
            
            .history-clear:hover {
                background: var(--bg-hover, #f5f5f5);
            }
        `;
        
        document.head.appendChild(style);
    }

    /**
     * Attache le dropdown à un champ de saisie d'URL
     */
    attachToInput(urlInput) {
        if (!urlInput) return;

        const container = urlInput.closest('.tab-toolbar');
        if (!container) return;

        // Créer le dropdown s'il n'existe pas
        let dropdown = container.querySelector('.url-history-dropdown');
        if (!dropdown) {
            dropdown = document.createElement('div');
            dropdown.className = 'url-history-dropdown';
            container.style.position = 'relative';
            container.appendChild(dropdown);
        }

        // Événements sur le champ de saisie
        urlInput.addEventListener('focus', (e) => {
            this.showDropdown(urlInput, dropdown);
        });

        urlInput.addEventListener('input', (e) => {
            this.updateDropdown(urlInput, dropdown, e.target.value);
        });

        urlInput.addEventListener('keydown', (e) => {
            this.handleKeyboard(e, urlInput, dropdown);
        });

        urlInput.addEventListener('blur', (e) => {
            // Délai pour permettre les clics sur le dropdown
            setTimeout(() => {
                if (!dropdown.matches(':hover')) {
                    this.hideDropdown(dropdown);
                }
            }, 150);
        });
    }

    /**
     * Affiche le dropdown
     */
    showDropdown(input, dropdown) {
        this.currentInput = input;
        this.activeDropdown = dropdown;
        
        this.updateDropdown(input, dropdown, input.value);
        dropdown.classList.add('visible');
    }

    /**
     * Cache le dropdown
     */
    hideDropdown(dropdown) {
        if (dropdown) {
            dropdown.classList.remove('visible');
        }
        this.activeDropdown = null;
        this.currentInput = null;
    }

    /**
     * Met à jour le contenu du dropdown
     */
    updateDropdown(input, dropdown, query) {
        const results = this.history.searchHistory(query);
        
        dropdown.innerHTML = '';

        if (results.length === 0) {
            dropdown.innerHTML = '<div class="history-empty">Aucun historique</div>';
            return;
        }

        // Ajouter les résultats
        results.forEach((item, index) => {
            const historyItem = this.createHistoryItem(item, index);
            dropdown.appendChild(historyItem);
        });

        // Ajouter le bouton de nettoyage si il y a des résultats
        if (results.length > 0) {
            const clearBtn = document.createElement('div');
            clearBtn.className = 'history-clear';
            clearBtn.textContent = '🗑️ Vider l\'historique';
            clearBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.clearHistory(dropdown);
            });
            dropdown.appendChild(clearBtn);
        }
    }

    /**
     * Crée un élément d'historique
     */
    createHistoryItem(item, index) {
        const div = document.createElement('div');
        div.className = 'history-item';
        div.dataset.index = index;
        div.dataset.url = item.url;

        // Icône basée sur le type d'URL
        let icon = '🌐';
        if (item.url.includes('.pdf')) {
            icon = '📄';
        } else if (item.url.startsWith('file://')) {
            icon = '📁';
        }

        div.innerHTML = `
            <span class="history-icon">${icon}</span>
            <div class="history-content">
                <div class="history-title">${this.escapeHtml(item.title)}</div>
                <div class="history-url">${this.escapeHtml(item.url)}</div>
            </div>
            <span class="history-remove" title="Supprimer">✕</span>
        `;

        // Événements
        div.addEventListener('click', (e) => {
            if (e.target.classList.contains('history-remove')) {
                e.stopPropagation();
                this.removeHistoryItem(item.url, dropdown);
            } else {
                this.selectHistoryItem(item);
            }
        });

        return div;
    }

    /**
     * Sélectionne un élément d'historique
     */
    selectHistoryItem(item) {
        if (this.currentInput) {
            this.currentInput.value = item.url;
            
            // Déclencher la navigation
            const goButton = this.currentInput.parentElement.querySelector('.tab-go-button');
            if (goButton) {
                goButton.click();
            }
        }
        
        if (this.activeDropdown) {
            this.hideDropdown(this.activeDropdown);
        }
    }

    /**
     * Supprime un élément d'historique
     */
    removeHistoryItem(url, dropdown) {
        this.history.removeUrl(url);
        this.updateDropdown(this.currentInput, dropdown, this.currentInput?.value || '');
    }

    /**
     * Vide l'historique
     */
    clearHistory(dropdown) {
        if (confirm('Êtes-vous sûr de vouloir vider l\'historique ?')) {
            this.history.clearHistory();
            this.updateDropdown(this.currentInput, dropdown, this.currentInput?.value || '');
        }
    }

    /**
     * Gère la navigation au clavier
     */
    handleKeyboard(e, input, dropdown) {
        if (!dropdown.classList.contains('visible')) {
            return;
        }

        const items = dropdown.querySelectorAll('.history-item');
        let selected = dropdown.querySelector('.history-item.selected');
        let selectedIndex = selected ? parseInt(selected.dataset.index) : -1;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
                this.updateSelection(items, selectedIndex);
                break;

            case 'ArrowUp':
                e.preventDefault();
                selectedIndex = Math.max(selectedIndex - 1, 0);
                this.updateSelection(items, selectedIndex);
                break;

            case 'Enter':
                if (selected) {
                    e.preventDefault();
                    const url = selected.dataset.url;
                    const item = this.history.getHistory().find(h => h.url === url);
                    if (item) {
                        this.selectHistoryItem(item);
                    }
                }
                break;

            case 'Escape':
                this.hideDropdown(dropdown);
                break;
        }
    }

    /**
     * Met à jour la sélection au clavier
     */
    updateSelection(items, selectedIndex) {
        items.forEach((item, index) => {
            if (index === selectedIndex) {
                item.classList.add('selected');
            } else {
                item.classList.remove('selected');
            }
        });
    }

    /**
     * Échappe le HTML pour éviter les injections
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Nettoie les ressources
     */
    destroy() {
        if (this.activeDropdown) {
            this.hideDropdown(this.activeDropdown);
        }
    }
}

// Export pour utilisation dans Electron
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UrlHistoryDropdown;
} else {
    window.UrlHistoryDropdown = UrlHistoryDropdown;
}
