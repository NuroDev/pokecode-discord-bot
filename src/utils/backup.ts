import { BACKUP_RETENTION_DAYS, KEY_PREFIX } from '~/constants';
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

/**
 * Prunes old backups from R2 storage that are older than the specified retention days.
 *
 * @param env - The environment containing R2 bindings
 * @param retentionDays - Number of days to keep backups (default: 30)
 *
 * @returns A promise that resolves when the pruning is complete
 */
export async function pruneBackups(
	env: Env,
	retentionDays = BACKUP_RETENTION_DAYS,
): Promise<void> {
	try {
		const cutoffDate = new Date();
		cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
		const cutoffTimestamp = cutoffDate.getTime();

		const keysToDelete = new Set<string>();
		const listResult = await env.BACKUPS.list();
		for (const object of listResult.objects) {
			// Extract timestamp from filename (format: backup-{timestamp}.json)
			const match = object.key.match(/backup-(\d+)\.json$/);
			if (!match) continue;

			const backupTimestamp = Number.parseInt(match[1], 10);
			if (backupTimestamp < cutoffTimestamp) keysToDelete.add(object.key);
		}

		if (keysToDelete.size > 0) {
			await env.BACKUPS.delete(Array.from(keysToDelete.values()));
			console.log(`Pruning completed: ${keysToDelete.size} old backups deleted`);
		} else {
			console.log('Pruning completed: No old backups to delete');
		}
	} catch (error) {
		console.error('Backup pruning failed:', error);
	}
}
