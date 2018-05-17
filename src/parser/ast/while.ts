import Line from '../../util/line';
import {While, AstParser} from '../typings';
import {toRPN, evaluateRPN, ReservedTokens} from '../condition';
import {getObjective} from '../../config';

export const WhileParser: AstParser = {
    childrenParsers: ['if', 'while', 'command', 'statement'],
    name: 'while',
    prefix: ['while'],
    parse: (l: Line): While => {
        if (!l.content.endsWith(':')) {
            throw l.getError('Invalid while statement: Expected ending `:` character');
        }
        let result: {
            evaluation: string[];
            condition: string;
        } = {evaluation: [], condition: ''};
        let condition = l.content.substring(6, l.content.length - 1);
        try {
            let rpn = toRPN(condition);
            result = evaluateRPN(rpn);
        } catch (e) {
            throw l.getError('Error evaluating condition', (<Error>e).message);
        }
        return {
            source: l,
            evaluation: result.evaluation,
            condition: result.condition,
            nodeType: 'while'
        }
    }
}