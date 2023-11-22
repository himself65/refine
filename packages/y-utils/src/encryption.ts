import {
  UpdateEncoderV1,
  UpdateDecoderV1,
  UpdateEncoderV2,
  ID,
  Skip,
  createID,
  Item,
  ContentDeleted,
  UpdateDecoderV2,
  ContentJSON,
  Array as YArray,
  Map as YMap,
  Text as YText,
  XmlElement as YXmlElement,
  XmlFragment as YXmlFragment,
  XmlHook as YXmlHook,
  XmlText as YXmlText,
  ContentBinary,
  ContentString,
  ContentEmbed,
  ContentFormat,
  ContentType,
  ContentAny,
  ContentDoc,
  Doc as YDoc,
  GC,
  createDeleteSet
} from 'yjs'
import { btoa, decodeBase64 } from '@endo/base64'

import {
  encoding,
  binary,
  error,
  map,
  math,
  number,
  array,
  decoding,
  func
} from 'lib0'

const floatTestBed = new DataView(new ArrayBuffer(4))
const isFloat32 = (num: number) => {
  floatTestBed.setFloat32(0, num)
  return floatTestBed.getFloat32(0) === num
}

export class EncryptedEncoderV1 extends UpdateEncoderV1 {
  constructor (
    private readonly cryptoKey: InstanceType<typeof window.CryptoKey>,
    private readonly iv: Uint8Array
  ) {
    super()
  }

  override writeLeftID (id: ID) {
    return super.writeLeftID(id)
  }

  override writeRightID (id: ID) {
    return super.writeRightID(id)
  }

  override writeClient (client: number) {
    return super.writeClient(client)
  }

  override writeInfo (info: number) {
    return super.writeInfo(info)
  }

  override async writeString (s: string) {
    const encrypted = await crypto.subtle.encrypt({
      name: 'AES-GCM',
      iv: this.iv
    }, this.cryptoKey, decodeBase64(btoa(s)))
    encoding.writeUint8Array(this.restEncoder, new Uint8Array(encrypted))
  }

  override writeParentInfo (isYKey: boolean) {
    return super.writeParentInfo(isYKey)
  }

  override writeTypeRef (info: number) {
    return super.writeTypeRef(info)
  }

  override writeLen (len: number) {
    return super.writeLen(len)
  }

  // we can encrypt the string, number, buffer, object, array.
  //  but undefined, null, boolean will be reserved.
  override async writeAny (data: undefined | null | number | bigint | boolean | string | Record<string, any> | Array<any> | Uint8Array) {
    switch (typeof data) {
      case 'string': {
        // TYPE 119: STRING
        encoding.write(this.restEncoder, 119)
        const encrypted = await crypto.subtle.encrypt({
          name: 'AES-GCM',
          iv: this.iv
        }, this.cryptoKey, decodeBase64(btoa(data)))
        encoding.writeUint8Array(this.restEncoder, new Uint8Array(encrypted))
        break
      }
      case 'number':
        if (number.isInteger(data) && math.abs(data) <= binary.BITS31) {
          // TYPE 125: INTEGER
          encoding.write(this.restEncoder, 125)
          const encrypted = await crypto.subtle.encrypt({
            name: 'AES-GCM',
            iv: this.iv
          }, this.cryptoKey, decodeBase64(btoa(`${data}`)))
          encoding.writeUint8Array(this.restEncoder, new Uint8Array(encrypted))
        } else if (isFloat32(data)) {
          // TYPE 124: FLOAT32
          encoding.write(this.restEncoder, 124)
          const encrypted = await crypto.subtle.encrypt({
            name: 'AES-GCM',
            iv: this.iv
          }, this.cryptoKey, decodeBase64(btoa(`${data}`)))
          encoding.writeUint8Array(this.restEncoder, new Uint8Array(encrypted))
        } else {
          // TYPE 123: FLOAT64
          encoding.write(this.restEncoder, 123)
          const encrypted = await crypto.subtle.encrypt({
            name: 'AES-GCM',
            iv: this.iv
          }, this.cryptoKey, decodeBase64(btoa(`${data}`)))
          encoding.writeUint8Array(this.restEncoder, new Uint8Array(encrypted))
        }
        break
      case 'bigint': {
        // TYPE 122: BigInt
        encoding.write(this.restEncoder, 122)
        const encrypted = await crypto.subtle.encrypt({
          name: 'AES-GCM',
          iv: this.iv
        }, this.cryptoKey, decodeBase64(btoa(`${data}`)))
        encoding.writeUint8Array(this.restEncoder, new Uint8Array(encrypted))
        break
      }
      case 'object':
        if (data === null) {
          // TYPE 126: null
          encoding.write(this.restEncoder, 126)
        } else if (array.isArray(data)) {
          // TYPE 117: Array
          encoding.write(this.restEncoder, 117)
          encoding.writeVarUint(this.restEncoder, data.length)
          for (let i = 0; i < data.length; i++) {
            await this.writeAny(data[i])
          }
        } else if (data instanceof Uint8Array) {
          // TYPE 116: ArrayBuffer
          encoding.write(this.restEncoder, 116)
          encoding.writeVarUint8Array(this.restEncoder, data)
        } else {
          // TYPE 118: Object
          encoding.write(this.restEncoder, 118)
          const keys = Object.keys(data)
          encoding.writeVarUint(this.restEncoder, keys.length)
          for (let i = 0; i < keys.length; i++) {
            const key = keys[i]
            encoding.writeVarString(this.restEncoder, key)
            await this.writeAny(data[key as keyof typeof data])
          }
        }
        break
      case 'boolean': {
        // TYPE 120/121: boolean (true/false)
        encoding.write(this.restEncoder, data ? 120 : 121)
        break
      }
      default:
        // TYPE 127: undefined
        encoding.write(this.restEncoder, 127)
    }
  }

  override writeBuf (buf: Uint8Array) {
    // todo: encrypt
    return super.writeBuf(buf)
  }

  override writeJSON (embed: any) {
    // todo: encrypt
    super.writeJSON(embed)
  }

  override writeKey (key: string) {
    super.writeKey(key)
  }
}

//#region copy from yjs source code, please keep the logic same as yjs
const readContentDeleted = (
  decoder: UpdateDecoderV1 | UpdateDecoderV2
) => new ContentDeleted(decoder.readLen())

const readContentJSON = (decoder: UpdateDecoderV1 | UpdateDecoderV2) => {
  const len = decoder.readLen()
  const cs = []
  for (let i = 0; i < len; i++) {
    const c = decoder.readString()
    if (c === 'undefined') {
      cs.push(undefined)
    } else {
      cs.push(JSON.parse(c))
    }
  }
  return new ContentJSON(cs)
}

const readContentBinary = (decoder: UpdateDecoderV1 | UpdateDecoderV2) =>
  new ContentBinary(decoder.readBuf())

const readContentString = (decoder: UpdateDecoderV1 | UpdateDecoderV2) => new ContentString(
  decoder.readString())

const readContentEmbed = (decoder: UpdateDecoderV1 | UpdateDecoderV2) => new ContentEmbed(
  decoder.readJSON())

const readContentFormat = (decoder: UpdateDecoderV1 | UpdateDecoderV2) => new ContentFormat(
  decoder.readKey(), decoder.readJSON())

const readYArray = () => new YArray()
const readYMap = () => new YMap()
const readYText = () => new YText()
const readYXmlElement = (
  decoder: UpdateDecoderV1 | UpdateDecoderV2
) => new YXmlElement(decoder.readKey())
const readYXmlFragment = () => new YXmlFragment()
const readYXmlHook = (decoder: UpdateDecoderV1 | UpdateDecoderV2) => new YXmlHook(
  decoder.readKey())
const readYXmlText = () => new YXmlText()

const typeRefs = [
  readYArray,
  readYMap,
  readYText,
  readYXmlElement,
  readYXmlFragment,
  readYXmlHook,
  readYXmlText
]

const readContentType = (decoder: UpdateDecoderV1 | UpdateDecoderV2) => new ContentType(
  typeRefs[decoder.readTypeRef()](decoder))

const readContentAny = (decoder: UpdateDecoderV1 | UpdateDecoderV2) => {
  const len = decoder.readLen()
  const cs = []
  for (let i = 0; i < len; i++) {
    cs.push(decoder.readAny())
  }
  return new ContentAny(cs)
}
const createDocFromOpts = (guid: string, opts: {
  shouldLoad?: boolean
  autoLoad?: boolean
}) => new YDoc(
  { guid, ...opts, shouldLoad: opts.shouldLoad || opts.autoLoad || false })
const readContentDoc = (decoder: UpdateDecoderV1 | UpdateDecoderV2) => new ContentDoc(
  createDocFromOpts(decoder.readString(), decoder.readAny()))

export const contentRefs = [
  () => { error.unexpectedCase() }, // GC is not ItemContent
  readContentDeleted, // 1
  readContentJSON, // 2
  readContentBinary, // 3
  readContentString, // 4
  readContentEmbed, // 5
  readContentFormat, // 6
  readContentType, // 7
  readContentAny, // 8
  readContentDoc, // 9
  () => { error.unexpectedCase() } // 10 - Skip is not ItemContent
]

const readItemContent = (
  decoder: UpdateDecoderV1 | UpdateDecoderV2, info: number
) => contentRefs[info & binary.BITS5](decoder)

function * lazyStructReaderGenerator (
  decoder: UpdateDecoderV1
) {
  const numOfStateUpdates = decoding.readVarUint(decoder.restDecoder)
  for (let i = 0; i < numOfStateUpdates; i++) {
    const numberOfStructs = decoding.readVarUint(decoder.restDecoder)
    const client = decoder.readClient()
    let clock = decoding.readVarUint(decoder.restDecoder)
    for (let i = 0; i < numberOfStructs; i++) {
      const info = decoder.readInfo()
      // @todo use switch instead of ifs
      if (info === 10) {
        const len = decoding.readVarUint(decoder.restDecoder)
        yield new Skip(createID(client, clock), len)
        clock += len
      } else if ((binary.BITS5 & info) !== 0) {
        const cantCopyParentInfo = (info & (binary.BIT7 | binary.BIT8)) === 0
        // If parent = null and neither left nor right are defined, then we know that `parent` is child of `y`
        // and we read the next string as parentYKey.
        // It indicates how we store/retrieve parent from `y.share`
        // @type {string|null}
        const struct = new Item(
          createID(client, clock),
          null, // left
          (info & binary.BIT8) === binary.BIT8 ? decoder.readLeftID() : null, // origin
          null, // right
          (info & binary.BIT7) === binary.BIT7 ? decoder.readRightID() : null, // right origin
          // @ts-ignore Force writing a string here.
          cantCopyParentInfo ? (decoder.readParentInfo()
            ? decoder.readString()
            : decoder.readLeftID()) : null, // parent
          cantCopyParentInfo && (info & binary.BIT6) === binary.BIT6
            ? decoder.readString()
            : null, // parentSub
          readItemContent(decoder, info) // item content
        )
        yield struct
        clock += struct.length
      } else {
        const len = decoder.readLen()
        yield new GC(createID(client, clock), len)
        clock += len
      }
    }
  }
}

export class LazyStructReader {
  gen: Generator<Item | GC | Skip, void>
  curr: null | Item | Skip | GC
  done: boolean
  filterSkips: boolean

  constructor (
    decoder: UpdateDecoderV1 | UpdateDecoderV2, filterSkips: boolean) {
    this.gen = lazyStructReaderGenerator(decoder)
    /**
     * @type {null | Item | Skip | GC}
     */
    this.curr = null
    this.done = false
    this.filterSkips = filterSkips
    this.next()
  }

  next (): Item | GC | Skip | null {
    // ignore "Skip" structs
    do {
      this.curr = this.gen.next().value || null
    } while (this.filterSkips && this.curr !== null && this.curr.constructor ===
    Skip)
    return this.curr
  }
}

export class LazyStructWriter {
  currClient: number
  startClock: number
  written: number
  encoder: UpdateEncoderV1 | UpdateEncoderV2
  clientStructs: { written: number, restEncoder: Uint8Array }[]

  constructor (encoder: UpdateEncoderV1 | UpdateEncoderV2) {
    this.currClient = 0
    this.startClock = 0
    this.written = 0
    this.encoder = encoder
    this.clientStructs = []
  }
}

const flushLazyStructWriter = (lazyWriter: LazyStructWriter) => {
  if (lazyWriter.written > 0) {
    lazyWriter.clientStructs.push({
      written: lazyWriter.written, restEncoder: encoding.toUint8Array(
        lazyWriter.encoder.restEncoder)
    })
    lazyWriter.encoder.restEncoder = encoding.createEncoder()
    lazyWriter.written = 0
  }
}

const writeStructToLazyStructWriter = (
  lazyWriter: LazyStructWriter, struct: Item | GC, offset: number) => {
  // flush curr if we start another client
  if (lazyWriter.written > 0 && lazyWriter.currClient !== struct.id.client) {
    flushLazyStructWriter(lazyWriter)
  }
  if (lazyWriter.written === 0) {
    lazyWriter.currClient = struct.id.client
    // write next client
    lazyWriter.encoder.writeClient(struct.id.client)
    // write startClock
    encoding.writeVarUint(lazyWriter.encoder.restEncoder,
      struct.id.clock + offset)
  }
  struct.write(lazyWriter.encoder, offset)
  lazyWriter.written++
}
const finishLazyStructWriting = (lazyWriter: LazyStructWriter) => {
  flushLazyStructWriter(lazyWriter)

  // this is a fresh encoder because we called flushCurr
  const restEncoder = lazyWriter.encoder.restEncoder

  /**
   * Now we put all the fragments together.
   * This works similarly to `writeClientsStructs`
   */

  // write # states that were updated - i.e. the clients
  encoding.writeVarUint(restEncoder, lazyWriter.clientStructs.length)

  for (let i = 0; i < lazyWriter.clientStructs.length; i++) {
    const partStructs = lazyWriter.clientStructs[i]
    /**
     * Works similarly to `writeStructs`
     */
    // write # encoded structs
    encoding.writeVarUint(restEncoder, partStructs.written)
    // write the rest of the fragment
    encoding.writeUint8Array(restEncoder, partStructs.restEncoder)
  }
}

function readDeleteSet (decoder: UpdateDecoderV2 | UpdateDecoderV1) {
  const ds = createDeleteSet()
  const numClients = decoding.readVarUint(decoder.restDecoder)
  for (let i = 0; i < numClients; i++) {
    decoder.resetDsCurVal()
    const client = decoding.readVarUint(decoder.restDecoder)
    const numberOfDeletes = decoding.readVarUint(decoder.restDecoder)
    if (numberOfDeletes > 0) {
      const dsField = map.setIfUndefined(ds.clients, client,
        () => [] as unknown[])
      for (let i = 0; i < numberOfDeletes; i++) {
        dsField.push({
          clock: decoder.readDsClock(),
          len: decoder.readDsLen()
        })
      }
    }
  }
  return ds
}

function writeDeleteSet () {
  // todo
}

//#endregion

export const covertUpdateV1ToEncryptedUpdate = async (
  cryptoKey: InstanceType<typeof window.CryptoKey>,
  update: Uint8Array
) => {
  const iv = crypto.getRandomValues(new Uint8Array(12))

  const updateDecoder = new UpdateDecoderV1(
    decoding.createDecoder(update)
  )
  const lazyDecoder = new LazyStructReader(updateDecoder, false)
  const updateEncoder = new EncryptedEncoderV1(cryptoKey, iv)

  const lazyWriter = new LazyStructWriter(updateEncoder)

  const blockTransformer = func.id

  for (let curr = lazyDecoder.curr; curr !== null; curr = lazyDecoder.next()) {
    writeStructToLazyStructWriter(lazyWriter, blockTransformer(curr), 0)
  }
  finishLazyStructWriting(lazyWriter)
  const ds = readDeleteSet(updateDecoder)
  writeDeleteSet(updateEncoder, ds)
  return updateEncoder.toUint8Array()
}
