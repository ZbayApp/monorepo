import React from 'react'
import { renderComponent } from '../../testUtils/renderComponent'

import { DateDivider } from './DateDivider'

describe('DateDivider', () => {
  it('renders component', () => {
    const result = renderComponent(<DateDivider title='test' />)
    expect(result.baseElement).toMatchInlineSnapshot(`
      <body>
        <div>
          <div
            aria-label="Messages from test"
            class="MuiGrid-root MuiGrid-container css-1oqe91p-MuiGrid-root"
          >
            <div
              class="MuiGrid-root MuiGrid-item MuiGrid-grid-xs-true css-1vd824g-MuiGrid-root"
            >
              <div
                class="DateDividerdivider"
              />
            </div>
            <div
              class="MuiGrid-root MuiGrid-item DateDividertitleDiv css-13i4rnv-MuiGrid-root"
            >
              <p
                class="MuiTypography-root MuiTypography-body1 DateDividerdateText css-ghvhpl-MuiTypography-root"
              >
                test
              </p>
            </div>
            <div
              class="MuiGrid-root MuiGrid-item MuiGrid-grid-xs-true css-1vd824g-MuiGrid-root"
            >
              <div
                class="DateDividerdivider"
              />
            </div>
          </div>
        </div>
      </body>
    `)
  })
})
