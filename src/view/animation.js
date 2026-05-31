/** Houses the juice of the logic ( triggerAnimationJoker, floating text, async scoring) */

import {el} from '../util.js';

/*
Instead of calculating the total and setting the score in one line,
you must break calculateHandScore into a generator or an async function that awaits animations
*/
// ── Juice ────────────────────────────────────────────────
async function playHandJuice(cards, jokers) {
  let currentTotal = 0;

  for(const card of cards) {
    // 1. Highlight the current card being scored
    const cardEl = document.querySelector(`[data-id="${card.id}"]`);
    cardEl.classList.add('scoring-pulse');

    // 2. Calculate individual card value
    const cardChips = card.rankValue;
    currentTotal += cardChips;

    // 3. Spawning the floating +N text over the card
    spawnFloatingText(`+${cardChips}`, 'var(--blue)');

    // 4. Update the chip counter gradually
    await animateCounter('chips-display', currentTotal, 300);

    cardEl.classList.remove('scoring-pulse');
    await new Promise(r => setTimeout(r,2000) ); // the balatro pause
  }

  // 5. Trigger Mult animation after chips are done
  await triggerMultJuice(jokers)
}

async function triggerMultJuice(jokers) {

}

async function animateCounter(elementId, targetValue, duration) {
  const el = document.getElementById(elementId);
  const startValue = parseInt(el.innerText) || 0;
  const startTime = performance.now();

  return new Promise ( resolve => {
    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Linear interpolation
      const current = Math.floor(startValue + (targetValue - startValue) * progress);
      el.innerText = current;

      if (progress < 1) requestAnimationFrame(update);
      else resolve();
    }
    requestAnimateFrame(update);
  })
}

function spawnFloatingText(targetEl, text, color) {
    const rect = targetEl.getBoundingClientRect(); //
    const popup = document.createElement('div');
    popup.innerText = text;
    popup.style.cssText = `position:fixed; left:${rect.left}px; top:${rect.top}px; color:${color}; font-size: 2rem; pointer-events:none; z-index: 5000;`;
    document.body.appendChild(popup);

    popup.animate([
        { transform: 'translateY(0) scale(1)', opacity: 1 },
        { transform: 'translateY(-100px) scale(1.5)', opacity: 0 }
    ], { duration: 800, easing: 'ease-out' }).onfinish = () => popup.remove();
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

function flashWarning(msg) {
  el('hand-validation-msg').innerText = `⚠ ${msg}`;
  setTimeout(() => { el('hand-validation-msg').innerText = ''; }, 1800);
}

export const ANIMATION = {
  playHandJuice,
  animateCounter,
  spawnFloatingText,
  initCardTiltEffect,
  triggerJokerAnimation,
  flashWarning,
}