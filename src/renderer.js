/**
 * This file will automatically be loaded by webpack and run in the "renderer" context.
 * To learn more about the differences between the "main" and the "renderer" context in
 * Electron, visit:
 *
 * https://electronjs.org/docs/tutorial/application-architecture#main-and-renderer-processes
 *
 * By default, Node.js integration in this file is disabled. When enabling Node.js integration
 * in a renderer process, please be aware of potential security implications. You can read
 * more about security risks here:
 *
 * https://electronjs.org/docs/tutorial/security
 *
 * To enable Node.js integration in this file, open up `main.js` and enable the `nodeIntegration`
 * flag:
 *
 * ```
 *  // Create the browser window.
 *  mainWindow = new BrowserWindow({
 *    width: 800,
 *    height: 600,
 *    webPreferences: {
 *      nodeIntegration: true
 *    }
 *  });
 * ```
 */
import * as Sentry from '@sentry/electron/renderer';

Sentry.init({
	integrations: [
		Sentry.browserTracingIntegration(),
		Sentry.replayIntegration(),
	],

	// Set tracesSampleRate to 1.0 to capture 100%
	// of transactions for performance monitoring.
	// We recommend adjusting this value in production
	// Learn more at
	// https://docs.sentry.io/platforms/javascript/configuration/options/#traces-sample-rate
	tracesSampleRate: 0.9,

	// Capture Replay for 10% of all sessions,
	// plus for 100% of sessions with an error
	// Learn more at
	// https://docs.sentry.io/platforms/javascript/session-replay/configuration/#general-integration-configuration
	replaysSessionSampleRate: 0.0,
	replaysOnErrorSampleRate: 1.0,
	// debug: true,
});

import './index.jsx';
