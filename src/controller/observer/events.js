/** Manages the event listeners and the "ghost" drag and drop 
 * Implementation of the observer pattern to decouple game logic from UI rendering.
 * 
 * The observer pattern allows different parts of the application to communicate without being tightly coupled.
 * In this case, the game logic can trigger events, and the UI can listen for those events to update the display accordingly.
 * This makes the code more modular and easier to maintain.
 * 
 * Usage:
 * 1. Define an event in the EVENTS object.
 * 2. Trigger the event from game logic using triggerEvent(eventName, data).
 * 3. Listen for the event in the UI using addEventListener(eventName, callback).
 */

/**
 * Javascript has a built-in EventTarget class that can be used to create 
 * custom events and dispatch them.
 * This allows us to create a centralized event system for our game.
 */
const gameEvents = new EventTarget();

function emit(type, detail) {
  gameEvents.dispatchEvent(new CustomEvent(type, { detail: detail }));
}


export const EVENT = {
  gameEvents,
  emit
}