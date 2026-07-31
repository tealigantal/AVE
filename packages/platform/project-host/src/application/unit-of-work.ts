export type Transaction = { commit(): void; rollback(): void };

export class UnitOfWork {
  async execute<TResult>(transaction: Transaction, operation: () => Promise<TResult> | TResult): Promise<TResult> {
    try {
      const result = await operation();
      transaction.commit();
      return result;
    } catch (error) {
      transaction.rollback();
      throw error;
    }
  }
}
