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
  'High Card':       {baseChips: 5,  baseMult: 1} ,
  'Pair':            {baseChips: 10, baseMult: 2} ,
  'Two Pair':        {baseChips: 20, baseMult: 2} ,
  'Three of a Kind': {baseChips: 30, baseMult: 3} ,
  'Straight':        {baseChips: 30, baseMult: 4} ,
  'Flush':           {baseChips: 35, baseMult: 4} ,
  'Full House':      {baseChips: 40, baseMult: 4} ,
  'Four of a Kind':  {baseChips: 60, baseMult: 7} ,
  'Straight Flush':  {baseChips: 100, baseMult: 8} ,
};

export const CONST = {
    RANKS,
    SUITS,
    BLACK_SUITS,
    RED_SUITS,
    SCORING_TABLE,

    STARTING_$,

    HAND_SIZE,
    BASE_HANDS,
    BASE_DISCARDS,

    ANTE_SCORE_TARGETS,
    BLINDS,
    BLIND_MULT_LEVELS,
    BLIND_TYPES,
    
}