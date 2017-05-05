const vm = require('vm');
const http = require('http');
const https = require('https');
const fs = require('fs');
const options = require('./options.json');

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

const context = new vm.createContext(scope);

function evaluate(expression) {
    let script = new vm.Script(expression);
    return script.runInContext(context);
}

function loadFile(path) {
    if (path.startsWith("http://")) {
        http.get(path, response => {
            data = [];
            response.setEncoding('utf8');
            response.on('data', (chunk) => data.push(chunk));
            //response.on('error', (err) => throw err);
            response.on('end', () => console.log(data.join('')));
        });
    } else if (path.startsWith("https://")) {
        https.get(path, response => {
            data = [];
            response.setEncoding('utf8');
            response.on('data', (chunk) => data.push(chunk));
            //response.on('error', (err) => throw err);
            response.on('end', () => console.log(data.join('')));
        });
    } else {
        fs.readFile(path, 'utf8', (err, data) => {
            if (err) throw err;
            console.log(data);
        });
    }
}

//parse inline functions
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
                    throw new Error("Comments in inline expressions are not allowed.");
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
                            throw new Error("Imbalance bracket at " + i.toString());
                        }
                    } else if (line[i] == '}') {
                        inExp = false;
                        let result = evaluate(line.substring(tempStart, i)).toString();
                        output.push(result);
                    } else {
                        throw new Error("Imbalance bracket at " + i.toString());
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
    if (jsEscape) {
        throw new Error("Invalid escape at the end of line");
    }
    if (inExp) {
        throw new Error("Not terminated expression at the end of line");
    }
    return output.join('');
}

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
