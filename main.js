const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

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
    icon: path.join(__dirname, 'assets', 'icon.png'),
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
