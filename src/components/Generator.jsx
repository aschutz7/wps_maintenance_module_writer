import React, { useState } from 'react';
import Sidebar from './Sidebar.jsx';

export default function Generator() {
	const [excelFile, setExcelFile] = useState(null);
	const [outputFile, setOutputFile] = useState('');
	const [outputFormat, setOutputFormat] = useState('pdf');
	const [generating, setGenerating] = useState(false);
	const [progress, setProgress] = useState(0);
	const [availableColumns, setAvailableColumns] = useState([]);
	const [selectedColumns, setSelectedColumns] = useState([]);

	const loadSavedColumns = async () => {
		const savedColumns = await window.electron.loadConfig();
		if (Array.isArray(savedColumns)) {
			const sortedSelection = savedColumns.sort(
				(a, b) =>
					availableColumns.indexOf(a) - availableColumns.indexOf(b)
			);
			setSelectedColumns(sortedSelection);
			alert('Saved columns loaded successfully!');
		} else {
			alert('No saved columns found.');
			setSelectedColumns([]);
		}
	};

	const saveSelectedColumns = async () => {
		if (selectedColumns.length > 0) {
			await window.electron.saveConfig(selectedColumns);
			alert('Selected columns have been saved!');
		} else {
			alert('No columns selected to save.');
		}
	};

	const handleFileChange = async () => {
		const filePath = await window.electron.selectFile();
		if (filePath) {
			try {
				const formattedData = await window.electron.convertExcelToJSON(
					filePath
				);

				if (formattedData && Object.keys(formattedData).length > 0) {
					const firstKey = Object.keys(formattedData)[0];

					const columnHeaders = Array.isArray(formattedData[firstKey])
						? Object.keys(formattedData[firstKey][0])
						: [];

					if (columnHeaders.length > 0) {
						setAvailableColumns(columnHeaders);
						setExcelFile(filePath);
					} else {
						alert('No columns found in the Excel data.');
						setAvailableColumns([]);
					}
				} else {
					alert(
						'Invalid or empty data returned from Excel conversion.'
					);
					setAvailableColumns([]);
				}
			} catch (error) {
				console.error('Error during conversion or formatting:', error);
				alert('An error occurred while fetching the Excel file');
				setAvailableColumns([]);
			}
		}
	};

	const handleGenerate = async () => {
		if (generating) {
			alert('You are already generating a file. Please wait.');
			return;
		}
		setGenerating(true);
		setProgress(0);

		const progressInterval = setInterval(() => {
			setProgress((prevProgress) => {
				if (prevProgress < 100) {
					return prevProgress + Math.random() * 10 + 1;
				} else {
					clearInterval(progressInterval);
					return 100;
				}
			});
		}, 1000);

		try {
			const result = await window.electron.generateFile(
				excelFile,
				outputFile,
				selectedColumns,
				outputFormat
			);
			setGenerating(false);

			window.scrollTo(0, 0);
			document.body.style.overflow = 'auto';

			if (result && result.success) {
				alert(
					`${outputFormat.toUpperCase()} has been generated: ${
						result.message
					}`
				);
			}
		} catch (error) {
			console.error(`Error generating ${outputFormat}:`, error);
			alert(`An error occurred while generating the ${outputFormat}.`);
			setGenerating(false);
		}
	};

	const handleSelectOutputFolder = async () => {
		const folderPath = await window.electron.selectOutputFolder();
		if (folderPath) {
			const outputFileName = `maintenance_report.${outputFormat}`;
			setOutputFile(`${folderPath}\\${outputFileName}`);
		}
	};

	const handleColumnSelection = (column) => {
		setSelectedColumns((prev) => {
			const isSelected = prev.includes(column);
			const updatedSelection = isSelected
				? prev.filter((item) => item !== column)
				: [...prev, column];
			return updatedSelection.sort(
				(a, b) =>
					availableColumns.indexOf(a) - availableColumns.indexOf(b)
			);
		});
	};

	const isGenerateDisabled =
		!excelFile || !outputFile || selectedColumns.length === 0 || generating;

	const getDisabledMessage = () => {
		if (!excelFile) return 'Please select an Excel file.';
		if (!outputFile) return 'Please select an output location.';
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
						PDFs or DOCX
					</p>
				</header>
				<main className='max-w-3xl mx-auto space-y-6'>
					<div>
						<label className='block mb-2 text-lg'>
							Upload Excel File
						</label>
						<button
							onClick={handleFileChange}
							disabled={generating}
							className={`w-full p-2 rounded bg-blue-500 text-white hover:bg-blue-600 ${
								generating
									? 'cursor-not-allowed bg-gray-600'
									: ''
							}`}
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

						{excelFile && availableColumns.length > 0 && (
							<div className='flex items-center gap-4 mb-4'>
								<button
									onClick={() =>
										setSelectedColumns([availableColumns])
									}
									disabled={generating}
									className={`py-2 px-4 rounded bg-green-500 text-white hover:bg-green-600 ${
										generating
											? 'cursor-not-allowed bg-gray-600'
											: ''
									}`}
								>
									Select All
								</button>
								<button
									onClick={() => setSelectedColumns([])}
									disabled={generating}
									className={`py-2 px-4 rounded bg-red-500 text-white hover:bg-red-600 ${
										generating
											? 'cursor-not-allowed bg-gray-600'
											: ''
									}`}
								>
									Clear Selection
								</button>
								<button
									onClick={saveSelectedColumns}
									disabled={generating}
									className={`py-2 px-4 rounded bg-blue-500 text-white hover:bg-blue-600 ${
										generating
											? 'cursor-not-allowed bg-gray-600'
											: ''
									}`}
								>
									Save Selection
								</button>
								<button
									onClick={loadSavedColumns}
									disabled={generating}
									className={`py-2 px-4 rounded bg-yellow-500 text-white hover:bg-yellow-600 ${
										generating
											? 'cursor-not-allowed bg-gray-600'
											: ''
									}`}
								>
									Load Saved
								</button>
							</div>
						)}

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
											disabled={generating}
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

					<div>
						<label className='block mb-2 text-lg'>
							Select Output Format
						</label>
						<select
							value={outputFormat}
							onChange={(e) => setOutputFormat(e.target.value)}
							disabled={generating}
							className='w-full p-2 rounded bg-gray-700 text-white'
						>
							<option value='pdf'>PDF</option>
							<option value='docx'>DOCX</option>
						</select>
					</div>

					<div>
						<label className='block mb-2 text-lg'>
							Select Output Location
						</label>
						<div className='flex space-x-4'>
							<input
								type='text'
								placeholder={`Enter output ${outputFormat.toUpperCase()} file path`}
								value={outputFile}
								onChange={(e) => setOutputFile(e.target.value)}
								disabled={generating}
								className='w-full p-2 rounded bg-gray-700 text-white'
							/>
							<button
								onClick={handleSelectOutputFolder}
								disabled={generating}
								className={`bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded ${
									generating
										? 'cursor-not-allowed bg-gray-600'
										: ''
								}`}
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
						Generate {outputFormat.toUpperCase()}
					</button>

					{isGenerateDisabled && !generating && (
						<p className='text-sm text-red-400 mt-2'>
							{getDisabledMessage()}
						</p>
					)}

					{generating && (
						<div className='absolute inset-0 bg-black opacity-50 flex justify-center items-center'>
							<div className='text-white'>
								<p className='text-lg mb-2'>
									Generating {outputFormat.toUpperCase()}...
								</p>
								<div className='w-full bg-gray-700 rounded'>
									<div
										className='bg-blue-500 h-2 rounded'
										style={{ width: `${progress}%` }}
									></div>
								</div>
							</div>
						</div>
					)}
				</main>
			</div>
		</div>
	);
}
