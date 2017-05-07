/**@module Chain*/
const cb = require('./CommandBlock.js');
const runner = require('./JsRunner.js');
const chain = require('./Chain.js');
const procedure = require('./Procedure.js');
const CommandModule = require('./CommandModule.js');
const trans = require('./Translate.js');
const options = require('./options.json');

let chains = [];

function getLastChain() {
    return chains[chains.length - 1];
}
function addChain(c) {
    chains.push(c);
}
function chainsLength() {
    return chains.length;
}

class Chain {

    /**
     * constructor
     *
     * @param  {type} coor                     initial coordinate of the chain
     * @param  {type} direction                direction of the chain(will be inversed when wrapping)
     * @param  {type} loop                     If the chain will be folded into a loop
     * @param  {type} wrapDirection            Wrapping direction of the chain
     * @param  {type} wrapCount                Number of command blocks in one row before wrapping(0 for no wrap)
     */
    constructor(coor, direction = cb.EAST, loop = false, wrapDirection = cb.NORTH, wrapCount = 0) {
        this.coor = coor;
        this.direction = direction;
        this.loop = loop;
        this.wrapDirection = wrapDirection;
        this.wrapCount = wrapCount;
        this.elements = [];
        //command blocks
        this.cbs = [];
        this.count = 0;
    }

    addElement(element) {
        this.elements.push(element);
    }

    /**
     * getLines - Generator, yield one line per call
     * @return {Line} line
     */
    *getLines() {
        for (let l of this.elements) {
            if (l instanceof CommandModule.CommandModule) {
                l.parse();
                for (let l1 of l.getLines())
                    yield l1;
            } else if (l instanceof Chain) {
                l.parseCommands();
                continue;
            } else if (l instanceof procedure.Procedure) {
                l.saveToFile(options.out);
                continue;
            } else {
                yield l;
            }
        }
    }

    parseCommands() {
        let noOfCb = 0;
        if (this.loop) {
            for (let l of this.elements) {
                if (l instanceof CommandModule.CommandModule) {
                    for (let l1 of l.getNumberOfCommands())
                        noOfCb += l1;
                } else if (l instanceof chain.Chain) {
                    continue;
                } else if (l instanceof procedure.Procedure) {
                    continue;
                } else {
                    if (l.content.startsWith('@'))
                        continue;
                    noOfCb += 1;
                }
            }

            this.wrapCount = Math.floor((noOfCb+1) / 2);
        }
        for (let l of this.getLines()) {
            let [x, y, z] = this.cbs.length > 0? this.cbs[this.cbs.length-1].getNextCoor() : this.coor;
            runner.scope.CurrentCoor = {x: x, y: y, z: z};

            let tempDir = this.direction;
            if (this.wrapCount > 0) {
                this.count++;
                if (this.count == this.wrapCount) {
                    tempDir = this.wrapDirection;
                    this.count = 0;
                    this.direction = cb.reverseDirection(this.direction);
                }
            }

            if (l.content.startsWith("@")) {
                let spaceIndex = l.content.indexOf(' ');
                let name = '', content = '';
                if (spaceIndex > -1) {
                    name = l.content.substring(0, spaceIndex);
                    content = l.content.substring(spaceIndex+1);
                } else {
                    name = l.content;
                }
                name = name.substring(1);
                if (Object.keys(runner.scope.Annotations).indexOf(name) == -1) {
                    throw new Error(trans.translate("NoAnnotation", name, l.lineNum));
                }
                try {
                    runner.scope.Annotations[name](content);
                } catch (err) {
                    throw new Error(trans.translate("RunAnnotation", l.lineNum, err));
                }
            } else {
                this.cbs.push(cb.CommandBlock.getCommandBlock(l.content, l.lineNum, [x, y, z], tempDir, this.loop));
            }
        }
        if (this.loop) {
            if (noOfCb % 2 == 1) {
                this.cbs.push(cb.CommandBlock.getCommandBlock("", "NA", this.cbs[this.cbs.length - 1].getNextCoor(), cb.reverseDirection(this.wrapDirection), true));
            } else {
                this.cbs[this.cbs.length - 1].facing = cb.reverseDirection(this.wrapDirection);
            }
        }

        for (let c of this.cbs) {
            runner.scope.ComamndBlockCommands.push(c.getCommand());
        }
    }

}

exports.Chain = Chain;
exports.getLastChain = getLastChain;
exports.addChain = addChain;
exports.chainsLength = chainsLength;
