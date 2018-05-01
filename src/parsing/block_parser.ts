import {Line, LineError} from './line';
import {TreeNode} from './tree';
import * as list from '../util/linked_list';
import * as helper from '../util/textutil';
import {getDefaultNs} from '../config';

interface BlockParser {
    name: string;
    prefix: string;
    topLevel: boolean;
    skipChildren: boolean;
    pattern: RegExp;
    acceptAnnotation?: boolean;

    initialize(data: object, result: object): void;
    match(line: string): RegExpMatchArray | null;
    process(line: Line, data: object,
        stack: (TreeNode | string)[] , results: object): ((m: RegExpMatchArray)=>void);
    pop ? (original: TreeNode | string, data: object) : void;
}

const parsers: BlockParser[] = [{
    name: 'template',
    prefix: 'template',
    pattern: /^template ([a-z0-9_\-]+)(\(.*\)):$/,
    topLevel: true,
    skipChildren: true,
    initialize: function (d, r) {
        r[this.name] = [];
    },
    match: function (l) {
        return this.pattern.exec(l);
    },
    process: function (l, d, s, r) {
        return (m)=>{
            r[this.name].push({
                name: m[1],
                params: helper.getParams(m[2], 0).map(p=>new RegExp(helper.regexEscape(p), 'g')),
                ns: d['module'] || getDefaultNs(),
                content: [],
                file: l.item.file,
                lineNum: l.item.lineNum
            });
            s.push(this.name);
        }
    }
}, {
    name: 'def',
    prefix: 'def',
    pattern: /^def ([a-z0-9_\-]+):$/,
    topLevel: true,
    skipChildren: false,
    acceptAnnotation: true,
    initialize: function (d, r) {
        r[this.name] = [];
    },
    match: function (l) {
        return this.pattern.exec(l);
    },
    process: function (l, d, s, r) {
        return (m)=>{
            let events = [];
            if (d['annotation']['event']) {
                events = d['annotation']['event'].slice().map(v=>v[0]);
                delete d['annotation']['event'];
            }
            for (let k of Object.keys(d['annotation'])) {
                throw new LineError('Unused annotation', d['annotation'][k][0][1]);
            }
            let node = new TreeNode(this.name, {
                name: m[1],
                events: events,
                ns: d['module'] || getDefaultNs()
            }, {file: l.item.file, lineNum: l.item.lineNum});
            s.push(node);
            r[this.name].push(node);
        }
    },
}, {
    name: 'module',
    prefix: 'module',
    pattern: /^module ([a-z0-9_\-\.]+):$/,
    topLevel: true,
    skipChildren: false,
    initialize: function (d, r) {
        d[this.name] = '';
    },
    match: function (l) {
        return this.pattern.exec(l);
    },
    process: function (l, d, s, r) {
        return (m)=> {
            s.push(new TreeNode(this.name, m[1], {file: l.item.file, lineNum: l.item.lineNum}));
            if (d[this.name]) {
                d[this.name] += '.';
            }
            d[this.name] += m[1];
        }
    },
    pop: function (o, d) {
        if (o instanceof TreeNode) {
            let index = d[this.name].indexOf(o.data);
            if (index > 0) {
                index--;
                d[this.name] = d[this.name].substring(0, index);
            }
        }
        d['event-annotation'] = [];
    }
}, {
    name: 'event',
    prefix: 'event',
    pattern: /^event ([a-z0-9_\-]+)$/,
    topLevel: true,
    skipChildren: false,
    initialize: function (d, r) {
        r[this.name] = [];
    },
    match: function (l) {
        return this.pattern.exec(l);
    },
    process: function (l, d, s, r) {
        return (m) => {
            r[this.name].push({
                name: m[1],
                ns: d['module'] || getDefaultNs(),
                file: l.item.file,
                lineNum: l.item.lineNum
            });
        }
    }
}, {
    name: 'event-annotation',
    prefix: '@event',
    pattern: /^@event (.+)$/,
    topLevel: true,
    skipChildren: false,
    acceptAnnotation: true,
    initialize: function (d, r) {
        d[this.name] = [];
    },
    match: function (l) {
        return this.pattern.exec(l);
    },
    process: function (l, d, s, r) {
        return (m) => {
            if (!d['annotation']['event']) {
                d['annotation']['event'] = [];
            }
            d['annotation']['event'].push(
                ...m[1].split(',').map(m => [m.trim(), l])
            );
        }
    }
}, {
    name: 'while',
    prefix: 'while',
    pattern: /^while ((true)|(.+)):$/,
    topLevel: false,
    skipChildren: false,
    initialize: function (d, r) {
        d[this.name] = 0;
    },
    match: function (l) {
        return this.pattern.exec(l);
    },
    process: function (l, d, s, r) {
        return (m) => {
            let node = s[s.length - 1];
            let subcommand = '';
            if (m[3]) {
                subcommand = m[3].split('&&').map(n => {
                    n = n.trim();
                    if (n.startsWith('not '))
                        return 'unless ' +
                            n.substring(4).trim();
                    return 'if ' + n.trim();
                }).join(' ');
            }
            if (node instanceof TreeNode) {
                s.push(node.addChild(this.name, {
                    subcommand: subcommand
                }, {file: l.item.file, lineNum: l.item.lineNum}));
                d[this.name]++;
            }
        }
    },
    pop: function (o, d) {
        d[this.name]--;
    }
}, {
    name: 'return',
    prefix: 'return',
    pattern: /^return$/,
    topLevel: false,
    skipChildren: false,
    initialize: function (d, r) {},
    match: function (l) {
        return this.pattern.exec(l);
    },
    process: function (l, d, s, r) {
        return (m) => {
            let node = s[s.length - 1];
            if (node instanceof TreeNode) {
                node.addChild(this.name, null, {file: l.item.file, lineNum: l.item.lineNum});
            }
        }
    }
}, {
    name: 'break',
    prefix: 'break',
    pattern: /^break$/,
    topLevel: false,
    skipChildren: false,
    initialize: function (d, r) {},
    match: function (l) {
        return this.pattern.exec(l);
    },
    process: function (l, d, s, r) {
        return (m) => {
            if (d['while'] <= 0) {
                throw 'Break statement should be placed inside loops';
            }
            let node = s[s.length - 1];
            if (node instanceof TreeNode) {
                node.addChild(this.name, null, {file: l.item.file, lineNum: l.item.lineNum});
            }
        }
    }
}, {
    name: 'continue',
    prefix: 'continue',
    pattern: /^continue$/,
    topLevel: false,
    skipChildren: false,
    initialize: function (d, r) {},
    match: function (l) {
        return this.pattern.exec(l);
    },
    process: function (l, d, s, r) {
        return (m) => {
            if (d['while'] <= 0) {
                throw 'Continue statement should be placed inside loops';
            }
            let node = s[s.length - 1];
            if (node instanceof TreeNode) {
                node.addChild(this.name, null, {file: l.item.file, lineNum: l.item.lineNum});
            }
        }
    }
}]

export function getBlocks(lines: Line) {
    let stack: (TreeNode|string)[] = [];
    let result = {};
    let data = {annotation: {}};

    for (let p of parsers) {
        p.initialize(data, result);

        //handle the f**king 'this'
        p.match = p.match.bind(p);
        p.process = p.process.bind(p);
    }
    let getName = (obj: TreeNode | string | undefined) => {
        if (!obj) {
            return '';
        }
        if (obj instanceof TreeNode) {
            return obj.name;
        }
        return obj;
    }
    let topLevel = () => {
        return stack.length === 0 || getName(stack[stack.length - 1]) === 'module';
    }
    for (let line of lines) {
        while (line.item.indent < stack.length) {
            let pop = stack.pop();
            let name = getName(pop);
            for (let p of parsers) {
                if (pop && p.name === name && p.pop) {
                    p.pop(pop, data);
                }
            }
        }

        let top = stack[stack.length - 1];
        if (getName(top) === 'multiline') {
            top = stack[stack.length - 2];
            if (!top || !(top instanceof TreeNode)) {
                throw new LineError('Unexpected indentation', line);
            }
            if (!top.data['command'].startsWith('execute') || !top.data['command'].endsWith('run:')) {
                throw new LineError('Unexpected indentation', line);
            }
            top.name = 'anonymous';
        } else if (getName(top) !== 'command') {
            let skipped = false;
            for (let p of parsers) {
                if (p.name === getName(top)) {
                    if (p.skipChildren) {
                        skipped = true;
                        line.item.indent -= stack.length;
                        result[p.name][result[p.name].length - 1].content.push(line);
                    }
                    break;
                }
            }
            if (skipped) {
                continue;
            }
        }

        if (line.item.indent > stack.length) {
            throw new LineError('Unexpected indentation', line);
        }

        helper.matcher(line.item.content, parsers.map(
            (p)=><[(line: string)=> boolean | null, (b: boolean)=>void]>[
                l=>l.startsWith(p.prefix),
                b => {
                    let m = p.match(line.item.content);
                    if (!m) {
                        throw new LineError(`Invalid ${p.name} format`, line);
                    }
                    if (p.topLevel != topLevel()) {
                        throw new LineError(`${p.name} should not be placed inside functions`, line);
                    }
                    if (top instanceof TreeNode && getName(top) === 'command') {
                        //it should be changed to anonymous function
                        top.name = 'anonymous';
                    }
                    if (!p.acceptAnnotation) {
                        //not allowed for any indentation
                        for (let k of Object.keys(data['annotation'])) {
                            throw new LineError('Unused annotation', data['annotation'][k][0][1]);
                        }
                    }
                    try {
                        p.process(line, data, stack, result)(m);
                    } catch (e) {
                        throw new LineError(e, line);
                    }
                }
            ]
        ), ()=> {
            //command
            if (topLevel()) {
                throw new LineError('Command should be placed inside functions', line);
            }
            if (top instanceof TreeNode && getName(top) === 'command') {
                //multiline
                if (top.data['command'].endsWith('\\')) {
                    top.data['command'] = top.data['command'].substring(0, top.data['command'].length - 1);
                } else {
                    top.data['command'] += ' ';
                }
                top.data['command'] += line.item.content;
                stack.push('multiline');
            } else if (top instanceof TreeNode) {
                stack.push(top.addChild('command', {command: line.item.content}, {
                    file: line.item.file, lineNum: line.item.lineNum
                }));
            }
        })
    }
    return result;
}

export function getFunction(name: string, ns: string, file: string, lineNum: number, lines: Line) {
    let fn = new TreeNode('def', {
        name: name,
        ns: ns,
        events: []
    }, {file: file, lineNum: lineNum});
    let stack: (TreeNode|string)[] = [fn];
    let result = {};
    let data = {annotation: {}};

    for (let p of parsers) {
        p.initialize(data, result);

        //handle the f**king 'this'
        p.match = p.match.bind(p);
        p.process = p.process.bind(p);
    }
    let getName = (obj: TreeNode | string | undefined) => {
        if (!obj) {
            return '';
        }
        if (obj instanceof TreeNode) {
            return obj.name;
        }
        return obj;
    }
    let topLevel = () => {
        return false;
    }
    for (let line of lines) {
        line.item.indent++;
        while (line.item.indent < stack.length) {
            let pop = stack.pop();
            let name = getName(pop);
            for (let p of parsers) {
                if (pop && p.name === name && p.pop) {
                    p.pop(pop, data);
                }
            }
        }

        let top = stack[stack.length - 1];
        if (getName(top) === 'multiline') {
            top = stack[stack.length - 2];
            if (!top || !(top instanceof TreeNode)) {
                throw new LineError('Unexpected indentation', line);
            }
            if (!top.data['command'].startsWith('execute') || !top.data['command'].endsWith('run:')) {
                throw new LineError('Unexpected indentation', line);
            }
            top.name = 'anonymous';
        } else if (getName(top) !== 'command') {
            let skipped = false;
            for (let p of parsers) {
                if (p.name === getName(top)) {
                    if (p.skipChildren) {
                        skipped = true;
                        line.item.indent -= stack.length;
                        result[p.name][result[p.name].length - 1].content.push(line);
                    }
                    break;
                }
            }
            if (skipped) {
                continue;
            }
        }

        if (line.item.indent > stack.length) {
            throw new LineError('Unexpected indentation', line);
        }

        helper.matcher(line.item.content, parsers.map(
            (p)=><[(line: string)=> boolean | null, (b: boolean)=>void]>[
                l=>l.startsWith(p.prefix),
                b => {
                    let m = p.match(line.item.content);
                    if (!m) {
                        throw new LineError(`Invalid ${p.name} format`, line);
                    }
                    if (p.topLevel != topLevel()) {
                        throw new LineError(`${p.name} should not be placed inside functions`, line);
                    }
                    if (top instanceof TreeNode && getName(top) === 'command') {
                        //it should be changed to anonymous function
                        top.name = 'anonymous';
                    }
                    if (!p.acceptAnnotation) {
                        //not allowed for any indentation
                        for (let k of Object.keys(data['annotation'])) {
                            throw new LineError('Unused annotation', data['annotation'][k][0][1]);
                        }
                    }
                    try {
                        p.process(line, data, stack, result)(m);
                    } catch (e) {
                        throw new LineError(e, line);
                    }
                }
            ]
        ), ()=> {
            //command
            if (topLevel()) {
                throw new LineError('Command should be placed inside functions', line);
            }
            if (top instanceof TreeNode && getName(top) === 'command') {
                //multiline
                if (top.data['command'].endsWith('\\')) {
                    top.data['command'] = top.data['command'].substring(0, top.data['command'].length - 1);
                } else {
                    top.data['command'] += ' ';
                }
                top.data['command'] += line.item.content;
                stack.push('multiline');
            } else if (top instanceof TreeNode) {
                stack.push(top.addChild('command', {command: line.item.content}, {
                    file: line.item.file, lineNum: line.item.lineNum
                }));
            }
        })
    }
    return fn;
}
