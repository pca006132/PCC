import {Line, LineError} from '../parsing/line';
import {TreeNode} from '../parsing/tree';
import {getParams} from '../util/textutil';

interface Module {
    defs: {[key: string]: TreeNode | string};
    templates: {[key: string]: {
        params: RegExp[],
        content: Line[],
        file: string,
        num: number, //for function suffix
        usage: {
            [key: string]: string
        }
    }};
    events: {[key: string]: {
        file: string,
        usage: string[]
    }};
}

const NS_PATTERN = /:|\//g;
const DOT_PATTERN = /\./g;
function ns2dot(original: string) {
    return original.replace(NS_PATTERN, '.');
}
function dot2ns(original: string) {
    let count = 0;
    return original.replace(DOT_PATTERN, (m)=>{
        if (count++ === 0)
            return ':';
        return '/';
    })
}
function getFullName(original: string, current: string) {
    if (original.indexOf(':') > -1) {
        return ns2dot(original);
    }
    while (original.startsWith('../')) {
        original = original.substring(3);
        let index = current.lastIndexOf('.');
        if (index === -1) {
            throw new Error();
        }
        current = current.substring(0, index);
    }
    return current + '.' + original;
}
function getModuleAndName(fullname: string) {
    let index = fullname.lastIndexOf('.');
    if (index === -1 || index === fullname.length - 1) {
        throw new Error('Invalid name');
    }
    return [fullname.substring(0, index), fullname.substring(index+1)];
}

export default class ModuleManager {
    modules: {[key: string]: Module} = {};
    templates: {ns: string, name: string, actualNs: string, actual: string, events: string[], params: {name: RegExp, content: string}[], lineNum: number}[] = [];
    defs: {ns: string, name: string}[] = [];
    accessChecker: (a: string, b: string)=> boolean;

    constructor(checker: (a: string, b: string)=> boolean) {
        this.accessChecker = checker;
    }

    addDef(fullname: string, content: TreeNode | null, file: string, processed = false) {
        fullname = ns2dot(fullname);
        let [ns, name] = getModuleAndName(fullname);
        if (!this.modules[ns]) {
            this.modules[ns] = {
                defs: {},
                templates: {},
                events: {}
            }
        }
        if (this.modules[ns].defs[name]) {
            let conflict: string;
            let fn = this.modules[ns].defs[name];
            if (fn instanceof TreeNode) {
                conflict = fn.src.file;
            } else {
                conflict = fn;
            }
            throw new Error(`Conflict function declaration ${dot2ns(fullname)} between ${file} and ${conflict}`);
        }
        if (content) {
            content.data.num = 1; //initialize a counter for anonymous function naming
            let temp_name = name;
            if (content.data.events) {
                for (let event of content.data.events) {
                    let _fullname = getFullName(event, ns);
                    let [_ns, _name] = getModuleAndName(_fullname);
                    if (!this.modules[_ns] || !this.modules[_ns].events[_name]) {
                        throw new Error(`Unknown event ${dot2ns(_fullname)} for function ${dot2ns(fullname)} in ${file}`);
                    }
                    if (!this.accessChecker(file, this.modules[_ns].events[_name].file)) {
                        throw new Error(`Unknown event ${dot2ns(_fullname)} for function ${dot2ns(fullname)} in ${file}`);
                    }
                    this.modules[_ns].events[_name].usage.push(dot2ns(fullname));
                }
            }
            if (content.data.wrappers) {
                for (let wrapper of content.data.wrappers) {
                    let _fullname = getFullName(wrapper.name, ns);
                    let [_ns, _name] = getModuleAndName(_fullname);
                    if (!this.modules[_ns] || !this.modules[_ns].templates[_name]) {
                        throw new Error(`Unknown wrapper(template) ${dot2ns(_fullname)} for function ${dot2ns(fullname)} in ${file}`);
                    }
                    if (!this.accessChecker(file, this.modules[_ns].templates[_name].file)) {
                        throw new Error(`Unknown wrapper(template) ${dot2ns(_fullname)} for function ${dot2ns(fullname)} in ${file}`);
                    }
                    if (this.modules[_ns].templates[_name].params.length !== wrapper.params.length + 1) {
                        throw new Error(`Invalid wrapper ${dot2ns(_fullname)} for function ${dot2ns(fullname)} in ${file}: \nInvalid params length, expected ` +
                        ` ${this.modules[_ns].templates[_name].params.length - 1} but got ${wrapper.params.length + 1}`);
                    }
                    wrapper.params.push(name + '_' + (content.data.num).toString());
                    this.templates.push({
                        ns: _ns,
                        actualNs: ns,
                        name: _name,
                        actual: temp_name,
                        params: this.modules[_ns].templates[_name].params.map((v, i)=>({name: v, content: wrapper.params[i]})),
                        lineNum: content.src.lineNum,
                        events: []
                    })
                    temp_name = name + '_' + (content.data.num++).toString();
                }
            }
            this.modules[ns].defs[temp_name] = content;
            if (!processed) {
                this.defs.push({ns: ns, name: temp_name});
            }
        } else {
            this.modules[ns].defs[name] = file;
        }
    }

    //should be called before calling addDef
    addTemplate(template: {
        name: string,
        params: RegExp[],
        ns: string,
        content: Line[],
        file: string,
        lineNum: number
    }) {
        if (!this.modules[template.ns]) {
            this.modules[template.ns] = {
                defs: {},
                templates: {},
                events: {}
            }
        }
        if (this.modules[template.ns].templates[template.name]) {
            let conflict = this.modules[template.ns].templates[template.name].file;
            throw new Error(`Conflict template declaration ${dot2ns(template.ns + '.' + template.name)} between ${template.file} and ${conflict}`);
        }
        this.modules[template.ns].templates[template.name] = {
            params: template.params,
            content: template.content,
            file: template.file,
            num: 233,
            usage: {}
        }
    }
    //should be called before calling addDef
    addEvent(event: {
        name: string,
        ns: string,
        file: string
    }) {
        if (!this.modules[event.ns]) {
            this.modules[event.ns] = {
                defs: {},
                templates: {},
                events: {}
            }
        }
        if (this.modules[event.ns].events[event.name]) {
            let conflict = this.modules[event.ns].events[event.name].file;
            throw new Error(`Conflict event declaration ${dot2ns(event.ns + '.' + event.name)} between ${event.file} and ${conflict}`);
        }
        this.modules[event.ns].events[event.name] = {
            file: event.file,
            usage: []
        }
    }

    parseName(name: string, file: string, fn_ns: string, lineNum: number) {
        let index = name.indexOf('(');
        if (index > -1) {
            //template
            let params = getParams(name.substring(index), 0);
            let [ns, n] = getModuleAndName(getFullName(name.substring(0, index), fn_ns));

            if (!this.modules[ns] || !this.modules[ns].templates[n]) {
                throw new Error('Unknown template ' + dot2ns(ns + '.' + n));
            }
            if (!this.accessChecker(file, this.modules[ns].templates[n].file)) {
                throw new Error('Unknown template ' + dot2ns(ns + '.' + n));
            }
            if (this.modules[ns].templates[n].params.length !== params.length) {
                throw new Error(`Invalid parameters: expected ${this.modules[ns].templates[n].params.length} but got ${params.length}`);
            }
            let serialized = JSON.stringify(params);
            if (!this.modules[ns].templates[n].usage[serialized]) {
                this.templates.push({
                    ns: ns,
                    actualNs: ns,
                    name: n,
                    actual: n + this.modules[ns].templates[n].num.toString(),
                    params: this.modules[ns].templates[n].params.map((v, i)=>({name: v, content: params[i]})),
                    lineNum: lineNum,
                    events: []
                })
                this.modules[ns].templates[n].usage[serialized] = n + (this.modules[ns].templates[n].num++).toString();
            }
            return dot2ns(ns + '.' + this.modules[ns].templates[n].usage[serialized]);
        } else if (name.startsWith('#')) {
            //event
            let [ns, n] = getModuleAndName(getFullName(name.substring(1), fn_ns));
            if (!this.modules[ns] || !this.modules[ns].events[n]) {
                throw new Error('Unknown event ' + dot2ns(ns + '.' + n));
            }
            if (!this.accessChecker(file, this.modules[ns].events[n].file)) {
                throw new Error('Unknown event ' + dot2ns(ns + '.' + n));
            }
            return '#' + dot2ns(ns + '.' + n);
        } else {
            let [ns, n] = getModuleAndName(getFullName(name, fn_ns));
            if (!this.modules[ns] || !this.modules[ns].defs[n]) {
                throw new Error('Unknown function ' + dot2ns(ns + '.' + n));
            }
            let fn = this.modules[ns].defs[n];
            if (fn instanceof TreeNode) {
                if (!this.accessChecker(file, fn.src.file)) {
                    throw new Error('Unknown function ' + dot2ns(ns + '.' + n));
                }
            } else {
                if (!this.accessChecker(file, fn)) {
                    throw new Error('Unknown function ' + dot2ns(ns + '.' + n));
                }
            }

            return dot2ns(ns + '.' + n);
        }
    }
}
