import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'path';
import { defineConfig } from 'vite';

/** @type {import('vite').UserConfig} */
const config = defineConfig({
	plugins: [svelte()],
	
	build: {
		// Optimize for production with smaller bundle size
		minify: 'terser',
		terserOptions: {
			compress: {
				// Remove console logs in production
				drop_console: false, // Keep console for now, but can enable in final release
				pure_funcs: ['console.debug'],
				// Additional compression options
				passes: 2
			}
		},
		
		// Optimize chunk size
		chunkSizeWarningLimit: 1000,
		
		// Lib configuration
		lib: {
			entry: resolve('src', 'module.ts'),
			name: 'HealthArc', 
			formats: ['iife'],
			fileName: () => 'module.js', // output to dist/module.js
		},    // Output directory configuration
    outDir: 'dist',
    emptyOutDir: process.env.NODE_ENV !== 'development',
    
    // Rollup specific options
		rollupOptions: {
			output: {
				// Ensure exports are properly named
				inlineDynamicImports: true,
				
				// Setup proper paths for assets
				assetFileNames: (assetInfo) => {
					const name = assetInfo?.name || '';
					
					if (name.endsWith('.css')) {
						return 'styles/module.css';
					}
					
					return '[name][extname]';
				},
				
				// Avoid using eval to improve security and performance
				strict: true
			},
			
			// External dependencies (if any)
			// external: ['pixi.js']
		},    // Optimize for faster builds during development
    sourcemap: process.env.NODE_ENV === 'development'
  },
	
	// Optimize server options for development
	server: {
		port: 3000,
		strictPort: false,
		open: false,
		hmr: {
			overlay: true
		}
	},
	
	// Optimize for production
	optimizeDeps: {
		include: ['svelte']
	},
	
	// Public directory for static assets
	publicDir: 'public'
});

export default config;
