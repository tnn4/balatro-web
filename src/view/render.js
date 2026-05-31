// Rendering code
import {GAME} from '../model/game.js';
import {G} from '../model/game.js';
import {DECK_REGISTRY} from '../model/data/decks.js';
import {UTIL} from '../util.js';
import {LOGIC} from '../controller/logic.js';
import {CONST} from '../model/data/constants.js'
import {el} from '../util.js';
import {HUD} from '../view/hud.js';
import {DOM} from '../view/dom.js';
//

export function initRender() {

  // Menu for choosing deck
  renderDeckSelectionMenu();

  // Discard pile
  UTIL.el('discard-pile').addEventListener('click', () => {
    const pile = G.discardPile;
    if (pile.length === 0) return;

    // Create container
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    
    // Header & Close Button
    overlay.innerHTML = `
      <h2 style="margin-bottom: 20px;">Discard Pile (${pile.length})</h2>
      <div id="overlay-cards" class="overlay-content"></div>
      <button id="close-overlay" style="margin-top: 20px;">Close</button>
    `;

    // Append cards to the inner container
    const cardContainer = overlay.querySelector('#overlay-cards');
    pile.forEach(cardData => {
        // We use buildCardEl but strip the pointer events to make them static
        const cardEl = buildCardEl(cardData);
        cardEl.style.cursor = 'default';
        cardContainer.appendChild(cardEl);
    });

    // Close logic
    overlay.querySelector('#close-overlay').onclick = () => overlay.remove();
    
    document.body.appendChild(overlay);
  });
}

function renderSuitColors(){
  for (const cardData of G.hand){
    const cardEl = document.createElement('div');
    cardEl.className = 'card';

// Simply apply the color property we baked in earlier
    cardEl.innerHTML = `
        <div style="font-weight:bold; color: ${cardData.color};">${cardData.rank}</div>
        <div style="font-size: 30px; color: ${cardData.color};">${cardData.suit}</div>
    `;
  }
}

function renderHand() {
  console.log("Current hand state:", G.hand);
  const area = UTIL.el('hand-area');
  area.innerHTML = '';

  for (const cardData of G.hand) {
    const div = DOM.buildCardEl(cardData);
    area.appendChild(div);
  }
}


function renderDeckBack() {
  const deckArea = document.getElementById('deck-area');
  if (G.activeDeck) {
    deckArea.style.backgroundColor = G.activeDeck.backColor;
  }
}

// Call inside render loop
function renderDeckScaling() {
  const deckEl = el('deck-area');
  const remaining = G.deck.length;

  const scale = 0.8 + (remaining/52) * 0.4;

  deckEl.style.transform = `scale(${scale})`;
  deckEl.style.transition = 'transform 0.3s ease';

  // Visual juice: change color as it gets low
  deckEl.style.borderColor = remaining < 10 ? 'var(--red)' : '#000';
}

// Joker area
function renderJokers() {
  const container = el('joker-area');
  container.innerHTML = ''; // clear current display

  G.activeJokers.forEach((joker) =>{
    const div = document.createElement('div');
    div.className = 'joker-card';

    div.dataset.jokerID = joker.id;

    div.style.cssText = "width: 60px; height: 80px; background: #facc15; border: 2px solid #000; display: flex; align-items: center; justify-content: center; font-size: 0.3rem; text-align: center;";
    div.innerText = joker.name;
    container.appendChild(div);
  });
}

function renderMoneyLabel(){
  UTIL.el('money-display').innerText = `$${G.$}`;
}

function renderDeckSelectionMenu() {
  const container = document.getElementById('deck-options-container');
  container.innerHTML = '';

  Object.values(DECK_REGISTRY).forEach(deck => {
    const btn = document.createElement('button');
    btn.innerText = deck.name;
    btn.style.backgroundColor = deck.backColor;
    // Bind the dynamic deck ID to selection function
    btn.onclick = () => GAME.selectDeck(deck.id);
    container.appendChild(btn);
    render();
  })
}


// ── Core render — called after every state change ─────────────

// This should take a list of functions to render instead of hardcoded ones
export function render() {
  // Scores & counters
  UTIL.el('score-display').innerText = `Score: ${LOGIC.formatScore(G.score.totalScore)}`;;
  UTIL.el('play-btn').innerText         = `▶ Play (${G.handsLeft})`;
  UTIL.el('discard-btn').innerText      = `✕ Discard (${G.discardsLeft})`;
  UTIL.el('deck-count').innerText       = G.deck.length;
  UTIL.el('discard-pile').innerText = `DISCARD: ${G.discardPile.length}`;
  // Blind info
  const target = CONST.ANTE_SCORE_TARGETS[G.anteLevel - 1];
  console.log(`Current ante level: ${G.anteLevel}`)
  const name   = CONST.BLINDS[G.anteLevel - 1];
  const currentRound = G.currentRound;
  UTIL.el('blind-status').innerText  = `Ante: ${G.anteLevel} Round:${currentRound} ${G.currentBlind}  —  Target: ${G.blindTarget}`;

  // Progress bar
  const pct = Math.min(100, Math.round((G.score / target) * 100));
  UTIL.el('progress-bar-fill').style.width = pct + '%';

  renderMoneyLabel();
  // Decks
  renderDeckScaling();
  renderDeckBack();
  // Jokers
  renderJokers();

  // Render hand
  renderHand();
  renderSuitColors();

  HUD.updateHandScore(G.score);

  // Update preview label
  HUD.updatePreview();

  // Button states
  UTIL.el('play-btn').disabled    = G.handsLeft <= 0;
  UTIL.el('discard-btn').disabled = G.discardsLeft <= 0;
}


export const RENDER = {
    initRender,
    renderDeckSelectionMenu,
    render,
}