import * as vm from 'vm';

export type Macro = {[key: string]: (x: string[])=>
    {content: string, indent: number}[]};
export type CustomCommand = {[key: string]: (x: string[])=>
    {content: string, indent: number}[]};

/**
 * Sandbox for each file
 */
export class Context implements vm.Context {
    constructor() {
        /** range generator:
        * (end): Generate numbers from 0 to end step 1 (-1 if end < 0)
        * (start, end): Generate numbers from start to end step 1 (-1 if end < start)
        * (start, end, step): Generate numbers from start to end step x
        */
        this['range'] = function *(a: number, b: number|null = null, c: number|null = null) {
            let _b, _c: number;
            if (b === null) {
                _b = a;
                a = 0;
            } else {
                _b = b;
            }
            if (c === null) {
                _c = a > _b? -1 : 1;
            } else {
                _c = c;
            }

            let compare = (n: number) => {
                if (a < _b)
                    return n < _b;
                return n > _b;
            }

            for (let i = a; compare(i); i += _c)
                yield i;
        }

        vm.createContext(this);
    }
}

/**
 * Load scripts into the file sandbox
 * @param scripts Scripts to be loaded into the sandbox
 * @param context File sandbox
 */
export function loadScripts(scripts: {name: string, code: string}[], context: Context) {
    for (let i of scripts) {
        try {
            vm.runInContext(i.code, context);
        } catch (e) {
            throw new Error(`Error loading ${i.name}`);
        }
    }
}

/**
 * Run an expression in context.helper, may throw an error due to syntax or runtime error.
 * @param expression Expression to be run
 * @param context File context
 * @returns Result of the expression
 */
export function runExpression(expression: string, context: Context): any {
    return vm.runInContext(expression, context);
}

/**
 * Special toString function for numbers.
 * @param obj Source object
 * @returns String representation of the object
 */
export function toString(obj: any) {
    if (obj instanceof Number) {
        return obj.toFixed(5);
    }
    return obj.toString();
}
