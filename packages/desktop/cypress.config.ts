import { defineConfig } from "cypress"
import getCompareSnapshotsPlugin from 'cypress-visual-regression/dist/plugin'
import webpackConfig from "./cypress/webpack.config"

export default defineConfig({
  screenshotsFolder: "./cypress/snapshots/actual",
  trashAssetsBeforeRuns: true,
  video: false,

  // Add the env block so cypress-visual-regression knows whether to generate base or actual snapshots.
  // You can override this by running: cypress run -e type=base
  env: {
    type: "actual"
  },

  component: {
    setupNodeEvents(on, config) {
      getCompareSnapshotsPlugin(on, config)

      on('before:browser:launch', (browser, launchOptions) => {
        if (browser.name === 'electron' && browser.isHeadless) {
          launchOptions.preferences.width = 1400
          launchOptions.preferences.height = 1200
        }
        return launchOptions
      })
      return config
    },

    specPattern: "src/**/*regression.cy.{js,jsx,ts,tsx}",
    excludeSpecPattern: ["**/__snapshots__/*", "**/__image_snapshots__/*"],
    devServer: {
      framework: "react",
      bundler: "webpack",
      webpackConfig,
    }
  }
})
