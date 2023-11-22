export type EncryptedField = 119 | 125 | 124 | 123 | 122 | 116
export type EncryptedData = {
  type: 119,
  data: number
} | {
  type: 125,
  data: number
} | {
  type: 124,
  data: number
} | {
  type: 123,
  data: number
} | {
  type: 122,
  data: number
} | {
  type: 116,
  data: string
}
