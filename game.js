// ============================================================
// game.js — Pure state. Zero DOM. Zero side effects.
// ============================================================

export const RANKS = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
export const SUITS = ['♠','♥','♦','♣'];
export const RED_SUITS = new Set(['♥','♦']);

export const ANTE_SCORE_REQUIREMENT = [100,300,800,2000,5000,11000,20000,35000,50000]
export const BLIND_TARGETS = [100, 300, 500];
export const BLIND_NAMES   = ['Small Blind', 'Big Blind', 'Boss Blind'];
export const BLIND_LEVELS = [1, 1.5, 2]
export const BLIND_TYPES = [{name: "Small", mult: 1}, {name: "Big", mult: 1.5}, {name: "Boss", mult: 2}]

export const HAND_SIZE     = 7;

// The single source of truth. Never mutate directly — use the functions below.
export let gameState = {
  score:        0,
  handsLeft:    4,
  discardsLeft: 4,
  anteLevel:    1,   // 1 | 2 | 3
  blindType: BLIND_TYPES[0]["name"],
  blindMult: BLIND_TYPES[0]["mult"],
  blindTarget: ANTE_SCORE_REQUIREMENT[anteLevel] * blindMult,
  deck:         [],
  hand:         [],  // array of { rank, suit, id } objects
  nextCardId:   0,
};

// ── Deck ────────────────────────────────────────────────────

export function buildShuffledDeck() {
  const deck = [];
  for (const suit of SUITS)
    for (const rank of RANKS)
      deck.push({ rank, suit });

  // Fisher-Yates
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

// ── Card factory ─────────────────────────────────────────────

function makeCard(state, { rank, suit }) {
  const id = state.nextCardId++;
  return { rank, suit, id, selected: false };
}

// ── State transitions (pure-ish — they mutate gameState in place,
//    which is fine for a small game; no framework needed) ─────

export function initGame() {
  gameState.score        = 0;
  gameState.handsLeft    = 4;
  gameState.discardsLeft = 4;
  gameState.blindType = BLIND_TYPES[0]["name"],
  gameState.blindMult = BLIND_TYPES[0]["mult"],
  gameState.anteLevel    = 1;
  gameState.blindTarget = ANTE_SCORE_REQUIREMENT[gameState.anteLevel] * gameState.blindMult;
  gameState.nextCardId   = 0;
  gameState.deck         = buildShuffledDeck();
  gameState.hand         = [];
  refillHand();
}

/** Draw cards from deck until hand has HAND_SIZE cards. */
export function refillHand() {
  while (gameState.hand.length < HAND_SIZE && gameState.deck.length > 0) {
    const drawn = gameState.deck.pop();
    gameState.hand.push(makeCard(gameState, drawn));
  }
}

/** Toggle selected state on a card by id. */
export function toggleCardSelected(cardId) {
  const card = gameState.hand.find(c => c.id === cardId);
  if (card) card.selected = !card.selected;
}

/** Returns selected cards array. */
export function getSelected() {
  return gameState.hand.filter(c => c.selected);
}

/** Remove selected cards from hand, decrement handsLeft, add score, refill. */
export function playSelectedHand(handResult) {
  if (gameState.handsLeft <= 0) return false;
  const selected = getSelected();
  if (selected.length === 0 || selected.length > 5) return false;

  const points = (selected.length * 10) + handResult.bonus;
  gameState.score      += points;
  gameState.handsLeft  -= 1;
  gameState.hand        = gameState.hand.filter(c => !c.selected);

  refillHand();
  checkBlindProgress();
  return points;
}

/** Remove selected cards from hand, decrement discardsLeft, refill. */
export function discardSelected() {
  if (gameState.discardsLeft <= 0) return false;
  const selected = getSelected();
  if (selected.length === 0) return false;

  gameState.hand           = gameState.hand.filter(c => !c.selected);
  gameState.discardsLeft  -= 1;
  refillHand();
  return true;
}

/** Returns { cleared: bool, won: bool } */
export function checkBlindProgress() {
  const target = BLIND_TARGETS[gameState.anteLevel - 1];
  if (gameState.score < target) return { cleared: false, won: false };

  if (gameState.anteLevel >= 3) return { cleared: true, won: true };

  gameState.anteLevel++;
  gameState.handsLeft    = 5;
  gameState.discardsLeft = 3;
  return { cleared: true, won: false };
}
