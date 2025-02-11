import { defineConfig } from "cypress"
import webpackConfig from "./cypress/webpack.config"

export default defineConfig({
  video: false,

  component: {
    devServer: {
      framework: "react",
      bundler: "webpack",
      webpackConfig,
    },

    setupNodeEvents(on, config) {
      on('before:browser:launch', (browser, launchOptions) => {
        if (browser.name === 'electron' && browser.isHeadless) {
          launchOptions.preferences.width = 1400
          launchOptions.preferences.height = 1200
        }
        return launchOptions
      })
      return config
    },

    specPattern: "src/**/*.cy.{js,jsx,ts,tsx}",
    excludeSpecPattern: ["**/__snapshots__/*", "**/__image_snapshots__/*"],
  }
})
