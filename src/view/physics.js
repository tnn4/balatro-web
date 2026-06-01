// ── Physics / wiggle drag ─────────────────────────────────────

import {UTIL} from '../util.js';

const toggle = UTIL.el('mode-toggle');
let activeCard = null, mouseX = 0, mouseY = 0;
let offset = { x: 0, y: 0 };
let phys   = { x: 0, y: 0 };
let dragStartX = 0, dragStartY = 0;
let isDragging = false;
let pendingOriginal = null;

function initPhysicsEventListeners() {
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

  window.addEventListener('mouseup', () => {
    if (activeCard) {
      activeCard.originalRef.style.opacity = '1';
      activeCard.remove();
      activeCard = null;
    }
    pendingOriginal = null;
    isDragging = false;
  });
}


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

export const PHYSICS = {
  initPhysicsEventListeners,
  physicsLoop,
}