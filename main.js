const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const pdfParse = require('pdf-parse');

let mainWindow;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
      allowRunningInsecureContent: true,
      webviewTag: true  // Nécessaire pour utiliser les WebView
    },
    icon: path.join(__dirname, 'assets', 'icons', 'app-icon.ico'),
    title: 'Flash Sight Reader App'
  });

  mainWindow.loadFile('src/index.html');
  
  // Log pour vérifier que la fenêtre se charge
  mainWindow.webContents.once('did-finish-load', () => {
    console.log('✅ Flash Sight window loaded successfully');
  });

  // Supprimer complètement la barre de menu pour une interface compacte
  Menu.setApplicationMenu(null);
}

async function openPDF() {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'PDF Files', extensions: ['pdf'] }
    ]
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const filePath = result.filePaths[0];
    mainWindow.webContents.send('load-pdf', filePath);
  }
}

async function openURL() {
  // Focus directement sur le champ URL dans l'interface au lieu d'un dialog
  mainWindow.webContents.send('focus-url-input');
}

// Gérer les événements IPC
ipcMain.handle('navigate-to-url', (event, url) => {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }
  mainWindow.webContents.send('navigate-to-url', url);
});

ipcMain.handle('open-pdf-dialog', async () => {
  return await openPDF();
});

// Gestionnaire pour afficher le menu contextuel
ipcMain.handle('show-context-menu', async (event, options) => {
  const { Menu } = require('electron');
  
  const template = [
    {
      label: 'Activer/Désactiver FlashSight',
      click: () => {
        mainWindow.webContents.send('context-menu-action', 'toggle-flashsight');
      }
    },
    { type: 'separator' },
    {
      label: 'Zoom +',
      click: () => {
        mainWindow.webContents.send('context-menu-action', 'zoom-in');
      }
    },
    {
      label: 'Zoom -',
      click: () => {
        mainWindow.webContents.send('context-menu-action', 'zoom-out');
      }
    },
    { type: 'separator' },
    {
      label: 'Intensité +',
      click: () => {
        mainWindow.webContents.send('context-menu-action', 'intensity-up');
      }
    },
    {
      label: 'Intensité -',
      click: () => {
        mainWindow.webContents.send('context-menu-action', 'intensity-down');
      }
    },
    { type: 'separator' },
    {
      label: 'Mode Immersif',
      click: () => {
        mainWindow.webContents.send('context-menu-action', 'immersive-mode');
      }
    }
  ];
  
  const menu = Menu.buildFromTemplate(template);
  menu.popup({
    window: mainWindow,
    x: options.x,
    y: options.y
  });
});

// Gestionnaire pour basculer les DevTools
ipcMain.handle('toggle-dev-console', async () => {
  if (mainWindow) {
    const isDevToolsOpened = mainWindow.webContents.isDevToolsOpened();
    
    if (isDevToolsOpened) {
      mainWindow.webContents.closeDevTools();
    } else {
      mainWindow.webContents.openDevTools();
    }
    
    // Retourner le nouvel état (inverse de l'état précédent)
    return !isDevToolsOpened;
  }
  return false;
});

// Gestionnaire pour l'extraction de contenu PDF
ipcMain.handle('extract-pdf-content', async (event, pdfUrl) => {
  try {
    console.log('Main process: Extraction PDF demandée pour:', pdfUrl);
    
    // Nettoyer le chemin du fichier
    let filePath = pdfUrl;
    if (filePath.startsWith('file://')) {
      filePath = filePath.replace('file://', '');
    }
    
    // Sur Windows, corriger les slashes
    if (process.platform === 'win32') {
      filePath = filePath.replace(/\//g, '\\');
    }
    
    console.log('Main process: Chemin du fichier nettoyé:', filePath);
    
    // Vérifier que le fichier existe
    if (!fs.existsSync(filePath)) {
      throw new Error(`Fichier PDF non trouvé: ${filePath}`);
    }
    
    // Lire le fichier PDF
    const pdfBuffer = fs.readFileSync(filePath);
    console.log('Main process: Fichier PDF lu, taille:', pdfBuffer.length, 'bytes');
    
    // Extraire le texte avec pdf-parse
    const pdfData = await pdfParse(pdfBuffer);
    
    // Nettoyer et formater le texte pour préserver la structure
    let extractedText = pdfData.text;
    
    // Normaliser les sauts de ligne multiples en paragraphes
    extractedText = extractedText
      .replace(/\r\n/g, '\n')  // Normaliser les retours à la ligne Windows
      .replace(/\r/g, '\n')    // Normaliser les retours à la ligne Mac
      .replace(/\n{3,}/g, '\n\n')  // Réduire les multiples sauts de ligne
      .replace(/([.!?])\s*\n([A-Z])/g, '$1\n\n$2')  // Ajouter des paragraphes après les phrases
      .trim();
    
    console.log('Main process: Extraction réussie');
    console.log('- Pages:', pdfData.numpages);
    console.log('- Caractères extraits:', extractedText.length);
    
    return {
      success: true,
      text: extractedText,
      numpages: pdfData.numpages,
      fileSize: pdfBuffer.length
    };
    
  } catch (error) {
    console.error('Main process: Erreur lors de l\'extraction PDF:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

app.whenReady().then(createMainWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});
