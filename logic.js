// ============================================================
// logic.js — Pure functions only. No DOM. No gameState.
// ============================================================

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
    return { name: 'Invalid Hand', bonus: 0 };
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

  if (isFlush && isStraight)                              return { name: 'Straight Flush', bonus: 100 };
  if (hasFour)                                            return { name: 'Four of a Kind', bonus: 80  };
  if (tripleCount >= 2 || (tripleCount === 1 && pairCount >= 1))
                                                          return { name: 'Full House',     bonus: 40  };
  if (isFlush)                                            return { name: 'Flush',          bonus: 50  };
  if (isStraight)                                         return { name: 'Straight',       bonus: 70  };
  if (tripleCount === 1)                                  return { name: 'Three of a Kind',bonus: 30  };
  if (pairCount >= 2)                                     return { name: 'Two Pair',       bonus: 20  };
  if (pairCount === 1)                                    return { name: 'Pair',           bonus: 10  };

  return { name: 'High Card', bonus: 5 };
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
