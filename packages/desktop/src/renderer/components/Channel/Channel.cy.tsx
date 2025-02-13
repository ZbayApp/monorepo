import React from 'react'
import CssBaseline from '@mui/material/CssBaseline'
import { composeStories, setGlobalConfig } from '@storybook/testing-react'
import { it, beforeEach, cy, Cypress, describe } from 'local-cypress'

import * as stories from './Channel.stories'
import { withTheme } from '../../storybook/decorators'
import { mount } from 'cypress/react18'

declare global {
  namespace Cypress {
    interface Chainable {
      assertScrolledToBottom(): Chainable<void>
    }
  }
}

// Custom command to check if the channel content is scrolled to the bottom
Cypress.Commands.add('assertScrolledToBottom', { prevSubject: 'element' }, subject => {
  const el = subject[0]
  const isScrolledToBottom = Math.abs(el.scrollHeight - el.scrollTop - el.clientHeight) <= 1 // Allow 1px difference for rounding
  cy.wrap(isScrolledToBottom).should('be.true')
})

const resizeObserverLoopErrRe = /^[^(ResizeObserver loop limit exceeded)]/
Cypress.on('uncaught:exception', err => {
  /* returning false here prevents Cypress from failing the test */
  if (resizeObserverLoopErrRe.test(err.message)) {
    return false
  }
})

// @ts-expect-error
setGlobalConfig(withTheme)

const { InteractiveLocalState } = composeStories(stories)

describe('Scroll behavior test', () => {
  beforeEach(() => {
    mount(
      <React.Fragment>
        {/* @ts-ignore */}
        <CssBaseline>
          {/* @ts-ignore */}
          <InteractiveLocalState />
        </CssBaseline>
      </React.Fragment>
    )
    // Wait 0 is a workaround to ensure the component is rendered. See: https://github.com/cypress-io/cypress/issues/3817#issuecomment-1186705536
    cy.wait(0)
  })

  const channelContent = '[data-testid="channelContent"]'
  const messageInput = '[data-testid="messageInput"]'
  const floatingDateSelector = '[class*="FloatingDatetitleDiv"]'

  it('scroll should be at the bottom after entering channel', () => {
    cy.get(channelContent).assertScrolledToBottom()
  })

  it('scroll should be at the bottom after sending messages', () => {
    cy.get(messageInput).focus().type('luke where are you?').type('{enter}')
    cy.get(channelContent).within(() => {
      cy.contains('luke where are you?')
    })
    cy.get(channelContent).assertScrolledToBottom()
  })

  it('should scroll to the bottom when scroll is in the middle and user sends new message', () => {
    cy.get(channelContent).scrollTo(0, 100)
    cy.get(messageInput).focus().type('actually, he is on the dark side').type('{enter}')
    cy.get(channelContent).within(() => {
      cy.contains('actually, he is on the dark side')
    })
    cy.get(channelContent).assertScrolledToBottom()
  })

  it('should scroll to the bottom when scroll is at the top and user sends new message', () => {
    cy.get(messageInput).focus().type('hi').type('{enter}')
    cy.get(channelContent).scrollTo(0, 0)
    cy.get(messageInput).focus().type('and yoda too').type('{enter}')
    cy.get(channelContent).assertScrolledToBottom()
  })

  it('PageUp keydown should scroll message list up.', () => {
    cy.get(messageInput).focus().type('{pageup}{pageup}{pageup}{pageup}{pageup}{pageup}{pageup}')

    cy.get(channelContent).then($el => {
      const container = $el[0]
      const isScrolledToTop = Math.abs(container.scrollTop) <= 1 // Allow 1px difference for rounding
      cy.wrap(isScrolledToTop).should('be.true')
    })
  })

  it('PageDown keydown should scroll message list down.', () => {
    cy.get(channelContent).scrollTo(0, 0)
    cy.get(messageInput).focus().type('{pagedown}{pagedown}{pagedown}{pagedown}{pagedown}{pagedown}{pagedown}')
    cy.get(channelContent).assertScrolledToBottom()
  })

  it('Shift+Enter should not send message', () => {
    cy.get(messageInput)
      .focus()
      .type('luke where are you?')
      .type('{shift+enter}')
      .type('you underestimate the power of the force')
      .should('have.text', 'luke where are you?\nyou underestimate the power of the force')
  })

  it('Check words wrapping in message input', () => {
    const longWord = () => {
      let word: string = 'm'
      while (word.length < 150) {
        word = `${word}m`
      }
      return word
    }
    // Get initial height
    let initialHeight: number
    cy.get(messageInput).then($el => {
      initialHeight = $el[0].offsetHeight
    })

    cy.get(messageInput).focus().type(longWord())

    // Check that:
    // 1. Height increased to accommodate the wrapped text
    // 2. The full text is visible
    cy.get(messageInput).then($el => {
      const element = $el[0] as HTMLTextAreaElement
      // Height should be greater after typing long word
      cy.wrap(element.offsetHeight).should('be.gt', initialHeight)

      // Full text should be visible (no truncation)
      cy.wrap(element.value).should('eq', longWord())

      // Scrollable width should not exceed the container width
      // (meaning text is wrapping, not horizontally scrolling)
      cy.wrap(element.scrollWidth).should('eq', element.offsetWidth)
    })
  })

  describe('FloatingDate displays correctly', () => {
    // The scroll wheel was difficult to test, even with cypress-real-events
    // so we're just going to test the pageup and pagedown keys

    it('should not display on channel load', () => {
      cy.get(messageInput).focus().type('{pageup}')
      cy.get(floatingDateSelector).should('not.be.visible')
    })

    it('should display on pageup', () => {
      cy.get(messageInput).focus().type('{pageup}')
      cy.get(floatingDateSelector).should('be.visible')
    })

    it('should disappear within 3 seconds after scrolling stops', () => {
      cy.clock()
      cy.get(messageInput).focus().type('{pageup}')
      cy.get(floatingDateSelector).should('be.visible')
      cy.tick(3000)
      cy.get(floatingDateSelector).should('not.be.visible')
    })

    it('should display the correct date text', () => {
      cy.get(channelContent)
      cy.get(messageInput).focus().type('{pageup}')

      cy.get(floatingDateSelector).should('be.visible').invoke('text').should('contain', '28 Oct')
    })
  })
})
