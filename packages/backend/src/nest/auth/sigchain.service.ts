import { Injectable, OnModuleInit } from '@nestjs/common'
import { SigChain } from './sigchain'
import { Keyring, LocalUserContext } from '3rd-party/auth/packages/auth/dist'
import { LocalDbService } from '../local-db/local-db.service'
import { createLogger } from '../common/logger'

@Injectable()
export class SigChainService implements OnModuleInit {
  public activeChainTeamName: string | undefined
  private readonly logger = createLogger(SigChainService.name)
  private chains: Map<string, SigChain> = new Map()
  private static _instance: SigChainService | undefined

  constructor(private readonly localDbService: LocalDbService) {}

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
    return this.getChain(this.activeChainTeamName)
  }

  /**
   * Gets a chain by team name
   * @param teamName Name of the team to get the chain for
   * @returns The chain for the team
   * @throws Error if the chain doesn't exist
   */
  getChain(teamName: string): SigChain {
    if (!this.chains.has(teamName)) {
      throw new Error(`No chain found for team ${teamName}`)
    }
    return this.chains.get(teamName)!
  }

  static get instance(): SigChainService {
    if (!SigChainService._instance) {
      throw new Error("SigChainManagerService hasn't been initialized yet! Run init() before accessing")
    }
    return SigChainService._instance
  }

  setActiveChain(teamName: string): void {
    if (!this.chains.has(teamName)) {
      throw new Error(`No chain found for team ${teamName}, can't set to active!`)
    }
    this.activeChainTeamName = teamName
  }

  /**
   * Adds a chain to the service
   * @param chain SigChain to add
   * @param setActive Whether to set the chain as active
   * @returns Whether the chain was set as active
   */
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

  /**
   * Deletes a chain from the service
   * @param teamName Name of the team to delete
   * @param fromDisk Whether to delete the chain from disk as well
   */
  async deleteChain(teamName: string, fromDisk: boolean): Promise<void> {
    if (fromDisk) {
      this.localDbService.deleteSigChain(teamName)
    }
    this.chains.delete(teamName)
    if (this.activeChainTeamName === teamName) {
      this.activeChainTeamName = undefined
    }
  }

  /**
   * Creates a new chain and adds it to the service
   * @param teamName Name of the team to create
   * @param username Name of the user to create
   * @param setActive Whether to set the chain as active
   * @returns The created chain
   */
  async createChain(teamName: string, username: string, setActive: boolean): Promise<SigChain> {
    if (this.chains.has(teamName)) {
      throw new Error(`Chain for team ${teamName} already exists`)
    }
    const sigChain = SigChain.create(teamName, username)
    this.addChain(sigChain, setActive)
    return sigChain
  }

  /**
   * Deserializes a chain and adds it to the service
   * @param serializedTeam Serialized chain to deserialize
   * @param context User context to use for the chain
   * @param teamKeyRing Keyring to use for the chain
   * @param setActive Whether to set the chain as active
   * @returns The SigChain instance created from the serialized chain
   */
  private async deserialize(
    serializedTeam: Uint8Array,
    context: LocalUserContext,
    teamKeyRing: Keyring,
    setActive: boolean
  ): Promise<SigChain> {
    this.logger.info('Deserializing chain')
    const sigChain = SigChain.load(serializedTeam, context, teamKeyRing)
    this.addChain(sigChain, setActive)
    return sigChain
  }

  /* LevelDB methods */

  /**
   * Loads a chain from disk and adds it to the service
   * @param teamName Name of the team to load
   * @param setActive Whether to set the chain as active
   * @returns The SigChain instance loaded from disk
   * @throws Error if the chain doesn't exist
   */
  async loadChain(teamName: string, setActive: boolean): Promise<SigChain> {
    if (this.localDbService.getStatus() !== 'open') {
      this.localDbService.open()
    }
    this.logger.info(`Loading chain for team ${teamName}`)
    const chain = await this.localDbService.getSigChain(teamName)
    if (!chain) {
      throw new Error(`Chain for team ${teamName} not found`)
    }
    return await this.deserialize(chain.serializedTeam, chain.context, chain.teamKeyRing, setActive)
  }

  /**
   * Saves a chain to disk
   * @param teamName Name of the team to save
   */
  async saveChain(teamName: string): Promise<void> {
    if (this.localDbService.getStatus() !== 'open') {
      this.localDbService.open()
    }
    const chain = await this.getChain(teamName)
    await this.localDbService.setSigChain(chain)
  }
}
