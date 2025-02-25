import React from 'react'

import { renderComponent } from '../../../testUtils/renderComponent'
import { Page } from './Page'
import PageHeader from './PageHeader'

describe('Page', () => {
  it('renders component', () => {
    const result = renderComponent(
      <Page>
        <PageHeader>
          <div>Test header</div>
        </PageHeader>
        <div>Test header</div>
      </Page>
    )
    expect(result.baseElement).toMatchInlineSnapshot(`
      <body>
        <div>
          <div
            class="MuiGrid-root MuiGrid-container MuiGrid-direction-xs-column css-1vpwcmr-MuiGrid-root"
            style="height: 100vh;"
          >
            <div
              class="MuiGrid-root MuiGrid-item PageHeaderroot css-jq8uxm-MuiGrid-root"
            >
              <div>
                Test header
              </div>
            </div>
            <div>
              Test header
            </div>
          </div>
        </div>
      </body>
    `)
  })
})
