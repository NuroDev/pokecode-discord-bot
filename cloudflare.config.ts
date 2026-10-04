import { bindings, defineConfig, triggers } from 'cf/config';

const PROJECT_NAME = 'pokecode';

export default defineConfig((ctx) => ({
	worker: {
		compatibilityDate: '2026-10-04',
		compatibilityFlags: ['nodejs_compat'],
		entrypoint: 'src/index.ts',
		env: {
			BACKUPS: bindings.r2({
				dev: { remote: true },
				name: ctx.isPreview
					? `${PROJECT_NAME}-preview-backups`
					: `${PROJECT_NAME}-backups`,
			}),
			BACKUP_AUTH_TOKEN: bindings.secret(),
			DISCORD_PUBLIC_KEY: bindings.secret(),
			KV: bindings.kv({
				dev: { remote: true },
				id: ctx.isPreview ? undefined : '992d2f8a71614989bf2a48b8eba1956c',
			}),
		},
		name: `${PROJECT_NAME}-discord-bot`,
		observability: {
			enabled: true,
			issues: { enabled: true },
			logs: { enabled: true },
			traces: { enabled: true },
		},
		previewUrls: false,
		// cf rejects Preview builds containing triggers; cron targets production.
		triggers: ctx.isPreview
			? []
			: [
					triggers.scheduled({
						schedule: '0 0 * * *',
					}),
				],
	},
}));
