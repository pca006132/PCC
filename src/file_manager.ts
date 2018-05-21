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
    refs: [Line, string][] = [];
    imports: [Line, string][] = [];

    constructor(name: string, lines: Iterable<string>) {
        this.name = name;
        this.lines = getLines(name, lines);
        if (this.lines) {
            let r = getDeclarations(this.lines);
            this.constants = r.constants;
            this.imports = r.imports.map(n=>{
                if (n[1] in getNameMap()) {
                    if (!getNameMap()[n[1]].endsWith('pcc')) {
                        throw n[0].getError(`Error in import statement: Only pcc file can be imported`)
                    }
                    return <[Line, string]>[n[0], getNameMap()[n[1]]];
                }
                return <[Line, string]>[n[0], join(name, n + '.pcc')];
            });
            this.refs = r.refs.map(n=>{
                if (n[1] in getNameMap()) {
                    if (!getNameMap()[n[1]].endsWith('pcd')) {
                        throw n[0].getError(`Error in import statement: Only pcd file can be referenced`)
                    }
                    return <[Line, string]>[n[0], getNameMap()[n[1]]];
                }
                return <[Line, string]>[n[0], join(name, n + '.pcd')];
            });;
            this.macros = r.macros;
        }
    }
}

class FileManager {
    /**
     * Pcc file collection, the key is the file path of the file
     */
    pccFiles: {[key: string]: PccFile} = {};
    /**
     * Pcd file collection, the key is the file path of the file
     */
    pcdFiles: {[key: string]: object} = {};
    context: Context;

    constructor(context: Context) {
        this.context = context;
    }

    /**
     * Load the pcc file, with all its dependencies and references
     * @param filepath File path of the pcc file
     */
    async loadPcc(filepath: string) {
        let content: string;
        try {
            content = await readFile(filepath, 'utf-8');
        } catch (e) {
            e.message = `Error parsing ${filepath}:\n` + e.message;
            throw e;
        }

        this.pccFiles[filepath] = new PccFile(filepath, content.split(LINE_DELIMITER));

        let refs = this.pccFiles[filepath].refs.filter(r=>!(r[1] in this.pcdFiles));
        try {
            (await Promise.all(refs.map(r=>readJson(r[1]).catch(e=>{throw r[0].getError(e);})))).map((v, i)=>this.pcdFiles[refs[i][1]] = v);
        } catch (e) {
            e.message = `Error parsing references for ${filepath}:\n` + e.message;
            throw e;
        }

        let imports = this.pccFiles[filepath].imports.filter(i=>!(i[1] in this.pccFiles));
        try {
            await Promise.all(imports.map(i=>this.loadPcc(i[1]).catch(e=>{throw i[0].getError(e);})));
        } catch (e) {
            e.message = `Error parsing dependencies for ${filepath}:\n` + e.message;
            throw e;
        }
    }

    /**
     * Return a generator, which yields all the constants which could be accessed by this file
     * @param name File path of the pcc file
     */
    getConstants(name: string) {
        let pccFiles = this.pccFiles;
        return function *() {
            //return the constants in the current file
            for (let c of pccFiles[name].constants) {
                yield c;
            }
            //return the constants in the imported files
            for (let i of pccFiles[name].imports) {
                for (let c of pccFiles[i[1]].constants) {
                    yield c;
                }
            }
        }
    }

    /**
     * Return a generator, which yields all the macros which could be accessed by this file
     * @param name File path of the pcd file
     */
    getMacros(name: string) {
        let imports = this.pccFiles;
        return function *() {
            //return the macros in the current file
            for (let c of imports[name].macros) {
                yield c;
            }
            //return the macros in the imported files
            for (let i of imports[name].imports) {
                for (let c of imports[i[1]].macros) {
                    yield c;
                }
            }
        }
    }
}