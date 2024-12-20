import debug from 'debug'
import { Console } from 'console'
import { DateTime } from 'luxon'

import { ANY_KEY, findAllByKeyAndReplace } from './utils'

const colors = require('ansi-colors')

const COLORIZE = process.env['COLORIZE'] === 'true'

/**
 * Available log levels
 */
enum LogLevel {
  DEBUG = 'debug',
  ERROR = 'error',
  INFO = 'info',
  LOG = 'log',
  WARN = 'warn',
  TIMER = 'timer',
}

/**
 * This determines the color scheme of each log type
 */
colors.theme({
  // debug
  debug: colors.bold.cyan,
  debug_text: colors.cyan,

  // log
  log: colors.bold.gray,
  log_text: colors.gray,

  // info
  info: colors.bold.blue,
  info_text: colors.blue,

  // warn
  warn: colors.bold.yellow,
  warn_text: colors.yellow,

  // error
  error: colors.bold.redBright,
  error_text: colors.redBright,

  // timers
  timer: colors.bold.yellowBright,
  timer_text: colors.yellowBright,

  // misc
  scope: colors.magenta,
  date: colors.bold.gray,
  object: colors.green,
  object_error: colors.red,
})

/**
 * This is the base logger we use to write to the node terminal.  Due to the ways that we import the node logger
 * we have to account for that (hence the ternary statement).
 */
const nodeConsoleLogger = Console instanceof Function ? new Console(process.stdout, process.stderr) : console

/**
 * This class is what we use to log to the node console and, optionally, the native console for browser-facing code
 * like the desktop renderer
 *
 * NOTE: This is exported because it needs to be exposed for the logger to work but you should use `createQuietLogger` in
 * (probably) all contexts
 */
export class QuietLogger {
  // This is based on the `debug` package and is backwards-compatible with the old logger's behavior (for the most part)
  private isDebug: boolean
  private timers: Map<string, number> = new Map()

  /**
   *
   * @param name This is the name that will be printed in the log entry
   * @param parallelConsoleLog If true we will also log to the native console (e.g. browser console)
   */
  constructor(
    public name: string,
    public parallelConsoleLog: boolean = false
  ) {
    this.isDebug = debug.enabled(name)
  }

  /*
  Log Level Methods
  */

  /**
   * Log a debug-level message if the DEBUG environment variable is set for this package/module
   *
   * @param message Message to log
   * @param optionalParams Optional parameters to log
   */
  debug(message: any, ...optionalParams: any[]) {
    if (!this.isDebug) return

    this.callLogMethods(LogLevel.DEBUG, message, ...optionalParams)
  }

  /**
   * Log an error-level message
   *
   * @param message Message to log
   * @param optionalParams Optional parameters to log
   */
  error(message: any, ...optionalParams: any[]) {
    this.callLogMethods(LogLevel.ERROR, message, ...optionalParams)
  }

  /**
   * Log an info-level message
   *
   * @param message Message to log
   * @param optionalParams Optional parameters to log
   */
  info(message: any, ...optionalParams: any[]) {
    this.callLogMethods(LogLevel.INFO, message, ...optionalParams)
  }

  /**
   * Log a log-level message if the DEBUG environment variable is set for this package/module
   *
   * @param message Message to log
   * @param optionalParams Optional parameters to log
   */
  log(message: any, ...optionalParams: any[]) {
    if (!this.isDebug) return

    this.callLogMethods(LogLevel.LOG, message, ...optionalParams)
  }

  /**
   * Log a warn-level message
   *
   * @param message Message to log
   * @param optionalParams Optional parameters to log
   */
  warn(message: any, ...optionalParams: any[]) {
    this.callLogMethods(LogLevel.WARN, message, ...optionalParams)
  }

  /**
   * Start a timer with a given name
   *
   * @param name Name of the timer
   */
  time(name: string) {
    if (this.timers.has(name)) {
      this.warn(`Timer with name ${name} already exists!`)
      return
    }

    const startMs = DateTime.utc().toMillis()
    this.timers.set(name, startMs)
  }

  /**
   * Calculate the runtime of the timer with a given name and log the formatted timing message
   *
   * @param name Name of the timer
   */
  timeEnd(name: string) {
    if (!this.timers.has(name)) {
      this.warn(`No timer started with name ${name}!`)
      return
    }

    const endMs = DateTime.utc().toMillis()
    const startMs = this.timers.get(name)!
    this.timers.delete(name)

    const formattedLogStrings = this.formatLog(LogLevel.TIMER, name, `${endMs - startMs}ms - timer ended`)
    this.printLog(LogLevel.LOG, ...formattedLogStrings)
  }

  /**
   * Formats the message and writes it out to the node logger and, optionally, to the native console with
   * colorized text and parameters
   *
   * NOTE: The text and optional parameter are printed in different colors for clarity when reading a given log
   * line
   *
   * @param level The level we are logging at
   * @param message The main log message
   * @param optionalParams Other parameters we want to log
   */
  private callLogMethods(level: LogLevel, message: any, ...optionalParams: any[]): void {
    const formattedLogStrings = this.formatLog(level, message, ...optionalParams)
    this.printLog(level, ...formattedLogStrings)
  }

  /**
   * Print logs to node console and, optionally, the native console (e.g. browser)
   *
   * @param level The level we are logging at
   * @param formattedLogStrings Array of formatted log strings
   */
  private printLog(level: LogLevel, ...formattedLogStrings: string[]): void {
    // @ts-ignore
    nodeConsoleLogger[level](...formattedLogStrings)
    if (this.parallelConsoleLog) {
      // @ts-ignore
      console[level](...formattedLogStrings)
    }
  }

  /**
   * Format the message and optional parameters according to the formatting rules for a given log level
   *
   * @param level The level we are logging at
   * @param message The main log message
   * @param optionalParams Other parameters we want to log
   * @returns Array of formatted log strings
   */
  private formatLog(level: LogLevel, message: any, ...optionalParams: any[]): string[] {
    const formattedMessage = this.formatMessage(message, level)
    const formattedOptionalParams = optionalParams.map((param: any) => this.formatObject(param))
    return [formattedMessage, ...formattedOptionalParams]
  }

  /**
   * Formats the primary log message and applies the level-specific coloring
   *
   * @param message Primary message to log
   * @param level The level we are logging at
   * @returns A colorized log string
   */
  private formatMessage(message: any, level: string): string {
    let formattedLevel = level.toUpperCase()
    let scope = this.name
    let date = DateTime.utc().toISO()
    const formattedMessage = this.formatMessageText(message, level)

    if (COLORIZE) {
      formattedLevel = colors[level](formattedLevel)
      scope = colors['scope'](scope)
      date = colors['date'](date)
    }

    return `${date} ${formattedLevel} ${scope} ${formattedMessage}`
  }

  private formatMessageText(message: any, level: string): string {
    if (['string', 'number', 'boolean', 'bigint'].includes(typeof message)) {
      let formattedMessageText = message
      if (COLORIZE) {
        formattedMessageText = colors[`${level}_text`](message)
      }
      return formattedMessageText
    }

    return this.formatObject(message, level)
  }

  /**
   * Colorizes an object parameter based on its type.
   *   - Errors are printed in red and we attempt to log the full stacktrace
   *   - Objects are stringified and logged
   *   - All other types are logged as-is
   *
   * @param param Object to format
   * @returns Colorized string
   */
  private formatObject(param: any, overrideColorKey: string | undefined = undefined): string {
    if (param instanceof Error) {
      let formattedError = param.stack || `${param.name}: ${param.message}`
      if (COLORIZE) {
        //@ts-ignore
        formattedError = colors[overrideColorKey || 'object_error'](formattedError)
      }
      return formattedError
    }

    const colorize = (stringifiedParam: string): string => {
      //@ts-ignore
      return COLORIZE ? colors[overrideColorKey || 'object'](stringifiedParam) : stringifiedParam
    }

    let formatted: string
    if (['string', 'number', 'boolean', 'bigint'].includes(typeof param)) {
      formatted = param
    } else if (param == null) {
      formatted = 'undefined'
    } else {
      try {
        let truncatedOrNot: string
        if ((param as ArrayLike<any>).length != undefined) {
          truncatedOrNot = param
        } else {
          truncatedOrNot = this.truncateMessageForLogging(param)
        }
        formatted = JSON.stringify(truncatedOrNot, null, 2)
      } catch (e) {
        formatted = param.toString()
        if (formatted.startsWith('[object')) {
          formatted = param
        }
      }
    }

    return colorize(formatted)
  }

  private truncateMessageForLogging(obj: any): string {
    return findAllByKeyAndReplace(obj, [
      {
        key: ANY_KEY,
        replace: {
          replacerFunc: (value: any) => {
            if (value != null && typeof value === 'bigint') {
              return (value as bigint).toString
            }
            return value
          },
        },
      },
    ])
  }
}

/**
 * Generate a function that creates a module-level logger with a name like `packageName:moduleName`.  This is the main
 * entry point for logging in Quiet.
 *
 * @param packageName Name of the package we are logging in
 * @param parallelConsoleLog If true we will also log to the native console (e.g. browser console)
 * @returns A function that can be used to generate a module-level logger
 */
export const createQuietLogger = (
  packageName: string,
  parallelConsoleLog: boolean = false
): ((moduleName: string) => QuietLogger) => {
  return (moduleName: string) => {
    const name = `${packageName}:${moduleName}`
    nodeConsoleLogger.info(`Initializing logger ${name}`)
    return new QuietLogger(name, parallelConsoleLog)
  }
}
