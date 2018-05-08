import {Constant, Macro} from './preprocessor/typings';
import {Context} from './util/sandbox';
import Line from './util/line';
import getLines from './preprocessor/line_processor';
import getDeclarations from './preprocessor/declaration_processor';
import expand from './preprocessor/expansion';
import {getNameMap} from './config';

import {join} from 'path';
import {readFile, readJson} from 'fs-extra';

const LINE_DELIMITER = /\r?\n/g;

class PccFile {
    name: string;
    lines: {next: Line} | null;
    constants: Constant[] = [];
    macros: Macro[] = [];
    refs: string[] = [];
    imports: string[] = [];

    constructor(name: string, lines: Iterable<string>) {
        this.name = name;
        this.lines = getLines(name, lines);
        if (this.lines) {
            let r = getDeclarations(this.lines);
            this.constants = r.constants;
            this.imports = r.imports.map(n=>{
                if (n in getNameMap()) {
                    if (!getNameMap()[n].endsWith('pcc')) {
                        throw new Error(`Error parsing ${name} dependencies:\nError importing ${n}, which is not a pcc file`);
                    }
                    return getNameMap()[n];
                }
                return join(name, n + '.pcc');
            });
            this.refs = r.refs.map(n=>{
                if (n in getNameMap()) {
                    if (!getNameMap()[n].endsWith('pcd')) {
                        throw new Error(`Error parsing ${name} dependencies:\nError referencing ${n}, which is not a pcd file`);
                    }
                    return getNameMap()[n];
                }
                return join(name, n + '.pcd');
            });;
            this.macros = r.macros;
        }
    }
}

class FileManager {
    imports: {[key: string]: PccFile} = {};
    refs: {[key: string]: object} = {};
    context: Context;

    constructor(context: Context) {
        this.context = context;
    }

    async loadPcc(name: string) {
        let content: string;
        try {
            content = await readFile(name, 'utf-8');
        } catch (e) {
            e.message = `Error parsing ${name}:\n` + e.message;
            throw e;
        }

        this.imports[name] = new PccFile(name, content.split(LINE_DELIMITER));

        let refs = this.imports[name].refs.filter(r=>!(r in this.refs));
        try {
            (await Promise.all(refs.map(r=>readJson(r)))).map((v, i)=>this.refs[refs[i]] = v);
        } catch (e) {
            e.message = `Error parsing references for ${name}:\n` + e.message;
            throw e;
        }

        let imports = this.imports[name].imports.filter(i=>!(i in this.imports));
        try {
            await Promise.all(imports.map(i=>this.loadPcc(i)));
        } catch (e) {
            e.message = `Error parsing dependencies for ${name}:\n` + e.message;
            throw e;
        }
    }

    getConstants(name: string) {
        let imports = this.imports;
        return function *() {
            //return the constants in the current file
            for (let c of imports[name].constants) {
                yield c;
            }
            //return the constants in the imported files
            for (let i of imports[name].imports) {
                for (let c of imports[i].constants) {
                    yield c;
                }
            }
        }
    }

    getMacros(name: string) {
        let imports = this.imports;
        return function *() {
            //return the macros in the current file
            for (let c of imports[name].macros) {
                yield c;
            }
            //return the macros in the imported files
            for (let i of imports[name].imports) {
                for (let c of imports[i].macros) {
                    yield c;
                }
            }
        }
    }
}