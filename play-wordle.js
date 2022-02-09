import fs from "fs";
import readline from "readline-sync";
import { init, processGuess, printIcons, getCurrentListLength} from "./solver.js";

let gameMode = "";
let runMode = "";
let rawList = [];
let answerList = [];
let failures = [];
let score = 0;
let wordLength = 999;
let bestGuesses = JSON.parse(fs.readFileSync("./best-guesses.json"));

const getFeedback = (answer, guess) => {
    let feedback = "";
    let checked = [];
    for (let i = 0; i < 5; i++) {
        if (answer[i] === guess[i]) {
            feedback += "gn";
            checked.push(i);
        } else if (answer.includes(guess[i])) {
            let foundYellow = false;
            for (let j = 0; j < 5; j++) {
                if ((answer[j] === guess[i]) && !checked.includes(j) && (answer[j] !== guess[j])) {
                    feedback += "yw";
                    checked.push(j);
                    foundYellow = true;
                    break;
                }
            }
            if (!foundYellow) {
                feedback += "gy";
            }
        } else {
            feedback += "gy";
        }
        if (i !== 4) {
            feedback += " ";
        }
    }
    return feedback;
}

// select game mode
while (gameMode !== "wordle" && gameMode !== "wardle") {
    gameMode = readline.question("\nwordle or wardle? (wordle/wardle): ");
}

// init based on game mode
let startingGuess = "";
if (gameMode === "wardle") {
    // wardle setup
    while (wordLength < 2 || wordLength > 15 || isNaN(wordLength)) {
        wordLength = readline.question("\nwardle length (2-15): ");
    }
    rawList = JSON.parse(fs.readFileSync("./wordlists/wordlist-" + wordLength+ ".json"));
    startingGuess = bestGuesses.wardle[wordLength-2];
} else {
    // wordle setup
    wordLength = 5;
    rawList = JSON.parse(fs.readFileSync("./wordlists/wordlist-wordle.json"));
    startingGuess = bestGuesses.wordle;
}

// build list of possible answers
rawList.forEach((wordValue) => {
    answerList.push({ value: wordValue });
});

// selecting run mode
while (runMode !== "single" && runMode !== "benchmark") {
    runMode = readline.question("\nsingle game mode or benchmarking mode? (single/benchmark): ");
}

if (runMode === "single") {
    // single game mode
    let found = false;
    init(answerList, wordLength);
    console.log("\n-------------------------\nstarting new " + gameMode + " game!\n-------------------------");
    console.log("\nbest starting guess: " + startingGuess.value + " (score: " + startingGuess.score + ", remaining words: " + getCurrentListLength() + ")");
    
    let didFind = readline.question("did you find it? (y/n): ");
    if (didFind === "y") {
        found = true;
        let fbk = "";
        for (let i = 0; i < wordLength; i++) {
            fbk += "gn ";
        }
        processGuess(startingGuess.value, fbk);
    }
    while (!found) {
        let lastGuess = readline.question("type in last guess: ");
        let feedback = readline.question("type in last result (gn/yw/gy): ");
        
        let nextGuess = processGuess(lastGuess, feedback);
        printIcons();
        console.log("next best guess: " + nextGuess.value + " (score: " + nextGuess.score + ", remaining words: " + getCurrentListLength() + ")");
        
        let didFind = readline.question("did you find it? (y/n): ");
        if (didFind === "y") {
            found = true;
            let fbk = "";
            for (let i = 0; i < wordLength; i++) {
                fbk += "gn ";
            }
            processGuess(nextGuess.value, fbk);
        }
    }

    printIcons();
    console.log("woohoo!");

} else {
    // benchmarking mode
    let verbosity = "";
    while (verbosity !== "full" && verbosity !== "light" && verbosity !== "none") {
        verbosity = readline.question("\nverbosity level? (full/light/none): ")
    }

    console.log("\nstarting simulations...");
    for (let i = 0; i < answerList.length; i++) {
        init(answerList, wordLength);
        const currentAnswer = answerList[i].value;
        let currentGuess = startingGuess.value; // precomputed best guesses based on our model
        let tries = 1;
        
        while ((currentGuess !== currentAnswer) && (currentGuess !== "placeholder")) {
            let feedback = getFeedback(currentAnswer, currentGuess);
            currentGuess = processGuess(currentGuess, feedback).value;
            tries++;
        }
    
        score += tries;
    
        if (currentGuess === "placeholder") {
            console.log("error!!!!");
        } else {
            if (verbosity === "full" && tries < 7) {
                console.log("game " + (i+1) + " won in " + tries + " tries");
            }
            if (verbosity === "light" && ((i+1) % 100 === 0)) {
                console.log("completed " + (i+1) + " of " + answerList.length);
            }
            if (tries > 6) {
                failures.push({
                    "answer": currentAnswer,
                    "tries": tries
                });
                if (verbosity !== "none") {
                    console.log("failed on game " + (i+1) + " (" + currentAnswer + ") with " + tries + " tries");
                }
            }
        }
    }
    let failureString = "";
    failures.forEach((entry) => {
        failureString += entry.answer + " (" + entry.tries + " tries)\n";
    });
    console.log("\nfinished testing all words!");
    console.log("\nfailed words: " + failures.length + "\n" + failureString);
    console.log("average tries: " + score/answerList.length + "\n");
}

