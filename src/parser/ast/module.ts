import Line from '../../util/line';
import {Module, ASTParser} from '../typings';

const PATTERN = /^module ([a-z0-9_\-\.]+):$/;

export const ModuleParser: ASTParser = {
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