// ============================================================
// game.js — Pure state. Zero DOM. Zero side effects.
// ============================================================

import {CONST} from './data/constants.js';
import {getHandType} from '../controller/logic.js';
import { 
  calculateHandScore,
  rankToNum } from '../controller/logic.js';
import {JOKER_TYPES} from './data/jokers.js';
import {DECK_REGISTRY} from './data/decks.js'
import {EVENT} from '../controller/observer/events.js';

// TODO:THis should not be here but we need to fix other things before this
// Game should just be sending out events.
import {ANIMATION} from '../view/animation.js';
import {HUD} from '../view/hud.js';
import {DOM} from '../view/dom.js';

import {UTIL} from '../util.js';

/**
 * Calculates score for a hand level (1-15).
 * Logic: chips increase by a fixed amount per level, mult increases by +1 per level.
 */
export function getScoreForLevel(handName, level) {
  const hand = CONST.SCORING_TABLE.find(h => h.name === handName);
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
  activeJokers: [],
  $: 0,
  shopItems: [],
  currentRound: 0,
  score:        0,
  handsLeft:    CONST.BASE_HANDS,
  discardsLeft: CONST.BASE_DISCARDS,
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
  gameOver: false,
};

export const G = gameState;

// ── State transitions (pure-ish — they mutate gameState in place,
//    which is fine for a small game; no framework needed) ─────

export function initGame() {
  gameState.activeJokers = [JOKER_TYPES.MULT_2X];
  gameState.$ = CONST.STARTING_$;
  gameState.handsLeft    = CONST.BASE_HANDS;
  gameState.discardsLeft = CONST.BASE_DISCARDS;
  gameState.currentBlind = CONST.BLINDS[0],
  gameState.blindMult    = CONST.BLIND_MULT_LEVELS[0],
  G.blindTarget = 300,
  G.player.handLevels = structuredClone(CONST.SCORING_TABLE);
  gameState.handLevels =    {
      "High Card": {level: 1, currentChips: CONST.SCORING_TABLE['High Card'].baseChips, currentMult: CONST.SCORING_TABLE['High Card'].baseMult },
      "Pair": { level: 1, currentChips: CONST.SCORING_TABLE['Pair'].baseChips, currentMult: CONST.SCORING_TABLE['Pair'].baseMult },
      "Two Pair": { level: 1, currentChips: CONST.SCORING_TABLE['Two Pair'].baseChips, currentMult: CONST.SCORING_TABLE['Two Pair'].baseMult },
      "Three of a Kind": { level: 1, currentChips: CONST.SCORING_TABLE['Three of a Kind'].baseChips, currentMult: CONST.SCORING_TABLE['Three of a Kind'].baseMult },
      "Straight": { level: 1, currentChips: CONST.SCORING_TABLE['Straight'].baseChips, currentMult: CONST.SCORING_TABLE['Straight'].baseMult },
      "Flush": { level: 1, currentChips: CONST.SCORING_TABLE['Flush'].baseChips, currentMult: CONST.SCORING_TABLE['Flush'].baseMult },
      "Full House": { level: 1, currentChips: CONST.SCORING_TABLE['Full House'].baseChips, currentMult: CONST.SCORING_TABLE['Full House'].baseMult },
      "Four of a Kind": { level: 1, currentChips: CONST.SCORING_TABLE['Four of a Kind'].baseChips, currentMult: CONST.SCORING_TABLE['Four of a Kind'].baseMult },
      "Straight Flush": { level: 1, currentChips: CONST.SCORING_TABLE['Straight Flush'].baseChips, currentMult: CONST.SCORING_TABLE['Straight Flush'].baseMult }
  },
  G.score = {
    currentChips: 0,
    currentMult: 0,
    totalScore: 0,
  }
  gameState.currentRound = 1;
  gameState.anteLevel    = 1;
  gameState.blindTarget = CONST.ANTE_SCORE_TARGETS[gameState.anteLevel] * gameState.blindMult;
  gameState.nextCardId   = 0;
  gameState.deck         = buildShuffledDeck();
  gameState.hand         = [];
  refillHand();
  sortHandByRank();
  console.log("Initialized Game");
  console.log(G);
}

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
  
  /*  TODO: emit deck selected event */
  EVENT.emit('DECK_SELECTED');

}

export function buildShuffledDeck() {
  const deck = [];
  for (const suit of CONST.SUITS){
    for (const rank of CONST.RANKS){
      const color = CONST.RED_SUITS.has(suit) ? '#d00': '#000';
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
  while (gameState.hand.length < CONST.HAND_SIZE && gameState.deck.length > 0) {
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
  EVENT.emit('GAME_STATE_UPDATED');
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

  EVENT.emit('HAND_PLAYED');

  return scoreData.finalScore;
}

/** Discard hand
 * 
 * Remove selected cards from hand, decrement discardsLeft, refill.
 * @returns {Array} The list of discarded cards */
export function discardSelected() {
  const discardedCards = [];
  if (gameState.discardsLeft <= 0) return false;
  const selected = getSelectedCards();
  if (selected.length === 0) return [];
  discardedCards.push(...selected);
  // Move to state's discards pile 
  selected.forEach(card => {
    gameState.discardPile.push(card);
    //G.discardPile.push(cardData);
  });

  gameState.hand           = gameState.hand.filter(c => !c.selected);
  gameState.discardsLeft  -= 1;
  refillHand();
  sortHandByRank();

  EVENT.emit('HAND_DISCARDED', discardedCards);

  return discardedCards;
}

async function handleDiscard() {
  const selected = getSelectedCards();
  if (selected.length === 0){
    flashWarning('Select cards first!');
  }

  const discardPileEl = UTIL.el('discard-pile');
  const rect = discardPileEl.getBoundingClientRect();



  discardSelected();

  EVENT.emit('HAND_DISCARDED',  selected );
  
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


// should decouple this from game logic and just trigger an event with the hand type and score, then have game.js listen for that event and update state accordingly
function handlePlayHand() {
  const selected = getSelectedCards();
  // TODO: UI needs to be decoupled from logic 
  if (selected.length === 0)  { ANIMATION.flashWarning('Select cards first!'); return; }
  if (selected.length > 5)    { ANIMATION.flashWarning('Max 5 cards!');        return; }
  if (gameState.handsLeft <= 0) return;

  const result = getHandType(selected);
  const points = playSelectedHand(result);

  if (points !== false) {
    DOM.showPopup(`${result.name}!`, `+${points} pts`, '#4ade80');
    // checkBlindResult();
    if (G.score.totalScore >= G.blindTarget){
      advanceRound();
    }
    else {
      // Show game over screen if we just failed to clear the blind and have no hands left
      if (checkGameOver()) {
        const randomFailQuote = failQuotes[Math.floor(Math.random() * failQuotes.length)]
        setTimeout(() => showHeadline("Game Over", "game-over", randomFailQuote, '#cc2200'), 200);
      }
    }
  }

  // Don't couple render(UI) to game logic
  //render();
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
  G.blindMult = CONST.BLIND_MULT_LEVELS[roundIdx];

  let targetBase = CONST.ANTE_SCORE_TARGETS[G.anteLevel - 1] * G.blindMult;
  gameState.blindTarget = targetBase * gameState.blindMult;
  
  console.log(`Round: ${gameState.currentRound}, Ante: ${gameState.anteLevel}, Target: ${gameState.blindTarget}`);

  resetRound();
  saveGame();
}

export function checkGameOver() {
  if (gameState.handsLeft === 0 && gameState.score.totalScore < gameState.blindTarget) {
    return true;
  }
  return false;
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


/* --- Handlers --- */ 
function handleAdvRound() {
  // Call advance round in game
  advanceRound();
}

function handleResetGame() {
  initGame();
  render();
  const gameOverLabel = document.getElementById("game-over");
  if (gameOverLabel){
    gameOverLabel.remove();
  }
}

function checkBlindResult() {
  const target = CONST.BLIND_SCORE_TARGETS[gameState.anteLevel - 1];
  // anteLevel was already bumped inside playSelectedHand → checkBlindProgress
  // We check if we just cleared by seeing if hands/discards were reset
  if (gameState.handsLeft === 4 && gameState.discardsLeft === 4 && gameState.score > 0) {
    const prevLevel = gameState.anteLevel - 1;
    if (prevLevel >= 1) {
      // never mix game logic with UI, so we emit an event instead of showing a popup here
      // setTimeout(() => showPopup('BLIND CLEARED!', `Next: ${BLIND_SCORE_TARGETS[gameState.anteLevel - 1]}`, '#facc15'), 600);
      // emit event for blind cleared
      // emit('blindCleared', { newLevel: gameState.anteLevel, target: BLIND_SCORE_TARGETS[gameState.anteLevel - 1] });
    }
  }
  if (CONST.BLINDS === 'Boss Blind' && gameState.score >= CONST.BLIND_SCORE_TARGETS[gameState.anteLevel -1 ]) {
    // setTimeout(() => showPopup('YOU WIN!', '🏆', '#f472b6'), 800);
    // emit('gameWon');
  }
}

/**
 * Stop calling render() inside logic functions
 * Instead, use a Proxy to automatically trigger render() whenever gameState is mutated.
 * This keeps the game logic pure and decoupled from the UI.
 * 
 * Usage:
 * Instead of directly mutating gameState, use GProxy. For example:
 * GProxy.handsLeft -= 1; // This will automatically call render()
 * 
 * This way, you don't have to remember to call render() after every state change.
 * It also keeps the game logic pure and decoupled from the UI.
 * 
 * Note: This Proxy only works for direct property assignments. If you mutate nested objects or arrays, you'll need to handle that separately.
 * For example, if you push to an array, you'll need to call render() manually after that operation.
 * 
 * Example:
 * GProxy.hand.push(newCard); // This won't trigger render() automatically
 * render(); // You need to call this manually after mutating arrays or nested objects.
 * 
 * This is a trade-off for simplicity. If you want to fully automate rendering for nested structures, 
 * you'd need a more complex solution, like using a library or implementing deep proxies.
 * 
 * For now, this Proxy will help reduce the number of render() calls you have to remember to make after simple state changes.
 * 
 * In summary:
 * - Use GProxy for direct property assignments to automatically trigger render().
 * - For nested objects or arrays, you'll still need to call render() manually after mutations.
 * - This keeps your game logic pure and decoupled from the UI, while still ensuring the UI updates correctly.
 */
const handleThenRender = {
  set(target, property, value) {
    target[property] = value;
    // Automatically trigger render on state change
    render();
    return true;
  }
};

export const GProxy = new Proxy(gameState, handleThenRender);

export const GAME = {
  getScoreForLevel,
  initGame,
  selectDeck,
  buildShuffledDeck,
  resetRound,
  resetDeck,
  resetDiscardPile,
  makeRed,
  makeCard,
  upgradePokerHand,
  refillHand,
  refillHandFromDeck,
  toggleCardSelected,
  getSelectedCards,
  playSelectedHand,
  discardSelected,
  sortHandByRank,
  sortHandBySuit,
  handlePlayHand,
  handleDiscard,
  advanceRound,
  checkGameOver,
  saveGame,
  deleteSave,
  loadGame,
  handleAdvRound,
  handleResetGame,
  checkBlindResult,
}

export const G_HANDLER = {
  handleAdvRound,
  handleDiscard,
  handlePlayHand,
  handleResetGame,
}