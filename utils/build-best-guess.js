import fs from "fs";
import { init, findBestGuess } from "../solver.js";

let guesses = {
    "wardle": [],
    "wordle": ""
};

// build wardle guesses
for (let i = 2; i <= 15; i++) {
    const rawList = JSON.parse(fs.readFileSync("../wordlists/wordlist-" + i + ".json"));
    let wordList = [];
    rawList.forEach((wordValue) => {
        wordList.push({ value: wordValue });
    });

    init(wordList, i);
    console.log("finding best " + i + "-length wardle guess");
    guesses.wardle.push(findBestGuess(wordList));
}

// build classic wordle guess
const rawList = JSON.parse(fs.readFileSync("../wordlists/wordlist-wordle.json"));
let wordList = [];
rawList.forEach((wordValue) => {
    wordList.push({ value: wordValue });
});

init(wordList, 5);
console.log("finding best classic wordle guess");
guesses.wordle = findBestGuess(wordList);

fs.writeFileSync("../best-guesses.json", JSON.stringify(guesses));
console.log("finished generating best guesses");