import React from 'react'
import { renderComponent } from '../../testUtils/renderComponent'

import { MessagesDivider } from './MessagesDivider'

describe('MessagesDivider', () => {
  it('renders component', () => {
    const result = renderComponent(<MessagesDivider title='test' />)
    expect(result.baseElement).toMatchInlineSnapshot(`
      <body>
        <div>
          <div
            class="MuiGrid-root MuiGrid-container css-1xe2ld0-MuiGrid-root"
          >
            <div
              class="MuiGrid-root MuiGrid-item MuiGrid-grid-xs-true css-1vd824g-MuiGrid-root"
            >
              <div
                class="MessagesDividerdivider"
              />
            </div>
            <div
              class="MuiGrid-root MuiGrid-item MessagesDividertitleDiv css-13i4rnv-MuiGrid-root"
            >
              <p
                class="MuiTypography-root MuiTypography-body1 css-ghvhpl-MuiTypography-root"
              >
                test
              </p>
            </div>
            <div
              class="MuiGrid-root MuiGrid-item MuiGrid-grid-xs-true css-1vd824g-MuiGrid-root"
            >
              <div
                class="MessagesDividerdivider"
              />
            </div>
          </div>
        </div>
      </body>
    `)
  })
})
