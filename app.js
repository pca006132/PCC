#!/usr/bin/env node

const fs = require('fs');
const options = require('./options.json');
const runner = require('./JsRunner.js');
const parser = require('./Parser.js');
const procedure = require('./Procedure.js');
const CommandModule = require('./CommandModule.js');

function mkdirSync(dirPath) {
    try {
        fs.mkdirSync(dirPath);
    } catch (err) {
        if (err.code !== 'EEXIST') throw err;
    }
}

function initializeDirectory() {
    //ensure all things are good to go
    //sadly we have to use sync

    //ensure the output folders are here
    mkdirSync(`./${options.out}`);
}

initializeDirectory();

let args = process.argv.slice(2);
if (args.length == 0) {
    console.log("Parameters: (* indicates required)");
    console.log("*1: PCC file name");
    console.log(" others: module names(if absent, parse all modules. If present, parse only those modules)");
    process.exit();
}
let fileName = args[0];
if (args.length > 1) {
    CommandModule.setWhiteList(args.slice(1));
}


fs.readFile(fileName, "utf8", (err, data) =>{
    if (err)
        throw err;
    parser.parse(data);
    let p = new procedure.Procedure("pcc:test", true, false, false);
    for (let c of runner.scope.InitCommands) {
        p.addElement(new parser.Line("NA", c, 0));
    }
    for (let c of runner.scope.ComamndBlockCommands) {
        p.addElement(new parser.Line("NA", c, 0));
    }
    for (let c of runner.scope.LastCommands) {
        p.addElement(new parser.Line("NA", c, 0));
    }
    //Avoid empty advancement
    if (p.content.rewards.length > 1)
        p.saveToFile(options.out);
});
