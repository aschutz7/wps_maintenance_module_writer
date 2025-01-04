const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');
const { mainConfig } = require('./webpack.main.config');
const { rendererConfig } = require('./webpack.renderer.config');

const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

module.exports = {
	packagerConfig: {
		asar: true,
		icon: './src/icon.ico',
	},
	publishers: [
		{
			name: '@electron-forge/publisher-github',
			config: {
				repository: {
					owner: 'aschutz7',
					name: 'wps_maintenance_module_writer',
				},
				prerelease: true,
				draft: false,
			},
		},
	],
	rebuildConfig: {},
	makers: [
		{
			name: '@electron-forge/maker-squirrel',
			config: {
				icon: './src/icon.ico',
				setupIcon: './src/icon.ico',
				name: 'WPS_FUA_Sorter',
				loadingGif: './src/loading.gif',
			},
		},
		{
			name: '@electron-forge/maker-zip',
			platforms: ['darwin'],
		},
		{
			name: '@electron-forge/maker-deb',
			config: {
				icon: './src/icon.ico',
				name: 'WPS_FUA_Sorter',
			},
		},
		{
			name: '@electron-forge/maker-rpm',
			config: {
				icon: './src/icon.ico',
				name: 'WPS_FUA_Sorter',
			},
		},
	],
	plugins: [
		{
			name: '@electron-forge/plugin-auto-unpack-natives',
			config: {},
		},
		{
			name: '@electron-forge/plugin-webpack',
			config: {
				mainConfig: './webpack.main.config.js',
				renderer: {
					config: './webpack.renderer.config.js',
					entryPoints: [
						{
							html: './src/index.html',
							js: './src/renderer.js',
							name: 'main_window',
							preload: {
								js: './src/preload.js',
							},
						},
					],
				},
			},
		},
		// Fuses configuration to enable/disable Electron functionality
		new FusesPlugin({
			version: FuseVersion.V1,
			[FuseV1Options.RunAsNode]: false,
			[FuseV1Options.EnableCookieEncryption]: true,
			[FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
			[FuseV1Options.EnableNodeCliInspectArguments]: false,
			[FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
			[FuseV1Options.OnlyLoadAppFromAsar]: true,
		}),
	],
	hooks: {
		readPackageJson: async (forgeConfig, packageJson) => {
			const originalPackageJson = await fs.readJson(
				path.resolve(__dirname, 'package.json')
			);

			const externals = rendererConfig?.externals || {};
			const neededDependencies = Object.keys(externals).reduce(
				(acc, pkg) => {
					if (originalPackageJson.dependencies[pkg]) {
						acc[pkg] = originalPackageJson.dependencies[pkg];
					}
					return acc;
				},
				{}
			);

			packageJson.dependencies = {
				...packageJson.dependencies,
				...neededDependencies,
			};

			return packageJson;
		},
		packageAfterPrune: async (forgeConfig, buildPath) => {
			try {
				execSync('npm install --production', { cwd: buildPath });
			} catch (error) {
				console.error('Error during npm install:', error);
			}
		},
	},
};
