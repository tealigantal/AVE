export type QueryHandler<TResult> = (query: unknown) => Promise<TResult> | TResult;

export class QueryBus {
  private readonly handlers = new Map<string, QueryHandler<unknown>>();

  register<TResult>(queryType: string, handler: QueryHandler<TResult>): void {
    if (this.handlers.has(queryType)) throw new Error(`query handler already registered: ${queryType}`);
    this.handlers.set(queryType, handler as QueryHandler<unknown>);
  }

  async execute<TResult>(queryType: string, query: unknown): Promise<TResult> {
    const handler = this.handlers.get(queryType);
    if (!handler) throw new Error(`query handler not found: ${queryType}`);
    return await handler(query) as TResult;
  }
}
