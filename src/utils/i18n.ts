/**
 * Internationalization helper functions
 */
import { MODULE_ID } from './constants';

/**
 * Gets a localized string from the i18n system
 * Falls back to a default string if the i18n system isn't ready
 * @param key The translation key
 * @param defaultValue The default value if translation isn't available
 * @returns The localized string or default value
 */
export function localize(key: string, defaultValue: string): string {
  try {
    const game = (window as any).game;
    if (game?.i18n?.localize) {
      const fullKey = `${MODULE_ID}.${key}`;
      const result = game.i18n.localize(fullKey);
      // If the result is the same as the key, it means no translation was found
      return result === fullKey ? defaultValue : result;
    }
  } catch (error) {
    console.error(`${MODULE_ID}: Error localizing key ${key}:`, error);
  }
  return defaultValue;
}

/**
 * Format a localized string with data
 * @param key The translation key
 * @param defaultValue The default pattern if translation isn't available
 * @param data The data to format the string with
 * @returns The formatted string
 */
export function format(key: string, defaultValue: string, data: Record<string, any>): string {
  try {
    const game = (window as any).game;
    if (game?.i18n?.format) {
      const fullKey = `${MODULE_ID}.${key}`;
      return game.i18n.format(fullKey, data) || defaultValue;
    }
  } catch (error) {
    console.error(`${MODULE_ID}: Error formatting key ${key}:`, error);
  }  // Simple fallback for formatting
  let result = defaultValue;
  // Using Object.keys to avoid Object.entries compatibility issues
  Object.keys(data).forEach(key => {
    result = result.replace(new RegExp(`{${key}}`, 'g'), String(data[key]));
  });
  return result;
}
