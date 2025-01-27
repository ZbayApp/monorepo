import { ChannelMessage, PublicChannel } from '@quiet/types'
import { isUser, isMessage, isConversation, isDirectMessage, isChannel } from './validators'

describe('Validators - Users', () => {
  test('publicKey and halfKey are valid', () => {
    const publicKey = '036e4c80bf5defb4ad7798fbe63129aab7c5320a25f19d3e7225edae5a6dd0f079'
    const halfKey = '619059803a3a8de0e733a68fa895017cee3bd0c26339647f994170d6e591f6d6'
    expect(isUser(publicKey, halfKey)).toBeTruthy()
  })
  test('publicKey is valid, halfKey is invalid - wrong format', () => {
    const publicKey = 'asdfsdf'
    const halfKey = 'asafdsf'
    expect(isUser(publicKey, halfKey)).toBeFalsy()
  })
  test('publicKey is valid, halfKey is invalid - wrong length', () => {
    const publicKey = 'asdfsdf'
    const halfKey = 'asafdsf'
    expect(isUser(publicKey, halfKey)).toBeFalsy()
  })
  test('publicKey is invalid - wrong format, halfKey is valid', () => {
    const publicKey = 'asdfsdf'
    const halfKey = 'asafdsf'
    expect(isUser(publicKey, halfKey)).toBeFalsy()
  })
  test('publicKey is invalid - wrong length, halfKey is valid', () => {
    const publicKey = 'asdfsdf'
    const halfKey = 'asafdsf'
    expect(isUser(publicKey, halfKey)).toBeFalsy()
  })
})

describe('Validators - Conversations', () => {
  test('publicKey and encryptedPhrase are valid', () => {
    const publicKey = '9a3e2d2f7ef14463a8dc7502a236e711a63f089edf842fd32d8cb747783718a7'
    const encryptedPhrase =
      'NyZICbOZCsjiJQGS8wIr5Vvd4E8fheRKgVLUlfdFpjB+54mW2V70Wct72wD4+sOrgvl94/PVGTlShHISZYluflh8jvr8vkpSejrXq0lVrbs='
    expect(isConversation(publicKey, encryptedPhrase)).toBeTruthy()
  })
  test('publicKey is valid, encryptedPhrase is invalid - wrong format', () => {
    const publicKey = '9a3e2d2f7ef14463a8dc7502a236e711a63f089edf842fd32d8cb747783718a7'
    const encryptedPhrase =
      'NyZICbOZCsjiJQGS8wIr5Vvd4E8fheRKgVLUlfdFpjB+54mW2V70Wct72wD4+sOrgvl94/==GTlShHISZYluflh8jvr8vkpSejrXq0lVrbsa'
    expect(isConversation(publicKey, encryptedPhrase)).toBeFalsy()
  })
  test('publicKey is valid, encryptedPhrase is invalid - wrong length', () => {
    const publicKey = '9a3e2d2f7ef14463a8dc7502a236e711a63f089edf842fd32d8cb747783718a7'
    const encryptedPhrase =
      'NyZICbOZCsjiJQGS8wIr5Vvd4E8fheRKgVLUlfdFpjB+54mW2Vct72wD4+sOrgvl94/PVGTlShHISZYluflh8jvr8vkpSejrXq0lVrbs='
    expect(isConversation(publicKey, encryptedPhrase)).toBeFalsy()
  })
  test('publicKey is invalid - wrong format, encryptedPhrase is valid', () => {
    const publicKey = 'ZCsjiJQGS8wIr5Vvd4E8fheRKgVLUlfdFpjB+54mW2Vct72wD4+sOrgvl94/PVGT'
    const encryptedPhrase =
      'NyZICbOZCsjiJQGS8wIr5Vvd4E8fheRKgVLUlfdFpjB+54mW2V70Wct72wD4+sOrgvl94/PVGTlShHISZYluflh8jvr8vkpSejrXq0lVrbs='
    expect(isConversation(publicKey, encryptedPhrase)).toBeFalsy()
  })
  test('publicKey is invalid - wrong length, encryptedPhrase is valid', () => {
    const publicKey = '9a3e2d2f7ef14463a8dc7502a236e711a63f089edf842fd32d8cb747783713458a7'
    const encryptedPhrase =
      'NyZICbOZCsjiJQGS8wIr5Vvd4E8fheRKgVLUlfdFpjB+54mW2V70Wct72wD4+sOrgvl94/PVGTlShHISZYluflh8jvr8vkpSejrXq0lVrbs='
    expect(isConversation(publicKey, encryptedPhrase)).toBeFalsy()
  })
})

describe('Validators - Messages', () => {
  test('message is valid', () => {
    // message with media is valid
    const msg = {
      id: 'fzxjdiasf8ashfisfd',
      type: 1,
      message: 'hello',
      createdAt: 1234567,
      channelId: '123n23l234lk234',
      signature: 'asdfasdf',
      pubKey: 'afsdf',
    }
    expect(isMessage(msg)).toBeTruthy()
  })
  test('message with media is valid', () => {
    const msg: ChannelMessage = {
      id: 'fzxjdiasf8ashfisfd',
      type: 1,
      message: 'hello',
      createdAt: 1234567,
      channelId: '123n23l234lk234',
      signature: 'asdfasdf',
      pubKey: 'afsdf',
      media: {
        cid: '123',
        message: {
          id: 'fzxjdiasf8ashfisfd',
          channelId: '123n23l234lk234',
        },
        path: '/path/to/file',
        name: 'file',
        ext: '.png',
      },
    }
    expect(isMessage(msg)).toBeTruthy()
  })
  test('message is lacking required proprty', () => {
    const msg = {
      type: 1,
      message: 'hello',
      createdAt: 1234567,
      channelId: '123n23l234lk234',
      signature: 'asdfasdf',
      pubKey: 'afsdf',
    }
    expect(isMessage(msg as ChannelMessage)).toBeFalsy()
  })
  test('message property has wrong format', () => {
    const msg = {
      id: 8,
      type: 1,
      message: 123,
      createdAt: 1234567,
      channelId: '123n23l234lk234',
      signature: 'asdfasdf',
      pubKey: 'afsdf',
    }
    expect(isMessage(msg as unknown as ChannelMessage)).toBeFalsy()
  })
  test('message with invalid media property is invalid', () => {
    const msg = {
      id: 'fzxjdiasf8ashfisfd',
      type: 1,
      message: 'hello',
      createdAt: 1234567,
      channelId: '123n23l234lk234',
      signature: 'asdfasdf',
      pubKey: 'afsdf',
      media: {
        message: {
          id: 'fzxjdiasf8ashfisfd',
          channelId: '123n23l234lk234',
        },
        path: '/path/to/file',
        name: 'file',
        ext: '.png',
      },
    }
    expect(isMessage(msg as unknown as ChannelMessage)).toBeFalsy()
  })
})

describe('Validators - Channels', () => {
  test('message is valid', () => {
    const channel = {
      name: 'quiet',
      description: 'quiet',
      owner: 'szakalakakaaakaka',
      timestamp: 12341234,
      id: 'sadfdasfsadfsdfsnfsdjfdsfsdfjsdf',
    }
    expect(isChannel(channel)).toBeTruthy()
  })
  test('message is lacking required proprty', () => {
    const channel = {
      name: 'quiet',
      description: 'quiet',
      owner: 'szakalakakaaakaka',
      id: 'sadfdasfsadfsdfsnfsdjfdsfsdfjsdf',
    }
    expect(isChannel(channel as unknown as PublicChannel)).toBeFalsy()
  })
  test('message proprty has wrong format', () => {
    const channel = {
      name: 'quiet',
      description: 'quiet',
      owner: 'szakalakakaaakaka',
      timestamp: 'asfasdf',
      id: 'sadfdasfsadfsdfsnfsdjfdsfsdfjsdf',
    }
    expect(isChannel(channel as unknown as PublicChannel)).toBeFalsy()
  })
})

describe('Validators - Direct Messages', () => {
  test('message is valid', () => {
    const msg =
      '2AguTZ3+hts4+eephmT4KAYRGg+jhCuoE03h/GiNGgTFk6OadVPQyzG5MC6TcyfRiao/6ENr1USnJ9zO9wcUoIUXu8RrS1MSA9/UTCeBytnqwCyffkvBLQvtnF+/7EWwpylJoewxhl0/MwAfMk0QDPzd8kSuguLKSID45AwKxO2Vh1Vq/pyjkH+7nURj7nw62pxyPXr3Jn0AEwAiTl8ZDmpb2s5wavWgk+ma7KJUoxSwgMepQtw+E5X5CLtqx8DS19H0lvcQBO5wMahLlc24zohOkKPVKUXrmcDJKdZaXNRFwR4o+CpnM/BBqB0QL1Y9U3OXevduWRwtiWc/oC07LLhczl5QqJ6m8mK8StSiXq0='
    expect(isDirectMessage(msg)).toBeTruthy()
  })
  test('message has wrong length', () => {
    const msg =
      '2AguTZ3+hts4+eephmT4KAYRGg+jhCuoE03h/GiNGgTFk6OadVPQyzG5MC6TcyfRiao/6ENr1USnJ9zO9wcUoIUXu8RrS1MSA9/UTCeBytnqwCyffkvBLQvtnF+/7EWwpylJoewxhl0/MwAfMk0QDPzd8kSuguLKSID45AwKxO2Vh1Vq/pyjkH+7nURj7nw62pxyPXr3Jn0AEwAiTl8ZDmpb2s5wavWgk+ma7KJUoxSwgMepQtw+E5X5CLtqx8DS19H0lvcQBO5wMahLlc24zohOkKPVKUXrmcDJKdZaXNRFwR4o+CpnM/BBqB0QL1Y9U3OXevduWRwtzl5QqJ6m8mK8StSiXq0='
    expect(isDirectMessage(msg)).toBeFalsy()
  })
  test('message has wrong format', () => {
    const msg =
      'c64ff83aebf43571d6346339942fb20e6dcb3df9d9895c6378ab9d1b8f8ff0f8364c33e82376f38a70fbe6f73542951c028232634d33c4a884223046c1da97a6e5159c1d8d2a70e097c3b85c37e28ecf0c809cae0350c0ef227a57882c9f6cc4e0c3a91b=06f7c64c8177fe95e8fb7ab3408d9f3aa31024c9056df5941564ef827236f2329f493b5346cf95e68575f1a8edf48034d38ee0e52b944f65abff39e8502c1836429a45d7a7cab76b573926de39ff0e0bbe8'
    expect(isDirectMessage(msg)).toBeFalsy()
  })
})
