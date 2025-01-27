export const TRANSFER_SPEED_SPAN_MS = 10_000 // 10 seconds
export const TRANSFER_SPEED_SPAN = TRANSFER_SPEED_SPAN_MS / 1000
export const UPDATE_STATUS_INTERVAL_MS = 1_000 // 1 second

// Not sure if this is safe enough, nodes with CID data usually contain at most around 270 hashes.
export const MAX_EVENT_LISTENERS = 600

// 1048576 is the number of bytes in a block uploaded via unixfs
// Reference: packages/backend/node_modules/@helia/unixfs/src/commands/add.ts
export const DEFAULT_CAT_BLOCK_CHUNK_SIZE = 1048576 * 10
