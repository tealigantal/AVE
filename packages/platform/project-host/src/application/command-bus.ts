export type CommandHandler<TCommand, TResult> = (command: TCommand) => Promise<TResult> | TResult;

export class CommandBus {
  private readonly handlers = new Map<string, CommandHandler<unknown, unknown>>();

  register<TCommand, TResult>(commandType: string, handler: CommandHandler<TCommand, TResult>): void {
    if (this.handlers.has(commandType)) throw new Error(`command handler already registered: ${commandType}`);
    this.handlers.set(commandType, handler as CommandHandler<unknown, unknown>);
  }

  async dispatch<TResult>(commandType: string, command: unknown): Promise<TResult> {
    const handler = this.handlers.get(commandType);
    if (!handler) throw new Error(`command handler not found: ${commandType}`);
    return await handler(command) as TResult;
  }
}
