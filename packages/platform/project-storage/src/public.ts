export type ProjectStorageBoundary = Readonly<{ databaseFile: string; objectStoreDirectory: string }>;
export type ProjectManifest = Readonly<{ project_id: string; project_format_version: 1; database: "project.sqlite"; created_at: string; portable: boolean }>;
