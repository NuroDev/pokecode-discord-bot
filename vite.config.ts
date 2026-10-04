import { cloudflare } from '@cloudflare/vite-plugin';
import { defineConfig } from 'vite-plus';

export default defineConfig({
	fmt: {
		arrowParens: 'always',
		bracketSameLine: true,
		bracketSpacing: true,
		ignorePatterns: ['.cloudflare/**'],
		jsxSingleQuote: true,
		printWidth: 90,
		semi: true,
		singleQuote: true,
		tabWidth: 4,
		trailingComma: 'all',
		useTabs: true,
	},
	lint: {
		ignorePatterns: ['.cloudflare/**'],
		options: {
			typeAware: true,
			typeCheck: true,
		},
	},
	plugins: [cloudflare()],
	resolve: {
		tsconfigPaths: true,
	},
});
