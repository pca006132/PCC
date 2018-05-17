import Line from '../../util/line';
import {Statement, AstParser} from '../typings';

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