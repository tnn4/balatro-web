// ============================================================
// game.js — Pure state. Zero DOM. Zero side effects.
// ============================================================

import {getHandType} from './logic.js';
import { 
  calculateHandScore,
  rankToNum } from './logic.js';
import {JOKER_TYPES} from './data/jokers.js';
import {DECK_REGISTRY} from './data/decks.js'


export const RANKS = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
export const SUITS = ['♠','♥','♦','♣'];
export const BLACK_SUITS = new Set(['♣','♠'])
export const RED_SUITS = new Set(['♥','♦']);

export const STARTING_$ = 5;
export const BASE_HANDS = 5;
export const BASE_DISCARDS = 3;
export const ANTE_SCORE_TARGETS = [100,300,800,2000,5000,11000,20000,35000,50000]
export const BLINDS   = ['Small Blind', 'Big Blind', 'Boss Blind'];
export const BLIND_MULT_LEVELS = [1, 1.5, 2]
export const BLIND_TYPES = [{name: "Small", mult: 1}, {name: "Big", mult: 1.5}, {name: "Boss", mult: 2}]

export const HAND_SIZE     = 7;

// Each object represents a row in your scoring chart
export const SCORING_TABLE = {
  'High Card': {baseChips: 5,  baseMult: 1} ,
  'Pair':            {baseChips: 10, baseMult: 2} ,
  'Two Pair':        {baseChips: 20, baseMult: 2} ,
  'Three of a Kind': {baseChips: 30, baseMult: 3} ,
  'Straight':        {baseChips: 30, baseMult: 4} ,
  'Flush':           {baseChips: 35, baseMult: 4} ,
  'Full House':      {baseChips: 40, baseMult: 4} ,
  'Four of a Kind':  {baseChips: 60, baseMult: 7} ,
  'Straight Flush':  {baseChips: 100, baseMult: 8} ,
  'Five of a Kind':  {baseChips: 120, baseMult: 12} ,
  'Flush House':     {baseChips: 140, baseMult: 14} ,
  'Flush Five':      {baseChips: 160, baseMult: 16} 
}
;

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
  // money
  $: 0,
  shopItems: [],
  currentRound: 0,
  score:        0,
  handsLeft:    BASE_HANDS,
  discardsLeft: BASE_DISCARDS,
  anteLevel:    1,
  currentBlind: "Small Blind",
  blindMult: 1,
  blindTarget: 100,
  player: {
    name: "Player 1",
    handLevels: {},
    currentChips: 0,
    currentMult: 0},
  handLevels: [],
  deck:         [],
  hand:         [],  // array of { rank, suit, id } objects
  discardPile: [],
  nextCardId:   0,
};

const G = gameState;

// ── Deck ────────────────────────────────────────────────────

export function selectDeck(deckId) {
  const deck = DECK_REGISTRY[deckId.toUpperCase()];
  if (!deck) return;

  // Apply bonuses
  G.discardsLeft += deck.bonusDiscards || 0;
  G.handsLeft += deck.bonusHands || 0;
  G.dollars += deck.starting$ || 0;

  G.activeDeck = deck;
  document.getElementById('deck-select-overlay').style.display = 'none';
}

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

/* --- Reset Functions --- */


export function resetRound(){
  console.log("Resetting round");
  const G = gameState;
  G.score.totalScore = 0;
  resetDiscardPile();
  resetDeck();
  refillHand();
  sortHandByRank();
  console.log("[Reset round]: Current hand state:", G.hand);
  G.handsLeft = 5;
  G.roundsLeft = 3;
}

export function resetDeck(){
  G.deck = buildShuffledDeck();
}

export function resetDiscardPile(){
  G.discardPile = [];
}

/* ---------- */

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
  gameState.activeJokers = [JOKER_TYPES.MULT_2X];
  gameState.$ = STARTING_$;
  gameState.handsLeft    = BASE_HANDS;
  gameState.discardsLeft = BASE_DISCARDS;
  gameState.currentBlind = BLINDS[0],
  gameState.blindMult    = BLIND_MULT_LEVELS[0],
  G.blindTarget = 300,
  G.player.handLevels = structuredClone(SCORING_TABLE);
  gameState.handLevels =    {
      "High Card": {level: 1, currentChips: SCORING_TABLE['High Card'].baseChips, currentMult: SCORING_TABLE['High Card'].baseMult },
      "Pair": { level: 1, currentChips: SCORING_TABLE['Pair'].baseChips, currentMult: SCORING_TABLE['Pair'].baseMult },
      "Two Pair": { level: 1, currentChips: SCORING_TABLE['Two Pair'].baseChips, currentMult: SCORING_TABLE['Two Pair'].baseMult },
      "Three of a Kind": { level: 1, currentChips: SCORING_TABLE['Three of a Kind'].baseChips, currentMult: SCORING_TABLE['Three of a Kind'].baseMult },
      "Straight": { level: 1, currentChips: SCORING_TABLE['Straight'].baseChips, currentMult: SCORING_TABLE['Straight'].baseMult },
      "Flush": { level: 1, currentChips: SCORING_TABLE['Flush'].baseChips, currentMult: SCORING_TABLE['Flush'].baseMult },
      "Full House": { level: 1, currentChips: SCORING_TABLE['Full House'].baseChips, currentMult: SCORING_TABLE['Full House'].baseMult },
      "Four of a Kind": { level: 1, currentChips: SCORING_TABLE['Four of a Kind'].baseChips, currentMult: SCORING_TABLE['Four of a Kind'].baseMult },
      "Straight Flush": { level: 1, currentChips: SCORING_TABLE['Straight Flush'].baseChips, currentMult: SCORING_TABLE['Straight Flush'].baseMult }
  },
  G.score = {
    currentChips: 0,
    currentMult: 0,
    totalScore: 0,
  }
  gameState.currentRound = 1;
  gameState.anteLevel    = 1;
  gameState.blindTarget = ANTE_SCORE_TARGETS[gameState.anteLevel] * gameState.blindMult;
  gameState.nextCardId   = 0;
  gameState.deck         = buildShuffledDeck();
  gameState.hand         = [];
  refillHand();
  sortHandByRank();
  console.log("Initialized Game");
}

/* --- Poker Hand level functions --- */
/**
 * 
 * @param {*} handType : string name of hand type, e.g. "Pair", "Straight", etc.
 * @param {*} upgradeLevels : how many levels to upgrade (default 1)
 */
export function upgradePokerHand(handType, upgradeLevels=1){
  const hand = gameState.handLevels.find(h => h.name === handType);
  if (!hand) return;

  hand.level += 1;
  for(let i=0; i < upgradeLevels; i++){
    hand.currentChips += 40; // Example: increase chips by 40 per level
    hand.currentMult += 2;   // Example: increase mult by 2 per level
  }
  const scoreData = getScoreForLevel(handType, hand.level);

}

/* --- Hand functions --- */

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
export function getSelectedCards() {
  return gameState.hand.filter(c => c.selected);
}

/** Play selected hand
 * 
 * Remove selected cards from hand, decrement handsLeft, add score, refill. */
export function playSelectedHand(handResult) {
  if (gameState.handsLeft <= 0) return false;
  const selected = getSelectedCards();
  if (selected.length === 0 || selected.length > 5) return false;

  // 1. Get hand type
  handResult = getHandType(selected);

  // 2. Calculate Chipx x Mult using logic.js helper
  const scoreData = calculateHandScore(G, handResult.name, selected);


  G.score.totalScore      += scoreData.totalChips * scoreData.totalMult;
  gameState.handsLeft  -= 1;
  gameState.hand        = gameState.hand.filter(c => !c.selected);

  refillHand();
  sortHandByRank();

  return scoreData.finalScore;
}

/** Discard hand
 * 
 * Remove selected cards from hand, decrement discardsLeft, refill. */
export function discardSelected() {
  if (gameState.discardsLeft <= 0) return false;
  const selected = getSelectedCards();
  if (selected.length === 0) return false;

  // Move to state's discards pile 
  selected.forEach(card => {
    gameState.discardPile.push(card);
  });

  gameState.hand           = gameState.hand.filter(c => !c.selected);
  gameState.discardsLeft  -= 1;
  refillHand();
  sortHandByRank();
  return true;
}

export function sortHandByRank() {
  G.hand.sort((a,b) => rankToNum(a.rank) - rankToNum(b.rank));
}

export function sortHandBySuit() {
  // Use a map that covers both the symbol and common full names
  const suitOrder = { 
    '♠': 0, 'S': 0, 'Spades': 0,
    '♥': 1, 'H': 1, 'Hearts': 1,
    '♦': 2, 'D': 2, 'Diamonds': 2,
    '♣': 3, 'C': 3, 'Clubs': 3 
  };

  gameState.hand.sort((a, b) => {
    console.log(`Comparing ${a.suit} and ${b.suit}`);
    const suitA = suitOrder[a.suit] ?? 99; // Default to 99 if unknown
    const suitB = suitOrder[b.suit] ?? 99;
    
    // Primary sort: Suit
    if (suitA !== suitB) return suitA - suitB;
    
    // Secondary sort: Rank (so cards of the same suit are also ordered)
    return rankToNum(a.rank) - rankToNum(b.rank);
  });
}

export function sortHandBySuit2() {
  const suitOrder = { '♠': 0, '♥': 1, '♦': 2, '♣': 3 };
  gameState.hand.sort((a, b) => suitOrder[a.suit] - suitOrder[b.suit]);
}


/* --- Progress --- */


export function advanceRound() {
  gameState.currentRound++;

    // advance the ante once past round 3 / Boss Blind
    /*
  if (gameState.currentRound % 3 === 1 & gameState.currentRound !== 0 ){
    gameState.anteLevel++;
    gameState.currentRound = 1;
  }
 */
  // Advance ante every 3 rounds
  if (G.currentRound > 3) {
    gameState.anteLevel++;
    gameState.currentRound = 1;
  }

  // Uniform state access
  const roundIdx = G.currentRound - 1;
  G.currentBlind = BLINDS[roundIdx];
  G.blindMult = BLIND_MULT_LEVELS[roundIdx];

  let targetBase = ANTE_SCORE_TARGETS[G.anteLevel - 1] * G.blindMult;
  gameState.blindTarget = targetBase * gameState.blindMult;
  
  console.log(`Round: ${gameState.currentRound}, Ante: ${gameState.anteLevel}, Target: ${gameState.blindTarget}`);

  resetRound();
  saveGame();
}

/* --- Save Game --- */

export function saveGame() {
  const saveState = JSON.stringify(G);
  localStorage.setItem('balatro_save', saveState);
  console.log("Game Saved.");
}

export function deleteSave() {
    localStorage.removeItem('balatro_save');
    console.log("Save file deleted.");
}

export function loadGame() {
  const saved = localStorage.getItem('balatro_save');
  if (saved){
    Object.assign(gameState, JSON.parse(saved));
    console.log("Game loaded");
  } else {
    console.log("No save found.")
  }
}

