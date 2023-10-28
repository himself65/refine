import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('apis', {
  getTheme: async () => ipcRenderer.invoke('get-theme'),
  changeTheme: async (theme: 'dark' | 'light') => {
    await ipcRenderer.invoke('change-theme', theme)
  }
})
