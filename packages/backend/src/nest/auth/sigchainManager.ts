/**
 * Manages the chain(s) and makes them accesible across the application
 */

import { SigChain } from './sigchain'
import { createLogger } from '../common/logger'
import { LoadedSigChain } from './types'

const logger = createLogger('auth:sigchainManager')

class SigChainManager {
  public chains: Map<string, SigChain> = new Map()
  public activeChainTeamName: string | undefined
  private static _instance: SigChainManager | undefined

  private constructor() {}

  public static init(): SigChainManager {
    if (SigChainManager._instance !== undefined) {
      throw new Error(`SigChainManager already initialized!`)
    }
    SigChainManager._instance = new SigChainManager()

    return SigChainManager.instance
  }

  public getActiveChain(): SigChain {
    if (this.activeChainTeamName == undefined) {
      throw new Error(`No active chain found!`)
    }

    return this.getChainByTeamName(this.activeChainTeamName)
  }

  public setActiveChain(teamName: string): SigChain {
    if (!this.chains.has(teamName)) {
      throw new Error(`No chain found for team ${teamName}, can't set to active!`)
    }

    this.activeChainTeamName = teamName
    return this.getActiveChain()
  }

  public addChain(chain: SigChain, setActive: boolean): boolean {
    if (this.chains.has(chain.team.teamName)) {
      throw new Error(`Chain for team ${chain.team.teamName} already exists`)
    }

    this.chains.set(chain.team.teamName, chain)
    if (setActive) {
      this.setActiveChain(chain.team.teamName)
      return true
    }
    return false
  }

  public deleteChain(teamName: string): void {
    if (!this.chains.has(teamName)) {
      throw new Error(`No chain found for team ${teamName} to delete!`)
    }

    this.chains.delete(teamName)
    if (this.activeChainTeamName === teamName) {
      this.activeChainTeamName = undefined
    }
    return
  }

  public createChain(teamName: string, username: string, setActive: boolean): LoadedSigChain {
    if (this.chains.has(teamName)) {
      throw new Error(`Chain for team ${teamName} already exists`)
    }

    const { context, sigChain } = SigChain.create(teamName, username)
    this.addChain(sigChain, setActive)
    return { context, sigChain }
  }

  public getChainByTeamName(teamName: string): SigChain {
    if (!this.chains.has(teamName)) {
      throw new Error(`No chain found for team ${teamName}!`)
    }

    return this.chains.get(teamName)!
  }

  public static get instance(): SigChainManager {
    if (SigChainManager._instance == undefined) {
      throw new Error(`SigChainManager hasn't been initialized yet!  Run init() before accessing`)
    }

    return SigChainManager._instance
  }
}

export { SigChainManager }
