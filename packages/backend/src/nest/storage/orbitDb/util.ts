/**
 * Forked from: https://github.com/orbitdb/orbitdb/blob/9ddffd346a26937902cacf0a33ee8210bdc637a0/src/utils/path-join.js
 */

export const posixJoin = (...paths: string[]) =>
  paths.join('/').replace(/((?<=\/)\/+)|(^\.\/)|((?<=\/)\.\/)/g, '') || '.'
