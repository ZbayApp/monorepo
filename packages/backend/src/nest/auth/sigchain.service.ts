import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { SigChain } from './sigchain'
import { Keyring, LocalUserContext } from '3rd-party/auth/packages/auth/dist'

@Injectable()
export class SigChainService implements OnModuleInit {
  private readonly logger = new Logger(SigChainService.name)
  private chains: Map<string, SigChain> = new Map()
  private activeChainTeamName: string | undefined
  private static _instance: SigChainService | undefined

  onModuleInit() {
    if (SigChainService._instance) {
      throw new Error('SigChainManagerService already initialized!')
    }
    SigChainService._instance = this
  }

  getActiveChain(): SigChain {
    if (!this.activeChainTeamName) {
      throw new Error('No active chain found!')
    }
    return this.getChainByTeamName(this.activeChainTeamName)
  }

  setActiveChain(teamName: string): SigChain {
    if (!this.chains.has(teamName)) {
      throw new Error(`No chain found for team ${teamName}, can't set to active!`)
    }
    this.activeChainTeamName = teamName
    return this.getActiveChain()
  }

  addChain(chain: SigChain, setActive: boolean): boolean {
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

  deleteChain(teamName: string): void {
    if (!this.chains.has(teamName)) {
      throw new Error(`No chain found for team ${teamName} to delete!`)
    }
    this.chains.delete(teamName)
    if (this.activeChainTeamName === teamName) {
      this.activeChainTeamName = undefined
    }
  }

  createChain(teamName: string, username: string, setActive: boolean): SigChain {
    if (this.chains.has(teamName)) {
      throw new Error(`Chain for team ${teamName} already exists`)
    }
    const sigChain = SigChain.create(teamName, username)
    this.addChain(sigChain, setActive)
    return sigChain
  }

  loadChain(serializedTeam: Uint8Array, context: LocalUserContext, teamKeyRing: Keyring, setActive: boolean): SigChain {
    const sigChain = SigChain.load(serializedTeam, context, teamKeyRing)
    this.addChain(sigChain, setActive)
    return sigChain
  }

  getChainByTeamName(teamName: string): SigChain {
    if (!this.chains.has(teamName)) {
      throw new Error(`No chain found for team ${teamName}!`)
    }
    return this.chains.get(teamName)!
  }

  static get instance(): SigChainService {
    if (!SigChainService._instance) {
      throw new Error("SigChainManagerService hasn't been initialized yet! Run init() before accessing")
    }
    return SigChainService._instance
  }
}
