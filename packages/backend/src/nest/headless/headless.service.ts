import { Inject, Injectable, OnModuleInit } from '@nestjs/common'
import {
  Community,
  Identity,
  InitCommunityPayload,
  InitUserCsrPayload,
  InvitationData,
  InvitationDataV2,
  InvitationDataVersion,
} from '@quiet/types'
import EventEmitter from 'events'
import { createLogger } from '../common/logger'
import { HEADLESS_OPTIONS } from '../const'
import { LocalDbService } from '../local-db/local-db.service'
import { HeadlessOptions } from '../types'
import short from 'short-uuid'
import { ConnectionsManagerService } from '../connections-manager/connections-manager.service'
import { pairsToP2pAddresses } from '@quiet/common'

@Injectable()
export class HeadlessService extends EventEmitter implements OnModuleInit {
  private _initialized: boolean = false
  private _launched: boolean = false
  private _inviteData: InvitationData | undefined = undefined

  private readonly logger = createLogger('headlessService')

  constructor(
    @Inject(HEADLESS_OPTIONS) private readonly headlessOptions: HeadlessOptions,
    private readonly localDbService: LocalDbService,
    private readonly connectionsManagerService: ConnectionsManagerService
  ) {
    super()
  }

  public async onModuleInit(): Promise<void> {
    this._initialized = false
    this._launched = false

    if (this.headlessOptions == null) {
      return
    }

    this.logger.info(`Initializing headless service`)
    const currentCommunity = await this.localDbService.getCurrentCommunity()
    if (currentCommunity != null) {
      this._initialized = true
    }
  }

  get initialized(): boolean {
    return this._initialized
  }

  get launched(): boolean {
    return this._launched
  }

  public async launchCommunity(joining: boolean = false): Promise<void> {
    if (!this._initialized) {
      throw new Error(`Headless user isn't initialized!`)
    }

    if (this._launched) {
      throw new Error(`Headless user has already launched the community!`)
    }

    const community = await this.localDbService.getCurrentCommunity()
    if (community == null) {
      throw new Error(`No community was found!`)
    }

    if (joining) {
      this.logger.info(`Joining community as headless user`)
      const payload: InitCommunityPayload = {
        id: community.id,
        inviteData: this._inviteData,
        name: community.name,
        ownerOrbitDbIdentity: community.ownerOrbitDbIdentity,
        psk: community.psk,
        peers: community.peerList,
      }
      await this.connectionsManagerService.joinCommunity(payload)
    } else {
      this.logger.info(`Launching community for headless user`)
      await this.connectionsManagerService.launchCommunity(community)
    }
  }

  public async initHeadlessUser(inviteData: InvitationDataV2): Promise<Identity> {
    if (this._initialized) {
      throw new Error(`Headless user already initialized!`)
    }

    this._inviteData = inviteData
    const community = await this.initCommunity(inviteData)
    let identity = await this.initIdentity(community.id)
    identity = await this.initUser(community, identity)
    this._initialized = true

    return identity
  }

  private async initCommunity(inviteData: InvitationDataV2): Promise<Community> {
    this.logger.info('Creating community metadata')

    // Community IDs are only local identifiers
    this.logger.info('Generating community ID')
    const id = short.generate()

    const community: Community = {
      id,
      name: inviteData.authData.communityName,
      inviteData,
      psk: inviteData.psk,
      ownerOrbitDbIdentity: inviteData.ownerOrbitDbIdentity,
      peerList: pairsToP2pAddresses(inviteData.pairs),
    }

    this.logger.info(`Storing community metadata`)
    await this.localDbService.setCommunity(community)
    this.localDbService.setCurrentCommunityId(community.id)

    return community
  }

  private async initIdentity(id: string): Promise<Identity> {
    this.logger.info(`Creating identity`)
    const identity = await this.connectionsManagerService.createIdentity(id)
    if (identity == null) {
      throw new Error(`Identity was null!`)
    }

    this.logger.info('Generating random username')
    const name = this._generateHeadlessUserName()

    this.logger.info(`Storing identity`)
    await this.localDbService.setIdentity({
      ...identity,
      nickname: name,
    })
    return identity
  }

  private async initUser(community: Community, identity: Identity): Promise<Identity> {
    this.logger.info(`Creating user metadata`)

    this.logger.info(`Creating CSR`)
    const csrPayload: InitUserCsrPayload = {
      communityId: community.id,
      nickname: identity.nickname,
      isUsernameTaken: false,
    }
    const updatedIdentity = await this.connectionsManagerService.addUserCsr(csrPayload)
    if (updatedIdentity == null) {
      throw new Error(`Updated identity was null!`)
    }

    this.logger.info(`Storing updated identity`)
    await this.localDbService.setIdentity(updatedIdentity)

    return updatedIdentity
  }

  private _generateHeadlessUserName(baseName: string = 'headless'): string {
    return `${baseName}-${short.generate()}`
  }
}
