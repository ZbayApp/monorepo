/**
 * This is an implementation of the UnixFS Chunker interface that writes chunks of a stream/iterable
 * to blocks one-to-one.
 *
 * NOTE: In UnixFS the chunker implementation used determines how bytes from a stream are written to the blockstore
 * with the default implementation writing blocks of a fixed size.  This results in UnixFS chunks having more than one
 * byte chunk from the stream grouped together like so:
 *
 * Byte chunk 1:
 * <0 1 2 3 4 5>
 *
 * Byte chunk 2:
 * <6 7 8 9 10 11>
 *
 * Byte chunk 3:
 * <12 13 14 15 16 17>
 *
 * UnixFS Chunk 1:
 * <0 1 2 3 4 5 6 7 8>
 *
 * UnixFS Chunk 2:
 * <9 10 11 12 13 14 15 16 17>
 *
 * In the case of file encryption we want to keep distinct encrypted chunks of the byte stream separate from other encrypted
 * chunks so they can be consumed by the decrypt stream.
 */

import type { Chunker } from 'ipfs-unixfs-importer/chunker'

export const oneToOne = (): Chunker => {
  return async function* oneToOneChunker(source) {
    for await (const buffer of source) {
      yield buffer
    }
  }
}
