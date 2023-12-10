type Chunk = {
  update: Uint8Array
  date: number
}

export type Workspace = {
  guid: string
  updates: Chunk[]
  author: string
}

export type QueryOptions = {
  stateVector: Uint8Array
  author: string
}

export interface DocStateResponse {
  missingUpdate: Uint8Array;
  stateVector?: Uint8Array;
}

export type Dispose = () => void

export type Status = {
  type: 'idle'
} | {
  type: 'syncing'
} | {
  type: 'error'
  error: unknown
} | {
  type: 'synced'
}

export type DataSourceAdapter = {
  queryDocState: (
    guid: string,
    query?: Partial<QueryOptions>
  ) => Promise<DocStateResponse>
  sendDocUpdate: (
    guid: string, update: Uint8Array, origin: string) => Promise<void>
  onDocUpdate?: (callback: (
    guid: string, update: Uint8Array) => void) => Dispose
}

export type ProviderAdapter = {
  sync (onlyRootDoc?: boolean): Promise<void>;
  getConnected (): boolean;
  connect (): void;
  disconnect (): void;
};

export type StatusAdapter = {
  getStatus (): Status
  onStatusChange (callback: () => void): Dispose
}
