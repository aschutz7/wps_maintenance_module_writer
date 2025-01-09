import React from 'react';
import Sidebar from './Sidebar.jsx';

export default function Instructions() {
	return (
		<div className='bg-gray-900 text-white min-h-screen flex'>
			<Sidebar isCollapsible className='shrink-0' />
			<div className='flex-grow p-8'>
				<header className='text-center mb-8'>
					<h1 className='text-4xl font-bold mb-2'>Instructions</h1>
					<p className='text-lg'>
						Learn how to use the WPS Maintenance Module Generator
					</p>
				</header>
				<main className='max-w-4xl mx-auto space-y-6'>
					<section>
						<h2 className='text-2xl font-semibold mb-2'>
							Step 1: Upload Your Excel File
						</h2>
						<p>
							Begin by selecting the Excel file containing the
							maintenance-related description data you want to
							format into a PDF or DOCX file.
						</p>
						<p className='text-sm text-gray-400'>
							The file should have column headers that can be
							selected for inclusion in the final output.
						</p>
					</section>

					<section>
						<h2 className='text-2xl font-semibold mb-2'>
							Step 2: Select Columns to Include
						</h2>
						<p>
							After uploading your file, choose the columns you
							want to include in the PDF or DOCX by checking the
							boxes next to each column.
						</p>
						<p className='text-sm text-gray-400'>
							You can save your selected columns for future use or
							load previously saved selections.
						</p>
					</section>

					<section>
						<h2 className='text-2xl font-semibold mb-2'>
							Step 3: Select Output Format and Folder
						</h2>
						<p>
							Choose whether you want to generate a PDF or DOCX
							file using the slider or toggle option. Then, select
							the folder where you want to save the generated
							file.
						</p>
						<p className='text-sm text-gray-400'>
							Make sure to save your output file path before
							generating the file.
						</p>
					</section>

					<section>
						<h2 className='text-2xl font-semibold mb-2'>
							Step 4: Generate the File
						</h2>
						<p>
							Once you've selected the output format and folder,
							click the "Generate" button to create your formatted
							maintenance description file (PDF or DOCX).
						</p>
						<p className='text-sm text-gray-400'>
							The generation progress will be displayed, and once
							completed, your file will be ready for use.
						</p>
					</section>

					<footer className='text-center mt-8'>
						<p>Ready to get started?</p>
						<button
							onClick={() =>
								(window.location.href = '#/generator')
							}
							className='bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded shadow-lg mt-2'
						>
							Start Sorting
						</button>
					</footer>
				</main>
			</div>
		</div>
	);
}
