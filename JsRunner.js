/** @module JsRunner*/

const vm = require('vm');
const http = require('http');
const https = require('https');
const fs = require('fs');
const trans = require('./Translate.js');
const options = require('./options.json');

//vm on this scope
let scope = {};
resetScope();

let context = new vm.createContext(scope);


/**
 * resetScope - Reset Scope, cancel all the effect of running js.
 * Used for parsing new files
 */
function resetScope() {
    scope = {
        CustomCommands: {
            call: function (n) {
                if (n.startsWith("this"))
                    n = this.parent.CurrentAdvancement.namespace + ":" + this.parent.CurrentAdvancement.name + n.substring(5);
                n = n.toLowerCase();
                if (n.indexOf(":") == -1) //No namespace
                    n = options.namespace + ":" + n;
                return `advancement grant @s only ${n}`;
            },
            remove: function(n) {
                if (n.startsWith("this"))
                    n = this.parent.CurrentAdvancement.namespace + ":" + this.parent.CurrentAdvancement.name + n.substring(5);
                n = n.toLowerCase();
                if (n.indexOf(":") == -1) //No namespace
                    n = options.namespace + ":" + n;
                return `advancement revoke @s only ${n}`;
            }
        },
        Annotations: {
            label: function (n) {
                if (Object.keys(this.parent.Labels).indexOf(n) != -1) {
                    throw new Error(trans.translate("DuplicateLabel", n));
                }
                let coor = this.parent.CurrentCoor;
                this.parent.Labels[n] = {x: coor.x, y: coor.y, z: coor.z} ;
            },
            mark: function (n) {
                let parts = n.split(' ');
                let name = parts[0];
                let tags = parts.length > 1? parts.slice(1) : [];
                this.parent.InitCommands.push(`summon area_effect_cloud ~${this.parent.CurrentCoor.x} ~${this.parent.CurrentCoor.y} ~${this.parent.CurrentCoor.z}`+
                    ` {CustomName:${name},Duration:2147483647,Tags:[${tags.join(',')}]}`);
            },
            stats: function (n) {
                let parts = n.split(' ');
                if (parts.length != 3) {
                    throw new Error(trans.translate("StatsPara"));
                }
                let stat = parts[0];
                let player = parts[1];
                let obj = parts[2];

                this.parent.LastCommands.push(`scoreboard players set ${player} ${obj} 0`);
                this.parent.LastCommands.push(`stats block  ~${this.parent.CurrentCoor.x} ~${this.parent.CurrentCoor.y} ~${this.parent.CurrentCoor.z} set ${stat} ${player} ${obj}`);
            }

        },
        InitCommands: [

        ],
        ComamndBlockCommands: [

        ],
        LastCommands: [

        ],
        Labels: {

        },
        CurrentCoor: {
            x: 0,
            y: 2,
            z: 0
        },
        CurrentAdvancement: {

        }
    };

    scope.Annotations.parent = scope;
    scope.CustomCommands.parent = scope;
    scope.Annotations.console = console;
    scope.CustomCommands.console = console;
}


/**
 * evaluate - Evaluate scripts/expression
 *
 * @param  {string} expression
 */
function evaluate(expression) {
    let script = new vm.Script(expression);
    return script.runInContext(context);
}


/**
 * loadFile - Load text file and run it as JavaScript. Support http, https and on disk file
 *
 * @param  {string} path file path. For http or https, please start with http:// or https://
 */
function loadFile(path) {
    if (path.startsWith("http://")) {
        http.get(path, response => {
            let data = [];
            response.setEncoding('utf8');
            response.on('data', (chunk) => data.push(chunk));
            response.on('end', () => evaluate(data.join('')));
        });
    } else if (path.startsWith("https://")) {
        https.get(path, response => {
            let data = [];
            response.setEncoding('utf8');
            response.on('data', (chunk) => data.push(chunk));
            response.on('end', () => evaluate(data.join('')));
        });
    } else {
        fs.readFile(path, 'utf8', (err, data) => {
            if (err) throw err;
            evaluate(data);
        });
    }
}

/**
 * parseLine - Parse #{} expressions inside the line.
 * Template strings are not parsed.
 * Comments are not allowed
 *
 * @param  {string} line
 * @return {string} parsed line
 */
function parseLine(line) {
    let output = [];
    let escape = false;
    let jsEscape = false;
    let inString = false;
    let inExp = false;
    let tempStart = -1;
    let pairs = [];
    for (let i = 0; i < line.length; i++) {
        if (inExp) {
            if (inString) {
                if (jsEscape) {
                    jsEscape = false;
                    continue;
                }
                if (line[i] == '\\') {
                    jsEscape = true;
                    continue;
                }
                //Three types of string declaration, i hate JS
                //Won't parse template string, that will make this too long
                if (line[i] == '"' || line[i] == "'" || line[i] == '`') {
                    if (pairs[pairs.length - 1] == line[i]) {
                        inString = false;
                        pairs.pop();
                        continue;
                    }
                }
            } else {
                if (line[i] == '/' && i + 1 < line.length) {
                    throw new Error(trans.translate("CommentsNotAllowed"));
                }
                if (line[i] == '"' || line[i] == "'" || line[i] == '`') {
                    pairs.push(line[i]);
                    inString = true;
                    continue;
                }
                if (line[i] == '{' || line[i] == '[' || line[i] == '(') {
                    pairs.push(line[i]);
                    continue;
                }
                if (line[i] == '}' || line[i] == ']' || line[i] == ')') {
                    if (pairs.length > 0) {
                        let c = pairs.pop();
                        if ((c == '[' && line[i] != ']') || (c == '{' && line[i] != '}') || (c == '(' && line[i] != ')')) {
                            throw new Error(trans.translate("ImbalanceBrackets", i));
                        }
                    } else if (line[i] == '}') {
                        inExp = false;
                        let result = evaluate(line.substring(tempStart, i)).toString();
                        output.push(result);
                    } else {
                        throw new Error(trans.translate("ImbalanceBrackets", i));
                    }
                }
            }
        } else {
            if (escape) {
                escape = false;
                output.push(line[i]);
                continue;
            }
            if (line[i] == '#' && i + 1 < line.length && line[i + 1] == '{') {
                //Start of inline expression
                tempStart = i + 2;
                inExp = true;
                i++; //Next loop will also +1. Skip 2 chars, #{
                continue;
            }
            if (line[i] == '`') {
                //Escape character
                escape = true;
                continue;
            }
            output.push(line[i]);
        }
    }
    if (inExp) {
        throw new Error(trans.translate("ExpNotTerminated"));
    }
    return output.join('');
}


/**
 * parseCommand - Parse custom commands and inline expression
 *
 * @param  {string} command
 * @return {string} parsed command
 */
function parseCommand(command) {
    command = parseLine(command);

    //get command name(before the first space char)
    let spaceIndex = command.indexOf(' ');

    //if space exist, and there is more than 1 char before the space char
    if (spaceIndex > 0) {
        let commandName = command.substring(0,spaceIndex);
        if (commandName[0] === '/' && commandName.length > 1) {
            commandName = commandName.substring(1);
        }
        let commandIndex = Object.keys(scope.CustomCommands).indexOf(commandName);
        if (commandIndex > -1) {
            //Exist such custom command
            command = scope.CustomCommands[commandName](command.substring(spaceIndex+1));
        }
    }
    return command;
}

exports.evaluate = evaluate;
exports.loadFile = loadFile;
exports.parseLine = parseLine;
exports.parseCommand = parseCommand;
exports.resetScope = resetScope;
exports.scope = scope;
