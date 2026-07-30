declare module "electron" {
  export const app: { whenReady(): Promise<void>; on(event: string, listener: () => void): void; quit(): void };
  export const ipcMain: { handle(channel: string, listener: (event: IpcMainInvokeEvent, request: unknown) => unknown): void };
  export const ipcRenderer: { invoke(channel: string, request: unknown): Promise<unknown> };
  export const dialog: { showOpenDialog(options: unknown): Promise<{ canceled: boolean; filePaths: string[] }> };
  export const contextBridge: { exposeInMainWorld(name: string, api: unknown): void };
  export class BrowserWindow { constructor(options: unknown); loadFile(path: string): Promise<void>; static getAllWindows(): BrowserWindow[]; }
  export interface IpcMainInvokeEvent { senderFrame: { url: string } }
}
declare namespace Electron { interface IpcMainInvokeEvent { senderFrame: { url: string } } }
