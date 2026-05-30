// ============================================================
// logic.js — Pure functions only. No DOM. No gameState.
// ============================================================

import {SCORING_TABLE} from './game.js';
import {JOKER_TYPES} from './data/jokers.js';
import {failQuotes} from './data/quotes.js';

/** Convert rank string → sortable number */
export function rankToNum(r) {
  if (r === 'A') return 14;
  if (r === 'K') return 13;
  if (r === 'Q') return 12;
  if (r === 'J') return 11;
  return parseInt(r, 10);
}

/**
 * Evaluate a hand of card objects ({ rank, suit }).
 * Works for 1–5+ cards. Returns { name: string, bonus: number }.
 */
export function getHandType(cards) {
  if (!Array.isArray(cards) || cards.length < 1) {
    return { name: 'Invalid Hand', baseChips: 0, baseMult: 0 };
  }

  const handSize = cards.length;
  const nums     = cards.map(c => rankToNum(c.rank)).sort((a, b) => a - b);

  // Frequency map
  const freq = {};
  for (const n of nums) freq[n] = (freq[n] || 0) + 1;
  const counts = Object.values(freq).sort((a, b) => b - a);

  const hasFour    = counts[0] === 4;
  const tripleCount = counts.filter(c => c === 3).length;
  const pairCount   = counts.filter(c => c === 2).length;

  // Flush / Straight only count at 5+ cards
  const isFlush    = handSize >= 5 && cards.every(c => c.suit === cards[0].suit);
  const isStraight = handSize >= 5 && checkStraight(nums);

  let handName = 'High Card';

  if (isFlush && isStraight) handName = 'Straight Flush';
  if (hasFour) handName = 'Four of a Kind' ;
  if (tripleCount >= 2 || (tripleCount === 1 && pairCount >= 1)) handName = 'Full House' ;
  if (isFlush) handName = 'Flush' ;
  if (isStraight) handName ='Straight';
  if (tripleCount === 1) handName = 'Three of a Kind';
  if (pairCount >= 2) handName = 'Two Pair';
  if (pairCount === 1) handName = 'Pair';

  const tableEntry = SCORING_TABLE[handName];

  return{
    name: handName,
    baseChips: tableEntry.baseChips,
    baseMult: tableEntry.baseMult
  }
}

function checkStraight(sortedNums) {
  const seq = sortedNums.every((v, i) => i === 0 || v === sortedNums[i - 1] + 1);
  if (seq) return true;
  // Ace-low wheel: A-2-3-4-5
  if (sortedNums.length === 5) {
    const wheel = [2, 3, 4, 5, 14];
    return sortedNums.every((v, i) => v === wheel[i]);
  }
  return false;
}

export function calculateHandScore(G, handName, cards, activeJokers = [], onJokerTrigger = null) {
  // 1. Get Base Values (Level + Cards)
  console.log(`BUG: handName = ${handName}`)
  const handData = G.handLevels[handName] || { currentChips: 0, currentMult: 0 };
  
  // Calculate card-specific chip values (e.g., Ace=11, Face=10, others=rank)
  const cardChips = cards.reduce((sum, c) => sum + rankToNum(c.rank), 0);
  
  // The "Frozen" state before Jokers intervene
  let scoreData = {
    totalChips: handData.currentChips + cardChips,
    totalMult: handData.currentMult
  };

  // 2. The Modifier Pipeline
  activeJokers.forEach(joker => {
    // Keep a snapshot to detect what changed
    const snapshot = { ...scoreData };

    if (typeof joker.apply === 'function') {
      joker.apply(scoreData);
    }

    // 3. Robust Trigger Notification
    if (onJokerTrigger) {
      const chipDiff = scoreData.totalChips - snapshot.totalChips;
      const multDiff = scoreData.totalMult - snapshot.totalMult;
      
      if (chipDiff !== 0 || multDiff !== 0) {
        const message = chipDiff !== 0 ? `+${chipDiff} Chips` : `+${multDiff} Mult`;
        onJokerTrigger(joker.id, message);
      }
    }
  });

  // Final multiplication
  scoreData.finalScore = scoreData.totalChips * scoreData.totalMult;
  return scoreData;
}

// score should be calculated on current player's hand
export function calculateHandScoreDep(G, handName, cards, activeJokers = [], onJokerTrigger = null) {
  const handData = G.handLevels[handName] || { baseChips: 0, baseMult: 0 };
    
  // Initial state
  let scoreData = {
    totalChips: handData.baseChips + cards.reduce( (sum,c) => sum + rankToNum(c.rank),0),
    totalMult: handData.baseMult
  };

  // 2. The Scalable Pipeline: Apply Jokers left-to-right
  // activeJokers should be an array of objects: { name: string, apply: fn(scoreData) }
  activeJokers.forEach( joker => {
    const before = {chips: scoreData.totalChips, mult: scoreData.totalMult};

    if (typeof joker.apply === 'function'){
      joker.apply(scoreData);
    }

    // Notify the UI of the trigger
    const bonus = (scoreData.totalChips > before.chips)
      ? `${scoreData.totalChips - before.chips} Chips`
      :`${scoreData.totalMult - before.mult} Mult`

    if (onJokerTrigger) onJokerTrigger(joker.id, bonus);
  });

  scoreData.finalScore = scoreData.totalChips * scoreData.totalMult;

  return scoreData;
}

export function formatScore(num) {
    // Convert BigInt to Number for formatting
    const val = Number(num);
    
    if (val < 1_000_000) return val.toString(); // Keep small numbers exact
    
    // Use standard Intl.NumberFormat for clean "scientific" or "compact" notation
    return new Intl.NumberFormat('en-US', {
        notation: "compact",
        compactDisplay: "short",
        maximumFractionDigits: 2
    }).format(val);
}