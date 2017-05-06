/** @module JsRunner*/

const vm = require('vm');
const http = require('http');
const https = require('https');
const fs = require('fs');
const options = require('./options.json');
const trans = require('./Translate.js');

//vm on this scope
let scope = {
    CustomCommands: {
        call: function (n) {
            return `advancement grant @p only ${options.namespace}:${n} c`;
        }
    },
    Annotations: {

    }
};

let context = new vm.createContext(scope);


/**
 * resetScope - Reset Scope, cancel all the effect of running js.
 * Used for parsing new files
 */
function resetScope() {
    scope = {
        CustomCommands: {
            call: function (n) {
                return `advancement grant @p only ${options.namespace}:${n} c`;
            }
        },
        Annotations: {

        }
    };
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
            data = [];
            response.setEncoding('utf8');
            response.on('data', (chunk) => data.push(chunk));
            response.on('end', () => evaluate(data.join('')));
        });
    } else if (path.startsWith("https://")) {
        https.get(path, response => {
            data = [];
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
    output = [];
    let escape = false;
    let jsEscape = false;
    let inString = false;
    let inExp = false;
    let tempStart = -1;
    pairs = [];
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
    spaceIndex = command.indexOf(' ');

    //if space exist, and there is more than 1 char before the space char
    if (spaceIndex > 0) {
        commandName = command.substring(0,spaceIndex);
        if (commandName[0] === '/' && commandName.length > 1) {
            commandName = commandName.substring(1);
        }
        commandIndex = Object.keys(scope.CustomCommands).indexOf(commandName);
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
