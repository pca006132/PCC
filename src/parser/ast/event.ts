import Line from '../../util/line';
import {Event, ASTParser} from '../typings';

const PATTERN = /^event ([a-z0-9_\-]+)$/;

export const EventParser: ASTParser = {
    childrenParsers: [],
    name: 'event',
    prefix: ['event'],
    parse: (l: Line): Event => {
        let m = PATTERN.exec(l.content);
        if (!m) {
            throw l.getError('Invalid event pattern');
        }
        return {
            nodeType: 'event',
            name: m[1],
            source: l
        }
    }
}