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
    let workingList = list;
    let filteredList = [];
    criteria.forEach((crit) => {
        switch (crit.type) {
            case "gn":
                workingList.forEach((word) => {
                    if (word.value[crit.index] === crit.letter) {
                        filteredList.push(word);
                    }
                });
                break;
            case "yw":
                workingList.forEach((word) => {
                    if ((word.value[crit.index] !== crit.letter) && (word.value.includes(crit.letter))) {
                        filteredList.push(word);
                    }
                });
                break;
            case "gy":
                workingList.forEach((word) => {
                    if (crit.exception && (crit.exception.length > 0)) {
                        let safe = true;
                        let hasYellow = false;
                        let greens = [];
                        crit.exception.forEach((ex) => {
                            if (ex.exceptionType === "yellow") {
                                hasYellow = true;
                            } else {
                                greens.push(ex.exceptionIndex);
                            }
                        });
                        if (!hasYellow) {
                            // if yellow, check that there are n of this letter equal to the number of exceptions
                            let count = 0;
                            for (let k = 0; k < maxDepth + 1; k++) {
                                if (word.value[k] === crit.letter) {
                                    count++;
                                }
                            }
                            if (count > crit.exception.length) {
                                safe = false;
                            }
                        } else {
                            // if all green, check that there are none of this letter outside of the greens
                            for (let k = 0; k < maxDepth + 1; k++) {
                                if (greens.includes(k)) continue;
                                if (word.value[k] === crit.letter) {
                                    safe = false;
                                }
                            }
                        }

                        if (safe) {
                            filteredList.push(word);
                        }
                        
                    } else {
                        if (!word.value.includes(crit.letter)) {
                            filteredList.push(word);
                        }
                    }
                });
                break;
            default:
                console.log("error! should never happen");
                break;
        }
        workingList = filteredList;
        filteredList = [];
    });
    return workingList;
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
    return findBestGuess(currentWordlist);
}

export const getCurrentListLength = () => {
    return currentWordlist.length;
}