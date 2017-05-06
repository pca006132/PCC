/**@module Parser*/
const trans = require('./Translate.js');
const runner = require('./JsRunner.js');

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

const prefixOnly = /^(r:)$|^((icb:|rcb:|1:|0:|\?:|n:)+(r:)?)$/;


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
            url.push(m[1]);
        }

        m = scriptStart.exec(raw_lines);
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
            throw new Error(trans.translate("AtLine", i, err));
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
                new Line(i.toString(), l, indent),
                lines.length
            ]);
            continue;
        }

        lines.push(new Line(i.toString(), l, indent));
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
                let l = new Line(runs[i][0].lineNum + "." + j.toString(), results[j].substring(indent*indentLength), indent + runs[i][0].indent);
                lines.splice(runs[i][1], 0, l);
            }
        } catch (err) {
            throw new Error(trans.translate("RunCommand", runs[i][0].lineNum, err));
        }
    }

    return lines;
}
