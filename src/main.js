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

async function logErrorToFile(error) {
	const configDirectory = path.join(
		os.homedir(),
		'AppData',
		'Local',
		'WPS Programs',
		'Maintenance Module Generator'
	);
	const errorsPath = path.join(configDirectory, 'errors.json');

	if (!fs.existsSync(errorsPath)) {
		const defaultErrors = [
			{
				date: new Date().toISOString(),
				error: {
					stack: 'No errors yet',
					message: 'No errors',
					name: 'Info',
				},
				errorId: '00000000-0000-0000-0000-000000000000',
			},
		];
		fs.writeFileSync(
			errorsPath,
			JSON.stringify(defaultErrors, null, 2),
			'utf-8'
		);
	}

	const errors = JSON.parse(fs.readFileSync(errorsPath, 'utf-8'));

	const errorLog = {
		date: new Date().toISOString(),
		error: {
			stack: error.stack || 'No stack available',
			message: error.message,
			name: error.name || 'Unknown',
		},
		errorId: generateUniqueErrorId(),
	};

	errors.push(errorLog);

	fs.writeFileSync(errorsPath, JSON.stringify(errors, null, 2), 'utf-8');
}

function generateUniqueErrorId() {
	return (
		Math.random().toString(36).substr(2, 9) + Date.now().toString(36)
	).toUpperCase();
}

const configDirectory = path.join(
	os.homedir(),
	'AppData',
	'Local',
	'WPS Programs',
	'Maintenance Module Generator'
);

if (!fs.existsSync(configDirectory)) {
	fs.mkdirSync(configDirectory, { recursive: true });
}

const configFilePath = path.join(configDirectory, 'config.json');

const readConfig = () => {
	if (fs.existsSync(configFilePath)) {
		const configData = fs.readFileSync(configFilePath, 'utf-8');
		return JSON.parse(configData);
	} else {
		return { selectedColumns: [] };
	}
};

const writeConfig = (config) => {
	if (!fs.existsSync(configDirectory)) {
		fs.mkdirSync(configDirectory, { recursive: true });
	}

	fs.writeFileSync(configFilePath, JSON.stringify(config, null, 2), 'utf-8');
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
	updateElectronApp();
});

ipcMain.on('open-external', (event, url) => {
	shell.openExternal(url);
});

ipcMain.handle('selectFile', async () => {
	const result = await dialog.showOpenDialog({
		properties: ['openFile'],
		filters: [{ name: 'Excel Files', extensions: ['xls', 'xlsx'] }],
	});

	return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('select-output-folder', async () => {
	const result = await dialog.showOpenDialog({
		properties: ['openDirectory'],
	});

	if (result.canceled) {
		return null;
	}
	return result.filePaths[0];
});

ipcMain.handle('convertExcelToJSON', async (event, filePath) => {
	try {
		return formatJSONData(convertExcelToJSON(filePath));
	} catch (error) {
		console.error('Error converting Excel to JSON:', error);
		return null;
	}
});

ipcMain.handle('get-config', () => {
	try {
		if (!fs.existsSync(configFilePath)) {
			const defaultConfig = {
				selectedColumns: [],
			};
			fs.writeFileSync(
				configFilePath,
				JSON.stringify(defaultConfig, null, 2),
				'utf-8'
			);
		}

		const configData = fs.readFileSync(configFilePath, 'utf-8');
		return JSON.parse(configData);
	} catch (error) {
		console.error('Error loading config:', error);
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
	} catch (error) {
		console.error('Error saving config:', error);
	}
});

ipcMain.handle(
	'generate-pdf',
	async (event, excelFilePath, outputFile, selectedColumns) => {
		try {
			const jsonData = await convertExcelToJSON(excelFilePath);
			const formattedData = formatJSONData(jsonData);

			const filteredData = includeOnlyFields(
				formattedData,
				selectedColumns
			);

			await generatePDF(outputFile, filteredData, selectedColumns);

			return { success: true, message: 'PDF generated successfully!' };
		} catch (error) {
			console.error('Error generating PDF:', error);
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

	mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
};

app.whenReady().then(() => {
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
		app.quit();
	}
});
