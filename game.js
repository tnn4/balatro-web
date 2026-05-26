// ============================================================
// game.js — Pure state. Zero DOM. Zero side effects.
// ============================================================

import {getHandType} from './logic.js';
import { calculateHandScore } from './logic.js';


export const RANKS = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
export const SUITS = ['♠','♥','♦','♣'];
export const BLACK_SUITS = new Set(['♣','♠'])
export const RED_SUITS = new Set(['♥','♦']);

export const ANTE_SCORE_TARGETS = [100,300,800,2000,5000,11000,20000,35000,50000]
export const BLIND_SCORE_TARGETS = [100, 300, 500];
export const BLINDS   = ['Small Blind', 'Big Blind', 'Boss Blind'];
export const BLIND_MULT_LEVELS = [1, 1.5, 2]
export const BLIND_TYPES = [{name: "Small", mult: 1}, {name: "Big", mult: 1.5}, {name: "Boss", mult: 2}]

export const HAND_SIZE     = 7;

// Each object represents a row in your scoring chart
export const SCORING_TABLE = [
  { name: 'High Card',       baseChips: 5,  baseMult: 1 },
  { name: 'Pair',            baseChips: 10, baseMult: 2 },
  { name: 'Two Pair',        baseChips: 20, baseMult: 2 },
  { name: 'Three of a Kind', baseChips: 30, baseMult: 3 },
  { name: 'Straight',        baseChips: 30, baseMult: 4 },
  { name: 'Flush',           baseChips: 35, baseMult: 4 },
  { name: 'Full House',      baseChips: 40, baseMult: 4 },
  { name: 'Four of a Kind',  baseChips: 60, baseMult: 7 },
  { name: 'Straight Flush',  baseChips: 100, baseMult: 8 },
  { name: 'Five of a Kind',  baseChips: 120, baseMult: 12 },
  { name: 'Flush House',     baseChips: 140, baseMult: 14 },
  { name: 'Flush Five',      baseChips: 160, baseMult: 16 }
];

/**
 * Calculates score for a hand level (1-15).
 * Logic: chips increase by a fixed amount per level, mult increases by +1 per level.
 */
export function getScoreForLevel(handName, level) {
  const hand = SCORING_TABLE.find(h => h.name === handName);
  if (!hand) return { chips: 0, mult: 0 };

  // Adjust logic based on your specific scaling rules:
  // Example: Chips = Base + (Level - 1) * 40, Mult = Base + (Level - 1)
  const chips = hand.baseChips + (level - 1) * 40; 
  const mult  = hand.baseMult  + (level - 1);
  
  return { chips, mult };
}

// The single source of truth. Never mutate directly — use the functions below.
export let gameState = {
  currentRound: 0,
  score:        0,
  handsLeft:    4,
  discardsLeft: 4,
  anteLevel:    1,   // 1 | 2 | 3
  currentBlind: "Small Blind",
  blindMult: 1,
  blindTarget: 100,
  handLevels: [],
  deck:         [],
  hand:         [],  // array of { rank, suit, id } objects
  discardPile: [],
  nextCardId:   0,
};

// ── Deck ────────────────────────────────────────────────────

export function buildShuffledDeck() {
  const deck = [];
  for (const suit of SUITS){
    for (const rank of RANKS){
      const color = RED_SUITS.has(suit) ? '#d00': '#000';
      deck.push({ rank, suit, color });
    }
  }
    

  // Fisher-Yates
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export function resetDeck(){
  const G = gameState;
  // refill deck
  G.deck =  buildShuffledDeck();
  // reset hand
  G.hand = [];
  G.hand = refillHandFromDeck(G.Deck);
}

export function resetRound(){
  console.log("Resetting round");
  const G = gameState;

  G.Deck = buildShuffledDeck();
  refillHand();
  console.log("[Reset round]: Current hand state:", G.hand);
  G.handsLeft = 5;
  G.roundsLeft = 3;
}

function makeRed(){
  // logic.js - Inside your card creation loop
  const suit = suits[Math.floor(Math.random() * suits.length)];

  // Logic: Check if the suit is red (Hearts or Diamonds)
  // All other suits (Clubs and Spades) will default to black
  const isRed = (suit === '♥' || suit === '♦');
  const cardColor = isRed ? '#d00' : '#000'; // Red for hearts/diamonds, Black for others

  card.innerHTML = `
    <div style="position:absolute; top:5px; left:5px; font-weight:bold; color: ${cardColor};">${rank}</div>
    <div style="font-size: 30px; color: ${cardColor};">${suit}</div>
  `;
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
  gameState.currentBlind = BLINDS[0],
  gameState.blindMult = BLIND_MULT_LEVELS[0],
  gameState.handLevels =     [ 
      {"High Card": 1},{"Pair": 1},{"Two Pair": 1},
      {"Three of a Kind":1},{"Straight": 1},{"Flush": 1},
      {"Full House":1},{"Four of a Kind": 1},{"Straight Flush": 1}
    ]
  gameState.currentRound = 1;
  
  gameState.anteLevel    = 1;
  gameState.blindTarget = ANTE_SCORE_TARGETS[gameState.anteLevel] * gameState.blindMult;
  gameState.nextCardId   = 0;
  gameState.deck         = buildShuffledDeck();
  gameState.hand         = [];
  refillHand();
  console.log("Initialized Game");
}

/** Draw cards from deck until hand has HAND_SIZE cards. */
export function refillHand() {
  while (gameState.hand.length < HAND_SIZE && gameState.deck.length > 0) {
    const drawn = gameState.deck.pop();
    gameState.hand.push(makeCard(gameState, drawn));
  }
}

//** returns a list of cards */
export function refillHandFromDeck(deck) {
  let hand = [];
  const drawn = deck.pop();
  hand.push(drawn);
  return hand;
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

  // 1. Get hand type
  handResult = getHandType(selected);

  // 2. Calculate Chipx x Mult using logic.js helper
  const scoreData = calculateHandScore(handResult.name, gameState.anteLevel, selected);


  gameState.score      += scoreData.finalScore;
  gameState.handsLeft  -= 1;
  gameState.hand        = gameState.hand.filter(c => !c.selected);

  refillHand();
  checkBlindProgress();
  return scoreData.finalScore;
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
  const target = BLIND_SCORE_TARGETS[gameState.anteLevel - 1];
  if (gameState.score < target) return { cleared: false, won: false };

  
  gameState.currentRound++;

  // advance the ante once past round 3
  if (gameState.currentRound % 3 === 0 & gameState.currentRound !== 0 ){
    gameState.anteLevel++;
    gameState.currentRound = 1;
  }
  
  resetRound();
  return { cleared: true, won: false };
}

export function advanceRound() {
  gameState.currentRound++;
    // advance the ante once past round 3 / Boss Blind
  if (gameState.currentRound % 3 === 1 & gameState.currentRound !== 0 ){
    gameState.anteLevel++;
    
    gameState.currentRound = 1;
  }
  console.log(`[advanceRound] ante-level=${gameState.anteLevel}`)
  gameState.currentBlind = BLINDS[gameState.currentRound - 1];
  gameState.blindTarget = ANTE_SCORE_TARGETS[gameState.anteLevel-1];
  resetRound();
}