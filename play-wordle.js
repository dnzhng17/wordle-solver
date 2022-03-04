import fs from "fs";
import readline from "readline-sync";
import { init, getCurrentWordlist, processGuess, processGuessWithoutSuggestion, printIcons, getCurrentListLength, findBestGuess} from "./solver.js";

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
    gameMode = readline.question("\nwordle or wardle?: ");
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
while (runMode !== "s" && runMode !== "b" && runMode !== "p") {
    runMode = readline.question("\n[s]ingle game mode, [p]arallel game mode, or [b]enchmarking mode?: ");
}

if (runMode === "s") {
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
        processGuessWithoutSuggestion(startingGuess.value, fbk);
    }
    while (!found) {
        let lastGuess = readline.question("last guess: ");
        let feedback = readline.question("last result (gn/yw/gy): ");
        
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

} else if (runMode === "p") {
    // parallel game mode
    let found = false;
    init(answerList, wordLength);
    console.log("\n-------------------------\nstarting new " + gameMode + " game!\n-------------------------");
    //console.log("\nbest starting guess: " + startingGuess.value + " (score: " + startingGuess.score + ", remaining words: " + getCurrentListLength() + ")");
    

    let numGuesses = -1;
    while (numGuesses < 1) {
        numGuesses = readline.question("\nguesses so far: ");
    }

    let oldGuesses = 0;
    while (oldGuesses < (numGuesses - 1) && !found) {
        let q = "\nguess #" + (++oldGuesses) + ": ";
        let og = readline.question(q)
        let of = readline.question("result (gn/yw/gy): ");
        processGuessWithoutSuggestion(og, of);
        let numLeft = getCurrentListLength(); 
        if (numLeft === 1) {
            found = true;
            let nextGuess = findBestGuess(getCurrentWordlist());
            console.log("\nonly one option left: " + nextGuess.value);
            
            let fbk = "";
            for (let i = 0; i < wordLength; i++) {
                fbk += "gn ";
            }
            processGuessWithoutSuggestion(nextGuess.value, fbk);
        } else {
            console.log("remaining words: " + numLeft);
        }
    }
 
    while (!found) {
        let lastGuess = readline.question("\nlast guess: ");
        let feedback = readline.question("last result (gn/yw/gy): ");
        
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
            processGuessWithoutSuggestion(nextGuess.value, fbk);
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

