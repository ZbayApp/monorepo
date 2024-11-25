import '@testing-library/jest-dom'
import React from 'react'
import { renderComponent } from '../../../../testUtils/renderComponent'
import { InviteComponent } from './Invite.component'
import { composeInvitationShareUrl } from '@quiet/common'

describe('CopyLink', () => {
  it('renderComponent - hidden long link', () => {
    const invitationLink = composeInvitationShareUrl({
      pairs: [
        {
          peerId: 'QmVTkUad2Gq3MkCa8gf12R1gsWDfk2yiTEqb6YGXDG2iQ3',
          onionAddress: 'p3oqdr53dkgg3n5nuezlzyawhxvit5efxzlunvzp7n7lmva6fj3i43ad',
        },
        {
          peerId: 'Qmd2Un9AynokZrcZGsMuaqgupTtidHGQnUkNVfFFAef97C',
          onionAddress: 'vnywuiyl7p7ig2murcscdyzksko53e4k3dpdm2yoopvvu25p6wwjqbad',
        },
        {
          peerId: 'QmXRY4rhAx8Muq8dMGkr9qknJdE6UHZDdGaDRTQEbwFN5b',
          onionAddress: '6vu2bxki777it3cpayv6fq6vpl4ke3kzj7gxicfygm55dhhtphyfdvyd',
        },
        {
          peerId: 'QmT18UvnUBkseMc3SqnfPxpHwN8nzLrJeNSLZtc8rAFXhz',
          onionAddress: 'y7yczmugl2tekami7sbdz5pfaemvx7bahwthrdvcbzw5vex2crsr26qd',
        },
      ],
      psk: '123435',
      ownerOrbitDbIdentity: 'testOwnerOrbitDbIdentity',
    })
    const result = renderComponent(
      <InviteComponent invitationLink={invitationLink} handleClickInputReveal={jest.fn()} revealInputValue={false} />
    )
    expect(result.baseElement).toMatchInlineSnapshot(`
      <body>
        <div>
          <div
            class="MuiGrid-root MuiGrid-container MuiGrid-direction-xs-column css-14gz6o9-MuiGrid-root"
          >
            <div
              class="MuiGrid-root MuiGrid-container MuiGrid-item InviteToCommunitytitleDiv css-89gxc5-MuiGrid-root"
            >
              <div
                class="MuiGrid-root MuiGrid-item InviteToCommunitytitle css-13i4rnv-MuiGrid-root"
              >
                <h3
                  class="MuiTypography-root MuiTypography-h3 css-ptjqt4-MuiTypography-root"
                  data-testid="invite-a-friend"
                >
                  Add Members
                </h3>
              </div>
            </div>
            <div
              class="MuiGrid-root MuiGrid-item InviteToCommunitywrapper css-13i4rnv-MuiGrid-root"
            >
              <div
                class="MuiGrid-root MuiGrid-item css-13i4rnv-MuiGrid-root"
              >
                <h5
                  class="MuiTypography-root MuiTypography-h5 css-11l3dv4-MuiTypography-root"
                >
                  Your community link
                </h5>
              </div>
              <div
                class="MuiGrid-root MuiGrid-item css-13i4rnv-MuiGrid-root"
              >
                <p
                  class="MuiTypography-root MuiTypography-body2 css-16d47hw-MuiTypography-root"
                >
                  Anyone with Quiet app can follow this link to join this community.
                  <br />
                   Only share with people you trust.
                </p>
                <div
                  class="MuiGrid-root MuiGrid-item InviteToCommunitylinkContainer css-13i4rnv-MuiGrid-root"
                >
                  <p
                    class="MuiTypography-root MuiTypography-body2 InviteToCommunitylink css-16d47hw-MuiTypography-root"
                    data-testid="invitation-link"
                  >
                    ••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••
                  </p>
                  <button
                    class="MuiButtonBase-root MuiIconButton-root MuiIconButton-sizeSmall InviteToCommunityeyeIcon css-8prnfn-MuiButtonBase-root-MuiIconButton-root"
                    data-testid="show-invitation-link"
                    tabindex="0"
                    type="button"
                  >
                    <svg
                      aria-hidden="true"
                      class="MuiSvgIcon-root MuiSvgIcon-colorPrimary MuiSvgIcon-fontSizeSmall css-26fd2i-MuiSvgIcon-root"
                      data-testid="VisibilityOffIcon"
                      focusable="false"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78 3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"
                      />
                    </svg>
                    <span
                      class="MuiTouchRipple-root css-8je8zh-MuiTouchRipple-root"
                    />
                  </button>
                </div>
              </div>
            </div>
            <div
              class="MuiGrid-root css-vj1n65-MuiGrid-root"
            >
              <button
                class="MuiButtonBase-root MuiButton-root MuiButton-text MuiButton-textPrimary MuiButton-sizeMedium MuiButton-textSizeMedium MuiButton-root MuiButton-text MuiButton-textPrimary MuiButton-sizeMedium MuiButton-textSizeMedium InviteToCommunitybutton css-1rwf87u-MuiButtonBase-root-MuiButton-root"
                data-testid="copy-invitation-link"
                tabindex="0"
                type="button"
              >
                Copy to clipboard
                <span
                  class="MuiTouchRipple-root css-8je8zh-MuiTouchRipple-root"
                />
              </button>
            </div>
          </div>
        </div>
      </body>
    `)
  })

  it('renderComponent - revealed short link', () => {
    const invitationLink = composeInvitationShareUrl({
      pairs: [
        {
          peerId: 'QmVTkUad2Gq3MkCa8gf12R1gsWDfk2yiTEqb6YGXDG2iQ3',
          onionAddress: 'p3oqdr53dkgg3n5nuezlzyawhxvit5efxzlunvzp7n7lmva6fj3i43ad',
        },
      ],
      psk: '12345',
      ownerOrbitDbIdentity: 'testOwnerOrbitDbIdentity',
    })
    const result = renderComponent(
      <InviteComponent invitationLink={invitationLink} handleClickInputReveal={jest.fn()} revealInputValue={true} />
    )
    expect(result.baseElement).toMatchInlineSnapshot(`
      <body>
        <div>
          <div
            class="MuiGrid-root MuiGrid-container MuiGrid-direction-xs-column css-14gz6o9-MuiGrid-root"
          >
            <div
              class="MuiGrid-root MuiGrid-container MuiGrid-item InviteToCommunitytitleDiv css-89gxc5-MuiGrid-root"
            >
              <div
                class="MuiGrid-root MuiGrid-item InviteToCommunitytitle css-13i4rnv-MuiGrid-root"
              >
                <h3
                  class="MuiTypography-root MuiTypography-h3 css-ptjqt4-MuiTypography-root"
                  data-testid="invite-a-friend"
                >
                  Add Members
                </h3>
              </div>
            </div>
            <div
              class="MuiGrid-root MuiGrid-item InviteToCommunitywrapper css-13i4rnv-MuiGrid-root"
            >
              <div
                class="MuiGrid-root MuiGrid-item css-13i4rnv-MuiGrid-root"
              >
                <h5
                  class="MuiTypography-root MuiTypography-h5 css-11l3dv4-MuiTypography-root"
                >
                  Your community link
                </h5>
              </div>
              <div
                class="MuiGrid-root MuiGrid-item css-13i4rnv-MuiGrid-root"
              >
                <p
                  class="MuiTypography-root MuiTypography-body2 css-16d47hw-MuiTypography-root"
                >
                  Anyone with Quiet app can follow this link to join this community.
                  <br />
                   Only share with people you trust.
                </p>
                <div
                  class="MuiGrid-root MuiGrid-item InviteToCommunitylinkContainer css-13i4rnv-MuiGrid-root"
                >
                  <p
                    class="MuiTypography-root MuiTypography-body2 InviteToCommunitylink css-16d47hw-MuiTypography-root"
                    data-testid="invitation-link"
                  >
                    https://tryquiet.org/join#p=QmVTkUad2Gq3MkCa8gf12R1gsWDfk2yiTEqb6YGXDG2iQ3%2Cp3oqdr53dkgg3n5nuezlzyawhxvit5efxzlunvzp7n7lmva6fj3i43ad&k=12345&o=testOwnerOrbitDbIdentity
                  </p>
                  <button
                    class="MuiButtonBase-root MuiIconButton-root MuiIconButton-sizeSmall InviteToCommunityeyeIcon css-8prnfn-MuiButtonBase-root-MuiIconButton-root"
                    data-testid="show-invitation-link"
                    tabindex="0"
                    type="button"
                  >
                    <svg
                      aria-hidden="true"
                      class="MuiSvgIcon-root MuiSvgIcon-colorPrimary MuiSvgIcon-fontSizeSmall css-26fd2i-MuiSvgIcon-root"
                      data-testid="VisibilityIcon"
                      focusable="false"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"
                      />
                    </svg>
                    <span
                      class="MuiTouchRipple-root css-8je8zh-MuiTouchRipple-root"
                    />
                  </button>
                </div>
              </div>
            </div>
            <div
              class="MuiGrid-root css-vj1n65-MuiGrid-root"
            >
              <button
                class="MuiButtonBase-root MuiButton-root MuiButton-text MuiButton-textPrimary MuiButton-sizeMedium MuiButton-textSizeMedium MuiButton-root MuiButton-text MuiButton-textPrimary MuiButton-sizeMedium MuiButton-textSizeMedium InviteToCommunitybutton css-1rwf87u-MuiButtonBase-root-MuiButton-root"
                data-testid="copy-invitation-link"
                tabindex="0"
                type="button"
              >
                Copy to clipboard
                <span
                  class="MuiTouchRipple-root css-8je8zh-MuiTouchRipple-root"
                />
              </button>
            </div>
          </div>
        </div>
      </body>
    `)
  })
})
