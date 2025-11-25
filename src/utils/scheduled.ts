type ScheduleHandler<E = Env> = (context: {
	controller: ScheduledController;
	env: E;
	executionCtx: ExecutionContext;
}) => void | Promise<void>;

/**
 * Controller for managing and executing scheduled tasks in Cloudflare Workers.
 *
 * This class provides a fluent API for registering cron job handlers and automatically
 * matches them to the appropriate cron schedule at runtime. Multiple handlers can be
 * registered for the same schedule and will be executed in parallel.
 *
 * @template E - The environment bindings type (defaults to Env)
 *
 * @example
 * ```ts
 * // Create a schedule controller
 * const scheduleController = new ScheduleController<Env>();
 *
 * // Register handlers for different schedules
 * scheduleController
 *   .handler('* /30 * * * *', createTaskHandler(async (context) => {
 *     console.info('Running every 30 minutes');
 *     // ...
 *   }))
 *   .handler('0 0 * * *', createTaskHandler(async (context) => {
 *     console.info('Running daily at midnight');
 *     // ...
 *   }));
 *
 * // Export the processor in your worker
 * export default {
 *   scheduled: scheduleController.process
 * };
 * ```
 *
 * @example
 * ```ts
 * // Multiple handlers for the same schedule run in parallel
 * scheduleController
 *   .handler('* /30 * * * *', sendAnalyticsHandler)
 *   .handler('* /30 * * * *', pruneCacheHandler);
 * ```
 */
export class ScheduleController<E = Env> {
	private _jobs: Map<string, Array<ScheduleHandler<E>>> = new Map();

	/**
	 * Registers a scheduled task handler for a specific cron schedule.
	 *
	 * Multiple handlers can be registered for the same schedule - they will all
	 * execute in parallel when the cron triggers.
	 *
	 * @param schedule - Cron expression (e.g., '* /30 * * * *' for every 30 minutes)
	 * @param handler - The handler function to execute when the cron triggers
	 * @returns The ScheduleController instance for method chaining
	 *
	 * @example
	 * ```ts
	 * scheduleController.handler('0 * * * *', createTaskHandler(async (context) => {
	 *   const { env, controller } = context;
	 *   console.info(`Hourly task triggered at ${controller.scheduledTime}`);
	 *   await env.WORKFLOWS.create({ id: 'hourly-workflow' });
	 * }));
	 * ```
	 */
	handler = (schedule: string, handler: ScheduleHandler<E>): this => {
		const existingHandlers = this._jobs.get(schedule) ?? [];
		this._jobs.set(schedule, existingHandlers.concat(handler));
		return this;
	};

	/**
	 * Gets the Cloudflare Workers scheduled event handler.
	 *
	 * This getter returns a function compatible with Cloudflare Workers'
	 * `ExportedHandlerScheduledHandler` interface. When a cron trigger fires,
	 * it matches the cron expression to registered handlers and executes all
	 * matching handlers in parallel.
	 *
	 * If no handlers match the triggered cron schedule, a warning is logged.
	 *
	 * @returns A scheduled event handler for Cloudflare Workers
	 *
	 * @example
	 * ```ts
	 * // In your worker's main file (src/index.ts)
	 * const scheduleController = new ScheduleController();
	 *
	 * // Register handlers...
	 * scheduleController.handler('* /30 * * * *', myHandler);
	 *
	 * // Export for Cloudflare Workers
	 * export default {
	 *   fetch: app.fetch,
	 *   scheduled: scheduleController.process
	 * };
	 * ```
	 */
	get process(): ExportedHandlerScheduledHandler<E> {
		return async (controller, env, executionCtx): Promise<void> => {
			const jobs = this._jobs.get(controller.cron) ?? [];
			if (!jobs.length)
				return console.warn(
					`No cron job found for schedule "${controller.cron}"`,
				);

			await Promise.all(
				jobs.map((handler) =>
					handler({
						controller,
						env,
						executionCtx,
					}),
				),
			);
		};
	}
}
