import { buffer, decoding } from 'lib0'
import { atob, decodeBase64, encodeBase64 } from '@endo/base64'
import { createID } from 'yjs'

export class EncryptedDecoderV1 {
  constructor (
    private readonly cryptoKey: CryptoKey,
    private readonly iv: Uint8Array,
    private readonly restDecoder: decoding.Decoder
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

  readAny () {
    return decoding.readAny(this.restDecoder)
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
