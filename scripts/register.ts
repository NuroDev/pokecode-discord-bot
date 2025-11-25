/// <reference types="@types/bun" />

import { REST, Routes, SlashCommandBuilder } from 'discord.js';
import { z } from 'zod';

import { COMMAND_NAME, SUBCOMMAND } from '../src/constants';

const env = await z
	.object({
		DISCORD_CLIENT_ID: z.string(),
		DISCORD_BOT_TOKEN: z.string(),
	})
	.parseAsync(process.env)
	.catch((err) => {
		if (err instanceof z.ZodError) {
			console.error(z.prettifyError(err));
		} else {
			console.error('Unexpected error during environment validation:', err);
		}
		process.exit(1);
	});

const codeCommand = new SlashCommandBuilder()
	.setName(COMMAND_NAME)
	.setDescription('Find, add or remove codes.')
	.addSubcommand((cmd) =>
		cmd
			.setName(SUBCOMMAND.LIST)
			.setDescription('List game codes')
			.addUserOption((option) =>
				option
					.setName('user')
					.setDescription('User to get codes for')
					.setRequired(false),
			),
	)
	.addSubcommand((cmd) =>
		cmd
			.setName(SUBCOMMAND.ADD)
			.setDescription('Add a game code')
			.addStringOption((option) =>
				option
					.setName('name')
					.setDescription('A name/label for this code')
					.setRequired(true),
			)
			.addStringOption((option) =>
				option
					.setName('code')
					.setDescription('The game code to add')
					.setRequired(true),
			),
	)
	.addSubcommand((cmd) =>
		cmd
			.setName(SUBCOMMAND.REMOVE)
			.setDescription('Remove a game code')
			.addStringOption((option) =>
				option
					.setName('name')
					.setDescription('The name of the code to remove')
					.setRequired(true),
			),
	);

const commandsRoute = Routes.applicationCommands(env.DISCORD_CLIENT_ID);

try {
	const rest = new REST({ version: '10' });
	rest.setToken(env.DISCORD_BOT_TOKEN);

	await rest.put(commandsRoute, {
		body: [codeCommand.toJSON()],
	});

	console.log('✅ Successfully registered application commands');
} catch (error) {
	console.error('❌ Error registering application commands:', error);
}
