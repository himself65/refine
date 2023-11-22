import {
  array,
  binary,
  buffer,
  decoding,
  encoding,
  error,
  map,
} from 'lib0'
import { atob, decodeBase64, encodeBase64 } from '@endo/base64'
import {
  Array as YArray,
  ContentAny,
  ContentBinary,
  ContentDeleted,
  ContentDoc,
  ContentEmbed,
  ContentFormat,
  ContentJSON,
  ContentString,
  ContentType,
  createID,
  GC,
  Item,
  Map as YMap, Skip,
  Text as YText,
  XmlElement as YXmlElement,
  XmlFragment as YXmlFragment,
  XmlHook as YXmlHook,
  XmlText as YXmlText,
  Doc as YDoc,
  UpdateEncoderV1,
  UpdateEncoderV2,
  createDeleteSet
} from 'yjs'
import type { EncryptedData } from './utils'

export class EncryptedDecoderV1 {

  constructor (
    private readonly cryptoKey: CryptoKey,
    private readonly iv: Uint8Array,
    public readonly restDecoder: decoding.Decoder
  ) {}

  resetDsCurVal () {
    // nop
  }

  readDsClock () {
    return decoding.readVarUint(this.restDecoder)
  }

  readDsLen () {
    return decoding.readVarUint(this.restDecoder)
  }

  readLeftID () {
    return createID(decoding.readVarUint(this.restDecoder),
      decoding.readVarUint(this.restDecoder))
  }

  readRightID () {
    return createID(decoding.readVarUint(this.restDecoder),
      decoding.readVarUint(this.restDecoder))
  }

  readClient () {
    return decoding.readVarUint(this.restDecoder)
  }

  readInfo () {
    return decoding.readUint8(this.restDecoder)
  }

  async readString (): Promise<string> {
    const encrypted = decoding.readVarString(this.restDecoder)
    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: this.iv
      },
      this.cryptoKey,
      decodeBase64(encrypted)
    )
    return atob(encodeBase64(new Uint8Array(decrypted)))
  }

  readParentInfo () {
    return decoding.readVarUint(this.restDecoder) === 1
  }

  readTypeRef () {
    return decoding.readVarUint(this.restDecoder)
  }

  readLen () {
    return decoding.readVarUint(this.restDecoder)
  }

  async readAny (): Promise<undefined | null | number | bigint | boolean | string | Record<string, any> | Array<any> | Uint8Array> {
    const offset = decoding.readUint8(this.restDecoder)
    switch (offset) {
      case 127:
        return undefined
      case 126:
        return null
      case 125: {
        break
      }
      case 124: {
        break
      }
      case 123: {
        break
      }
      case 122: {
        break
      }
      case 121:
        return false
      case 120:
        return true
      case 119: {
        break
      }
      case 118: {
        const len = decoding.readVarUint(this.restDecoder)
        const obj: Record<string, unknown> = {}
        for (let i = 0; i < len; i++) {
          const key = decoding.readVarString(this.restDecoder)
          obj[key] = await this.readAny()
        }
        return obj
      }
      case 117: {
        const len = decoding.readVarUint(this.restDecoder)
        const arr = []
        for (let i = 0; i < len; i++) {
          arr.push(await this.readAny())
        }
        return arr
      }
      case 116: {
        const encrypted = decoding.readVarUint8Array(this.restDecoder)
        const decrypted = await crypto.subtle.decrypt(
          {
            name: 'AES-GCM',
            iv: this.iv
          },
          this.cryptoKey,
          encrypted
        )
        const value = JSON.parse(
          atob(encodeBase64(new Uint8Array(decrypted)))) as EncryptedData
        switch (value.type) {
          case 119: {
            return value.data
          }
          case 125: {
            return value.data
          }
          case 124: {
            return value.data
          }
          case 123: {
            return value.data
          }
          case 122: {
            return value.data
          }
          default:
            error.unexpectedCase()
        }
      }
      default:
        error.unexpectedCase()
    }
    error.unexpectedCase()
  }

  readBuf () {
    return buffer.copyUint8Array(decoding.readVarUint8Array(this.restDecoder))
  }

  readJSON () {
    return JSON.parse(decoding.readVarString(this.restDecoder))
  }

  readKey () {
    return decoding.readVarString(this.restDecoder)
  }
}

const readContentDeleted = (
  decoder: EncryptedDecoderV1
) => new ContentDeleted(decoder.readLen())

const readContentJSON = async (decoder: EncryptedDecoderV1) => {
  const len = decoder.readLen()
  const cs = []
  for (let i = 0; i < len; i++) {
    const c = await decoder.readString()
    if (c === 'undefined') {
      cs.push(undefined)
    } else {
      cs.push(JSON.parse(c))
    }
  }
  return new ContentJSON(cs)
}

const readContentBinary = (decoder: EncryptedDecoderV1) =>
  new ContentBinary(decoder.readBuf())

const readContentString = async (decoder: EncryptedDecoderV1) => new ContentString(
  await decoder.readString())

const readContentEmbed = (decoder: EncryptedDecoderV1) => new ContentEmbed(
  decoder.readJSON())

const readContentFormat = (decoder: EncryptedDecoderV1) => new ContentFormat(
  decoder.readKey(), decoder.readJSON())

const readYArray = () => new YArray()
const readYMap = () => new YMap()
const readYText = () => new YText()
const readYXmlElement = (
  decoder: EncryptedDecoderV1
) => new YXmlElement(decoder.readKey())
const readYXmlFragment = () => new YXmlFragment()
const readYXmlHook = (decoder: EncryptedDecoderV1) => new YXmlHook(
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

const readContentType = (decoder: EncryptedDecoderV1) => new ContentType(
  typeRefs[decoder.readTypeRef()](decoder))

const readContentAny = async (decoder: EncryptedDecoderV1) => {
  const len = decoder.readLen()
  const cs = []
  for (let i = 0; i < len; i++) {
    cs.push(await decoder.readAny())
  }
  return new ContentAny(cs)
}
const createDocFromOpts = (guid: string, opts: {
  shouldLoad?: boolean
  autoLoad?: boolean
}) => new YDoc(
  { guid, ...opts, shouldLoad: opts.shouldLoad || opts.autoLoad || false })

const readContentDoc = async (decoder: EncryptedDecoderV1) => new ContentDoc(
  createDocFromOpts(await decoder.readString(),
    await decoder.readAny() as Record<string, unknown>
  )
)

const contentRefs = [
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

const readItemContent = async (
  decoder: EncryptedDecoderV1, info: number
) => contentRefs[info & binary.BITS5](decoder)

async function * lazyStructReaderGenerator (
  decoder: EncryptedDecoderV1
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
            ? await decoder.readString()
            : decoder.readLeftID()) : null, // parent
          cantCopyParentInfo && (info & binary.BIT6) === binary.BIT6
            ? await decoder.readString()
            : null, // parentSub
          await readItemContent(decoder, info) // item content
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

class LazyStructReader {
  gen: AsyncGenerator<Item | GC | Skip, void>
  curr: null | Item | Skip | GC
  done: boolean
  filterSkips: boolean

  constructor (
    decoder: EncryptedDecoderV1,
    filterSkips: boolean
  ) {
    this.gen = lazyStructReaderGenerator(decoder)
    /**
     * @type {null | Item | Skip | GC}
     */
    this.curr = null
    this.done = false
    this.filterSkips = filterSkips
  }

  async init () {
    await this.next()
  }

  async next (): Promise<Item | GC | Skip | null> {
    // ignore "Skip" structs
    do {
      this.curr = (await this.gen.next()).value || null
    } while (this.filterSkips && this.curr !== null && this.curr.constructor ===
    Skip)
    return this.curr
  }
}

class LazyStructWriter {
  currClient: number
  startClock: number
  written: number
  encoder: UpdateEncoderV1 | UpdateEncoderV2
  clientStructs: {
    written: number,
    restEncoder: Uint8Array
  }[]

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

function readDeleteSet (decoder: EncryptedDecoderV1) {
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
        dsField.push(createID(decoder.readDsClock(), decoder.readDsLen()))
      }
    }
  }
  return ds
}

const writeDeleteSet = (
  encoder: UpdateEncoderV1 | UpdateEncoderV2,
  ds: ReturnType<typeof createDeleteSet>
) => {
  encoding.writeVarUint(encoder.restEncoder, ds.clients.size)

  // Ensure that the delete set is written in a deterministic order
  array.from(ds.clients.entries()).
    sort((a, b) => b[0] - a[0]).
    forEach(([client, dsitems]) => {
      encoder.resetDsCurVal()
      encoding.writeVarUint(encoder.restEncoder, client)
      const len = dsitems.length
      encoding.writeVarUint(encoder.restEncoder, len)
      for (let i = 0; i < len; i++) {
        const item = dsitems[i]
        encoder.writeDsClock(item.clock)
        encoder.writeDsLen(item.len)
      }
    })
}

export async function decryptUpdateV1 (
  decryptKey: CryptoKey,
  iv: Uint8Array,
  update: Uint8Array
): Promise<Uint8Array> {
  const updateDecoder = new EncryptedDecoderV1(
    decryptKey,
    iv,
    decoding.createDecoder(update)
  )
  const lazyDecoder = new LazyStructReader(updateDecoder, false)
  await lazyDecoder.init()
  const updateEncoder = new UpdateEncoderV1()

  const lazyWriter = new LazyStructWriter(updateEncoder)
  for (
    let curr = lazyDecoder.curr;
    curr !== null;
    curr = await lazyDecoder.next()
  ) {
    writeStructToLazyStructWriter(lazyWriter, curr, 0)
  }
  finishLazyStructWriting(lazyWriter)
  const ds = readDeleteSet(updateDecoder)
  writeDeleteSet(updateEncoder, ds)
  return encoding.toUint8Array(updateEncoder.restEncoder)
}
