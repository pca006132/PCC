import {Macro, parseMacro} from './macro';
import {Line, LineContent, LineError} from './line';
import * as list from '../util/linked_list';
import * as helper from '../util/textutil';
import LineReader from '../util/reader';
import {safeLoad} from 'js-yaml';
import * as sandbox from '../util/sandbox';
import CommentParser from './comment';


const CONST_PATTERN = /^#define \s*(\$\S+)\s*=\s*(.*)\s*/;
const MACRO_PATTERN = /^#macro (#\S+)(\(.*\)):$/;
const ITERATION_PATTERN = /^#for (\$\w+) in (.+):$/;
const INDENT_PATTERN = /^\s+/;

const multiline_const = [
    {
        pattern: /^#json (\$\S+):$/,
        name: 'Json',
        parse: (m: RegExpMatchArray)=>{
            return {
                result: {
                    name: new RegExp(helper.regexEscape(m[1]), 'g'),
                    content: ''
                },
                addLine: (original: string, indent: number, line: string) => original + '    '.repeat(indent) + line + '\n'
            }
        },
        map: (list: {name: RegExp, content: string}[]) => list.map(j=>({name: j.name, content: JSON.stringify(safeLoad(j.content))}))
    }
]

export async function load(reader: LineReader) {
    let comment = CommentParser();

    let lines: Line|null = null;
    let temp: Line|null = lines;

    let constants: {name: RegExp, content: string}[] = [];
    let macro: Macro[] = [];
    let data: {[key: string]: {name: RegExp, content: string}[]} = {};
    for (let c of multiline_const) {
        //initialize
        data[c.name] = [];
    }

    let indentSize = 0;
    let indentTab: boolean|null = null;

    let skipLevel = 0;
    let addElement = (indent: number, content: string)=>{};

    try {
        for await (const raw of reader.lines(true)) {
            let l = raw.trim();
            if (comment(l)) {
                continue;
            }
            let i = INDENT_PATTERN.exec(raw);
            let indent = 0;
            if (i) {
                if (indentTab === null) {
                    indentTab = i[0].indexOf(' ') === -1;
                    indentSize = i[0].length;
                }
                if (indentTab !== (i[0].indexOf(' ') === -1) || i[0].length % indentSize !== 0) {
                    throw new Error(`Indent error at line ${reader.lineNum}`);
                }
                indent = Math.floor(i[0].length / indentSize);
            }
            if (skipLevel > 0) {
                if (indent >= skipLevel) {
                    addElement(indent - skipLevel, l);
                    continue;
                } else {
                    skipLevel = 0;
                }
            }
            helper.matcher<string, RegExpMatchArray, void>(l, [
                [
                    l=>CONST_PATTERN.exec(l),
                    m=> {
                        if (indent !== 0) {
                            throw new Error(`Constant declaration should have no indent, at line ${reader.lineNum}`);
                        }
                        constants.push({
                            name: new RegExp(helper.regexEscape(m[1]), 'g'),
                            content: m[2]
                        })
                    }
                ],
                [
                    l=>MACRO_PATTERN.exec(l),
                    m=> {
                        if (indent !== 0) {
                            throw new Error(`Macro declaration should have no indent, at line ${reader.lineNum}`);
                        }
                        let params = helper.getParams(m[2], 0);
                        for (let p of params) {
                            if (!p.startsWith('$'))
                                throw new Error('Macro parameters should start with $, at line ' + reader.lineNum.toString());
                        }
                        macro.push({
                            name: new RegExp('^' + helper.regexEscape(m[1]), 'g'),
                            params: params.map(l=>new RegExp(helper.regexEscape(l), 'g')),
                            content: []
                        });
                        skipLevel = indent + 1;
                        addElement = (i, l)=> {
                            let m = macro[macro.length - 1];
                            m.content.push({indent: i, content: l});
                        }
                    }
                ],
                ...(multiline_const.map((c):[(x: string) => RegExpMatchArray | null, (x: RegExpMatchArray) => void | null]=>[
                    (l: string)=>c.pattern.exec(l),
                    (m: RegExpMatchArray)=> {
                        if (indent !== 0) {
                            throw new Error(`${c.name} declaration should have no indent, at line ${reader.lineNum}`);
                        }
                        let r = c.parse(m);
                        data[c.name].push(r.result);
                        addElement = (i, l)=> {
                            let last = data[c.name][data[c.name].length - 1];
                            last.content = r.addLine(last.content, i, l);
                        }
                    }
                ]))
            ], ()=> {
                if (temp) {
                    temp = temp.insertItemAfter({
                        indent: indent,
                        content: l,
                        lineNum: reader.lineNum,
                        file: reader.name,
                        generated: false
                    })
                } else {
                    lines = new list.LinkedListNode({
                        indent: indent,
                        content: l,
                        lineNum: reader.lineNum,
                        file: reader.name,
                        generated: false
                    });
                    temp = lines;
                }
            })
        }
    } catch (e) {
        throw e;
    }

    for (let c of multiline_const) {
        constants.push(...c.map(data[c.name]));
    }

    return {
        lines: lines,
        constants: constants,
        macro: macro
    }
}

export function evaluate(
    lineStart: Line,
    context: sandbox.Context,
    constants: ()=>IterableIterator<{name: RegExp, content: string}>,
    macro: ()=>IterableIterator<Macro>
) {
    let skipLevel = -1;
    for (let line of lineStart) {
        let repeat = true;
        while (repeat) {
            repeat = false;
            if (line.item.content.startsWith('raw:')) {
                line.item.content = line.item.content.substring(4);
                continue;
            }
            //do not modify template content for now
            if (skipLevel > -1) {
                if (line.item.indent > skipLevel)
                    continue;
                skipLevel = -1;
            }
            if (line.item.content.startsWith('template ')) {
                skipLevel = line.item.indent;
                continue;
            }

            //constants
            for (let c of constants()) {
                line.item.content = line.item.content.replace(c.name, c.content)
            }

            if (line.item.content.startsWith('#for')) {
                parseIteration(line, context);
                repeat = true;
            } else if (line.item.content.startsWith('#if')) {
                parseCondition(line, context);
                repeat = true;

            } else {
                //evaluate inline js expression
                try {
                    line.item.content = parseInlineJs(line.item.content, context);
                } catch (e) {
                    throw new LineError('Error parsing inline JS', line, e);
                }
                for (let c of macro()) {
                    if (parseMacro(c, line)) {
                        repeat = true;
                        break;
                    }
                }
            }
        }
    }
}

function parseCondition(line: Line, context: sandbox.Context) {
    if (!line.item.content.endsWith(':')) {
        throw new LineError('Invalid #if pattern', line);
    }
    let result: any;
    try {
        result = sandbox.runExpression(line.item.content.substring(4, line.item.content.length - 1), context);
    } catch (e) {
        throw new LineError('Error parsing #if condition', line, e);
    }

    let last = line;
    for (let l of line.generator(l=>l.indent > line.item.indent)) {
        l.item.indent = l.item.indent - 1;
        if (!result) {
            last = l;
        }
    }
    list.deleteSegment(line, last);
}

function parseIteration(line: Line, context: sandbox.Context) {
    let m = ITERATION_PATTERN.exec(line.item.content);
    if (!m) {
        throw new LineError('Invalid #for pattern', line);
    }

    let lines: LineContent[] = [];
    let last = line;
    let name = new RegExp(helper.regexEscape(m[1]), 'g');
    try {
        for (let r of sandbox.runExpression(m[2], context)) {
            let result = sandbox.toString(r);
            let next = line.next;
            if (next) {
                for (let l of next.generator(l=>l.indent > line.item.indent)) {
                    last = l;
                    lines.push({
                        indent: l.item.indent - 1,
                        lineNum: l.item.lineNum,
                        content: l.item.content.replace(name, result),
                        file: l.item.file,
                        generated: true
                    });
                }
            }
        }
    } catch (e) {
        throw new LineError( 'Error parsing #for expression', line, e);
    }
    let r = list.listToLinkedList(lines);
    list.replaceSegment(line, last, r? r[0] : null, r? r[1]: null);
}

function parseInlineJs(line: string, context: sandbox.Context) {
    //skip {js expression}, offset is the index of the starting '{'
    function skipJs(str: string,  offset: number) {
        //offset is the index of the starting double quote
        function skipQuote(str: string,  offset: number, double = false) {
            let escape = false;
            while (++offset < str.length) {
                if (escape) {
                    escape = false;
                    continue;
                }
                switch (str[offset]) {
                    case '\\':
                        escape = true;
                        break;
                    case '"':
                        if (double) {
                            return offset;
                        }
                        break;
                    case '\'':
                        if (!double) {
                            return offset;
                        }
                        break;
                }
            }
            throw new Error("Not terminated string");
        }

        //offset is the index of the starting '/'
        function skipRegex(str: string,  offset: number) {
            let escape = false;
            while (++offset < str.length) {
                if (escape) {
                    escape = false;
                    continue;
                }
                switch (str[offset]) {
                    case '\\':
                        escape = true;
                        break;
                    case '/':
                        return offset;
                }
            }
            throw new Error("Not terminated RegExp expression");
        }

        //offset is the index of the start of the comment ('*' of '/*')
        function skipComment(str: string,  offset: number) {
            let star = false;
            while (++offset < str.length) {
                if (star) {
                    if (str[offset] === '/')
                        return offset;
                    star = false;
                } else {
                    if (str[offset] === '*')
                        star = true;
                }
            }
            throw new Error("Not terminated comment");
        }

        //offset is the index of the starting '`'
        function skipMacroString(str: string,  offset: number) {
            let dollar = false;
            let escape = false;

            while (++offset < str.length) {
                if (escape) {
                    escape = false;
                    continue;
                }
                if (dollar) {
                    dollar = false;
                    if (str[offset] === '{') {
                        offset = skipJs(str,  offset);
                        continue;
                    }
                }
                switch (str[offset]) {
                    case '\\':
                        escape = true;
                        break;
                    case '`':
                        return offset;
                    case '$':
                        dollar = true;
                        break;
                }
            }
            throw new Error("Not terminated template string");
        }

        let brackets: Number[] = []; //bracket stack, 0 for {, 1 for [, 2 for (
        let slash = false;

        while (++offset < str.length) {
            if (slash) {
                if (str[offset] === '/')
                    throw new Error("Single line comment is prohibited");
                if (str[offset] === '*')
                    offset = skipComment(str,  offset);
                else
                    offset = skipRegex(str,  offset-1);
                continue;
            }
            switch (str[offset]) {
                case '(':
                    brackets.push(2);
                    break;
                case '[':
                    brackets.push(1);
                    break;
                case '{':
                    brackets.push(0);
                    break;
                case ')':
                    if (brackets.length === 0)
                        throw new Error("Imbalanced parentheses");
                    if (brackets.pop() !== 2)
                        throw new Error("Imbalanced parentheses");
                    break;
                case ']':
                    if (brackets.length === 0)
                        throw new Error("Imbalanced brackets");
                    if (brackets.pop() !== 1)
                        throw new Error("Imbalanced brackets");
                    break;
                case '}':
                    if (brackets.length === 0)
                        return offset; //exit condition
                    if (brackets.pop() !== 0)
                        throw new Error("Imbalanced brackets");
                    break;
                case '"':
                    offset = skipQuote(str,  offset, true);
                    break;
                case '\'':
                    offset = skipQuote(str,  offset, false);
                    break;
                case '`':
                    offset = skipMacroString(str,  offset);
                    break;
            }
        }
        throw new Error("Not terminated js expression")
    }

    let i;
    while ((i = line.indexOf('${')) > -1) {
        try {
            let last = skipJs(line, i+1);
            let result = sandbox.toString(sandbox.runExpression(line.substring(i+2, last), context));
            line = line.substring(0, i) + result + line.substring(last + 1);
        } catch (e) {
            throw e;
        }
    }
    return line;
}

