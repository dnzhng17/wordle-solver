let wordlist = [];
let previousGuesses = [];
let currentCriteria = [];
let currentWordScores = [];
let currentWordlist = [];
let maxDepth = 4;

export const init = (list, length) => {
    wordlist = list;
    currentWordlist = wordlist;
    currentCriteria = [];
    previousGuesses = [];
    currentWordScores = [];
    maxDepth = length - 1;
}

const filterList = (list, criteria) => {
    return list.filter(word => {
        // Group criteria by letter for easier processing
        const letterInfo = {};
        
        // Initialize letter tracking
        for (const crit of criteria) {
            if (!letterInfo[crit.letter]) {
                letterInfo[crit.letter] = {
                    greenPositions: new Set(),
                    yellowPositions: new Set(),
                    grayPositions: new Set(),
                    minCount: 0
                };
            }
            
            if (crit.type === "gn") {
                letterInfo[crit.letter].greenPositions.add(crit.index);
                // For green, we know there's at least one
                letterInfo[crit.letter].minCount = Math.max(
                    letterInfo[crit.letter].minCount,
                    letterInfo[crit.letter].greenPositions.size
                );
            } else if (crit.type === "yw") {
                letterInfo[crit.letter].yellowPositions.add(crit.index);
                // For yellow, we know there's at least green + 1
                letterInfo[crit.letter].minCount = Math.max(
                    letterInfo[crit.letter].minCount,
                    letterInfo[crit.letter].greenPositions.size + 1
                );
            } else if (crit.type === "gy") {
                letterInfo[crit.letter].grayPositions.add(crit.index);
                // Gray doesn't increase minimum count
            }
        }
        
        // Now check each letter's requirements
        for (const letter in letterInfo) {
            const info = letterInfo[letter];
            
            // 1. All green positions must have this letter
            for (const pos of info.greenPositions) {
                if (word.value[pos] !== letter) {
                    return false;
                }
            }
            
            // 2. No yellow positions can have this letter
            for (const pos of info.yellowPositions) {
                if (word.value[pos] === letter) {
                    return false;
                }
            }
            
            // 3. Count occurrences in the word
            let occurrences = 0;
            for (let i = 0; i < word.value.length; i++) {
                if (word.value[i] === letter) {
                    occurrences++;
                }
            }
            
            // 4. Must have at least the minimum required count
            if (occurrences < info.minCount) {
                return false;
            }
            
            // 5. If we have gray positions and no exceptions, 
            // the count must be exactly the minimum
            if (info.grayPositions.size > 0) {
                let hasException = false;
                
                // Check if any gray has exceptions
                for (const crit of criteria) {
                    if (crit.type === "gy" && crit.letter === letter && crit.exception) {
                        hasException = true;
                        break;
                    }
                }
                
                if (!hasException && occurrences > info.minCount) {
                    return false;
                }
            }
        }
        
        return true;
    });
};

export const getCurrentWordlist = () => {
    return currentWordlist;
}

const calculateScore = (word, depth, list, population) => {
    let colours = ["gn", "yw", "gy"];
    let score = 0;
    let filteredLists = [];
    let subscores = [];
    colours.forEach((colour) => {
        filteredLists.push(filterList(list, [{ type: colour, letter: word.value[depth], index: depth }]));
    });
    filteredLists.forEach((fl) => {
        subscores.push(fl.length/population);
    });
    subscores = subscores.map((ss) => ss * ss);
    score += subscores.reduce((a, b) => a + b, 0);
    if (depth < maxDepth) {
        filteredLists.forEach((fl) => {
            score += calculateScore(word, depth + 1, fl, population);
        });
    }
    return score;
};

export const findBestGuess = (filteredList) => {
    currentWordScores = [];
    let lowestScoringWord = { value: "placeholder", score: 9999999999 };
    const population = filteredList.length;

    filteredList.forEach((word) => {
        word.score = calculateScore(word, 0, filteredList, population);
        currentWordScores.push(word);
        if (word.score <= lowestScoringWord.score) {
            lowestScoringWord = word;
        }
    });

    return lowestScoringWord;
};

const resolveConflictingCriteria = (criteria) => {
    for (let i = 0; i < criteria.length; i++) {
        for (let j = i+1; j < criteria.length; j++) {
            if ((criteria[i].letter === criteria[j].letter) && (criteria[i].type !== criteria[j].type)) {
                if (criteria[i].type === "gy") {
                    if (!criteria[i].exception) criteria[i].exception = [];
                    criteria[i].exception.push({
                        "exceptionIndex": j,
                        "exceptionType": criteria[j].type
                    });
                }
                if (criteria[j].type === "gy") {
                    if (!criteria[j].exception) criteria[j].exception = [];
                    criteria[j].exception.push({
                        "exceptionIndex": i,
                        "exceptionType": criteria[i].type
                    });
                }
            }
        }
    }
    return criteria;
}

export const printIcons = () => {
    let iconString = "\n";
    for (let i = 0; i < currentCriteria.length; i++) {
        switch (currentCriteria[i].type) {
            case "gn":
                iconString += "\x1b[42m\x1b[37m " + currentCriteria[i].letter + " \x1b[0m";
                break;
            case "yw":
                iconString += "\x1b[43m\x1b[30m " + currentCriteria[i].letter + " \x1b[0m";
                break;
            case "gy":
                iconString += "\x1b[100m\x1b[37m " + currentCriteria[i].letter + " \x1b[0m";
                break;
            default:
                break;
        }
        if (i % (maxDepth + 1) === maxDepth) {
            iconString += "\n";
        }
    }
    console.log(iconString);
};

export const processGuess = (guess, feedback) => {
    processGuessWithoutSuggestion(guess, feedback);
    return findBestGuess(currentWordlist);
}

export const processGuessWithoutSuggestion = (guess, feedback) => {
    let splitFeedback = feedback.split(" ");
    previousGuesses.push(guess);

    let newCriteria = [];
    for (let i = 0; i < maxDepth + 1; i++) {
        newCriteria.push({
            type: splitFeedback[i], 
            letter: guess[i], 
            index: i
        });
    }
    newCriteria = resolveConflictingCriteria(newCriteria);
    currentCriteria = currentCriteria.concat(newCriteria);
    // console.log(currentCriteria);
    currentWordlist = filterList(currentWordlist, currentCriteria);
}

export const getCurrentListLength = () => {
    return currentWordlist.length;
}