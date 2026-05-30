// ============================================================
// ui.js — The ONLY file that touches the DOM.
//         Imports from game.js and logic.js, never the other way.
// ============================================================

import {
  gameState,
  initGame,

  selectDeck,

  toggleCardSelected,
  getSelectedCards,
  playSelectedHand,
  discardSelected,
  sortHandByRank,
  sortHandBySuit,
  
  saveGame,
  deleteSave,
  loadGame,

  advanceRound,
  BLIND_SCORE_TARGETS,
  BLINDS,
  RED_SUITS,
} from './game.js';

import { 
  calculateHandScore, 
  getHandType, 
  formatScore } from './logic.js';
import {DECK_REGISTRY} from './data/decks.js';
import {JOKER_TYPES} from './data/jokers.js'
import {failQuotes} from './data/quotes.js'


export const DEBUG_MODE = true;

function updateDebugButtons(){
  const advBtn = el('adv-round-btn');
  if(advBtn) {
    advBtn.style.display = DEBUG_MODE ? 'block' : 'none';
  }
}

const G = gameState;

// ── Boot ─────────────────────────────────────────────────────
// This should be only run once
console.log("Running ui.js");



init()
initGame();
initRender();
// our debug buttons for testing
updateDebugButtons();
render();

// ── Core render — called after every state change ─────────────

export function render() {
  // Scores & counters
  el('score-display').innerText = `Score: ${formatScore(gameState.score)}`;;
  el('play-btn').innerText         = `▶ Play (${gameState.handsLeft})`;
  el('discard-btn').innerText      = `✕ Discard (${gameState.discardsLeft})`;
  el('deck-count').innerText       = gameState.deck.length;
  el('discard-pile').innerText = `DISCARD: ${gameState.discardPile.length}`;
  // Blind info
  const target = BLIND_SCORE_TARGETS[gameState.anteLevel - 1];
  console.log(`Current ante level: ${gameState.anteLevel}`)
  const name   = BLINDS[gameState.anteLevel - 1];
  const currentRound = G.currentRound;
  el('blind-status').innerText  = `Ante: ${G.anteLevel} Round:${currentRound} ${gameState.currentBlind}  —  Target: ${gameState.blindTarget}`;

  // Progress bar
  const pct = Math.min(100, Math.round((gameState.score / target) * 100));
  el('progress-bar-fill').style.width = pct + '%';

  renderMoneyLabel();
  // Decks
  renderDeckScaling();
  renderDeckBack();
  // Jokers
  renderJokers();

  // Render hand
  renderHand();
  renderSuitColors();

  updateHandScore(gameState.score);

  // Update preview label
  updatePreview();

  // Button states
  el('play-btn').disabled    = gameState.handsLeft <= 0;
  el('discard-btn').disabled = gameState.discardsLeft <= 0;

  // Game over
  if (gameState.handsLeft === 0 && gameState.score < gameState.blindTarget){
    console.log("GAME OVER");
    // Get a random fail quote
    const randomFailQuote = failQuotes[Math.floor(Math.random() * failQuotes.length)]
    setTimeout(() => showHeadline("Game Over", "game-over", ), 200);
    
  }
}

// ── Hand rendering ────────────────────────────────────────────

function renderHand() {
  console.log("Current hand state:", gameState.hand);
  const area = el('hand-area');
  area.innerHTML = '';

  for (const cardData of gameState.hand) {
    const div = buildCardEl(cardData);
    area.appendChild(div);
  }
}

function renderSuitColors(){
  for (const cardData of gameState.hand){
    const cardEl = document.createElement('div');
    cardEl.className = 'card';

// Simply apply the color property we baked in earlier
    cardEl.innerHTML = `
        <div style="font-weight:bold; color: ${cardData.color};">${cardData.rank}</div>
        <div style="font-size: 30px; color: ${cardData.color};">${cardData.suit}</div>
    `;
  }
}

// -- Render Score --
function updateHandScore() {
  const selected = getSelectedCards();

  // 1. Guard Clause: Reset UI if no cards
  if (selected.length === 0) {
    el('chips-display').innerText = '0';
    el('mult-display').innerText = '0';
    el('hand-type-preview').innerText = 'Select cards...';
    el('score-display').innerText = `Score: ${gameState.score.totalScore}`;
    return;
  }

  // 2. Identify Hand
  const handType = getHandType(selected);
  // Now this direct lookup works perfectly because handLevels is an object
  const levelData = gameState.handLevels[handType.name] || { level: 1 };

  // 3. Single Calculation (Performance optimization)
  const scoreData = calculateHandScore(
    handType.name,
    levelData.level,
    selected,
    G.activeJokers,
    (id, bonus) => triggerJokerAnimation(id, bonus)
  );

  // 4. Update UI
  el('chips-display').innerText = `${scoreData.totalChips}`;
  el('mult-display').innerText = `${scoreData.totalMult}`;
  el('hand-type-preview').innerText = handType.name;
  
  // Assuming scoreData.finalScore is the result of Chips * Mult
  el('score-display').innerText = `Score: ${gameState.score.totalScore} + ${scoreData.finalScore}`;
}

function buildCardEl(cardData) {
  const isRed = RED_SUITS.has(cardData.suit);
  console.log(`isRed = ${isRed}`);
  const div   = document.createElement('div');
  div.className = 'card' + (cardData.selected ? ' selected' : '');
  div.dataset.id = cardData.id;

  // Change colors to black or red
  div.innerHTML = `
    <div class="card-corner top-left">
      <span class="card-rank">${cardData.rank}</span>
      <span class="card-suit" style="color:${isRed ? 'red' : 'black'}">${cardData.suit}</span>
    </div>
    <div class="card-center" style="color:${isRed ? 'red' : 'black'}">${cardData.suit}</div>
    <div class="card-corner bottom-right">
      <span class="card-rank">${cardData.rank}</span>
      <span class="card-suit" style="color:${isRed ? 'red' : 'black'}">${cardData.suit}</span>
    </div>
  `;

  div.addEventListener('click', () => {
    const selected = getSelectedCards();
    // If clicking an unselected card and already at 5, block
    if (!cardData.selected && selected.length >= 5) {
      flashWarning('Max 5 cards!');
      return;
    }
    toggleCardSelected(cardData.id);
    render();
  });

  return div;
}

// ── Preview label ─────────────────────────────────────────────

function updatePreview() {
  const selected = getSelectedCards();
  const preview  = el('hand-type-preview');
  const warning  = el('hand-validation-msg');

  warning.innerText = '';

  if (selected.length === 0) {
    preview.innerText = 'Select cards to play...';
    preview.className = 'preview-idle';
    return;
  }

  const result = getHandType(selected);
  preview.innerText = result.name;
  preview.className = 'preview-active';
}

// ── Actions ───────────────────────────────────────────────────

function handlePlayHand() {
  const selected = getSelectedCards();
  if (selected.length === 0)  { flashWarning('Select cards first!'); return; }
  if (selected.length > 5)    { flashWarning('Max 5 cards!');        return; }
  if (gameState.handsLeft <= 0) return;

  const result = getHandType(selected);
  const points = playSelectedHand(result);

  if (points !== false) {
    showPopup(`${result.name}!`, `+${points} pts`, '#4ade80');
    // checkBlindResult();
    if (G.score >= G.blindTarget){
      advanceRound();
    }
  }

  render();
}

async function handleDiscard() {
  const selected = getSelectedCards();
  if (selected.length === 0){
    flashWarning('Select cards first!');
  }

  const discardPileEl = el('discard-pile');
  const rect = discardPileEl.getBoundingClientRect();

  // 1. Snapshot position for all selected cards before modifying state
  const animations = selected.map(cardData => {
    const cardEl = document.querySelector(`[data-id="${cardData.id}"]`);
    const startRect = cardEl.getBoundingClientRect();

    // Hide original element immediately
    cardEl.style.opacity = '0';
    return {cardData, startRect };
  });

  discardSelected();
  // Animation sequence for each card
  for (const {cardData, startRect} of animations){

    G.discardPile.push(cardData);
    // Create a clone for the "flight"
    const flyCard = buildCardEl(cardData);
    flyCard.style.position = 'fixed';
    flyCard.style.left = startRect.left + 'px';
    flyCard.style.top = startRect.top + 'px';
    flyCard.style.zIndex = '1000';
    document.body.appendChild(flyCard);

    await flyCard.animate([
      { transform: 'scale(1) rotate(0deg)'},
      {left: rect.left + 'px', top: rect.top + 'px', transform: 'scale(0.2) rotate(360deg)'},
    ], { duration: 100, easing: 'ease-in-out'}).finished;

    flyCard.remove();
  }

  
  render();
}


function handleReset() {
  initGame();
  render();
  const gameOverLabel = document.getElementById("game-over");
  if (gameOverLabel){
    gameOverLabel.remove();
  }
}

// Advance round for testing
function handleAdvRound() {
  // Call advance round in game
  advanceRound();
  render();
}

function checkBlindResult() {
  const target = BLIND_SCORE_TARGETS[gameState.anteLevel - 1];
  // anteLevel was already bumped inside playSelectedHand → checkBlindProgress
  // We check if we just cleared by seeing if hands/discards were reset
  if (gameState.handsLeft === 4 && gameState.discardsLeft === 4 && gameState.score > 0) {
    const prevLevel = gameState.anteLevel - 1;
    if (prevLevel >= 1) {
      setTimeout(() => showPopup('BLIND CLEARED!', `Next: ${BLIND_SCORE_TARGETS[gameState.anteLevel - 1]}`, '#facc15'), 600);
    }
  }
  if (gameState.BLINDS === 'Boss Blind' && gameState.score >= BLIND_SCORE_TARGETS[gameState.anteLevel -1 ]) {
    setTimeout(() => showPopup('YOU WIN!', '🏆', '#f472b6'), 800);
  }
}

// ── Event listeners ───────────────────────────────────────────

el('play-btn').addEventListener('click', handlePlayHand);
el('discard-btn').addEventListener('click', handleDiscard);
el('reset-btn').addEventListener('click', handleReset);
el('adv-round-btn').addEventListener('click', handleAdvRound);

// ── Physics / wiggle drag ─────────────────────────────────────

const toggle = el('mode-toggle');
let activeCard = null, mouseX = 0, mouseY = 0;
let offset = { x: 0, y: 0 };
let phys   = { x: 0, y: 0 };
let dragStartX = 0, dragStartY = 0;
let isDragging = false;
let pendingOriginal = null;

window.addEventListener('mousemove', e => {
  mouseX = e.clientX;
  mouseY = e.clientY;

  // Only start ghost after 6px movement — distinguishes click from drag
  if (pendingOriginal && !isDragging) {
    const dx = mouseX - dragStartX, dy = mouseY - dragStartY;
    if (Math.sqrt(dx*dx + dy*dy) > 6) {
      isDragging = true;
      startGhost(pendingOriginal);
    }
  }

  if (activeCard && !toggle.checked) {
    activeCard.style.left = (mouseX - offset.x) + 'px';
    activeCard.style.top  = (mouseY - offset.y) + 'px';
  }
});

document.body.addEventListener('mousedown', e => {
  const cardEl = e.target.closest('.card');
  if (!cardEl) return;
  dragStartX = e.clientX;
  dragStartY = e.clientY;
  isDragging = false;
  pendingOriginal = cardEl;
});

function startGhost(original) {
  activeCard = original.cloneNode(true);
  activeCard.style.cssText += 'position:fixed;z-index:1000;pointer-events:none;margin:0;transition:none;';
  original.style.opacity = '0.35';
  const rect = original.getBoundingClientRect();
  activeCard.style.left = rect.left + 'px';
  activeCard.style.top  = rect.top  + 'px';
  phys.x = rect.left; phys.y = rect.top;
  offset.x = mouseX - rect.left;
  offset.y = mouseY - rect.top;
  document.body.appendChild(activeCard);
  activeCard.originalRef = original;
}

window.addEventListener('mouseup', () => {
  if (activeCard) {
    activeCard.originalRef.style.opacity = '1';
    activeCard.remove();
    activeCard = null;
  }
  pendingOriginal = null;
  isDragging = false;
});

function physicsLoop() {
  if (activeCard && toggle.checked) {
    phys.x += (mouseX - offset.x - phys.x) * 0.18;
    phys.y += (mouseY - offset.y - phys.y) * 0.18;
    const rot = (mouseX - (phys.x + 50)) * 0.15;
    activeCard.style.left      = phys.x + 'px';
    activeCard.style.top       = phys.y + 'px';
    activeCard.style.transform = `rotate(${rot}deg) scale(1.06)`;
  }
  requestAnimationFrame(physicsLoop);
}
physicsLoop();

// ── UI helpers ────────────────────────────────────────────────

function el(id) { return document.getElementById(id); }

export function showPopup(headline, sub, color = '#4ade80') {
  const popup = document.createElement('div');
  popup.className = 'popup';
  popup.innerHTML = `<div class="popup-headline" style="color:${color}">${headline}</div>
                     <div class="popup-sub">${sub}</div>`;
  document.body.appendChild(popup);

  popup.animate([
    { opacity: 0, transform: 'translate(-50%,-50%) scale(0.4)' },
    { opacity: 1, transform: 'translate(-50%,-50%) scale(1.1)', offset: 0.4 },
    { opacity: 0, transform: 'translate(-50%,-50%) scale(1.3)' },
  ], { duration: 1100, easing: 'ease-out' }).onfinish = () => popup.remove();
}

export function showHeadline(headline, id, sub, color = "#000000"){
  const hl = document.createElement('div');
  hl.className = 'headline';
  // Much cleaner
  hl.innerHTML = `<div id="${id}" class="headline centered-headline" style="color:${color}">${headline}</div>n
    <div id=${id} class="popup-sub">${sub}</div>`;
  document.body.appendChild(hl);
}

function flashWarning(msg) {
  el('hand-validation-msg').innerText = `⚠ ${msg}`;
  setTimeout(() => { el('hand-validation-msg').innerText = ''; }, 1800);
}

export function updateScoringDisplay(chips, mult){
  document.getElementById('chips-display').innerText = `${chips}`
  document.getElementById('mult-display').innerText = `${mult}`
}

export function initRender() {

  // Menu for choosing deck
  renderDeckSelectionMenu();

  // Discard pile
  el('discard-pile').addEventListener('click', () => {
    const pile = gameState.discardPile;
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

// Joker area
function renderJokers() {
  const container = el('joker-area');
  container.innerHTML = ''; // clear current display

  gameState.activeJokers.forEach((joker) =>{
    const div = document.createElement('div');
    div.className = 'joker-card';

    div.dataset.jokerID = joker.id;

    div.style.cssText = "width: 60px; height: 80px; background: #facc15; border: 2px solid #000; display: flex; align-items: center; justify-content: center; font-size: 0.3rem; text-align: center;";
    div.innerText = joker.name;
    container.appendChild(div);
  });
}

function triggerJokerAnimation(jokerId, bonusText){
  const jokerEl = document.querySelector(`[data-joker-id="${jokerId}"]`);
  if (!jokerEl) return;

  // Shake and scale
  jokerEl.animate([
    { transform: 'scale(1)' },
    { transform: 'scale(1.2) rotate(-5deg)'},
    { transform: 'scale(1.2) rotate(5deg)'},
    { transform: 'scale(1)'}
  ], {duration: 300});

  // Spawn floating text
  const popup = document.createElement('div');
  popup.innerText = bonusText;
  popup.style.cssText = "position:fixed; color:var(--gold); font-size: 0.5rem; z-index: 3000;";

  const rect = jokerEl.getBoundingClientRect();
  popup.style.left = rect.left + 'px';
  popup.style.top = rect.top + 'px';
  document.body.appendChild(popup);

  popup.animate([
    {opacity: 1, transform: 'translateY(0)'},
    {opacity: 0, transform: 'translateY(-50px'}
  ], {duration: 800}).onfinish = () => popup.remove();
}

// Resize Game 

// ui.js
function resizeGame() {
  const container = document.getElementById('game-container');
  if (!container) return;

  const winW = window.innerWidth;
  const winH = window.innerHeight;
  
  // Calculate scale based on the smaller dimension to ensure it always fits
  const scale = Math.min(winW / 1280, winH / 720);
  
  container.style.transform = `scale(${scale})`;
}

window.addEventListener('resize', resizeGame);
resizeGame();

// Deck rendering

function renderDeckSelectionMenu() {
  const container = document.getElementById('deck-options-container');
  container.innerHTML = '';

  Object.values(DECK_REGISTRY).forEach(deck => {
    const btn = document.createElement('button');
    btn.innerText = deck.name;
    btn.style.backgroundColor = deck.backColor;
    // Bind the dynamic deck ID to selection function
    btn.onclick = () => selectDeck(deck.id);
    container.appendChild(btn);
    render();
  })
}

function renderDeckBack() {
  const deckArea = document.getElementById('deck-area');
  if (G.activeDeck) {
    deckArea.style.backgroundColor = gameState.activeDeck.backColor;
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
// --------------

// Render money label
function renderMoneyLabel(){
  el('money-display').innerText = `$${G.$}`;
}

function updateMoney(newAmount){
  const el = document.getElementById('money-display');
  el.innerText = `$${newAmount}`;
  el.classList.add('money-pulse');
  setTimeout(() => el.classList.remove('money-pulse'), 200);
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
    const overlay = el('system-overlay');
    
    // Poker hand levels menu
    const handLevelsBtn = document.createElement('button');
    handLevelsBtn.innerText = 'View Hand Levels';
    handLevelsBtn.onclick = showPokerHandLevelOverlay;

    // Appnd to system-overlay container
    document.getElementById('system-overlay').appendChild(handLevelsBtn);
    
    // Toggle visibility
    el('open-system-btn').onclick = () => overlay.style.display = 'flex';
    el('close-system-menu').onclick = () => overlay.style.display = 'none';

    // Button Actions
    el('save-btn-menu').onclick = () => {
        saveGame();
        showPopup('Saved!', 'Game state stored', '#60a5fa');
    };

    el('load-btn-menu').onclick = () => {
        loadGame();
        render();
        showPopup('Loaded!', 'Save reloaded', '#4ade80');
    };

    el('delete-btn-menu').onclick = () => {
        if (confirm("Are you sure you want to delete your progress?")) {
            deleteSave();
            showPopup('Deleted', 'Fresh start ready', '#cc2200');
        }
    };
}


// Parallax tilt effect
// Calculate how far mouse is from center of card
// e.g. mouse to the right -> rotate Y-axis
// e.g. mouse towards bottom -> rotate X-axis

function initCardTiltEffect() {
  const cards = document.querySelectorAll('.card');

  cards.forEach((card) => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const cardX = e.clientX - rect.left; // mouse x relative to card
      const cardY = e.clientY - rect.top; // mouse y relative to card

      // Calculate rotation (-15 to 15)
      const rotateY = ((x / rect.width) - 0.5) * 30;
      const rotateX = (( y / rect.height) - 0.5) * -30;
      
      card.style.transform = `perspective(1000px) rotateY(${rotateY}deg) rotateX(${rotateX}deg)`;
    });

      // Reset on mouse leave
    card.addEventListener('mouseleave', () => {
      card.style.transform = `perspective(1000px) rotateY(0deg) rotateX(0deg)`;
    });
  });


}

// 1. Create the level display overlay
function showPokerHandLevelOverlay() {
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  // Build the list of hand levels
  let html = `<h2>Hand Levels</ht><ul style="list-style: none; margin: 20px 0;">`;
  for (const [handName, level] of Object.entries[G.handLevels]){
    html += `<li style="padding: 5px;">${handName}: <strong>Level ${level}</strong></lis>`;

  }
  html += `</ul><button id="close-poker-hand-levels-overlay">Close</button>`;
  
  overlay.innerHTML = html;
  document.body.appendChild(overlay);

  overlay.querySelector('#close-poker-hand-levels-overlay').onclick = () => overlay.remove();
}

function init(){

  initCardTiltEffect();

  initSortButtons();
  initSaveButtons();
  initSystemMenu();
}