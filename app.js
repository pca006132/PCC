const fs = require('fs');
const options = require('./options.json');
const cb = require('./CommandBlock.js');

function mkdirSync(dirPath) {
    try {
        fs.mkdirSync(dirPath)
    } catch (err) {
        if (err.code !== 'EEXIST') throw err
    }
}

function initializeDirectory() {
    //ensure all things are good to go
    //sadly we have to use sync

    //ensure the output folders are here
    mkdirSync('./out');
    mkdirSync(`./out/${options.namespace}`);
}

c = new cb.CommandBlock("say hi", "1", [1, 2, 3]);

console.log(c.getCommand());
