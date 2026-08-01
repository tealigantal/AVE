declare module "electron" {
  export const app: { whenReady(): Promise<void>; on(event: string, listener: () => void): void; quit(): void };
  export const ipcMain: { handle(channel: string, listener: (event: IpcMainInvokeEvent, request: unknown) => unknown): void };
  export const ipcRenderer: { invoke(channel: string, request?: unknown): Promise<unknown>; on(channel: string, listener: (event: unknown, payload: unknown) => void): void; removeListener(channel: string, listener: (event: unknown, payload: unknown) => void): void };
  export const protocol: { registerSchemesAsPrivileged(schemes: unknown[]): void; handle(scheme: string, handler: (request: { url: string }) => Promise<Response> | Response): void };
  export const net: { fetch(url: string): Promise<Response> };
  export const dialog: {
    showOpenDialog(options: unknown): Promise<{ canceled: boolean; filePaths: string[] }>;
    showOpenDialog(browserWindow: BrowserWindow, options: unknown): Promise<{ canceled: boolean; filePaths: string[] }>;
  };
  export const contextBridge: { exposeInMainWorld(name: string, api: unknown): void };
  export class BrowserWindow { readonly id: number; readonly webContents: { send(channel: string, payload: unknown): void }; constructor(options: unknown); loadFile(path: string): Promise<void>; loadURL(url: string): Promise<void>; on(event: string, listener: () => void): void; static getAllWindows(): BrowserWindow[]; static fromWebContents(webContents: unknown): BrowserWindow | null; }
  export interface IpcMainInvokeEvent { sender: { id: number }; senderFrame: { url: string } }
}
declare namespace Electron { interface IpcMainInvokeEvent { senderFrame: { url: string } } }
