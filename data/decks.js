export const DECK_REGISTRY = {
    RED: {
        id: 'red',
        name: 'Red Deck',
        bonusDiscards: 1,
        bonusHands: 0,
        backColor: '#cc2200'
    },
    BLUE: {
        id: 'blue',
        name: 'Blue Deck',
        bonusDiscards: 0,
        bonusHands: 1,
        backColor: '#2563eb'
    },
    // Adding a new deck is now trivial:
    YELLOW: {
        id: 'yellow',
        name: 'Yellow Deck',
        bonusDiscards: 0,
        bonusHands: 0,
        startingDollars: 10,
        backColor: '#f5c842'
    }
};