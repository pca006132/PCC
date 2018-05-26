import {Function, Event, Template, PlaceHolder, AstNode, EventAnnotation, DecoratorAnnotation} from '../parser/typings';
import Tree from '../util/tree';
import {getParams} from '../util/text';

const NS_PATTERN = /:|\//g;
const DOT_PATTERN = /\./g;
function ns2dot(input: string) {
    return input.replace(NS_PATTERN, '.');
}
function dot2ns(input: string) {
    let count = 0;
    return input.replace(DOT_PATTERN, (m)=>{
        if (count++ === 0)
            return ':';
        return '/';
    })
}
function getFullName(input: string, current: string) {
    if (input.indexOf(':') > -1) {
        return ns2dot(input);
    }
    while (input.startsWith('../')) {
        input = input.substring(3);
        let index = current.lastIndexOf('.');
        if (index === -1) {
            throw new Error('There is no parent module for root modules');
        }
        current = current.substring(0, index);
    }
    return current + '.' + input;
}
function getModuleAndName(fullname: string) {
    let index = fullname.lastIndexOf('.');
    if (index === -1 || index === fullname.length - 1) {
        throw new Error('Invalid name');
    }
    return [fullname.substring(0, index), fullname.substring(index+1)];
}
function getSuffixGenerator(): (preview?: boolean)=>string {
    let n = -1;
    let last = false;
    return (preview = false)=> {
        if (n === -1) {
            if (!last)
                n++;
            return '';
        }
        if (!last) {
            n++;
        }
        last = preview;
        return `_${n}`;
    }
}

class Module {
    Functions: {[key: string]: Function|PlaceHolder} = {};
    Events: {[key: string]: Event&{usage: string[]}} = {};
    Templates: {[key: string]: Template&{num: number, usage: {[key: string]: string}}} = {};

    hasFunction(name: string) {
        return this.Functions[name] && this.Functions[name].nodeType === 'function';
    }
    addFunction(fn: Function|PlaceHolder) {
        //use hasFunction becuase we could replace PlaceHolder function
        if (this.hasFunction(fn.name))
            throw new Error(`Function ${fn.name} is already defined in ${this.Functions[fn.name].source.file[0]}`);
        this.Functions[fn.name] = fn;
    }
    addEvent(event: Event) {
        if (event.name in this.Events)
            throw new Error(`Event ${event.name} is already defined in ${this.Events[event.name].source.file[0]}`);
        Object.defineProperties(event, {
            usage: {
                value: []
            }
        })
        this.Events[event.name] = event as Event&{usage: string[]};
    }
    addTemplate(template: Template) {
        if (template.name in this.Templates)
            throw new Error(`Template ${template.name} is already defined in ${this.Templates[template.name].source.file[0]}`);
        Object.defineProperties(template, {
            usage: {
                value: {}
            },
            num: {
                value: 1,
                writable: true
            }
        })
        this.Templates[template.name] = template as Template&{num: number, usage: {[key: string]: string}};
    }
}

class ModuleManager {
    modules: {[key: string]: Module} = {};
    //Returns whether b is a dependency of a
    accessChecker: (a: string, b: string)=>boolean;
    templateQueue: {
        template: Template,
        ns: string,
        name: string,
        params: string[],
        suffixGenerator: ()=>string
    }[] = [];

    constructor(accessChecker: (a: string, b: string)=>boolean) {
        this.accessChecker = accessChecker;
    }
    hasModule(name: string) {
        return name in this.modules;
    }
    getModule(name: string) {
        if (!this.hasModule(name)) {
            this.modules[name] = new Module();
        }
        return this.modules[name];
    }

    checker(ns: string, name: string, file: string, elementType: 'Event'): string|Event&{usage: string[]};
    checker(ns: string, name: string, file: string, elementType: 'Function'): string|Function|PlaceHolder;
    checker(ns: string, name: string, file: string, elementType: 'Template'): string|Template&{num: number, usage: {[key: string]: string}};
    checker(ns: string, name: string, file: string, elementType: 'Event'|'Function'|'Template'): string|
        Event&{usage: string[]}|Function|PlaceHolder|Template&{num: number, usage: {[key: string]: string}}
    {
        if (!this.hasModule(ns) || !(name in this.getModule(ns)[elementType + 's'])) {
            return `${elementType} ${dot2ns(`${ns}.${name}`)} does not exist.`;
        }
        if (!this.accessChecker(file, this.getModule(ns)[elementType + 's'][name].source.file[0])) {
            return `${elementType} ${dot2ns(`${ns}.${name}`)} is not accessible from this file.`;
        }
        const result = this.getModule(ns)[elementType + 's'][name];
        switch (elementType) {
            case 'Event': return result as Event&{usage: string[]};
            case 'Function': return result as Function|PlaceHolder;
            case 'Template': return result as Template&{num: number, usage: {[key: string]: string}};
        }
    }

    listen(fn: Function, e: EventAnnotation) {
        const [ns, name] = getModuleAndName(getFullName(e.name, e.namespace!.join('.')));
        const result = this.checker(ns, name, fn.source.file[0], 'Event');
        if (typeof result === 'string') {
            throw e.source.getError(result);
        }
        result.usage.push(fn.namespace!.join('.') + '.' + fn.name);
    }
    decorate(functionNs: string, functionName: string, t: DecoratorAnnotation, suffixGenerator: (preview?: boolean)=>string) {
        const [ns, name] = getModuleAndName(getFullName(t.name, t.namespace!.join('.')));
        const result = this.checker(ns, name, t.source.file[0], 'Template');
        if (typeof result === 'string') {
            throw t.source.getError(result);
        }
        const expectedLength = result.params.length;
        if (expectedLength !== t.params.length + 1) {
            throw t.source.getError(`Invalid parameters: Expected ${expectedLength - 1} but got ${t.params.length}`);
        }
        const suffix = suffixGenerator();
        const nextSuffix = suffixGenerator(true);
        //such that the next suffixGenerator call would yield nextSuffix again
        this.modules[functionNs].addFunction({
            nodeType: 'placeholder',
            source: t.source,
            name: `${functionName}${suffix}`,
            namespace: t.namespace
        });
        this.templateQueue.push({
            template: result,
            ns: functionNs,
            name: `${functionName}${suffix}`,
            params: [...t.params, dot2ns(`${ns}.${name}${nextSuffix}`)],
            suffixGenerator: suffixGenerator
        })
    }
    addFunction(fn: Function) {
        const suffixGenerator = getSuffixGenerator();
        const functionNs = fn.namespace!.join('.');
        //There must have no function/placeholder
        if (this.hasModule(functionNs) && (fn.name in this.getModule(functionNs).Functions)) {
            throw fn.source.getError(`Function ${dot2ns(`${functionNs}.${fn.name}`)} already exists`);
        }
        if (this.hasModule(functionNs) && (fn.name in this.getModule(functionNs).Templates)) {
            throw fn.source.getError(`Function should not have the same name as a template`);
        }

        //process event annotations
        for (let e of fn.events) {
            this.listen(fn, e);
        }
        //process decorators
        for (let t of fn.decorators) {
            this.decorate(functionNs, fn.name, t, suffixGenerator);
        }
        fn.name = fn.name + suffixGenerator();
        this.getModule(functionNs).addFunction(fn);
        return suffixGenerator;
    }
    addEvent(event: Event) {
        this.getModule(event.namespace!.join('.')).addEvent(event);
    }
    addTemplate(template: Template) {
        this.getModule(template.namespace!.join('.')).addTemplate(template);
    }
    getFullName(input: string, currentNs: string, file: string) {
        if (input.startsWith('#')) {
            //event
            const [ns, name] = getModuleAndName(getFullName(input.substring(1), currentNs));
            const result = this.checker(ns, name, file, 'Event');
            if (typeof result === 'string') {
                throw new Error(result);
            }
            return '#' + dot2ns(`${ns}.${name}`);
        }
        let i = input.indexOf('(');
        if (i > -1) {
            //template
            const [ns, name] = getModuleAndName(getFullName(input.substring(0, i), currentNs));
            const result = this.checker(ns, name, file, 'Template');
            if (typeof result === 'string') {
                throw new Error(result);
            }
            const r = getParams(input, i);
            const expectedLength = this.modules[ns].Templates[name].params.length;
            if (r.params.length !== expectedLength) {
                throw new Error(`Invalid parameters: Expected ${expectedLength} but got ${r.params.length}`);
            }
            const key = JSON.stringify(r.params);
            if (!(key in result.usage)) {
                const n = `${name}_${result.num++}`;
                result.usage[key] = dot2ns(`${ns}.${n}`);
                this.templateQueue.push({
                    template: result,
                    ns: ns,
                    name: n,
                    params: r.params,
                    suffixGenerator: getSuffixGenerator()
                })
            }
            return result.usage[key];
        }
        const [ns, name] = getModuleAndName(getFullName(input, currentNs));
        const result = this.checker(ns, name, file, 'Function');
        if (typeof result === 'string') {
            throw new Error(result);
        }
        return dot2ns(`${ns}.${name}`);
    }
}