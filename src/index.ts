import {
	type APIChatInputApplicationCommandInteraction,
	type APIInteraction,
	type APIInteractionResponse,
	InteractionResponseType,
	InteractionType,
} from 'discord-api-types/v10';
import { verifyKey } from 'discord-interactions';
import { Hono } from 'hono';
import { bearerAuth } from 'hono/bearer-auth';

import { COMMAND_NAME, KEY_PREFIX, SUBCOMMAND } from '~/constants';
import type { CodeEntry } from '~/types';
import { backup } from '~/utils/backup';
import { ScheduleController } from '~/utils/scheduled';

const app = new Hono<{
	Bindings: Env;
	Variables: {
		interaction: APIInteraction;
	};
}>()
	.use('/interactions', async (c, next) => {
		if (c.req.method !== 'POST')
			return c.json(
				{
					error: 'Method not allowed.',
				},
				405,
			);

		const signature = c.req.header('X-Signature-Ed25519');
		const timestamp = c.req.header('X-Signature-Timestamp');
		if (!signature || !timestamp)
			return c.json(
				{
					error: 'Invalid request headers.',
				},
				401,
			);

		const body = await c.req.text();
		const isValid = await verifyKey(
			body,
			signature,
			timestamp,
			c.env.DISCORD_PUBLIC_KEY,
		);
		if (!isValid)
			return c.json(
				{
					error: 'Failed to verify request.',
				},
				401,
			);

		const json = JSON.parse(body) as APIInteraction;
		if (json.type === InteractionType.Ping)
			return c.json<APIInteractionResponse>({
				type: InteractionResponseType.Pong,
			});

		c.set('interaction', json);
		await next();
	})
	.post('/interactions', async (c) => {
		const body = c.get('interaction');
		if (body.type !== InteractionType.ApplicationCommand)
			return c.json(
				{
					error: 'Unknown interaction type',
				},
				400,
			);

		const command = body as APIChatInputApplicationCommandInteraction;
		const subcommandOption = command.data.options?.find((opt) => opt.type === 1);
		if (command.data.name !== COMMAND_NAME || !subcommandOption)
			return c.json<APIInteractionResponse>({
				data: {
					content: 'Unknown subcommand.',
				},
				type: InteractionResponseType.ChannelMessageWithSource,
			});

		const serverId = command.guild_id;
		if (!serverId)
			return c.json(
				{
					error: 'No server ID found in interaction.',
				},
				400,
			);

		const targetUserId = command.member?.user.id || command.user?.id;
		if (!targetUserId)
			return c.json(
				{
					error: 'No user ID found in interaction.',
				},
				400,
			);

		switch (subcommandOption.name) {
			case SUBCOMMAND.LIST: {
				const selectedUserId = subcommandOption.options?.find(
					(opt) => opt.name === 'user',
				);
				console.log({ selectedUserId });

				const codes = await c.env.KV.get<Array<CodeEntry>>(
					[KEY_PREFIX, serverId, targetUserId].join('/'),
					{
						type: 'json',
					},
				);
				if (!codes || codes.length === 0)
					return c.json<APIInteractionResponse>({
						data: {
							content: 'No codes found.',
						},
						type: InteractionResponseType.ChannelMessageWithSource,
					});

				return c.json<APIInteractionResponse>({
					data: {
						content: codes
							.map((entry) => `- **${entry.name}**: \`${entry.code}\``)
							.join('\n'),
					},
					type: InteractionResponseType.ChannelMessageWithSource,
				});
			}
			case SUBCOMMAND.ADD: {
				const name = subcommandOption.options?.find((opt) => opt.name === 'name')
					?.value as string;
				const code = subcommandOption.options?.find((opt) => opt.name === 'code')
					?.value as string;

				const existingCodes = await c.env.KV.get<Array<CodeEntry>>(
					[KEY_PREFIX, serverId, targetUserId].join('/'),
					{
						type: 'json',
					},
				);
				const hasDuplicate = existingCodes?.some(
					(e) => e.name === name || e.code === code,
				);
				if (hasDuplicate)
					return c.json<APIInteractionResponse>({
						data: {
							content: `A code with the name \`${name}\` or code \`${code}\` already exists in your list.`,
						},
						type: InteractionResponseType.ChannelMessageWithSource,
					});

				await c.env.KV.put(
					[KEY_PREFIX, serverId, targetUserId].join('/'),
					JSON.stringify([...(existingCodes ?? []), { name, code }]),
				);

				return c.json<APIInteractionResponse>({
					data: {
						content: `Added code \`${name}\` (\`${code}\`) to your list.`,
					},
					type: InteractionResponseType.ChannelMessageWithSource,
				});
			}
			case SUBCOMMAND.REMOVE: {
				const name = subcommandOption.options?.find((opt) => opt.name === 'name')
					?.value as string;

				const existingCodes = await c.env.KV.get<Array<CodeEntry>>(
					[KEY_PREFIX, serverId, targetUserId].join('/'),
					{
						type: 'json',
					},
				);
				const codeToRemove = existingCodes?.find((entry) => entry.name === name);
				if (!codeToRemove)
					return c.json<APIInteractionResponse>({
						data: {
							content: `No code found with the name \`${name}\`.`,
						},
						type: InteractionResponseType.ChannelMessageWithSource,
					});

				const updatedCodes = (existingCodes ?? []).filter((e) => e.name !== name);
				await c.env.KV.put(
					[KEY_PREFIX, serverId, targetUserId].join('/'),
					JSON.stringify(updatedCodes),
				);

				return c.json<APIInteractionResponse>({
					data: {
						content: `Removed code \`${name}\` from your list.`,
					},
					type: InteractionResponseType.ChannelMessageWithSource,
				});
			}
			default: {
				return c.json<APIInteractionResponse>({
					data: {
						content: 'Unknown subcommand.',
					},
					type: InteractionResponseType.ChannelMessageWithSource,
				});
			}
		}
	})
	.use('/backup', async (c, next) => {
		const middleware = bearerAuth({
			token: c.env.BACKUP_AUTH_TOKEN,
		});

		return middleware(c, next);
	})
	.post('/backup', async (c) => {
		c.executionCtx.waitUntil(backup(c.env));
		return c.json({
			data: null,
			error: null,
		});
	});

const scheduled = new ScheduleController().handler(
	'0 0 * * *', // Daily at midnight UTC
	async (c) => {
		console.log('Running scheduled task to backup codes.');
		c.executionCtx.waitUntil(backup(c.env));
	},
);

export default {
	fetch: app.fetch,
	scheduled: scheduled.process,
} satisfies ExportedHandler<Env>;
