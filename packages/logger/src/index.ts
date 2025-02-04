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
  TRACE = 'trace',
  WARN = 'warn',
  TIMER = 'timer',
}

/**
 * Maximum log level allowed
 */
enum LogSetting {
  TRACE = 2, // Allows all logs
  DEBUG = 1, // Excludes `trace` logs
  ON = 0, // Excludes `trace`, `debug`, and `log`
}

/**
 * Common fields to colorize
 */
enum ColorField {
  SCOPE = 'scope',
  DATE = 'date',
  OBJECT = 'object',
  OBJECT_ERROR = 'object_error',
}

/**
 * This determines the color scheme of each log type
 */
colors.theme({
  // trace
  trace: colors.bold.italic.cyanBright,
  trace_text: colors.italic.cyanBright,

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
  scope_trace: colors.italic.magenta,
  date: colors.bold.gray,
  date_trace: colors.bold.italic.gray,
  object: colors.green,
  object_trace: colors.italic.green,
  object_error: colors.red,
  object_error_trace: colors.italic.red,
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
  private logSetting: LogSetting = LogSetting.ON
  // Tracks timers created by the `time` log method
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
    this.logSetting = this._getLogSetting()
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
    this.callLogMethods(LogLevel.DEBUG, message, ...optionalParams)
  }

  /**
   * Log a trace-level message if the DEBUG environment variable is set for this package/module with
   * trace set (e.g. `backend*:trace`)
   *
   * @param message Message to log
   * @param optionalParams Optional parameters to log
   */
  trace(message: any, ...optionalParams: any[]) {
    this.callLogMethods(LogLevel.TRACE, message, ...optionalParams)
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
    if (!this._canLog(level)) return

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
    // we have to do this conversion because console doesn't have a trace method
    const printLevel: LogLevel = level === LogLevel.TRACE ? LogLevel.LOG : level

    // @ts-ignore
    nodeConsoleLogger[printLevel](...formattedLogStrings)
    if (this.parallelConsoleLog) {
      // @ts-ignore
      console[printLevel](...formattedLogStrings)
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
    const formattedOptionalParams = optionalParams.map((param: any) => this.formatObject(param, level))
    return [formattedMessage, ...formattedOptionalParams]
  }

  /**
   * Formats the primary log message and applies the level-specific coloring
   *
   * @param message Primary message to log
   * @param level The level we are logging at
   * @returns A colorized log string
   */
  private formatMessage(message: any, level: LogLevel): string {
    let formattedLevel = level.toUpperCase()
    let scope = this.name
    let date = DateTime.utc().toISO()
    const formattedMessage = this.formatMessageText(message, level)

    if (COLORIZE) {
      formattedLevel = colors[level](formattedLevel)
      scope = this._getColorForField(ColorField.SCOPE, level)(scope)
      date = this._getColorForField(ColorField.DATE, level)(date)
    }

    return `${date} ${formattedLevel} ${scope} ${formattedMessage}`
  }

  /**
   * Formats the primary log message string and applies the level-specific text coloring
   *
   * @param message Primary message to log
   * @param level The level we are logging at
   * @returns A colorized log message string
   */
  private formatMessageText(message: any, level: LogLevel): string {
    if (['string', 'number', 'boolean', 'bigint'].includes(typeof message)) {
      let formattedMessageText = message
      if (COLORIZE) {
        formattedMessageText = colors[`${level}_text`](message)
      }
      return formattedMessageText
    }

    // we override the object coloring to be the same as normal level-specific text
    return this.formatObject(message, level, level)
  }

  /**
   * Colorizes an object parameter based on its type.
   *   - Errors are printed in red and we attempt to log the full stacktrace
   *   - Objects are stringified and logged
   *   - All other types are logged as-is
   *
   * @param param Object to format
   * @param level The level we are logging at
   * @param overrideColorKey Color field we would like to use instead
   * @returns Colorized string
   */
  private formatObject(param: any, level: LogLevel, overrideColorKey: string | undefined = undefined): string {
    if (param instanceof Error) {
      const colorizeError = (stringifiedError: string): string => {
        //@ts-ignore
        return COLORIZE
          ? this._getColorForField(ColorField.OBJECT_ERROR, level, overrideColorKey)(stringifiedError)
          : stringifiedError
      }

      const stringifyError = (err: Error) => {
        return err.stack || `${err.name}: ${err.message}`
      }

      let formattedErrors: string = stringifyError(param)
      if ((param as any).errors != null) {
        formattedErrors += ` - Errors:\n`
        formattedErrors += (param as any).errors.map((err: Error) => stringifyError(err)).join('\n')
      }

      return colorizeError(formattedErrors)
    }

    const colorize = (stringifiedParam: string): string => {
      //@ts-ignore
      return COLORIZE
        ? this._getColorForField(ColorField.OBJECT, level, overrideColorKey)(stringifiedParam)
        : stringifiedParam
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

  /**
   * Truncate fields on an object to produce smaller, more readable logs
   *
   * @param obj Object to truncate text in
   * @returns Truncated object
   */
  private truncateMessageForLogging(obj: any): string {
    return findAllByKeyAndReplace(obj, [
      {
        key: ANY_KEY,
        replace: {
          replacerFunc: (value: any) => {
            if (value != null && typeof value === 'bigint') {
              return (value as bigint).toString()
            } else if (value != null && (value.toV1 != null || value.toV0 != null)) {
              return value.toString()
            } else if (value != null && value instanceof Uint8Array) {
              return Buffer.from(value).toString('base64')
            }

            return value
          },
        },
      },
    ])
  }

  /**
   * Checks if this logger is enabled in `debug` and to what level
   *
   * @returns LogSetting for this logger
   */
  private _getLogSetting(): LogSetting {
    if (this._canTrace()) {
      return LogSetting.TRACE
    } else if (debug.enabled(this.name)) {
      return LogSetting.DEBUG
    }

    return LogSetting.ON
  }

  /**
   * Check if <this logger name>:trace is explicitly enabled in the DEBUG environment variable
   *
   * @returns True if this logger can emit TRACE logs
   */
  private _canTrace(): boolean {
    if (!debug.enabled(`${this.name}:trace`)) {
      return false
    }

    for (const debugName of debug.names) {
      if (!debugName.toString().includes(':trace')) {
        continue
      }

      if (debugName.test(`${this.name}:trace`)) {
        return true
      }
    }

    return false
  }

  /**
   * Checks the intended log level against the log setting to determine if we are allowed to log
   *
   * @param level The level we are logging at
   * @returns True if the intended log level is allowed on this logger
   */
  private _canLog(level: LogLevel): boolean {
    switch (level) {
      case LogLevel.DEBUG:
      case LogLevel.LOG:
        return this.logSetting >= LogSetting.DEBUG
      case LogLevel.TRACE:
        return this.logSetting === LogSetting.TRACE
      case LogLevel.INFO:
      case LogLevel.WARN:
      case LogLevel.ERROR:
      case LogLevel.TIMER:
      default:
        return true
    }
  }

  /**
   * Gets the correct ansi-color value for a given field and log level.  Color is determined by:
   *  1. Which field we are logging
   *  2. If the level is `trace` we use trace-specific field values
   *  3. If there is an override
   *
   * @param field Field we are getting a color for
   * @param level The level we are logging at
   * @param overrideColorKey Color field we would like to use instead
   * @returns ansi-color value for the given field
   */
  private _getColorForField(field: ColorField, level: LogLevel, overrideColorKey?: string): any {
    if (overrideColorKey) {
      return colors[overrideColorKey]
    }

    if (level === LogLevel.TRACE) {
      return colors[`${field}_trace`]
    }

    return colors[field]
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
