import React  from 'react';
import Sidebar from './Sidebar.jsx';

export default function Home() {
	return (
		<div className='bg-gray-900 text-white min-h-screen flex'>
			<Sidebar isCollapsible className='shrink-0' />
			<div className='flex-grow flex flex-col items-center justify-center'>
				<header className='text-center'>
					<h1 className='text-5xl font-bold'>
						WPS Engineering LLC
						<br />
						Maintenance Module PDF Generator
					</h1>
				</header>

				<div className='space-y-4 space-x-3'>
					<button
						onClick={() =>
							(window.location.href = '#/instructions')
						}
						className='bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded shadow-lg'
					>
						Instructions
					</button>
					<button
						onClick={() => (window.location.href = '#/generator')}
						className='bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded shadow-lg'
					>
						Start Generating
					</button>
				</div>
			</div>
		</div>
	);
}
