import { jest } from '@jest/globals'

import { ProcessInChunksService } from './process-in-chunks.service'
import waitForExpect from 'wait-for-expect'
import { TestModule } from '../common/test.module'
import { Test, TestingModule } from '@nestjs/testing'
import { sleep } from '../common/sleep'
import { createLogger } from '../common/logger'

const logger = createLogger('processInChunksService:test')

describe('ProcessInChunks', () => {
  let module: TestingModule
  let processInChunks: ProcessInChunksService<string>

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [TestModule, ProcessInChunksService],
    }).compile()

    processInChunks = await module.resolve(ProcessInChunksService)
  })

  it('processes data', async () => {
    const mockProcessItem = jest
      .fn(async a => {
        logger.info('processing', a)
      })
      .mockResolvedValueOnce()
      .mockRejectedValueOnce(new Error('Rejected 1'))
      .mockResolvedValueOnce()
      .mockRejectedValueOnce(new Error('Rejected 2'))
    processInChunks.init(['a', 'b', 'c', 'd'], mockProcessItem)
    await waitForExpect(() => {
      expect(mockProcessItem).toBeCalledTimes(6)
    })
  })

  it('processes new data', async () => {
    const mockProcessItem = jest
      .fn(async a => {
        logger.info('processing', a)
      })
      .mockResolvedValueOnce()
      .mockRejectedValueOnce(new Error('Rejected 1'))
    processInChunks.init(['a', 'b'], mockProcessItem)
    processInChunks.updateQueue(['e', 'f'])
    await waitForExpect(() => {
      expect(mockProcessItem).toBeCalledTimes(5)
    })
  })

  it('processes data in chunks', async () => {
    const mockProcessItem = jest
      .fn(async a => {
        logger.info('processing', a)
      })
      .mockResolvedValueOnce()
      .mockRejectedValueOnce(new Error('Rejected 1'))
      .mockResolvedValueOnce()
      .mockRejectedValueOnce(new Error('Rejected 2'))
    const chunkSize = 2
    processInChunks.init(['a', 'b', 'c', 'd'], mockProcessItem, chunkSize)
    await sleep(10000)
    await waitForExpect(() => {
      expect(mockProcessItem).toBeCalledTimes(6)
    })
  })

  it('does not process more data if stopped', async () => {
    const mockProcessItem = jest.fn(async () => {})
    processInChunks.init([], mockProcessItem)
    processInChunks.pause()
    processInChunks.updateQueue(['a', 'b', 'c', 'd'])
    expect(mockProcessItem).not.toBeCalled()
  })

  it('processes tasks after resuming from pause', async () => {
    const mockProcessItem = jest.fn(async () => {})
    processInChunks.init([], mockProcessItem)
    processInChunks.pause()
    processInChunks.updateQueue(['a', 'b', 'c', 'd'])
    processInChunks.resume()
    await waitForExpect(() => {
      expect(mockProcessItem).toBeCalledTimes(4)
    })
  })
})
