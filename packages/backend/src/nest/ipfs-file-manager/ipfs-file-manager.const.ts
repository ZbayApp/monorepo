export const TRANSFER_SPEED_SPAN_MS = 10_000 // 10 seconds
export const TRANSFER_SPEED_SPAN = TRANSFER_SPEED_SPAN_MS / 1000
export const UPDATE_STATUS_INTERVAL_MS = 1_000 // 1 second

// Not sure if this is safe enough, nodes with CID data usually contain at most around 270 hashes.
export const MAX_EVENT_LISTENERS = 600

// The default chunk size written by unixfs is 262144 bytes when using the fixedSize chunker
// Reference: https://github.com/ipfs/js-ipfs-unixfs/blob/bf060cda444221225675663e2a760ef562437963/packages/ipfs-unixfs-importer/src/chunker/fixed-size.ts#L8
export const UNIXFS_CHUNK_SIZE = 524288
export const UNIXFS_CAT_CHUNK_SIZE = UNIXFS_CHUNK_SIZE * 25 // This determines how much we read when downloading blocks from peers
