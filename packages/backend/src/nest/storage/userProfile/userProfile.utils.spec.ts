import { isPng, base64DataURLToByteArray, isGif, isJpeg, validatePhoto } from './userProfile.utils'
import { LARGE_IMG_URI, VALID_GIF_URI, VALID_JPEG_URI, VALID_PNG_URI } from './userProfile.utils.spec.const'

describe('isPng', () => {
  test('returns true for a valid PNG', () => {
    // Bytes in decimal copied out of a PNG file
    // e.g. od -t u1 ~/Pictures/test.png | less
    const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82])
    expect(isPng(png)).toBeTruthy()
  })

  test('returns false for a invalid PNG', () => {
    // Changed the first byte from 137 to 136
    const png = new Uint8Array([136, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82])
    expect(isPng(png)).toBeFalsy()
  })

  test('returns false for a incomplete PNG', () => {
    // Removed last byte from the PNG header
    const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26])
    expect(isPng(png)).toBeFalsy()
  })
})

describe('isJpeg', () => {
  test('returns true for a valid JPEG', () => {
    const jpeg = new Uint8Array([255, 216, 255, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82])
    expect(isJpeg(jpeg)).toBeTruthy()
  })

  test('returns false for a invalid JPEG', () => {
    const jpeg = new Uint8Array([136, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82])
    expect(isJpeg(jpeg)).toBeFalsy()
  })

  test('returns false for a incomplete JPEG', () => {
    // Removed last byte from the PNG header
    const jpeg = new Uint8Array([255, 216])
    expect(isJpeg(jpeg)).toBeFalsy()
  })
})

describe('isGif', () => {
  test('returns true for a valid GIF89', () => {
    const gif = new Uint8Array([71, 73, 70, 56, 57, 97, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82])
    expect(isGif(gif)).toBeTruthy()
  })

  test('returns true for a valid GIF87', () => {
    const gif = new Uint8Array([71, 73, 70, 56, 55, 97, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82])
    expect(isGif(gif)).toBeTruthy()
  })

  test('returns false for a invalid GIF', () => {
    const gif = new Uint8Array([136, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82])
    expect(isGif(gif)).toBeFalsy()
  })

  test('returns false for a incomplete GIF', () => {
    // Removed last byte from the PNG header
    const gif = new Uint8Array([71, 73, 70, 56, 57])
    expect(isGif(gif)).toBeFalsy()
  })
})

describe('base64DataURLToByteArray', () => {
  test("throws error if data URL prefix doesn't exist", () => {
    const contents = '1234567'
    expect(() => base64DataURLToByteArray(contents)).toThrow(Error)
  })

  test('throws error if data URL prefix is malformatted', () => {
    let contents = ',1234567'
    expect(() => base64DataURLToByteArray(contents)).toThrow(Error)

    contents = ',1234567'
    expect(() => base64DataURLToByteArray(contents)).toThrow(Error)

    contents = 'data:,1234567'
    expect(() => base64DataURLToByteArray(contents)).toThrow(Error)

    contents = ';base64,1234567'
    expect(() => base64DataURLToByteArray(contents)).toThrow(Error)

    contents = 'dat:;base64,1234567'
    expect(() => base64DataURLToByteArray(contents)).toThrow(Error)
  })

  test('returns Uint8Array if data URL prefix is correct', () => {
    // base64 encoding of binary 'm'
    // btoa('m') == 'bQ=='
    const contents = 'data:mime;base64,bQ=='
    expect(base64DataURLToByteArray(contents)).toEqual(new Uint8Array(['m'.charCodeAt(0)]))
  })
})

describe('validatePhoto', () => {
  test("returns false when the photo isn't a string", () => {
    const input = 1234 as any
    expect(validatePhoto(input, 'abc123')).toEqual(false)
  })

  test("returns false when the photo doesn't have a valid image header", () => {
    const input = 'Zm9vYmFy'
    expect(validatePhoto(input, 'abc123')).toEqual(false)
  })

  test('returns false when the photo is missing the magic byte header', () => {
    const input = 'data:image/png;base64,Zm9vYmFy'
    expect(validatePhoto(input, 'abc123')).toEqual(false)
  })

  test('returns true when the photo is a valid PNG string', () => {
    expect(validatePhoto(VALID_PNG_URI, 'abc123')).toEqual(true)
  })

  test('returns true when the photo is a valid JPEG string', () => {
    expect(validatePhoto(VALID_JPEG_URI, 'abc123')).toEqual(true)
  })

  test('returns true when the photo is a valid GIF string', () => {
    expect(validatePhoto(VALID_GIF_URI, 'abc123')).toEqual(true)
  })

  test('returns false when the photo is larger than 200KB', () => {
    expect(validatePhoto(LARGE_IMG_URI, 'abc123')).toEqual(false)
  })
})
