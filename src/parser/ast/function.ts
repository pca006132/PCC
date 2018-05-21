import Line from '../../util/line';
import Tree from '../../util/tree';
import {iterate} from '../../util/linked_list';
import {Function, AstParser, AstNode} from '../typings';

const PATTERN = /^def ([a-z0-9_\-]+):$/;

export const FunctionParser: AstParser = {
    childrenParsers: ['if', 'while', 'command', 'statement'],
    name: 'function',
    prefix: ['def'],
    parse: (l: Line): Function => {
        let m = PATTERN.exec(l.content);
        if (!m) {
            throw l.getError('Invalid function pattern');
        }
        return {
            nodeType: 'function',
            name: m[1],
            events: [],
            decorators: [],
            commands: [],
            source: l
        }
    }
}

/**
 * Get the function list in the node
 * @param m Root node to be visited
 */
export function getFunctions(m: Tree<undefined|AstNode, AstNode>): Function[] {
    let functions: Function[] = [];
    if (!m.child) {
        return [];
    }
    for (let t of iterate(m.child)) {
        switch (t.data.nodeType) {
            case 'module':
                functions = functions.concat(getFunctions(t));
                break;
            case 'function':
                functions.push(t.data);
                break;
        }
    }
    return functions;
}