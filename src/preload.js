const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
	getSelectedColumns: () => ipcRenderer.invoke('get-selected-columns'),
	setSelectedColumns: (selectedColumns) =>
		ipcRenderer.invoke('set-selected-columns', selectedColumns),
	openExternal: (url) => ipcRenderer.send('open-external', url),
	loadConfig: () => ipcRenderer.invoke('get-config'),
	saveConfig: (config) => ipcRenderer.invoke('set-config', config),
	selectFile: () => ipcRenderer.invoke('selectFile'),
	selectOutputFolder: () => ipcRenderer.invoke('select-output-folder'),
	convertExcelToJSON: (filePath) =>
		ipcRenderer.invoke('convertExcelToJSON', filePath),
	generatePDF: (excelFilePath, outputFile, selectedColumns) =>
		ipcRenderer.invoke(
			'generate-pdf',
			excelFilePath,
			outputFile,
			selectedColumns
		),
	checkForUpdates: () => ipcRenderer.send('check-for-updates'),
});
