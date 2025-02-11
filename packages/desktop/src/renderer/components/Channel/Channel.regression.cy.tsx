import React from 'react'
import CssBaseline from '@mui/material/CssBaseline'
import { composeStories, setGlobalConfig } from '@storybook/testing-react'
import { it, beforeEach, cy, Cypress, describe } from 'local-cypress'

import * as stories from './Channel.stories'
import { withTheme } from '../../storybook/decorators'
import compareSnapshotCommand from 'cypress-visual-regression/dist/command'
import { mount } from 'cypress/react18'

compareSnapshotCommand() // Workaround. This should be only in cypress/commands.ts but typescript complains when it's not here

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
    // Wait for component to render
    cy.wait(3000)
  })

  const channelContent = '[data-testid="channelContent"]'
  const messageInput = '[data-testid="messageInput"]'

  it('scroll should be at the bottom after entering channel', () => {
    // Check if scrolled to bottom
    cy.get(channelContent).then($el => {
      const container = $el[0]      
      const isScrolledToBottom = Math.abs(
        (container.scrollHeight - container.scrollTop) - container.clientHeight
      ) <= 1
      expect(isScrolledToBottom).to.be.true
    })
  })

  it('scroll should be at the bottom after sending messages', () => {
    // Send one message
    cy.get(messageInput).focus().type('luke where are you?').type('{enter}')

    // Wait for message to appear in the message list
    cy.get(channelContent).within(() => {
      cy.contains('luke where are you?')
    })

    // After sending message , check if scrolled to bottom
    cy.get('[data-testid="channelContent"]').then($el => {
      const container = $el[0]      
      const isScrolledToBottom = Math.abs(
        (container.scrollHeight - container.scrollTop) - container.clientHeight
      ) <= 1
      expect(isScrolledToBottom).to.be.true
    })
  })

  it('should scroll to the bottom when scroll is in the middle and user sends new message', () => {
    cy.get(channelContent).scrollTo(0, 100)
    cy.get(messageInput).focus().type('actually, he is on the dark side').type('{enter}')

    // Wait for message to appear in the message list
    cy.get(channelContent).within(() => {
      cy.contains('actually, he is on the dark side')
    })

    // After sending message , check if scrolled to bottom
    cy.get(channelContent).then($el => {
      const container = $el[0]      
      const isScrolledToBottom = Math.abs(
        (container.scrollHeight - container.scrollTop) - container.clientHeight
      ) <= 1
      expect(isScrolledToBottom).to.be.true
    })
  })

  it('should scroll to the bottom when scroll is at the top and user sends new message', () => {
    cy.get(messageInput).focus().type('hi').type('{enter}')
    cy.get(channelContent).scrollTo(0, 0)

    // Send only one message because previous bug was only after sending one message
    cy.get(messageInput).focus().type('and yoda too').type('{enter}')

    // After sending message , check if scrolled to bottom
    cy.get(channelContent).then($el => {
      const container = $el[0]      
      const isScrolledToBottom = Math.abs(
        (container.scrollHeight - container.scrollTop) - container.clientHeight
      ) <= 1
      expect(isScrolledToBottom).to.be.true
    })
  })

  it('PageUp keydown should scroll message list up.', () => {
    cy.get(messageInput).focus().type('{pageup}{pageup}{pageup}{pageup}{pageup}{pageup}{pageup}')

    // Check if scrolled to top 
    cy.get(channelContent).then($el => {
      const container = $el[0]      
      const isScrolledToTop = Math.abs(
        container.scrollTop
      ) <= 1  // Allow 1px difference for rounding
      expect(isScrolledToTop).to.be.true
    })
  })

  it('PageDown keydown should scroll message list down.', () => {
    cy.get(channelContent).scrollTo(0, 0)
    cy.get(messageInput).focus().type('{pagedown}{pagedown}{pagedown}{pagedown}{pagedown}{pagedown}{pagedown}')
    // After pagedown, check if scrolled to bottom
    cy.get(channelContent).then($el => {
      const container = $el[0]      
      const isScrolledToBottom = Math.abs(
        (container.scrollHeight - container.scrollTop) - container.clientHeight
      ) <= 1
      expect(isScrolledToBottom).to.be.true
    })
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
      const element = $el[0]
      // Height should be greater after typing long word
      expect(element.offsetHeight).to.be.greaterThan(initialHeight)
      
      // Full text should be visible (no truncation)
      expect(element.value).to.equal(longWord())
      
      // Scrollable width should not exceed the container width
      // (meaning text is wrapping, not horizontally scrolling)
      expect(element.scrollWidth).to.equal(element.offsetWidth)
    })
  })
})
