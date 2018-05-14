import Line from '../../util/line';
import {Function, ASTParser} from '../typings';

const PATTERN = /^def ([a-z0-9_\-]+):$/;

export const FunctionParser: ASTParser = {
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