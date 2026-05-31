export const JOKER_TYPES = {
    MULT_2X: {
        name: "Double Joker",
        apply: (scoreData) => {
            scoreData.mult *= 2;
        }
    },
    FLAT_CHIPS_20:{
        name: "Chip Joker",
        apply: (scoreData) => {
            scoreData.chips += 20;
        }
    }
};