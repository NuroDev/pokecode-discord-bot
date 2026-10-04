import { bindings, defineConfig, triggers } from 'cf/config';

export default defineConfig({
	worker: {
		compatibilityDate: '2025-11-09',
		compatibilityFlags: ['nodejs_compat'],
		entrypoint: 'src/index.ts',
		env: {
			BACKUPS: bindings.r2({
				dev: { remote: true },
				name: 'pokecode-backups',
			}),
			BACKUP_AUTH_TOKEN: bindings.secret(),
			DISCORD_PUBLIC_KEY: bindings.secret(),
			KV: bindings.kv({
				dev: { remote: true },
				id: '992d2f8a71614989bf2a48b8eba1956c',
			}),
		},
		name: 'pokecode-discord-bot',
		observability: {
			enabled: true,
			logs: { enabled: true },
			traces: { enabled: true },
		},
		previewUrls: false,
		triggers: [
			triggers.scheduled({
				schedule: '0 0 * * *',
			}),
		],
	},
});
