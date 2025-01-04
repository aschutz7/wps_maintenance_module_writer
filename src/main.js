import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import path from 'node:path';
import fs from 'fs';
import os from 'os';
import started from 'electron-squirrel-startup';
import { updateElectronApp, UpdateSourceType } from 'update-electron-app';
import {
	validateFields,
	convertExcelToJSON,
	formatJSONData,
	includeOnlyFields,
	convertDocxToPdf,
	generatePDF,
} from './lib';

if (started) {
	app.quit();
}

const configDirectory = path.join(
	os.homedir(),
	'AppData',
	'Local',
	'WPS Programs',
	'FUA Sorter'
);

const errorsPath = path.join(configDirectory, 'errors.json');
const logPath = path.join(configDirectory, 'log.json');

if (!fs.existsSync(configDirectory)) {
	fs.mkdirSync(configDirectory, { recursive: true });
}

function logToFile(message, eventType = 'INFO') {
	const logEntry = {
		date: new Date().toISOString(),
		type: eventType,
		message,
	};

	if (!fs.existsSync(logPath)) {
		fs.writeFileSync(logPath, JSON.stringify([logEntry], null, 2), 'utf-8');
	} else {
		const logs = JSON.parse(fs.readFileSync(logPath, 'utf-8'));
		logs.push(logEntry);
		fs.writeFileSync(logPath, JSON.stringify(logs, null, 2), 'utf-8');
	}
}

async function logErrorToFile(error) {
	if (!fs.existsSync(errorsPath)) {
		fs.writeFileSync(
			errorsPath,
			JSON.stringify(
				[{ date: new Date().toISOString(), error }],
				null,
				2
			),
			'utf-8'
		);
	} else {
		const errors = JSON.parse(fs.readFileSync(errorsPath, 'utf-8'));
		errors.push({ date: new Date().toISOString(), error });
		fs.writeFileSync(errorsPath, JSON.stringify(errors, null, 2), 'utf-8');
	}
	logToFile(`Error logged: ${error.message}`, 'ERROR');
}

const configFilePath = path.join(configDirectory, 'config.json');

const readConfig = () => {
	if (fs.existsSync(configFilePath)) {
		const configData = fs.readFileSync(configFilePath, 'utf-8');
		logToFile('Configuration loaded.');
		return JSON.parse(configData);
	} else {
		logToFile('Configuration file not found, using default.');
		return { selectedColumns: [] };
	}
};

const writeConfig = (config) => {
	fs.writeFileSync(configFilePath, JSON.stringify(config, null, 2), 'utf-8');
	logToFile('Configuration updated.');
};

ipcMain.handle('get-selected-columns', () => {
	const config = readConfig();
	return config.selectedColumns;
});

ipcMain.handle('set-selected-columns', (event, selectedColumns) => {
	const config = readConfig();
	config.selectedColumns = selectedColumns;
	writeConfig(config);
});

ipcMain.handle('check-for-updates', () => {
	logToFile('Checking for updates.');
	updateElectronApp();
});

ipcMain.on('open-external', (event, url) => {
	logToFile(`Opening external URL: ${url}`);
	shell.openExternal(url);
});

ipcMain.handle('selectFile', async () => {
	const result = await dialog.showOpenDialog({
		properties: ['openFile'],
		filters: [{ name: 'Excel Files', extensions: ['xls', 'xlsx'] }],
	});
	if (result.canceled) {
		logToFile('File selection canceled.');
		return null;
	}
	logToFile(`File selected: ${result.filePaths[0]}`);
	return result.filePaths[0];
});

ipcMain.handle('select-output-folder', async () => {
	const result = await dialog.showOpenDialog({
		properties: ['openDirectory'],
	});
	if (result.canceled) {
		logToFile('Output folder selection canceled.');
		return null;
	}
	logToFile(`Output folder selected: ${result.filePaths[0]}`);
	return result.filePaths[0];
});

ipcMain.handle('convertExcelToJSON', async (event, filePath) => {
	try {
		logToFile(`Converting Excel file to JSON: ${filePath}`);
		return formatJSONData(convertExcelToJSON(filePath));
	} catch (error) {
		await logErrorToFile(error);
		return null;
	}
});

ipcMain.handle('get-config', () => {
	try {
		if (!fs.existsSync(configFilePath)) {
			const defaultConfig = { selectedColumns: [] };
			fs.writeFileSync(
				configFilePath,
				JSON.stringify(defaultConfig, null, 2),
				'utf-8'
			);
		}
		const configData = fs.readFileSync(configFilePath, 'utf-8');
		return JSON.parse(configData);
	} catch (error) {
		logToFile('Error loading configuration.', 'ERROR');
		console.error(error);
		return null;
	}
});

ipcMain.handle('set-config', (event, config) => {
	try {
		fs.writeFileSync(
			configFilePath,
			JSON.stringify(config, null, 2),
			'utf-8'
		);
		logToFile('Configuration saved successfully.');
	} catch (error) {
		logErrorToFile(error);
	}
});

ipcMain.handle(
	'generate-pdf',
	async (event, excelFilePath, outputFile, selectedColumns) => {
		try {
			logToFile(`Generating PDF for: ${excelFilePath}`);
			const jsonData = await convertExcelToJSON(excelFilePath);
			const formattedData = formatJSONData(jsonData);
			const filteredData = includeOnlyFields(
				formattedData,
				selectedColumns
			);
			await generatePDF(
				outputFile,
				filteredData,
				selectedColumns,
				logPath
			);
			logToFile('PDF generated successfully.');
			return { success: true, message: 'PDF generated successfully!' };
		} catch (error) {
			await logErrorToFile(error);
			return { success: false, message: error.message };
		}
	}
);

const createWindow = () => {
	const mainWindow = new BrowserWindow({
		width: 800,
		height: 600,
		webPreferences: {
			preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
			nodeIntegration: true,
			contextIsolation: true,
		},
		autoHideMenuBar: true,
		icon: __dirname + '/icon.ico',
	});

	logToFile('Main application window created.');
	mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
};

app.whenReady().then(() => {
	logToFile('Application started.');
	updateElectronApp({
		updateInterval: '1 hour',
		notifyUser: true,
		updateSource: {
			type: UpdateSourceType.ElectronPublicUpdateService,
			repo: 'aschutz7/wps_maintenance_module_generator',
			host: 'https://update.electronjs.org',
		},
	});
	createWindow();
	app.on('activate', () => {
		if (BrowserWindow.getAllWindows().length === 0) {
			createWindow();
		}
	});
});

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		logToFile('Application closed.');
		app.quit();
	}
});
