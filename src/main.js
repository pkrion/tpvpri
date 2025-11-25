const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const ensureTicketsDir = () => {
  const ticketsPath = path.join(app.getPath('userData'), 'tickets');
  if (!fs.existsSync(ticketsPath)) {
    fs.mkdirSync(ticketsPath, { recursive: true });
  }
  return ticketsPath;
};

const timestampedName = (prefix, extension) => {
  const now = new Date();
  const formatted = now
    .toISOString()
    .replace(/[-:]/g, '')
    .replace('T', '_')
    .split('.')[0];
  return `${prefix}_${formatted}.${extension}`;
};

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
};

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('save-ticket', async (_event, content) => {
  const dir = ensureTicketsDir();
  const fileName = timestampedName('ticket', 'txt');
  const filePath = path.join(dir, fileName);
  await fs.promises.writeFile(filePath, content, 'utf8');
  return filePath;
});

ipcMain.handle('export-sales-csv', async (_event, rows) => {
  const dir = ensureTicketsDir();
  const fileName = timestampedName('ventas', 'csv');
  const filePath = path.join(dir, fileName);
  const header = 'referencia,cantidadvendida\n';
  const body = rows
    .map(({ reference, quantity }) => `${reference},${quantity}`)
    .join('\n');
  await fs.promises.writeFile(filePath, `${header}${body}\n`, 'utf8');
  return filePath;
});

ipcMain.handle('log-escpos', async (_event, payload) => {
  const dir = ensureTicketsDir();
  const fileName = timestampedName('escpos', 'bin');
  const filePath = path.join(dir, fileName);
  await fs.promises.writeFile(filePath, payload, 'binary');
  return filePath;
});
