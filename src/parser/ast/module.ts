import Line from '../../util/line';
import Tree from '../../util/tree';
import {iterate} from '../../util/linked_list';
import {Module, AstParser, AstNode, TopLevel} from '../typings';

const PATTERN = /^module ([a-z0-9_\-\.]+):$/;

export const ModuleParser: AstParser = {
    childrenParsers: ['module', 'function', 'template', 'event', 'decorator-annotation', 'event-annotation'],
    name: 'module',
    prefix: ['module'],
    parse: (l: Line): Module => {
        let m = PATTERN.exec(l.content);
        if (!m) {
            throw l.getError('Invalid module pattern');
        }
        if (m[1].split(/\./g).filter(v=>v.length > 0).join('.') !== m[1]) {
            throw l.getError('Invalid module name');
        }
        return {
            nodeType: 'module',
            name: m[1],
            source: l
        }
    }
}

function isTopLevel(n: AstNode): n is AstNode&TopLevel {
    return (<TopLevel>n).name !== undefined;
}

export function visitModule(m: Tree<undefined|AstNode, AstNode>, ns: string[] = []) {
    if (!m.child) {
        return;
    }
    for (let t of iterate(m.child)) {
        if (isTopLevel(t.data)) {
            t.data.namespace = ns;
            if (t.data.nodeType === 'module') {
                //visit module
                visitModule(t, [...ns, t.data.name]);
            }
        }
    }
}