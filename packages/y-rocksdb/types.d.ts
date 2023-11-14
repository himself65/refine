declare module '@nxtedition/rocksdb' {
  import { AbstractLevel } from 'abstract-level'
  class RocksLevel<TFormat, KDefault = string, VDefault = string> extends AbstractLevel<
    TFormat,
    KDefault,
    VDefault
  >{
    constructor (location: string) {}
  }
}
