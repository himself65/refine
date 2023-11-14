declare module '@nxtedition/rocksdb' {
  // eslint-disable-next-line import/no-extraneous-dependencies
  import { AbstractLevel } from 'abstract-level'
  class RocksLevel<TFormat, KDefault = string, VDefault = string> extends AbstractLevel<
    TFormat,
    KDefault,
    VDefault
  >{
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    constructor (location: string) {}
  }
}
