import { bindings, defineConfig, triggers } from 'cf/config';

export default defineConfig(({ isPreview }) => {
	const previewKvNamespaceId = process.env.CLOUDFLARE_PREVIEW_KV_NAMESPACE_ID;
	if (isPreview && !previewKvNamespaceId) {
		throw new Error(
			'Set CLOUDFLARE_PREVIEW_KV_NAMESPACE_ID to a separate Preview KV namespace.',
		);
	}

	return {
		worker: {
			compatibilityDate: '2025-11-09',
			compatibilityFlags: ['nodejs_compat'],
			entrypoint: 'src/index.ts',
			env: {
				BACKUPS: bindings.r2({
					dev: { remote: true },
					name: isPreview ? 'pokecode-preview-backups' : 'pokecode-backups',
				}),
				BACKUP_AUTH_TOKEN: bindings.secret(),
				DISCORD_PUBLIC_KEY: bindings.secret(),
				KV: bindings.kv({
					dev: { remote: true },
					id: isPreview
						? previewKvNamespaceId
						: '992d2f8a71614989bf2a48b8eba1956c',
				}),
			},
			name: 'pokecode-discord-bot',
			observability: {
				enabled: true,
				issues: { enabled: true },
				logs: { enabled: true },
				traces: { enabled: true },
			},
			previewUrls: false,
			triggers: isPreview
				? []
				: [
						triggers.scheduled({
							schedule: '0 0 * * *',
						}),
					],
		},
	};
});
