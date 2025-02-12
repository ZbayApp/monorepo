import React from 'react'

import { renderComponent } from '../../../testUtils/renderComponent'
import { PopupMenu } from './PopupMenu'

describe('PopupMenu', () => {
  it('renders component', () => {
    const Content = () => <div>Content</div>
    const result = renderComponent(
      <PopupMenu open>
        <Content />
      </PopupMenu>
    )
    expect(result.baseElement).toMatchInlineSnapshot(`
      <body>
        <div>
          <div
            class="PopupMenupopper css-561hhw-MuiPopper-root MuiPopperUnstyled-root"
            role="tooltip"
            style="position: fixed; top: 0px; left: 0px;"
          >
            <div
              class="PopupMenuwrapper"
              style="opacity: 1; transform: scale(1, 1); transform-origin: center bottom; transition: opacity 0ms cubic-bezier(0.4, 0, 0.2, 1) 0ms,transform 0ms cubic-bezier(0.4, 0, 0.2, 1) 0ms;"
            >
              <div
                class="MuiPaper-root MuiPaper-elevation MuiPaper-rounded MuiPaper-elevation1 PopupMenupaper css-1pydcmh-MuiPaper-root"
              >
                <div>
                  Content
                </div>
              </div>
              <span
                class="PopupMenubottom"
              />
            </div>
          </div>
        </div>
      </body>
    `)
  })

  it('renders when closed', () => {
    const Content = () => <div>Content</div>
    const result = renderComponent(
      <PopupMenu open={false}>
        <Content />
      </PopupMenu>
    )
    expect(result.baseElement).toMatchInlineSnapshot(`
      <body>
        <div />
      </body>
    `)
  })

  it('renders with offset', () => {
    const Content = () => <div>Content</div>
    const result = renderComponent(
      <PopupMenu open offset='0 10'>
        <Content />
      </PopupMenu>
    )
    expect(result.baseElement).toMatchInlineSnapshot(`
      <body>
        <div>
          <div
            class="PopupMenupopper css-561hhw-MuiPopper-root MuiPopperUnstyled-root"
            role="tooltip"
            style="position: fixed; top: 0px; left: 0px;"
          >
            <div
              class="PopupMenuwrapper"
              style="opacity: 1; transform: scale(1, 1); transform-origin: center bottom; transition: opacity 0ms cubic-bezier(0.4, 0, 0.2, 1) 0ms,transform 0ms cubic-bezier(0.4, 0, 0.2, 1) 0ms;"
            >
              <div
                class="MuiPaper-root MuiPaper-elevation MuiPaper-rounded MuiPaper-elevation1 PopupMenupaper css-1pydcmh-MuiPaper-root"
              >
                <div>
                  Content
                </div>
              </div>
              <span
                class="PopupMenubottom"
              />
            </div>
          </div>
        </div>
      </body>
    `)
  })
})
