/** Houses the juice of the logic ( triggerAnimationJoker, floating text, async scoring) */

import {el} from '../util.js';
import {DOM} from '../view/dom.js';

/*
Instead of calculating the total and setting the score in one line,
you must break calculateHandScore into a generator or an async function that awaits animations
*/
// ── Juice ────────────────────────────────────────────────
async function playHandAnimation(cards, jokers) {
  let currentTotal = 0;

  console.log('[playHandAnimation] Playing hand animation for cards:', cards, 'and jokers:', jokers);
  cards.filter( (card) => {
    if (!card) {
      console.warn('playHandAnimation received invalid card:', card);
      return false; // Filter out invalid cards
    }
  })

  for(const card of cards) {
    // 1. Highlight the current card being scored
    const cardEl = document.querySelector(`[data-id="${card.id}"]`);
    cardEl.classList.add('scoring-pulse');

    // 2. Calculate individual card value
    const cardChips = card.rankValue;
    currentTotal += cardChips;

    // 3. Spawning the floating +N text over the card
    spawnFloatingText(cardEl,`+${cardChips}`, 'var(--blue)');

    // 4. Update the chip counter gradually
    await animateCounter('chips-display', currentTotal, 300);

    cardEl.classList.remove('scoring-pulse');
    await new Promise(r => setTimeout(r,2000) ); // the balatro pause
  }

  // 5. Trigger Mult animation after chips are done
  await triggerMultJuice(jokers)
}

async function triggerMultJuice(jokers) {
  console.log('Triggering Mult Juice for jokers:', jokers);
  for(const joker of jokers) {
    await triggerJokerAnimation(joker.id, `x${joker.multiplier}`);
    await animateCounter('mult-display', G.score.totalMult, 300);
  }
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
    requestAnimationFrame(update);
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

async function triggerJokerAnimation(jokerId, bonusText){
  const jokerEl = document.querySelector(`[data-joker-id="${jokerId}"]`);
  if (!jokerEl) return;

  // Shake and scale
  await jokerEl.animate([
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

/** Helper function for animation sequence of each card
 * Ideally, the game logic should just emit an event with the list of discarded cards, 
 * and the view layer should listen for that event and trigger this animation function, 
 * which takes care of the visual effects without any direct coupling to the game logic.
 * 
 */
async function moveCardsAnimation(selectedCards){
  //console.log( "[moveCardsAnimation] typeof: " + typeof selectedCards);
  //console.log( "[moveCardsAnimation] isArray: " + Array.isArray(selectedCards));
  
  // 1. Get the target element (the discard pile)
  const discardPile = document.getElementById('discard-pile');
  
  // 2. Define targetRect locally so it is available in this scope
  // If the pile doesn't exist, default to 0,0 to prevent a crash
  const targetRect = discardPile ? discardPile.getBoundingClientRect() : { left: 0, top: 0 };

  // Validate and filter out bad data immediately
  const validAnimations = selectedCards.filter(item => {
    return item && item.cardData && item.element;
  });

  if (selectedCards.length === 0){
    console.warn('moveCardsAnimation called with empty card list');
    return;
  }
  
// Map only the validated items
  const animations = validAnimations.map(({ cardData, element }) => {
    const startRect = element.getBoundingClientRect();
    element.style.opacity = '0'; 
    return { cardData, startRect };
  });

  // console.log(`animations = ${JSON.stringify(animations)}`);
  
  await new Promise(resolve => requestAnimationFrame(resolve));

  // Animation sequence for each card
  for (const {cardData, startRect} of animations){

    // console.log('[moveCardsAnimation]cardData = ', cardData);


    // Create a clone for the "flight"
    const flyCard = DOM.buildCardEl(cardData);

    // Add this guard
    if (!flyCard) {
        console.error('[moveCardsAnimation] Failed to build card for:', cardData);
        continue; // Skip this card instead of crashing
    }

    flyCard.style.position = 'fixed';
    flyCard.style.opacity = '1'; // Force visible
    flyCard.style.visibility = 'visible'; // Force visible
    flyCard.style.left = startRect.left + 'px';
    flyCard.style.top = startRect.top + 'px';
    flyCard.style.zIndex = '1000';
    document.body.appendChild(flyCard);

    await flyCard.animate([
      { transform: 'scale(1) rotate(0deg)'},
      {left: targetRect.left + 'px', top: targetRect.top + 'px', transform: 'scale(0.2) rotate(360deg)'},
    ], { duration: 100, easing: 'ease-in-out'}).finished;

    flyCard.remove();
  }

}

export const ANIMATION = {
  playHandAnimation,
  animateCounter,
  spawnFloatingText,
  initCardTiltEffect,
  triggerJokerAnimation,
  flashWarning,
  moveCardsAnimation,
}