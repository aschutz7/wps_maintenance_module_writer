import React, { useState } from 'react';
import Sidebar from './Sidebar.jsx';

export default function Generator() {
	const [excelFile, setExcelFile] = useState(null);
	const [outputFile, setOutputFile] = useState('');
	const [generating, setGenerating] = useState(false);
	const [progress, setProgress] = useState(0);
	const [availableColumns, setAvailableColumns] = useState([]);
	const [selectedColumns, setSelectedColumns] = useState([]);

	const loadSavedColumns = async () => {
		const savedColumns = await window.electron.loadConfig();
		if (Array.isArray(savedColumns)) {
			setSelectedColumns(savedColumns);
		} else {
			setSelectedColumns([]);
		}
	};

	const saveSelectedColumns = async () => {
		await window.electron.saveConfig(selectedColumns);
		alert('Selected columns have been saved!');
	};

	const handleFileChange = async () => {
		const filePath = await window.electron.selectFile();
		if (filePath) {
			try {
				const formattedData = await window.electron.convertExcelToJSON(
					filePath
				);
				const columnHeaders = Object.keys(
					formattedData[Object.keys(formattedData)[0]][0]
				);
				setExcelFile(filePath);
				setAvailableColumns(columnHeaders);
			} catch (error) {
				console.error('Error during conversion or formatting:', error);
				setAvailableColumns([]);
			}
		}
	};

	const handleColumnSelection = (column) => {
		setSelectedColumns((prev) => {
			const newSelectedColumns = prev.includes(column)
				? prev.filter((item) => item !== column)
				: [...prev, column];
			return newSelectedColumns;
		});
	};

	const handleGenerate = async () => {
		if (generating) {
			alert('You are already generating a PDF. Please wait.');
			return;
		}
		setGenerating(true);
		setProgress(0);

		try {
			const result = await window.electron.generatePDF(
				excelFile,
				outputFile,
				selectedColumns
			);
			setGenerating(false);

			if (result && result.success) {
				alert(`PDF has been generated: ${result.message}`);
			}
		} catch (error) {
			console.error('Error generating PDF:', error);
			alert('An error occurred while generating the PDF.');
			setGenerating(false);
		}
	};

	const handleSelectOutputFolder = async () => {
		const folderPath = await window.electron.selectOutputFolder();
		if (folderPath) {
			const outputFileName = 'maintenance_report.pdf';
			setOutputFile(`${folderPath}/${outputFileName}`);
		}
	};

	const isGenerateDisabled =
		!excelFile || !outputFile || selectedColumns.length === 0;

	const getDisabledMessage = () => {
		if (!excelFile) return 'Please select an Excel file.';
		if (!outputFile) return 'Please select an output folder.';
		if (selectedColumns.length === 0)
			return 'Please select at least one column.';
		return '';
	};

	return (
		<div className='bg-gray-900 text-white min-h-screen flex'>
			<Sidebar isCollapsible className='shrink-0' />
			<div className='flex-grow p-8'>
				<header className='text-center mb-8'>
					<h1 className='text-4xl font-bold'>
						Maintenance Description Generator
					</h1>
					<p className='text-lg'>
						Generate and format maintenance module data into clean
						PDFs
					</p>
				</header>
				<main className='max-w-3xl mx-auto space-y-6'>
					<div>
						<label className='block mb-2 text-lg'>
							Upload Excel File
						</label>
						<button
							onClick={handleFileChange}
							className='w-full p-2 rounded bg-blue-500 text-white hover:bg-blue-600'
						>
							Select Excel File
						</button>
						<p className='mt-2 text-sm text-gray-400'>
							{excelFile
								? `Selected File: ${excelFile}`
								: 'No file selected'}
						</p>
					</div>

					<div>
						<label className='block mb-2 text-lg'>
							Select Columns to Include
						</label>
						<div className='space-y-2'>
							{availableColumns.length > 0 ? (
								availableColumns.map((column) => (
									<div
										key={column}
										className='flex items-center'
									>
										<input
											type='checkbox'
											id={column}
											checked={selectedColumns.includes(
												column
											)}
											onChange={() =>
												handleColumnSelection(column)
											}
											className='mr-2'
										/>
										<label htmlFor={column}>{column}</label>
									</div>
								))
							) : (
								<p className='text-gray-500'>
									No Excel File selected yet
								</p>
							)}
						</div>
					</div>

					{availableColumns.length > 0 && (
						<div className='flex space-x-4'>
							<button
								onClick={saveSelectedColumns}
								className='py-2 px-4 rounded bg-green-500 text-white hover:bg-green-600'
							>
								Save Selected Columns
							</button>
							<button
								onClick={loadSavedColumns}
								className='py-2 px-4 rounded bg-blue-500 text-white hover:bg-blue-600'
							>
								Load Saved Columns
							</button>
						</div>
					)}

					<div>
						<label className='block mb-2 text-lg'>
							Select Output File
						</label>
						<div className='flex space-x-4'>
							<input
								type='text'
								placeholder='Enter output PDF file path'
								value={outputFile}
								onChange={(e) => setOutputFile(e.target.value)}
								className='w-full p-2 rounded bg-gray-700 text-white'
							/>
							<button
								onClick={handleSelectOutputFolder}
								className='bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded'
							>
								Select Folder
							</button>
						</div>
					</div>

					<button
						disabled={isGenerateDisabled || generating}
						onClick={handleGenerate}
						className={`py-2 px-4 rounded shadow-lg ${
							isGenerateDisabled || generating
								? 'bg-gray-600 cursor-not-allowed'
								: 'bg-blue-500 hover:bg-blue-600 text-white'
						}`}
					>
						Generate PDF
					</button>

					{isGenerateDisabled && !generating && (
						<p className='text-sm text-red-400 mt-2'>
							{getDisabledMessage()}
						</p>
					)}

					{generating && (
						<div className='mt-4'>
							<p className='text-lg mb-2'>Generating PDF...</p>
							<div className='w-full bg-gray-700 rounded'>
								<div
									className='bg-blue-500 h-2 rounded animated-progress-bar'
									style={{ width: `${progress}%` }}
								></div>
							</div>
						</div>
					)}
				</main>
			</div>
		</div>
	);
}