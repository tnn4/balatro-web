// ============================================================
// ui.js — The ONLY file that touches the DOM.
//         Imports from game.js and logic.js, never the other way.
// ============================================================

import {
  gameState,
  initGame,
  toggleCardSelected,
  getSelected,
  playSelectedHand,
  discardSelected,
  BLIND_TARGETS,
  BLIND_NAMES,
  RED_SUITS,
} from './game.js';

import { getHandType } from './logic.js';

// ── Boot ─────────────────────────────────────────────────────

initGame();
render();

// ── Core render — called after every state change ─────────────

export function render() {
  // Scores & counters
  el('score-display').innerText    = `Score: ${gameState.score}`;
  el('play-btn').innerText         = `▶ Play Hand  (${gameState.handsLeft} left)`;
  el('discard-btn').innerText      = `✕ Discard  (${gameState.discardsLeft} left)`;
  el('deck-count').innerText       = gameState.deck.length;

  // Blind info
  const target = BLIND_TARGETS[gameState.anteLevel - 1];
  const name   = BLIND_NAMES[gameState.anteLevel - 1];
  el('blind-status').innerText     = `${name}  —  Target: ${target}`;

  // Progress bar
  const pct = Math.min(100, Math.round((gameState.score / target) * 100));
  el('progress-bar-fill').style.width = pct + '%';

  // Render hand
  renderHand();

  // Update preview label
  updatePreview();

  // Button states
  el('play-btn').disabled    = gameState.handsLeft <= 0;
  el('discard-btn').disabled = gameState.discardsLeft <= 0;
}

// ── Hand rendering ────────────────────────────────────────────

function renderHand() {
  const area = el('hand-area');
  area.innerHTML = '';

  for (const cardData of gameState.hand) {
    const div = buildCardEl(cardData);
    area.appendChild(div);
  }
}

function buildCardEl(cardData) {
  const isRed = RED_SUITS.has(cardData.suit);
  const div   = document.createElement('div');
  div.className = 'card' + (cardData.selected ? ' selected' : '');
  div.dataset.id = cardData.id;

  div.innerHTML = `
    <div class="card-corner top-left">
      <span class="card-rank">${cardData.rank}</span>
      <span class="card-suit ${isRed ? 'red' : ''}">${cardData.suit}</span>
    </div>
    <div class="card-center ${isRed ? 'red' : ''}">${cardData.suit}</div>
    <div class="card-corner bottom-right">
      <span class="card-rank">${cardData.rank}</span>
      <span class="card-suit ${isRed ? 'red' : ''}">${cardData.suit}</span>
    </div>
  `;

  div.addEventListener('click', () => {
    const selected = getSelected();
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
  const selected = getSelected();
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
  const selected = getSelected();
  if (selected.length === 0)  { flashWarning('Select cards first!'); return; }
  if (selected.length > 5)    { flashWarning('Max 5 cards!');        return; }
  if (gameState.handsLeft <= 0) return;

  const result = getHandType(selected);
  const points = playSelectedHand(result);

  if (points !== false) {
    showPopup(`${result.name}!`, `+${points} pts`, '#4ade80');
    checkBlindResult();
  }

  render();
}

function handleDiscard() {
  if (gameState.discardsLeft <= 0) return;
  const ok = discardSelected();
  if (!ok) { flashWarning('Select cards to discard!'); return; }
  render();
}

function handleReset() {
  initGame();
  render();
}

function checkBlindResult() {
  const target = BLIND_TARGETS[gameState.anteLevel - 1];
  // anteLevel was already bumped inside playSelectedHand → checkBlindProgress
  // We check if we just cleared by seeing if hands/discards were reset
  if (gameState.handsLeft === 4 && gameState.discardsLeft === 4 && gameState.score > 0) {
    const prevLevel = gameState.anteLevel - 1;
    if (prevLevel >= 1) {
      setTimeout(() => showPopup('BLIND CLEARED!', `Next: ${BLIND_TARGETS[gameState.anteLevel - 1]}`, '#facc15'), 600);
    }
  }
  if (gameState.anteLevel === 3 && gameState.score >= BLIND_TARGETS[2]) {
    setTimeout(() => showPopup('YOU WIN!', '🏆', '#f472b6'), 800);
  }
}

// ── Event listeners ───────────────────────────────────────────

el('play-btn').addEventListener('click', handlePlayHand);
el('discard-btn').addEventListener('click', handleDiscard);
el('reset-btn').addEventListener('click', handleReset);

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

function flashWarning(msg) {
  el('hand-validation-msg').innerText = `⚠ ${msg}`;
  setTimeout(() => { el('hand-validation-msg').innerText = ''; }, 1800);
}
