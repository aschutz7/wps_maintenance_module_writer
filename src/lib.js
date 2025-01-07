import {
	Document,
	Packer,
	Paragraph,
	Table,
	TableCell,
	TableRow,
	TextRun,
	VerticalAlign,
	WidthType,
	convertInchesToTwip,
} from 'docx';
import mammoth from 'mammoth';
import puppeteer from 'puppeteer-core';
import fs from 'fs';

const XLSX = require('xlsx');

function logToFile(message, eventType = 'INFO', logPath) {
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

/**
 * @typedef {Object} InspectionData
 * @property {number} ID
 * @property {number} InspectionDateReport
 * @property {number} SystemDesignationAsset
 * @property {number} AssetName
 * @property {string} RouteAsset
 * @property {string} FeatureCrossedAsset
 * @property {string} DistrictReport
 * @property {number} MaintenanceSectionAsset
 * @property {string} CFCriticalFindingReport
 * @property {string} PreviouslyRecommendedReport
 * @property {string} RecommendationTypeReport
 * @property {string} DescriptionOfIssueReport
 * @property {string} WorkflowStage
 * @property {string} AssignedTo
 * @property {string} BridgeOwnerReport
 * @property {string} AreaOfficeReport
 * @property {string} BridgeComponentReport
 * @property {string} RepairCategoryReport
 * @property {string} MostRecentWorkflowComment
 */

/**
 * Validates the fields array by checking against the keys in the input JSON.
 * @param {{[key: number]: object[]}} json The formatted JSON data
 * @param {string[]} fields Array of field names to validate
 * @returns {string[]} Array of valid field names
 */
export function validateFields(json, fields) {
	try {
		const allKeys = new Set();
		for (const bridge of Object.values(json)) {
			for (const report of bridge) {
				Object.keys(report).forEach((key) => allKeys.add(key));
			}
			break;
		}

		return fields.filter((field) => allKeys.has(field));
	} catch (error) {
		throw new Error('Error validating fields: ' + error.message);
	}
}

/**
 * @description converts a given Excel file to a JSON file and returns the JSON data or throws an error
 * @returns {InspectionData[]} Array of inspection data objects
 * @param {String} filePath the excel file path to convert into JSON
 */
export function convertExcelToJSON(filePath) {
	try {
		const workbook = XLSX.readFile(filePath);
		const sheetName = workbook.SheetNames[0];
		const worksheet = workbook.Sheets[sheetName];
		const json = XLSX.utils.sheet_to_json(worksheet);

		return json;
	} catch (error) {
		throw error;
	}
}

/**
 * Formats given JSON inspection data into a dictionary with AssetName as keys or throws an error
 * @param {InspectionData[]} json The JSON data to format
 * @returns {{[key: number]: InspectionData[]}} Dictionary of arrays with AssetName as the key
 */
export function formatJSONData(json) {
	try {
		const formattedData = {};

		for (const item of json) {
			const assetName = item['Asset Name'];

			if (!assetName) {
				continue;
			}

			if (!formattedData[assetName]) {
				formattedData[assetName] = [];
			}

			formattedData[assetName].push(item);
		}

		return formattedData;
	} catch (error) {
		throw error;
	}
}

/**
 * Formats given JSON inspection data into a dictionary with AssetName as keys
 * including only the specified fields.
 * @param {{[key: number]: InspectionData[]}} json The formatted JSON data
 * @param {string[]} fields Array of field names to include in the result
 * @returns {{[key: string]: object[]}} Dictionary of arrays with AssetName as the key
 */
export function includeOnlyFields(json, fields) {
	const validFields = validateFields(json, fields);

	if (validFields.length !== fields.length) {
		throw new Error('Invalid fields provided');
	}

	try {
		const newData = {};

		for (const bridge of Object.values(json)) {
			for (const report of bridge) {
				const assetName = report['Asset Name'];

				if (!assetName) continue;

				if (!newData[assetName]) {
					newData[assetName] = [];
				}

				const filteredReport = {};
				for (const field of fields) {
					if (report.hasOwnProperty(field)) {
						filteredReport[field] = report[field];
					}
				}

				newData[assetName].push(filteredReport);
			}
		}

		return newData;
	} catch (error) {
		throw error;
	}
}

/**
 * Ensures Puppeteer has a valid Chromium installation.
 */
async function ensureChromiumInstalled() {
	const chromiumPaths = {
		win32: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
		darwin: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
		linux: '/usr/bin/google-chrome',
	};

	const executablePath = chromiumPaths[process.platform];

	if (!fs.existsSync(executablePath)) {
		throw new Error(
			`Chromium/Chrome executable not found. Please install Chrome or specify the path manually.`
		);
	}

	return executablePath;
}

/**
 * Converts a DOCX file buffer to a PDF using Puppeteer.
 *
 * @param {Buffer} docxBuffer - The DOCX file buffer.
 * @param {string} outputFilePath - The desired PDF output path.
 * @param {string} logPath - Path to save log messages.
 */
async function convertDocxToPdf(docxBuffer, outputFilePath, logPath) {
	let executablePath;

	try {
		logToFile('Starting DOCX to PDF conversion.', 'INFO', logPath);
		executablePath = await ensureChromiumInstalled();

		const { value: html } = await mammoth.convertToHtml({
			buffer: docxBuffer,
		});

		const cleanHtml = html.trim().replace(/^\s*<[^>]*>\s*$/, '');

		const sections = cleanHtml
			.split(/(?=Bridge ID:)/)
			.filter(
				(section) =>
					section.includes('Bridge ID:') && section.trim().length > 0
			);

		const styledHtml = `
			<html>
			  <head>
				<style>
				  body {
					font-family: Arial, sans-serif;
					margin: 20px;
				  }
				  table {
					width: 100%;
					border-collapse: collapse;
					margin-top: 25px;
					margin-bottom: 20px;
					table-layout: fixed;
				  }
				  th, td {
					border: 1px solid #000000;
					padding: 12px;
					text-align: left;
					overflow-wrap: break-word;
					word-wrap: break-word;
					word-break: normal;
					vertical-align: top;
					line-height: 1.4;
				  }
				  th {
					white-space: normal;
					min-width: 80px;
				  }
				  th, td {
					min-width: 15%;
					font-size: 12px;
				  }
				  th.description-issue, td.description-issue {
					width: 45%;
					min-width: 250px;
				  }
				  .bridge-section {
					margin-bottom: 20px;
				  }
				  .bridge-id {
					margin-bottom: 35px;
					display: block;
					font-size: 15px;
				  }
				</style>
			  </head>
			  <body>
				${sections
					.map((section, index) => {
						let formattedSection = section
							.trim()
							.replace(
								/(Bridge ID:[^<]*)/,
								'<span class="bridge-id">$1</span>'
							);

						formattedSection = formattedSection.replace(
							/<th>(Desc. of Issue)<\/th>/,
							'<th class="description-issue">$1</th>'
						);

						formattedSection = formattedSection.replace(
							/(<td[^>]*>)((?:(?!<\/td>).)*Desc\. of Issue(?:(?!<\/td>).)*)<\/td>/g,
							'<td class="description-issue">$2</td>'
						);

						return `
					  <div class="bridge-section" ${
							index < sections.length - 1
								? 'style="page-break-after: always;"'
								: ''
						}>
						${formattedSection}
					  </div>
					`;
					})
					.join('')}
			  </body>
			</html>
		  `;

		// fs.writeFileSync('styled_output.html', styledHtml, 'utf8');

		const browser = await puppeteer.launch({
			executablePath: executablePath,
			headless: true,
		});
		const page = await browser.newPage();
		await page.setContent(styledHtml);

		await page.addStyleTag({
			content: `
				table th.description-issue, table td.description-issue {
					width: 40% !important;
				}
			`,
		});

		await page.pdf({
			path: outputFilePath,
			format: 'A4',
			printBackground: true,
			margin: {
				top: '20px',
				right: '20px',
				bottom: '20px',
				left: '20px',
			},
		});
		await browser.close();

		logToFile(
			`PDF successfully generated from DOCX buffer: ${outputFilePath}`,
			'INFO',
			logPath
		);
	} catch (error) {
		logToFile(
			`Error in convertDocxToPdf: ${error.message}`,
			'ERROR',
			logPath
		);
		console.log(error);
		throw error;
	}
}

/**
 * Generates a PDF with a table based on a dynamic dataset.
 * Each Bridge ID appears above its table on a new page.
 * Users can choose which columns to include in the PDF.
 *
 * @param {string} outputFilePath - The file path to save the generated PDF.
 * @param {object} data - The data containing reports identified by their ID. The structure is as follows:
 *   - `data[assetName]`: An array of rows for a given asset (e.g., a bridge).
 *   - Each row is an object where keys represent column names, and values represent the corresponding data.
 * @param {string[]} selectedColumns - An array of column names selected by the user for inclusion in the PDF.
 *
 * @returns {Promise<{ success: boolean; message: string }>} - A state object that indicates whether the PDF generation was successful or not, along with the success or error message.
 */
export async function generatePDF(
	outputFilePath,
	data,
	selectedColumns,
	logPath = './logs.json'
) {
	const cleanHeader = (header) => header.replace(/\(Report\)/g, '').trim();

	const columnHeaderMap = {};
	for (const col of selectedColumns || []) {
		columnHeaderMap[col] = cleanHeader(col);
	}

	const columns =
		selectedColumns ||
		(Object.values(data)[0]?.[0]
			? Object.keys(Object.values(data)[0][0])
			: []);

	const columnTitles = columns.map((col) => columnHeaderMap[col] || col);

	function formatTextWithNewlines(text) {
		if (!text || !String(text)) return [];
		return String(text)
			.split(/\r?\n/)
			.map((line) => new Paragraph({ text: line, style: 'Text' }));
	}

	const sections = Object.keys(data).map((assetName) => {
		const assetData = data[assetName];

		const filteredRows = assetData.map((rowData) => {
			return columns.map((col) => rowData[col]);
		});

		const table = new Table({
			rows: [
				new TableRow({
					children: columnTitles.map((title, index) => {
						return new TableCell({
							width:
								index ===
								columns.indexOf('Description of Issue(Report)')
									? {
											size: 50,
											type: WidthType.PERCENTAGE,
									  }
									: {
											size: 100 / columnTitles.length,
											type: WidthType.PERCENTAGE,
									  },
							children: [new Paragraph({ text: title })],
						});
					}),
				}),
				...filteredRows.map((rowData) => {
					return new TableRow({
						children: rowData.map((cellData, index) => {
							return new TableCell({
								width:
									index ===
									columns.indexOf(
										'Description of Issue(Report)'
									)
										? {
												size: 50,
												type: WidthType.PERCENTAGE,
										  }
										: {
												size: 100 / columnTitles.length,
												type: WidthType.PERCENTAGE,
										  },
								children: formatTextWithNewlines(cellData),
								verticalAlign: VerticalAlign.CENTER,
								margins: {
									top: convertInchesToTwip(0.05),
									bottom: convertInchesToTwip(0.05),
									left: convertInchesToTwip(0.05),
									right: convertInchesToTwip(0.05),
								},
								class:
									columns[index] ===
									'Description of Issue(Report)'
										? 'description-issue'
										: '',
							});
						}),
					});
				}),
			],
		});

		return {
			properties: {},
			children: [
				new Paragraph({
					children: [
						new TextRun({
							text: `Bridge ID: ${assetName}`,
							size: 24,
						}),
					],
					spacing: {
						after: 200,
					},
				}),
				table,
			],
		};
	});

	const doc = new Document({
		styles: {
			paragraphStyles: [
				{
					id: 'NormalText',
					name: 'Normal Text',
					run: {
						font: 'Verdana Pro',
						size: 24,
						color: '000000',
					},
				},
				{
					id: 'Text',
					name: 'Global Text',
					run: {
						font: 'Verdana Pro',
						color: '000000',
					},
				},
			],
		},
		sections,
	});

	try {
		Packer.toBuffer(doc).then(async (buffer) => {
			logToFile(
				`Attempting to convert DOCX buffer to PDF at: ${outputFilePath}`,
				'INFO',
				logPath
			);
			await convertDocxToPdf(buffer, outputFilePath, logPath);

			logToFile(
				'PDF generated successfully from DOCX buffer',
				'INFO',
				logPath
			);
			return {
				success: true,
				message: `Successfully generated PDF of data at ${outputFilePath}`,
			};
		});
	} catch (error) {
		logToFile(`Error in generatePDF: ${error.message}`, 'ERROR', logPath);
		console.log(error);

		throw error;

		return {
			success: false,
			message:
				(error && error.message) ||
				'An error occurred while generating the PDF',
		};
	}
}

// generatePDF(
// 	'src/output.pdf',
// 	includeOnlyFields(
// 		formatJSONData(convertExcelToJSON('src/sample data set.xlsx')),
// 		[
// 			'Bridge Component(Report)',
// 			'Repair Category(Report)',
// 			'Description of Issue(Report)',
// 			'Workflow Stage',
// 		]
// 	)
// );
