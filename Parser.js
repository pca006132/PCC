/**@module Parser*/
const trans = require('./Translate.js');
const runner = require('./JsRunner.js');
const chain = require('./Chain.js');
const CommandModule = require('./CommandModule.js');
const procedure = require('./Procedure.js');
const cb = require('./CommandBlock.js');

let indentLength = 0;
let useTab = null;

/**
 * getIndent - Get Indent level of the line
 *
 * @param  {string} line
 * @return {string} Indent level
 */
function getIndent(line) {
    if (line.length == 0)
        return 0;

    if (line[0] !== ' ' && line[0] !== '\t') {
        return 0;
    } else if (useTab === null && line[0] === ' ') {
        useTab = false;
    } else if (useTab === null && line[0] === '\t') {
        useTab = true;
    }

    let i = 0;
    while (i < line.length && (line[i] === ' ' || line[i] === '\t')) {
        if (line[i] !== (useTab ? '\t' : ' ')) {
            throw new Error(trans.translate("MixedTabAndSpaces"));
        }
        i++;
    }

    if (indentLength == 0) {
        //use this as level 1 indentation
        indentLength = i;
        return 1;
    }
    if (i % indentLength != 0) {
        throw new Error(trans.translate("IndentLevel"));
    }
    return i / indentLength;
}


/**
 * resetIndent - Reset indent related variables.
 * Use when parsing new files
 */
function resetIndent() {
    indentLength = 0;
    useTab = null;
}


/**
 * @class line
 * Represents a line
 */
class Line {

    /**
     * constructor
     *
     * @param  {string} lineNum line number. String as it may contain something like 12.34
     * @param  {string} content content of the line
     * @param  {number} indent indent level
     */
    constructor(lineNum, content, indent) {
        this.lineNum = lineNum;
        this.content = content;
        this.indent = indent;
    }
}

const urlPattern = /^#include <([^<>]+)>$/;
const scriptStart = /^#script$/;
const scriptEnd = /^#end script$/;
const scriptRun = /^#run .+/;
const lineDelimiter = /\r\n|\n|\r/g;
const trimEnd = /\s*$/;

const prefixOnly = /^(r:)$|^((icb:|rcb:|!:|1:|0:|\?:|n:)+(r:)?)$/;


/**
 * parseLines - Parse lines, load js
 *
 * @param  {string} content whole pcc file
 * @return {Line[]} lines
 */
function parseLines(content) {
    resetIndent();
    let lines = [];
    let raw_lines = content.split(lineDelimiter);

    let scripts = "";
    let urls = [];
    let runs = [];
    let inJs = false;
    let inComment = false;

    for (let i = 0; i < raw_lines.length; i++) {
        if (inComment) {
            if (raw_lines[i].replace(trimEnd).endsWith("*/"))
                inComment = false;
            continue;
        }

        if (inJs) {
            let m = scriptEnd.exec(raw_lines[i]);
            if (m) {
                inJs = false;
            } else {
                scripts += '\n'+ raw_lines[i];
            }
            continue;
        }

        let m = urlPattern.exec(raw_lines[i]);
        if (m) {
            urls.push(m[1]);
        }

        m = scriptStart.exec(raw_lines[i]);
        if (m) {
            inJs = true;
            continue;
        }

        if (raw_lines[i].trim().length == 0)
            continue;

        let indent = 0;
        try {
            indent = getIndent(raw_lines[i]);
        } catch (err) {
            throw new Error(trans.translate("AtLine", (i+1), err));
        }
        let l = raw_lines[i].substring(indent * indentLength);

        if (l.startsWith("//")) {
            continue;
        }
        if (l.startsWith("/*")) {
            if (!l.replace(trimEnd).endsWith("*/"))
                inComment = true;
            continue;
        }

        m = scriptRun.exec(l);
        if (m) {
            runs.push([
                new Line((i+1).toString(), l, indent),
                lines.length
            ]);
            continue;
        }

        lines.push(new Line((i+1).toString(), l, indent));
    }
    if (inJs) {
        throw new Error(trans.translate("MissEndScript"));
    }
    if (inComment) {
        throw new Error(trans.translate("MissEndComment"));
    }

    for (let url in urls) {
        try {
            runner.loadFile(url);
        } catch (err) {
            throw new Error(trans.translate("LoadFile", url, err));
        }
    }
    try {
        runner.evaluate(scripts);
    } catch (err) {
        throw new Error(trans.translate("LoadEmbed"));
    }
    for (let i = runs.length - 1; i >= 0; i--) {
        try {
            let results = runner.evaluate(runs[i][0].content.substring(5)).split(lineDelimiter);
            for (let j = results.length - 1; j >= 0; j--) {
                let indent = getIndent(results[j]);
                let l = new Line(runs[i][0].lineNum + "." + (j+1).toString(), results[j].substring(indent*indentLength), indent + runs[i][0].indent);
                lines.splice(runs[i][1], 0, l);
            }
        } catch (err) {
            throw new Error(trans.translate("RunCommand", runs[i][0].lineNum, err));
        }
    }

    return lines;
}

function parseSections(lines) {
    let baseChain = new chain.Chain([0, 2, 0]);
    let sections = [baseChain];

    for (let l of lines) {
        if (l.indent > sections.length &&
            //Check if special case: annotation of procedure
            !(sections.length > 2 && sections[sections.length - 1] instanceof Line &&
                sections[sections.length - 2] instanceof procedure.Procedure && sections[sections.length - 1].content.startsWith("@criteria"))
        ) {
            throw new Error(trans.translate("InvalidIndentLevel", l.lineNum));
        }

        while (l.indent < sections.length-1) {
            let s = sections.pop();
            //prefix
            if (typeof s === 'string')
                continue;
            for (let i = sections.length - 1; i >= 0; i--) {
                //Skip line/prefix
                if (typeof sections[i] === 'string') {
                    //Should only be lines in prefix
                    s.content = sections[i] + s.content;
                    continue;
                }
                sections[i].addElement(s);
                break;
            }
        }

        if (typeof sections[sections.length - 1] === 'string') {
            //prefix
            if (l.content.startsWith("#")) {
                throw new Error(trans.translate("InvalidIndentLevel", l.lineNum));
            } else if (l.content.startsWith("@")) {
                throw new Error(trans.translate("InvalidIndentLevel", l.lineNum));
            }

            //check if prefix only
            if (prefixOnly.exec(l.content)) {
                sections.push(l.content);
            } else {
                sections.push(l);
            }
        } else if (sections[sections.length - 1] instanceof Line) {
            //concat lines
            sections[sections.length - 1].content += l.content;
        } else if (sections[sections.length - 1] instanceof procedure.Procedure) {
            if (l.content.startsWith("#")) {
                throw new Error(trans.translate("InvalidIndentLevel", l.lineNum));
            }
            //check if prefix only
            if (prefixOnly.exec(l.content)) {
                sections.push(l.content);
            } else {
                sections.push(l);
            }
        } else {
            if (l.content.startsWith("#module ")) {
                sections.push(new CommandModule.CommandModule(l.content.substring(8)));
            } else if (l.content.startsWith("#procedure")) {
                let c = l.content.substring(11);
                let p = c.split(" ");
                let impossible = false;
                let tick = false;
                let main_loop = false;
                for (let i = 1; i < p.length; i++) {
                    switch (p[i]) {
                        case "impossible":
                            impossible = true;
                            break;
                        case "tick":
                            tick = true;
                            break;
                        case "main_loop":
                            main_loop = true;
                            break;
                        default:
                            throw new Error(trans.translate("ProcedurePara", l.lineNum));
                    }
                }

                sections.push(new procedure.Procedure(p[0], impossible, tick, main_loop));
            } else if (l.content.startsWith("#chain")) {
                try {
                    l.content = runner.parseLine(l.content);
                } catch (err) {
                    throw new Error(trans.translate("CommandParseLineError", l.lineNum));
                }
                let [x, y, z] = chain.chainsLength > 0? chain.getLastChain().coor : [0, 2, 0];
                let parts = l.content.split(' ');
                if (parts.length < 4) {
                    throw new Error(trans.translate("ChainPara", l.lineNum));
                }

                try {
                    if (parts[1] == "~")
                        parts[1] = "~0";
                    if (parts[2] == "~")
                        parts[2] = "~0";
                    if (parts[3] == "~")
                        parts[3] = "~0";

                    parts[1].startsWith("~")? x += parseInt(parts[1].substring(1)) : x = parseInt(parts[1]);
                    parts[2].startsWith("~")? y += parseInt(parts[2].substring(1)) : y = parseInt(parts[2]);
                    parts[3].startsWith("~")? z += parseInt(parts[3].substring(1)) : z = parseInt(parts[3]);
                } catch (err) {
                    throw new Error(trans.translate("ChainPara", l.lineNum) + err);
                }
                let loop = false;
                let dir = cb.EAST;
                let wrapDir = cb.SOUTH;
                let wrapCount = 0;
                if (parts.length >= 5) {
                    try {
                        dir = cb.stringToDirection(parts[4]);
                    } catch (err) {
                        throw new Error(trans.translate("ChainPara", l.lineNum) + err);
                    }

                    if (parts.length == 6) {
                        if (parts[5] == "loop") {
                            loop = true;
                        } else if (parts[5].startsWith("wrap")) {
                            let parts2 = parts[5].split(',');
                            if (parts2.length != 3) {
                                throw new Error(trans.translate("ChainPara", l.lineNum));
                            }
                            try {
                                wrapDir = cb.stringToDirection(parts2[1]);
                            } catch (err) {
                                throw new Error(trans.translate("ChainPara", l.lineNum) + err);
                            }
                            try {
                                wrapCount = parseInt(parts2[2]);
                            } catch (err) {
                                throw new Error(trans.translate("ChainPara", l.lineNum) + err);
                            }
                        }
                    }
                    let c = new chain.Chain([x, y, z], dir, loop, wrapDir, wrapCount);
                    sections.push(c);
                    chain.addChain(c);
                }

            } else if (prefixOnly.exec(l.content)) {
                sections.push(l.content);
            } else {
                sections.push(l);
            }
        }
    }

    while (0 < sections.length-1) {
        let s = sections.pop();
        //prefix
        if (typeof s === 'string')
            continue;
        for (let i = sections.length - 1; i >= 0; i--) {
            //Skip line/prefix
            if (typeof sections[i] === 'string') {
                //Should only be lines in prefix
                s.content = sections[i] + s.content;
            }
            sections[i].addElement(s);
            break;
        }
    }

    sections[0].parseCommands();
}

function parse(content) {
    parseSections(parseLines(content));
}

exports.parse = parse;
exports.Line = Line;
