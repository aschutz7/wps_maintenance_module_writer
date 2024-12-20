import xlsx from 'xlsx';
import {
	Document,
	Packer,
	Paragraph,
	Table,
	TableCell,
	TableRow,
	TextRun,
	VerticalAlign,
	convertInchesToTwip,
} from 'docx';
import mammoth from 'mammoth';
import puppeteer from 'puppeteer';

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
		const workbook = xlsx.readFile(filePath);
		const sheetName = workbook.SheetNames[0];
		const worksheet = workbook.Sheets[sheetName];
		const json = xlsx.utils.sheet_to_json(worksheet);

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
 * Converts docx buffer to a styled PDF using Puppeteer.
 * @param {Buffer} docxBuffer - The buffer containing the generated Word document.
 * @param {string} pdfFilePath - The file path to save the generated PDF.
 */
async function convertDocxToPdf(docxBuffer, pdfFilePath) {
	try {
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
                }
                th, td {
                    border: 1px solid #000000;
                    padding: 8px;
                }
                th {
                    background-color: #f2f2f2;
                    text-align: left;
                }
                p {
                    margin: 5px 0;
                }
                .bridge-section {
                    margin-bottom: 20px;
                }
                .bridge-id {
                    margin-bottom: 35px;
                    display: block;
                }
            </style>
        </head>
        <body>
            ${sections
				.map((section, index) => {
					const formattedSection = section
						.trim()
						.replace(
							/(Bridge ID:[^<]*)/,
							'<span class="bridge-id">$1</span>'
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

		const browser = await puppeteer.launch();
		const page = await browser.newPage();
		await page.setContent(styledHtml);
		await page.pdf({
			path: pdfFilePath,
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
	} catch (error) {
		throw error;
	}
}

/**
 * Generates a PDF with a table based on dynamic dataset.
 * Each Bridge ID appears above its table on a new page.
 * @param {string} outputFilePath - The file path to save the generated PDF.
 * @param {object} data - The data containing reports identified by their ID.
 * @returns {Promise<{ success: boolean; message: string }>} - State which represents whether the generation was a success or failure and the error message if applicable
 */
async function generatePDF(outputFilePath, data) {
	const columnHeaderMap = {
		'Bridge Component(Report)': 'Bridge Component',
		'Repair Category(Report)': 'Repair Category',
		'Description of Issue(Report)': 'Desc. of Issue',
		'Workflow Stage': 'Workflow Stage',
	};

	const columns = Object.values(data)[0]?.[0]
		? Object.keys(Object.values(data)[0][0])
		: [];

	function formatTextWithNewlines(text) {
		if (!text || !String(text)) return [];
		return String(text)
			.split(/\r?\n/)
			.map((line) => new Paragraph({ text: line, style: 'Text' }));
	}

	const sections = Object.keys(data).map((assetName) => {
		const assetData = data[assetName];

		const table = new Table({
			rows: [
				new TableRow({
					children: columns.map((col) => {
						return new TableCell({
							children: [
								new Paragraph({
									text: columnHeaderMap[col] || col,
									style: 'Text',
								}),
							],
							verticalAlign: VerticalAlign.CENTER,
							margins: {
								top: convertInchesToTwip(0.05),
								bottom: convertInchesToTwip(0.05),
								left: convertInchesToTwip(0.05),
								right: convertInchesToTwip(0.05),
							},
						});
					}),
				}),
				...assetData.map((rowData) => {
					return new TableRow({
						children: columns.map((col) => {
							return new TableCell({
								children: formatTextWithNewlines(rowData[col]),
								verticalAlign: VerticalAlign.CENTER,
								margins: {
									top: convertInchesToTwip(0.05),
									bottom: convertInchesToTwip(0.05),
									left: convertInchesToTwip(0.05),
									right: convertInchesToTwip(0.05),
								},
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
			await convertDocxToPdf(buffer, outputFilePath);

			return {
				success: true,
				message: `Successfully generated PDF of data at ${outputFilePath}`,
			};
		});
	} catch (error) {
		console.log(error);
		
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
