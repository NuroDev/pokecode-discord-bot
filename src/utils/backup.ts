import { KEY_PREFIX } from '~/constants';
import type { CodeEntry } from '~/types';

interface BackupData {
	data: Map<string, Array<CodeEntry>>;
	timestamp: string;
	version: string;
}

/**
 * Backs up KV data to R2 storage.
 *
 * @param env - The environment containing KV and R2 bindings
 *
 * @returns A promise that resolves when the backup is complete
 */
export async function backup(env: Env): Promise<void> {
	try {
		const backup = {
			data: new Map<string, Array<CodeEntry>>(),
			timestamp: new Date().toISOString(),
			version: '1.0',
		} satisfies BackupData;

		const listResult = await env.KV.list({ prefix: `${KEY_PREFIX}/` });
		for (const key of listResult.keys) {
			const value = await env.KV.get<Array<CodeEntry>>(key.name, { type: 'json' });
			if (value) backup.data.set(key.name, value);
		}

		const filename = `backup-${Date.now()}.json`;

		await env.BACKUPS.put(
			filename,
			JSON.stringify(
				{
					data: Object.fromEntries(backup.data),
					timestamp: backup.timestamp,
					version: backup.version,
				},
				null,
				2,
			),
			{
				customMetadata: {
					keyCount: backup.data.size.toString(),
					timestamp: backup.timestamp,
					version: backup.version,
				},
				httpMetadata: {
					contentType: 'application/json',
				},
			},
		);

		console.log(`Backup completed successfully: ${filename}`);
	} catch (error) {
		console.error('Backup failed:', error);
	}
}
