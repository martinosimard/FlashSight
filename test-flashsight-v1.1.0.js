#!/usr/bin/env node

/**
 * Script de test automatique pour FlashSight v1.1.0
 * Vérifie les nouvelles fonctionnalités PDF et historique
 */

const fs = require('fs');
const path = require('path');

class FlashSightTester {
    constructor() {
        this.testResults = [];
        this.srcPath = path.join(__dirname, 'src');
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
        console.log(`${prefix} [${timestamp}] ${message}`);
        this.testResults.push({ timestamp, type, message });
    }

    async testModuleExists(modulePath, description) {
        const fullPath = path.join(this.srcPath, modulePath);
        if (fs.existsSync(fullPath)) {
            this.log(`Module ${description} existe: ${modulePath}`, 'success');
            return true;
        } else {
            this.log(`Module ${description} manquant: ${modulePath}`, 'error');
            return false;
        }
    }

    async testFileContent(filePath, searchTerms, description) {
        const fullPath = path.join(this.srcPath, filePath);
        if (!fs.existsSync(fullPath)) {
            this.log(`Fichier manquant pour test ${description}: ${filePath}`, 'error');
            return false;
        }

        const content = fs.readFileSync(fullPath, 'utf8');
        const missingTerms = searchTerms.filter(term => !content.includes(term));
        
        if (missingTerms.length === 0) {
            this.log(`Test ${description} réussi dans ${filePath}`, 'success');
            return true;
        } else {
            this.log(`Test ${description} échoué. Termes manquants: ${missingTerms.join(', ')}`, 'error');
            return false;
        }
    }

    async testPackageVersion() {
        const packagePath = path.join(__dirname, 'package.json');
        if (!fs.existsSync(packagePath)) {
            this.log('package.json manquant', 'error');
            return false;
        }

        const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
        if (packageData.version === '1.1.0') {
            this.log(`Version correcte: ${packageData.version}`, 'success');
            return true;
        } else {
            this.log(`Version incorrecte: ${packageData.version} (attendu: 1.1.0)`, 'error');
            return false;
        }
    }

    async runAllTests() {
        this.log('🚀 Début des tests FlashSight v1.1.0');
        
        // Test 1: Vérification des modules
        this.log('\n📋 Test 1: Modules existants');
        await this.testModuleExists('modules/PDFViewer.js', 'Visualiseur PDF');
        await this.testModuleExists('modules/ThemeManager.js', 'Gestionnaire de thèmes');
        await this.testModuleExists('modules/UrlHistoryDropdown.js', 'Dropdown historique');
        await this.testModuleExists('styles.css', 'Styles CSS');
        await this.testModuleExists('index.html', 'Interface principale');

        // Test 2: Version du package
        this.log('\n📦 Test 2: Version package');
        await this.testPackageVersion();

        // Test 3: Contenu PDFViewer
        this.log('\n📄 Test 3: Fonctionnalités PDF');
        await this.testFileContent('modules/PDFViewer.js', [
            'class PDFViewer',
            'createPDFContainer',
            'togglePDFTheme',
            'applyFlashSightToPDF',
            'pdf-dark-theme'
        ], 'PDFViewer complet');

        // Test 4: Styles PDF
        this.log('\n🎨 Test 4: Styles PDF');
        await this.testFileContent('styles.css', [
            '.pdf-viewer-container',
            '.pdf-toolbar',
            '.pdf-dark-theme',
            '.pdf-scroll-indicator',
            'pdf-font-slider'
        ], 'Styles PDF');

        // Test 5: Chargement des modules
        this.log('\n🔧 Test 5: Chargement modules');
        await this.testFileContent('index.html', [
            'PDFViewer.js',
            'ThemeManager.js',
            'UrlHistoryDropdown.js'
        ], 'Imports modules');

        // Test 6: Améliorations app.js
        this.log('\n⚡ Test 6: Intégration PDF dans app.js');
        await this.testFileContent('app.js', [
            'new PDFViewer',
            'getWebContentsId',
            'updateWebviewAnalytics',
            'applyBionicReadingToWebView'
        ], 'Intégration PDF et fixes WebView');

        // Test 7: Electron version
        this.log('\n🖥️ Test 7: Configuration Electron');
        const packagePath = path.join(__dirname, 'package.json');
        const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
        if (packageData.devDependencies.electron.includes('30.')) {
            this.log('Version Electron 30.x configurée', 'success');
        } else {
            this.log(`Version Electron incorrecte: ${packageData.devDependencies.electron}`, 'error');
        }

        // Résumé
        this.generateReport();
    }

    generateReport() {
        this.log('\n📊 Rapport de test final');
        
        const successTests = this.testResults.filter(r => r.type === 'success').length;
        const errorTests = this.testResults.filter(r => r.type === 'error').length;
        const totalTests = successTests + errorTests;
        
        this.log(`Tests réussis: ${successTests}/${totalTests}`);
        this.log(`Tests échoués: ${errorTests}/${totalTests}`);
        
        if (errorTests === 0) {
            this.log('🎉 Tous les tests sont passés ! FlashSight v1.1.0 est prêt.', 'success');
        } else {
            this.log('⚠️ Certains tests ont échoué. Vérifiez les erreurs ci-dessus.', 'error');
        }

        // Sauvegarder le rapport
        const reportPath = path.join(__dirname, 'test-report-v1.1.0.json');
        fs.writeFileSync(reportPath, JSON.stringify({
            version: '1.1.0',
            timestamp: new Date().toISOString(),
            summary: {
                total: totalTests,
                success: successTests,
                errors: errorTests,
                status: errorTests === 0 ? 'PASS' : 'FAIL'
            },
            details: this.testResults
        }, null, 2));
        
        this.log(`📄 Rapport détaillé sauvé: ${reportPath}`);
    }
}

// Exécution des tests
if (require.main === module) {
    const tester = new FlashSightTester();
    tester.runAllTests().catch(console.error);
}

module.exports = FlashSightTester;
