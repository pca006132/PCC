/**@module CommandModule*/
const chain = require('./Chain.js');
const procedure = require('./Procedure.js');
const trans = require('./Translate.js');
const runner = require('./JsRunner.js');
const options = require('./options.json');

let WhiteList = [];
function setWhiteList(list) {
    WhiteList = list;
}

/**
 * @class CommandModule
 * Store module related things
 */
class CommandModule {
    constructor(name) {
        this.name = name;
        this.AllowParse = WhiteList.length == 0;
        this.elements = [];
        if (!this.AllowParse) {
            this.AllowParse = WhiteList.indexOf(name) > -1;
        }
    }


    /**
     * addElement - Add line/another module/ to the module
     *
     * @param  {type} element description
     * @return {type}      description
     */
    addElement(element) {
        if (this.name == 'init' || this.name == 'last') {
            if (element instanceof chain.Chain || element instanceof procedure.Procedure) {
                throw new Error(trans.translate("SpecModuleElem"));
            }
        }
        this.elements.push(element);
    }

    /**
     * getLines - Generator, yield one line per call
     * @return {Line} line
     */
    *getLines() {
        if (!this.AllowParse)
            return;
        for (let l of this.elements) {
            if (l instanceof CommandModule) {
                for (let l1 of l.getLines())
                    yield l1;
            } else if (l instanceof chain.Chain) {
                continue;
            } else if (l instanceof procedure.Procedure) {
                continue;
            } else {
                yield l;
            }
        }
    }


    /**
     * parse - parse init/last/chain/procedures inside
     */
    parse() {
        if (!this.AllowParse)
            return;

        if (this.name == "init") {
            for (let l of this.getLines()) {
                runner.scope.InitCommands.push(runner.parseCommand(l.content));
            }
        } else if (this.name == "last") {
            for (let l of this.getLines()) {
                runner.scope.LastCommands.push(runner.parseCommand(l.content));
            }
        } else {
            for (let l of this.elements) {
                if (l instanceof CommandModule) {
                    l.parse();
                } else if (l instanceof chain.Chain) {
                    l.parseCommands();
                } else if (l instanceof procedure.Procedure) {
                    l.saveToFile(options.out);
                }
            }
        }
    }

    /**
     * getNumberOfCommands - get the number of command (excluding annotations) of the module
     *
     * @return {number} number of commands
     */
    getNumberOfCommands() {
        if (!this.AllowParse)
            return 0;
        let sum = 0;
        for (let l of this.elements) {
            if (l instanceof CommandModule) {
                for (let l1 of l.getNumberOfCommands())
                    sum += l1;
            } else if (l instanceof chain.Chain) {
                continue;
            } else if (l instanceof procedure.Procedure) {
                continue;
            } else {
                if (l.content.startsWith('@'))
                    continue;
                sum += 1;
            }
        }
        return sum;
    }
}

exports.setWhiteList = setWhiteList;
exports.CommandModule = CommandModule;
