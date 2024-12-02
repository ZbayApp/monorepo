// TODO: add back when QSS is implemented
// import { composeInvitationShareUrl, createLibp2pAddress, parseInvitationCode } from '@quiet/common'
// import { App, Channel, CreateCommunityModal, JoinCommunityModal, RegisterUsernameModal, Sidebar } from '../selectors'
// import { InvitationDataV1, InvitationDataV2, InvitationDataVersion } from '@quiet/types'
// import { UserTestData } from '../types'
// import { sleep } from '../utils'
// import fs from 'fs'
// import path from 'path'
// import { createLogger } from '../logger'

// const logger = createLogger('joiningWithQSS')

// jest.setTimeout(1200000) // 20 minutes

// // Run QSS locally before this test
// const serverAddress = 'http://127.0.0.1:3000'

// describe('User joining with storage server', () => {
//   let users: Record<string, UserTestData>
//   const communityName = 'Filmmakers'
//   let generalChannelOwner: Channel
//   let invitationLinkV1: string
//   let invitationLinkV2: string

//   beforeAll(async () => {
//     users = {
//       owner: {
//         username: 'owner',
//         messages: ['Hi'],
//         app: new App(),
//       },
//       user1: {
//         username: 'user-joining-1',
//         messages: ['Nice to meet you all'],
//         app: new App(),
//       },
//     }
//   })

//   afterAll(async () => {
//     await users.owner.app.close()
//     await users.user1.app.close()
//   })

//   describe('Owner creates the community', () => {
//     it('Owner opens the app', async () => {
//       await users.owner.app.open()
//     })

//     it('Owner sees "join community" modal and switches to "create community" modal', async () => {
//       const joinModal = new JoinCommunityModal(users.owner.app.driver)
//       const isJoinModal = await joinModal.element.isDisplayed()
//       expect(isJoinModal).toBeTruthy()
//       await joinModal.switchToCreateCommunity()
//     })
//     it('Owner submits valid community name', async () => {
//       const createModal = new CreateCommunityModal(users.owner.app.driver)
//       const isCreateModal = await createModal.element.isDisplayed()
//       expect(isCreateModal).toBeTruthy()
//       await createModal.typeCommunityName(communityName)
//       await createModal.submit()
//     })
//     it('Owner sees "register username" modal and submits valid username', async () => {
//       const registerModal = new RegisterUsernameModal(users.owner.app.driver)
//       const isRegisterModal = await registerModal.element.isDisplayed()
//       expect(isRegisterModal).toBeTruthy()
//       await registerModal.typeUsername(users.owner.username)
//       await registerModal.submit()
//     })
//     it('Owner registers successfully and sees general channel', async () => {
//       generalChannelOwner = new Channel(users.owner.app.driver, 'general')
//       const isGeneralChannel = await generalChannelOwner.element.isDisplayed()
//       const generalChannelText = await generalChannelOwner.element.getText()
//       expect(isGeneralChannel).toBeTruthy()
//       expect(generalChannelText).toEqual('# general')
//     })
//     it('Owner opens the settings tab and gets an invitation link', async () => {
//       const settingsModal = await new Sidebar(users.owner.app.driver).openSettings()
//       const isSettingsModal = await settingsModal.element.isDisplayed()
//       expect(isSettingsModal).toBeTruthy()
//       const invitationCodeElement = await settingsModal.invitationCode()
//       await sleep(2000)
//       invitationLinkV1 = await invitationCodeElement.getText()
//       await sleep(2000)
//       logger.info({ invitationLinkV1 })
//       expect(invitationLinkV1).not.toBeUndefined()
//       await settingsModal.closeTabThenModal()
//     })
//   })

//   describe('Guest joins using v2 invitation link', () => {
//     it('Prepare v2 link', async () => {
//       // Workaround until we have an UI for retrieving v2 invitation link from owner
//       // Compose server data from v1 invitation link
//       // @ts-expect-error
//       const v1Data: InvitationDataV1 = parseInvitationCode(invitationLinkV1.split('#')[1])
//       const data: InvitationDataV2 = {
//         version: InvitationDataVersion.v2,
//         cid: 'QmaRchXhkPWq8iLiMZwFfd2Yi4iESWhAYYJt8cTCVXSwpG',
//         token: '898989',
//         serverAddress: serverAddress,
//         inviterAddress: 'pgzlcstu4ljvma7jqyalimcxlvss5bwlbba3c3iszgtwxee4qjdlgeqd',
//       }

//       invitationLinkV2 = decodeURIComponent(composeInvitationShareUrl(data))
//       logger.info({ invitationLinkV2 })
//       const serverData = {
//         id: 'id',
//         rootCa: 'rootCa',
//         ownerCertificate: 'ownerCertificate',
//         ownerOrbitDbIdentity: v1Data.ownerOrbitDbIdentity,
//         peerList: [createLibp2pAddress(v1Data.pairs[0].onionAddress, v1Data.pairs[0].peerId)],
//         psk: v1Data.psk,
//       }
//       // Write metadata to 'storage' that is used by docker container
//       fs.writeFileSync(
//         path.join(`${__dirname}`, '..', 'QSS', 'storage', `${data.cid}.json`),
//         JSON.stringify(serverData, null, 2)
//       )
//     })
//     it('Guest opens the app', async () => {
//       await users.user1.app.open()
//     })
//     it('Guest submits invitation code v2 received from owner', async () => {
//       const joinCommunityModal = new JoinCommunityModal(users.user1.app.driver)
//       const isJoinCommunityModal = await joinCommunityModal.element.isDisplayed()
//       expect(isJoinCommunityModal).toBeTruthy()
//       logger.info({ invitationCode: invitationLinkV2 })
//       await joinCommunityModal.typeCommunityCode(invitationLinkV2)
//       await joinCommunityModal.submit()
//     })

//     it('Guest submits valid username', async () => {
//       const registerModal = new RegisterUsernameModal(users.user1.app.driver)
//       const isRegisterModal = await registerModal.element.isDisplayed()
//       expect(isRegisterModal).toBeTruthy()
//       await registerModal.clearInput()
//       await registerModal.typeUsername(users.user1.username)
//       await registerModal.submit()
//     })
//     it('Guest joins successfully, sees general channel and sends a message', async () => {
//       const general = new Channel(users.user1.app.driver, 'general')
//       await general.element.isDisplayed()
//       const isMessageInput = await general.messageInput.isDisplayed()
//       expect(isMessageInput).toBeTruthy()
//       await sleep(2000)
//       await general.sendMessage(users.user1.messages[0])
//       await sleep(2000)
//     })
//   })
// })
