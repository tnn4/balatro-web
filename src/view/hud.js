/** Handles updates to the HUD, score counter, progress bar */

import {G} from '../model/game.js';
import {GAME} from '../model/game.js';
import {el} from '../util.js';
import {LOGIC} from '../controller/logic.js';

// 1. Create the level display overlay
function showPokerHandLevelOverlay() {
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  // Build the list of hand levels
  let html = `<h2>Hand Levels</ht><ul style="list-style: none; margin: 20px 0;">`;
  for (const [handName, level] of Object.entries(G.handLevels)){
    html += `<li style="padding: 5px;">${handName}: <strong>Level ${level}</strong></lis>`;
  }
  html += `</ul><button id="close-poker-hand-levels-overlay">Close</button>`;
  
  overlay.innerHTML = html;
  document.body.appendChild(overlay);

  overlay.querySelector('#close-poker-hand-levels-overlay').onclick = () => overlay.remove();
}

function updateHandScore() {
  const selected = GAME.getSelectedCards();

  // 1. Guard Clause: Reset UI if no cards
  if (selected.length === 0) {
    el('chips-display').innerText = '0';
    el('mult-display').innerText = '0';
    el('hand-type-preview').innerText = 'Select cards...';
    el('score-display').innerText = `Score: ${G.score.totalScore}`;
    return;
  }

  // 2. Identify Hand
  const handType = LOGIC.getHandType(selected);
  // Now this direct lookup works perfectly because handLevels is an object
  const levelData = G.handLevels[handType.name] || { level: 1 };

  // 3. Single Calculation (Performance optimization)
  const scoreData = LOGIC.calculateHandScore(
    G,
    handType.name,
    selected,
    G.activeJokers,
    (id, bonus) => triggerJokerAnimation(id, bonus)
  );

  // 4. Update UI
  el('chips-display').innerText = `${scoreData.totalChips}`;
  el('mult-display').innerText = `${scoreData.totalMult}`;
  el('hand-type-preview').innerText = handType.name;
  
  // Assuming scoreData.finalScore is the result of Chips * Mult
  el('score-display').innerText = `Score: ${G.score.totalScore} + ${scoreData.finalScore}`;
}

function updateMoney(newAmount){
  const el = document.getElementById('money-display');
  el.innerText = `$${newAmount}`;
  el.classList.add('money-pulse');
  setTimeout(() => el.classList.remove('money-pulse'), 200);
}

export function updateScoringDisplay(chips, mult){
  document.getElementById('chips-display').innerText = `${chips}`
  document.getElementById('mult-display').innerText = `${mult}`
}


// ── Preview label ─────────────────────────────────────────────

function updatePreview() {
  const selected = GAME.getSelectedCards();
  const preview  = el('hand-type-preview');
  const warning  = el('hand-validation-msg');

  warning.innerText = '';

  if (selected.length === 0) {
    preview.innerText = 'Select cards to play...';
    preview.className = 'preview-idle';
    return;
  }

  const result = LOGIC.getHandType(selected);
  preview.innerText = result.name;
  preview.className = 'preview-active';
}

export const HUD = {
  showPokerHandLevelOverlay,
  updateHandScore,
  updateMoney,
  updateScoringDisplay,
  updatePreview,
}