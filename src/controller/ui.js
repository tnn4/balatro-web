// ============================================================
// ui.js — 
// Entry point.
//  The ONLY file that touches the DOM.
//         Imports from game.js and logic.js, never the other way.
//         This is the orchestrator of the UI, 
// handling rendering, event listeners, and animations.
//         
// ============================================================

export const DEBUG_MODE = true;

import {
  el,
  getEl,
  UTIL
} from '../util.js';


import {
  G,G_HANDLER
} from '../model/game.js';

import {
  DOM
} from '../view/dom.js';

import {
  HUD
} from '../view/hud.js';

import {
  RENDER
} from '../view/render.js';

import {EVENT} from './observer/events.js';

// game.js
import { GAME } from '../model/game.js';

import {PHYSICS} from '../view/physics.js';

// logic.js
import { 
  calculateHandScore, 
  getHandType, 
  formatScore } from './logic.js';

import {DECK_REGISTRY} from '../model/data/decks.js';
import {JOKER_TYPES} from '../model/data/jokers.js'
import {failQuotes} from '../model/data/quotes.js'

import {ANIMATION} from '../view/animation.js';



function updateDebugButtons(){
  const advBtn = UTIL.el('adv-round-btn');
  if(advBtn) {
    advBtn.style.display = DEBUG_MODE ? 'block' : 'none';
  }
}

// ── UI helpers ────────────────────────────────────────────────

window.addEventListener('resize', DOM.resizeGame);
DOM.resizeGame();

function initSaveButtons(){
  const container = document.getElementById('controls');

  const saveBtn = document.createElement('button');
  saveBtn.innerText = '💾 Save';
  saveBtn.onclick = () => {
    saveGame();
    showPopup('Game Saved', 'Progress stored!', '#60a5fa');
  };

  const loadBtn = document.createElement('button');
    loadBtn.innerText = '📂 Load';
    loadBtn.onclick = () => {
        loadGame();
        render(); // Refresh the UI with loaded data
        showPopup('Game Loaded', 'Resuming run...', '#4ade80');
    };

  container.appendChild(saveBtn);
  container.appendChild(loadBtn);
}

// 1. Menu Toggle Logic
function initSystemMenu() {
    const overlay = UTIL.el('system-overlay');
    
    // Poker hand levels menu
    const handLevelsBtn = document.createElement('button');
    handLevelsBtn.innerText = 'View Hand Levels';
    handLevelsBtn.onclick = HUD.showPokerHandLevelOverlay;

    // Appnd to system-overlay container
    document.getElementById('system-overlay').appendChild(handLevelsBtn);
    
    // Toggle visibility
    UTIL.el('open-system-btn').onclick = () => overlay.style.display = 'flex';
    UTIL.el('close-system-menu').onclick = () => overlay.style.display = 'none';

    // Button Actions
    UTIL.el('save-btn-menu').onclick = () => {
        saveGame();
        showPopup('Saved!', 'Game state stored', '#60a5fa');
    };

    UTIL.el('load-btn-menu').onclick = () => {
        loadGame();
        render();
        showPopup('Loaded!', 'Save reloaded', '#4ade80');
    };

    UTIL.el('delete-btn-menu').onclick = () => {
        if (confirm("Are you sure you want to delete your progress?")) {
            deleteSave();
            showPopup('Deleted', 'Fresh start ready', '#cc2200');
        }
    };
}

function initSortButtons() {
  const container = document.getElementById('sort-controls');

  const rankBtn = document.createElement('button');
  rankBtn.innerText = 'Sort: Rank';
  rankBtn.onclick = () => {
    sortHandByRank();
    render();
  }

  const suitBtn = document.createElement('button');
  suitBtn.innerText = 'Sort: Suit';
  suitBtn.onclick = () => {
    sortHandBySuit();
    render();
  }

  container.appendChild(rankBtn);
  container.appendChild(suitBtn);
}

function initEventListeners() {
  
  UTIL.el('play-btn').addEventListener('click', G_HANDLER.handlePlayHand);
  UTIL.el('discard-btn').addEventListener('click', G_HANDLER.handleDiscard);
  UTIL.el('reset-btn').addEventListener('click', G_HANDLER.handleResetGame);
  UTIL.el('adv-round-btn').addEventListener('click', G_HANDLER.handleAdvRound);

  // start game when deck is selected
  EVENT.gameEvents.addEventListener('DECK_SELECTED', (e) => {
    console.log("Deck selected");
    GAME.initGame();
    RENDER.render();
  });

  initHandHandPlayedEventListener();

  initHandDiscardedEventListener();

  EVENT.gameEvents.addEventListener('NO_CARDS_SELECTED', () => {
    flashWarning('Select at least 1 card!');
  });

  EVENT.gameEvents.addEventListener('TOO_MANY_CARDS_SELECTED', () => {
    flashWarning('Max 5 cards!');
  });


  EVENT.gameEvents.addEventListener('GAME_STATE_UPDATED', (e) => {
    RENDER.render();
    PHYSICS.physicsLoop();
  });
}

function initHandHandPlayedEventListener() {
  EVENT.gameEvents.addEventListener('HAND_PLAYED', (e) => {
    
    console.log('HAND_PLAYED');
    const selected = e.detail.selected;
    const handType = e.detail.handType;
    const jokers = G.activeJokers; // Assuming this is updated before emitting HAND_PLAYED

  if (e.detail.points !== false) {
    DOM.showPopup(`${e.detail.result.name}!`, `+${e.detail.points} pts`, '#4ade80');
    // checkBlindResult();
    if (G.score.totalScore >= G.blindTarget){
      advanceRound();
    }
    else {
      // Show game over screen if we just failed to clear the blind and have no hands left
      if (GAME.checkGameOver()) {
        const randomFailQuote = failQuotes[Math.floor(Math.random() * failQuotes.length)]
        setTimeout(() => showHeadline("Game Over", "game-over", randomFailQuote, '#cc2200'), 200);
      }
    }
  }

    ANIMATION.playHandAnimation(selected, jokers);
    RENDER.render();
    PHYSICS.physicsLoop();
  });
}

function initHandDiscardedEventListener() {
    EVENT.gameEvents.addEventListener('HAND_DISCARDED', (e) => {
    //console.log('HAND_DISCARDED');
    //console.log('Discarded cards:', e.detail);

    const cardsToAnimate = e.detail; // Assuming detail contains the list of discarded cards
    //console.log('[EVENTLISTENER] Cards to animate:', cardsToAnimate);
    const snapshots = cardsToAnimate
      .map(cardData => ({
      cardData: cardData,
      element: document.querySelector(`[data-id="${cardData.id}"]`)
    }))
    .filter(item => item.element !== null); // Filter out any cards that don't have a corresponding element

     if (snapshots.length === 0) {
      console.warn('No valid cards to animate for discard');
      return;
    }
    ANIMATION.moveCardsAnimation(snapshots);
    
    RENDER.render();
    PHYSICS.physicsLoop();
  });
}

function main(){
  RENDER.initRender();
  initEventListeners();
  initSortButtons();
  initSaveButtons();
  initSystemMenu();
  PHYSICS.initPhysicsEventListeners();
}

main();