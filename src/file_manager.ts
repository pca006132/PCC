import LineReader from './util/reader';
import commentParser from './parsing/comment';
import {Line} from './parsing/line';
import {Macro} from './parsing/macro';
import * as path from 'path';
import * as preprocessor from './parsing/preprocessor';
import * as sandbox from './util/sandbox';
import {readFile} from 'fs';
import {promisify} from 'util';
import {getBlocks, getFunction} from './parsing/block_parser';
import {printTree, TreeNode} from './parsing/tree';
import ModuleManager from './analyzing/module';
import {analyze} from './analyzing/analyzer';
import * as list from './util/linked_list';

const readFileAsync = promisify(readFile);

const IMPORT_PATTERN = /^import (.*)/;
const REF_PATTERN = /^ref (.*)/;

class PccFile {
    reader: LineReader;
    dependencies: string[] = [];
    refs: string[] = [];
    line: Line|null = null;
    results: object = {};
    name: string;

    constants: {name: RegExp, content: string}[] = [];
    macro: Macro[] = [];

    constructor(name: string) {
        this.reader = new LineReader(name);
        this.name = name;
    }

    async resolveDependencies() {
        let comment = commentParser();
        let directory = path.dirname(this.name);
        try {
            for await (const raw of this.reader.lines()) {
                if (comment(raw.trim())) {
                    continue;
                }

                let m = IMPORT_PATTERN.exec(raw.trimLeft());
                if (m) {
                    this.dependencies.push(path.join(directory, m[1]) + '.pcc');
                } else {
                    m = REF_PATTERN.exec(raw.trimLeft());
                    if (m) {
                        let p = path.join(directory, m[1]) + '.pcd';
                        this.refs.push(p);
                        if (refs.indexOf(p) === 0) {
                            refs.push(p);
                        }
                    } else {
                        break;
                    }
                }
            }
        } catch (e) {
            throw e;
        }

        for (const dependency of this.dependencies) {
            if (!files[dependency]) {
                let d = new PccFile(dependency);
                files[dependency] = d;
                try {
                    await d.resolveDependencies();
                } catch (e) {
                    throw new Error(`Error parsing ${dependency}: \n${e}`);
                }
            }
        }
    }

    async load() {
        try {
            let result = await preprocessor.load(this.reader);
            this.line = result.lines;
            this.constants = result.constants;
            this.macro = result.macro;
        } catch (e) {
            throw new Error(`Error loading ${this.name}: \n${e}`);
        }
    }

    evaluate() {
        if (this.line) {
            preprocessor.evaluate(this.line, context, getConstants(this.name), getMacro(this.name));
            this.results = getBlocks(this.line);
        }
    }

    toCache() {
        return JSON.stringify({
            constants: this.constants.map(v=>({name: v.name.source, content: v.content})),
            macro: this.macro.map(v=>({name: v.name.source, params: v.params, lines: v.content})),
            defs: this.results['def'].map(d=>d.data.ns + '.' + d.data.name),
            events: this.results['event'].map(e=>e.ns + '.' + e.name)
        })
    }
}

function getConstants(name: string, constants: {name: RegExp, content: string}[] = []) {
    return function *() {
        for (let c of constants) {
            yield c;
        }
        for (let c of files[name].constants) {
            yield c;
        }
        for (let d of files[name].dependencies) {
            for (let c of files[d].constants) {
                yield c;
            }
        }
    }
}
function getMacro(name: string) {
    return function *() {
        for (let c of files[name].macro) {
            yield c;
        }
        for (let d of files[name].dependencies) {
            for (let c of files[d].macro) {
                yield c;
            }
        }
    }
}
function accessChecker(a: string, b: string) {
    if (a === b) {
        return true;
    }
    let f = files[a];
    if (f) {
        if (f.dependencies.indexOf(b) > -1) {
            return true;
        }
        if (f.refs.indexOf(b) > -1) {
            return true;
        }
    }
    return false;
}

let files: {[key: string]: PccFile} = {};
let refs: string[] = [];
let context = new sandbox.Context();

export async function parse(name: string, js: string[] = []) {
    let scripts = (await Promise.all(
        js.map(j=>readFileAsync(path.resolve(j), 'utf-8'))
    )).map((v, i)=>({
        name: js[i],
        code: v
    }));
    sandbox.loadScripts(scripts, context);

    name = path.resolve(name);
    let f = new PccFile(name);
    files[name] = f;
    try {
        await f.resolveDependencies();
    } catch (e) {
        console.log('Error while resolving dependencies');
        console.log((<Error>e).stack);
        return;
    }
    let p = Promise.all(refs.map(r=>readFileAsync(r, 'utf-8')));

    try {
        await Promise.all(Object.keys(files).map(n=>files[n].load()));
    } catch (e) {
        console.log('Error while loading files');
        console.log((<Error>e).stack);
        return;
    }
    try {
        Object.keys(files).forEach(v=>{
            files[v].evaluate();
        })
    } catch (e) {
        console.log('Error while parsing files');
        console.log(e.toString());
        console.log((<Error>e).stack);
        return;
    }
    let referencess: {file: string, content: object}[];
    try {
        referencess = (await p).map((v, i)=>({file: refs[i], content: JSON.parse(v)}));
    } catch (e) {
        console.log('Error while resolving references');
        console.log((<Error>e).stack);
        return;
    }

    let defs: TreeNode[] = [];
    for (let f of Object.keys(files)) {
        defs.push(...(<TreeNode[]>files[f].results['def']));
    }
    let events: object[] = [];
    for (let f of Object.keys(files)) {
        events.push(...(<object[]>files[f].results['event']));
    }
    let templates: object[] = [];
    for (let f of Object.keys(files)) {
        templates.push(...(<object[]>files[f].results['template']));
    }

    return {
        defs: defs,
        events: events,
        templates: templates,
        refs: referencess
    }
}

export function compile(defs: TreeNode[], events: object[], templates: object[], refs: {file: string, content: object}[]) {
    let manager = new ModuleManager(accessChecker);

    for (let f of refs) {
        if (f.content['defs']) {
            for (let d of f.content['defs']) {
                manager.addDef(d, null, f.file);
            }
        }
        if (f.content['events']) {
            for (let e of f.content['events']) {
                manager.addEvent({name: <string>e['name'], ns: <string>e['ns'], file: f.file});
            }
        }
    }
    for (let e of events) {
        manager.addEvent(<{name: string, ns: string, file: string}>e);
    }
    for (let d of defs) {
        manager.addDef(d.data['ns'] + '.' + d.data['name'], d, d.src.file);
    }
    for (let t of templates) {
        manager.addTemplate(<{
            name: string,
            params: RegExp[],
            ns: string,
            content: Line[],
            file: string,
            lineNum: number
        }>t);
    }

    for (let d of manager.defs) {
        let def = manager.modules[d.ns].defs[d.name];
        if (def instanceof TreeNode) {
            def.data['commands'] = [];
            if (def.child) {
                analyze(manager, def.child, def);
            }
        }
    }
    while (manager.templates.length > 0) {
        let temp = manager.templates.pop();
        if (!temp) {
            break;
        }
        let line = list.listToLinkedList(manager.modules[temp.ns].templates[temp.name].content.map(
            //deep clone the line object
            l=>({
                content: l.item.content,
                file: l.item.file,
                lineNum: l.item.lineNum,
                indent: l.item.indent,
                generated: l.item.generated
            })
        ))
        if (!line)
            continue;
        try {
            let file = manager.modules[temp.ns].templates[temp.name].file;
            preprocessor.evaluate(line[0], context, getConstants(file, temp.params), getMacro(file));
            let def = getFunction(temp.actual, temp.ns, file, temp.lineNum, line[0]);
            def.data['commands'] = [];
            manager.addDef(temp.ns + '.' + temp.actual, def, file, true);
            let child = def.child;
            if (child) {
                analyze(manager, child, def);
            }
        } catch (e) {
            throw new Error(`Error parsing generated template ${temp.ns + '.' + temp.name} ` +
                `with params ${JSON.stringify(temp.params)}\n` + e.message);
        }
    }

    let fn: {name: string, ns: string, commands: string[]}[] = [];
    let event: {name: string, ns: string, usage: string[]}[] = [];

    for (let ns of Object.keys(manager.modules)) {
        for (let name of Object.keys(manager.modules[ns].defs)) {
            let def = manager.modules[ns].defs[name];
            if (def instanceof TreeNode) {
                fn.push({
                    name: name,
                    ns: ns,
                    commands: def.data['commands']
                })
            }
        }
        for (let name of Object.keys(manager.modules[ns].events)) {
            event.push({
                name: name,
                ns: ns,
                usage: manager.modules[ns].events[name].usage
            })
        }
    }

    return {
        fn: fn,
        event: event
    }
}

export function getDefinitions(defs: TreeNode[], events: object[]) {
    let manager = new ModuleManager(accessChecker);
    for (let e of events) {
        manager.addEvent(<{name: string, ns: string, file: string}>e);
    }
    for (let d of defs) {
        manager.addDef(d.data['ns'] + '.' + d.data['name'], d, d.src.file);
    }

    let fn: string[] = [];
    let event: string[] = [];
    for (let ns of Object.keys(manager.modules)) {
        for (let name of Object.keys(manager.modules[ns].defs)) {
            fn.push(ns + '.' + name);
        }
        for (let name of Object.keys(manager.modules[ns].events)) {
            event.push(ns + '.' + name);
        }
    }

    return JSON.stringify({
        defs: fn,
        events: event
    })
}