import Line from '../../util/line';
import Tree from '../../util/tree';
import {iterate} from '../../util/linked_list';
import {Statement, AstParser, AstNode} from '../typings';

export const StatementParser: AstParser = {
    childrenParsers: [],
    name: 'statement',
    prefix: ['break', 'continue', 'return'],
    parse: (l: Line): Statement => {
        let type: 'return' | 'continue' | 'break';
        switch (l.content) {
            case 'break':
                type = 'break';
                break;
            case 'continue':
                type = 'continue';
                break;
            case 'return':
                type = 'return';
                break;
            default:
                throw l.getError('Invalid statement ' + l.content);
        }
        return {
            nodeType: 'statement',
            statementType: type,
            source: l
        }
    }
}

/**
 * Visit all nodes, and throw error if break/continue statements are not put inside a while loop
 * @param m Node to be visited
 * @param inWhile Whether the node is inside a while loop
 */
export function statementVisitor(m: Tree<undefined|AstNode, AstNode>, inWhile = false) {
    if (!m.child) {
        return;
    }
    for (let t of iterate(m.child)) {
        switch (t.data.nodeType) {
            case 'while':
                statementVisitor(t, true);
                break;
            case 'statement':
                if (t.data.statementType !== 'return' && !inWhile) {
                    throw t.data.source.getError(`${t.data.statementType} should be placed inside while loops`);
                }
                break;
            default:
                statementVisitor(t, inWhile);
                break;
        }
    }
}