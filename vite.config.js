import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
	plugins: [
		react(),
		nodePolyfills({
			global: true,
		}),
	],
	optimizeDeps: {
		esbuildOptions: {
			target: "esnext",
			define: {
				global: 'globalThis'
			},
			supported: { 
				bigint: true
			},
		}
	},
	define: {
		'process.env': {},
	},
	base: './',
});
