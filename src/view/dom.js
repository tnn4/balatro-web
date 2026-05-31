/** Handles low-level DOM operations */
import { CONST } from '../model/data/constants.js';
import { GAME } from '../model/game.js';

function buildCardEl(cardData) {
  const isRed = CONST.RED_SUITS.has(cardData.suit);
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
    const selected = GAME.getSelectedCards();
    // If clicking an unselected card and already at 5, block
    if (!cardData.selected && selected.length >= 5) {
      flashWarning('Max 5 cards!');
      return;
    }
    GAME.toggleCardSelected(cardData.id);
  
  });

  return div;
}


function resizeGame() {
  const container = document.getElementById('game-container');
  if (!container) return;

  const winW = window.innerWidth;
  const winH = window.innerHeight;
  
  // Calculate scale based on the smaller dimension to ensure it always fits
  const scale = Math.min(winW / 1280, winH / 720);
  
  container.style.transform = `scale(${scale})`;
}



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





export const DOM = {
  buildCardEl,
  resizeGame,
  showPopup,
  showHeadline,
}

