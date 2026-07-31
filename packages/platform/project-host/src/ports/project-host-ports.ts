export type ProjectHostSessionPort = {
  manifest: { project_id: string };
  close(): Promise<void>;
};

export type ProjectHostStoragePort = {
  open(projectDirectory: string): Promise<ProjectHostSessionPort>;
  create(projectDirectory: string): Promise<ProjectHostSessionPort>;
};

export type WorkerJobPort = {
  submit<TInput, TResult>(taskType: string, input: TInput, control?: { jobId?: string; signal?: AbortSignal; timeoutMs?: number; onProgress?: (value: number) => void }): Promise<TResult>;
};
