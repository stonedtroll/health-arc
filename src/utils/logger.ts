/**
 * Logger - Provides controlled logging for the Health Arc module
 * Only outputs non-error messages when debug mode is enabled
 * Uses Australian English spelling conventions
 */

import { MODULE_ID } from '../utils/constants';
import { localize, format } from './i18n';

/**
 * Log level enum
 */
export enum LogLevel {
  TRACE = 0,
  DEBUG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
  NONE = 5
}

/**
 * Logger for the Health Arc module
 */
export class Logger {    private static readonly PREFIX = `${MODULE_ID}:`;
  private static _debugModeInitialised = false;
  private static _debugMode = false;
  private static _logLevel = LogLevel.ERROR;

  /**
   * Safely checks if debug mode is enabled
   * @returns True if debug mode is enabled
   */  private static isDebugMode(): boolean {
    try {
      if (!this._debugModeInitialised && (window as any).game?.settings?.settings?.has(`${MODULE_ID}.debugMode`)) {
        this._debugMode = (window as any).game?.settings?.get(MODULE_ID, 'debugMode') === true;
        this._debugModeInitialised = true;
      }
      return this._debugMode;
    } catch (e) {
      // If settings aren't registered yet, assume debug mode is off
      return false;
    }
  }
  
  /**
   * Checks if a message at the given log level should be displayed based on current debug mode and log level
   * When debug mode is OFF: DEBUG and TRACE messages are never shown regardless of log level setting
   * When debug mode is ON: Even if INFO/WARN/ERROR is selected, only messages up to DEBUG level are shown
   * 
   * @param level - The log level to check
   * @returns True if a message at this log level should be displayed
   */
  private static shouldLogLevel(level: LogLevel): boolean {
    // First check if the level is supported in current debug mode
    const isLevelAppropriateForMode = this.isDebugMode() 
      ? level <= LogLevel.DEBUG  // In debug mode, only TRACE and DEBUG are meaningful
      : level >= LogLevel.INFO;  // In normal mode, only INFO, WARN, ERROR, NONE are meaningful
    
    // Then check if it's within the configured log level
    const isWithinConfiguredLevel = level <= this._logLevel;
    
    return isLevelAppropriateForMode && isWithinConfiguredLevel;
  }
  
  /**
   * Logs a trace message if debug mode is enabled and log level is TRACE
   * Only available in debug mode
   * @param message - The message to log
   * @param optionalParams - Additional parameters to log
   */
  public static trace(message: string, ...optionalParams: any[]): void {
    if (this.isDebugMode() && this.shouldLogLevel(LogLevel.TRACE)) {
      console.log(`${this.PREFIX} [TRACE] ${message}`, ...optionalParams);
    }
  }

  /**
   * Logs a debug message if debug mode is enabled and log level is DEBUG or lower
   * Only available in debug mode
   * @param message - The message to log
   * @param optionalParams - Additional parameters to log
   */
  public static debug(message: string, ...optionalParams: any[]): void {
    if (this.isDebugMode() && this.shouldLogLevel(LogLevel.DEBUG)) {
      console.log(`${this.PREFIX} [DEBUG] ${message}`, ...optionalParams);
    }
  }

  /**
   * Logs an info message if log level is INFO or lower
   * Only available when debug mode is off
   * @param message - The message to log
   * @param optionalParams - Additional parameters to log
   */
  public static info(message: string, ...optionalParams: any[]): void {
    if (this.shouldLogLevel(LogLevel.INFO)) {
      console.info(`${this.PREFIX} [INFO] ${message}`, ...optionalParams);
    }
  }

  /**
   * Logs a warning message if log level is WARN or lower
   * Only available when debug mode is off
   * @param message - The warning message
   * @param optionalParams - Additional parameters to log
   */
  public static warn(message: string, ...optionalParams: any[]): void {
    if (this.shouldLogLevel(LogLevel.WARN)) {
      console.warn(`${this.PREFIX} [WARN] ${message}`, ...optionalParams);
    }
  }

  /**
   * Logs an error message if log level is ERROR or lower
   * Always available regardless of debug mode
   * @param message - The error message
   * @param optionalParams - Additional parameters to log
   */
  public static error(message: string, ...optionalParams: any[]): void {
    if (this._logLevel <= LogLevel.ERROR) {
      console.error(`${this.PREFIX} [ERROR] ${message}`, ...optionalParams);
    }
  }
  
  /**
   * Updates the debug mode state when settings change
   * This should be called after settings are registered
   */
  public static updateDebugMode(): void {
    try {
      const previousDebugMode = this._debugMode;      this._debugMode = (window as any).game?.settings?.get(MODULE_ID, 'debugMode') === true;
      this._debugModeInitialised = true;
      
      // If debug mode has changed, adjust behaviour and notify
      if (previousDebugMode !== this._debugMode) {
        // Load the appropriate log level setting based on debug mode
        this.loadAppropriateLogLevel();
        
        const status = this._debugMode ? 'enabled' : 'disabled';
        console.log(`${this.PREFIX} Debug mode ${status}`);
        
        // Show a UI notification about the change
        if ((window as any).ui?.notifications?.info) {
          const message = this._debugMode 
            ? 'Debug mode enabled - TRACE and DEBUG messages will now be shown'
            : 'Debug mode disabled - Only INFO, WARN, ERROR messages will be shown';
          
          (window as any).ui.notifications.info(`Health Arc: ${message}`);
        }
      }
    } catch (e) {
      console.error(`${this.PREFIX} ${localize('logger.error.debugMode', 'Error updating debug mode:')}`, e);
    }
  }
  
  /**
   * Loads the appropriate log level based on debug mode
   * Uses debugLogLevel setting when debug mode is on, normalLogLevel when off
   */
  public static loadAppropriateLogLevel(): void {
    try {
      const settingKey = this._debugMode ? 'debugLogLevel' : 'normalLogLevel';
      
      if ((window as any).game?.settings?.settings?.has(`${MODULE_ID}.${settingKey}`)) {
        const level = (window as any).game?.settings?.get(MODULE_ID, settingKey) as LogLevel;
        this.setLogLevel(level);
          // Log using the appropriate method based on debug mode
        if (this.isDebugMode()) {
          console.log(`${this.PREFIX} [DEBUG] Log level set to: ${this.getLogLevelName(level)}`);
        } else {
          console.info(`${this.PREFIX} [INFO] Log level set to: ${this.getLogLevelName(level)}`);
        }
      }
    } catch (e) {
      console.error(`${this.PREFIX} ${localize('logger.error.loadLogLevel', 'Error loading log level:')}`, e);
    }
  }
    /**
   * Sets the log level
   * @param level - The log level to set
   */
  public static setLogLevel(level: LogLevel): void {
    this._logLevel = level;
    
    // Log using the appropriate method based on debug mode
    if (this.isDebugMode()) {
      this.debug(format('logger.logLevel.set', 'Log level set to: {level}', { level: this.getLogLevelName(level) }));
    } else {
      this.info(format('logger.logLevel.set', 'Log level set to: {level}', { level: this.getLogLevelName(level) }));
    }
  }
  
  /**
   * Gets the name of a log level
   * @param level - The log level
   * @returns The name of the log level
   */
  private static getLogLevelName(level: LogLevel): string {
    switch (level) {
      case LogLevel.TRACE: return 'TRACE';
      case LogLevel.DEBUG: return 'DEBUG';
      case LogLevel.INFO: return 'INFO';
      case LogLevel.WARN: return 'WARN';
      case LogLevel.ERROR: return 'ERROR';
      case LogLevel.NONE: return 'NONE';
      default: return 'UNKNOWN';
    }
  }

  /**
   * Gets the available log level choices based on debug mode
   * When debug mode is off: Only INFO, WARN, ERROR, NONE levels are available
   * When debug mode is on: Only TRACE and DEBUG levels are available
   * @returns An object with log level choices
   */
  public static getAvailableLogLevels(isDebug: boolean): Record<number, string> {
    if (isDebug) {
      return {
        [LogLevel.TRACE]: localize("settings.logLevel.trace", "Trace - Most Verbose"),
        [LogLevel.DEBUG]: localize("settings.logLevel.debug", "Debug")
      };
    } else {
      return {
        [LogLevel.INFO]: localize("settings.logLevel.info", "Info"),
        [LogLevel.WARN]: localize("settings.logLevel.warn", "Warning"),
        [LogLevel.ERROR]: localize("settings.logLevel.error", "Error"),
        [LogLevel.NONE]: localize("settings.logLevel.none", "None - No Logging")
      };
    }
  }
  
  /**
   * Suggests an appropriate log level based on the current debug mode
   * This does not force a change but returns a recommended level
   * 
   * @returns The recommended log level for the current debug mode
   */
  public static getSuggestedLogLevel(isDebug: boolean): LogLevel {
    return isDebug ? LogLevel.DEBUG : LogLevel.ERROR;
  }
}
