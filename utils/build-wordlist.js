import fs from "fs";

const raw = fs.readFileSync("./utils/twl.txt").toString("utf-8");
const allWords = raw.split("\n");

for (let i = 2; i <= 15; i++) {
    const filtered = allWords.filter((word) => {
        return (word.length === i);
    });
    let contents = "[";
    for (let j = 0; j < filtered.length; j++) {
        contents += "\"" + filtered[j] + "\"";
        if (j !== filtered.length - 1) {
            contents += ", ";
        }
    }
    contents += "]";
    fs.writeFileSync("../wordlists/wordlist-" + i + ".json", contents);
}