import Line from '../../util/line';
import {If, ASTParser} from '../typings';
import {toRPN, evaluateRPN, ReservedTokens} from '../condition';
import {getObjective} from '../../config';

export const IfParser: ASTParser = {
    childrenParsers: ['if', 'while', 'command', 'statement'],
    name: 'if',
    prefix: ['if', 'elif', 'else'],
    parse: (l: Line): If => {
        let isElse = !l.content.startsWith('if');
        if (!l.content.endsWith(':')) {
            throw l.getError('Invalid if statement: Expected ending `:` character');
        }
        let result: {
            evaluation: string[];
            condition: string;
        } = {evaluation: [], condition: ''};
        if (!l.content.startsWith('else')) {
            let condition = l.content.substring(isElse? 5 : 3, l.content.length - 1);
            try {
                let rpn = toRPN(condition);
                if (isElse) {
                    //Convert the condition to
                    //#if common matches 1 && (original condition)
                    //and turn off the optimization as that may change the score of #if
                    rpn.unshift({subcommand: `score #if ${getObjective()} matches 1`, negation: false});
                    rpn.push(ReservedTokens.AND);
                }
                result = evaluateRPN(rpn, !isElse);
            } catch (e) {
                throw l.getError('Error evaluating condition', (<Error>e).message);
            }
        } else {
            result.condition = `execute if score #if ${getObjective()} matches 1 run`;
        }
        return {
            isElse: isElse,
            source: l,
            evaluation: result.evaluation,
            condition: result.condition,
            nodeType: 'if'
        }
    }
}