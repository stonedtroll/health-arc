import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'path';

/** @type {import('vite').UserConfig} */
const config = {
	plugins: [svelte()],
	build: {
		lib: {
			entry: resolve('src', 'main.ts'),
			name: 'HealthArc', 
			formats: ['iife'],
			fileName: () => 'health-arc.js', // output to dist/health-arc.js
		},
		outDir: 'dist',
		emptyOutDir: true,
		rollupOptions: {
			output: {
				assetFileNames: (assetInfo) => {
					const name = assetInfo?.fileName || '';
					if (name.endsWith('.css')) {
						return 'styles/health-arc.css';
					}
					return '[name][extname]';
				},
			},
		},
	},
	publicDir: 'public'
};

export default config;
