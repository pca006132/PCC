/**
 * parser used for parsing conditions
 */

import {skipArgument} from '../util/text';

export enum ReservedTokens {
    OP, //opening parenthesis
    CP, //closing parenthesis
    AND,
    OR,
    NOT
}

interface Condition {
    subcommand: string;
    negation: boolean;
    id?: number; //scoreboard fake player name id
}

type Token = ReservedTokens | Condition;

function isCondition(obj: Token): obj is Condition {
    return typeof obj === 'object' && 'subcommand' in obj;
}

/**
 * Tokenize the condition, note that this would not throw error for imbalance brackets
 * @param input String input
 * @param i Start of the condition
 * @param end Index of the end of the condition, default to the input length
 * @returns List of tokens of the condition
 */
export function conditionTokenizer(input: string, i: number = 0, end = input.length): Token[] {
    let tokens: Token[] = [];
    for (; i < end; i++) {
        switch (input[i]) {
            case ' ':
                //skip spaces
                break;
            case '(':
                //if the token before is a complete expression
                if (tokens.length > 0 && (isCondition(tokens[tokens.length - 1]) || tokens[tokens.length - 1] === ReservedTokens.CP))
                    throw new Error('Invalid condition');
                tokens.push(ReservedTokens.OP);
                break;
            case ')':
                //if the token before is not a complete expression
                if (tokens.length > 0 && tokens[tokens.length - 1] !== ReservedTokens.CP && !isCondition(tokens[tokens.length - 1]))
                    throw new Error('Invalid condition');
                tokens.push(ReservedTokens.CP);
                break;
            case '!':
                //if the token before is a complete expression
                if (tokens.length > 0 && (isCondition(tokens[tokens.length - 1]) || tokens[tokens.length - 1] === ReservedTokens.CP))
                    throw new Error('Invalid condition');
                tokens.push(ReservedTokens.NOT);
                break;
            case '&':
                //if the token before is not a complete expression
                if (tokens.length > 0 && tokens[tokens.length - 1] !== ReservedTokens.CP && !isCondition(tokens[tokens.length - 1]))
                    throw new Error('Invalid condition');
                if (input.length - 1 > i && input[++i] === '&') {
                    tokens.push(ReservedTokens.AND);
                } else {
                    throw new Error('Single & character in condition is prohibited');
                }
                break;
            case '|':
                //if the token before is not a complete expression
                if (tokens.length > 0 && tokens[tokens.length - 1] !== ReservedTokens.CP && !isCondition(tokens[tokens.length - 1]))
                    throw new Error('Invalid condition');
                if (input.length - 1 > i && input[++i] === '|') {
                    tokens.push(ReservedTokens.OR);
                } else {
                    throw new Error('Single | character in condition is prohibited');
                }
                break;
            default:
                let result = skipArgument(input, i);
                let last = tokens[tokens.length - 1];
                if (isCondition(last)) {
                    last.subcommand += ' ' + input.substring(i, result);
                } else {
                    tokens.push({subcommand: input.substring(i, result), negation: false});
                }
                i = result - 1;
                break;
        }
    }
    return tokens;
}

/**
 * Shunting yard implementation, note that this would throw an error if there is any imbalance bracket
 * @param tokens Tokens to be parsed
 * @returns Parsed tokens
 */
export function shuntingYard(tokens: Token[]): Token[] {
    let output: Token[] = [];
    let operators: (ReservedTokens.OP | ReservedTokens.AND | ReservedTokens.OR | ReservedTokens.NOT)[] = [];
    let rev = false;

    function mutate(token: ReservedTokens.AND | ReservedTokens.OR) {
        if (rev && token === ReservedTokens.AND) {
            return ReservedTokens.OR;
        } else if (rev && token === ReservedTokens.OR) {
            return ReservedTokens.AND;
        }
        return token;
    }
    function removeNots() {
        while (operators.length > 0 && operators[operators.length - 1] === ReservedTokens.NOT) {
            operators.pop();
            rev = !rev;
        }
    }

    for (let t of tokens) {
        if (isCondition(t)) {
            t.negation = rev;
            output.push(t);
        } else {
            switch (t) {
                case ReservedTokens.OP:
                    operators.push(t);
                    break;
                case ReservedTokens.AND:
                case ReservedTokens.OR:
                    removeNots()
                    operators.push(mutate(t));
                    break;
                case ReservedTokens.CP:
                    while (operators.length > 0) {
                        let p = operators.pop()!;
                        if (p === ReservedTokens.OP) {
                            break;
                        }
                        if (p === ReservedTokens.NOT) {
                            rev = !rev;
                        } else {
                            output.push(p);
                        }
                    }
                    break;
                case ReservedTokens.NOT:
                    operators.push(t);
                    rev = !rev;
                    break;
            }
        }
    }
    while (operators.length > 0) {
        let p = operators.pop()!;
        if (p === ReservedTokens.OP) {
            throw new Error('Imbalance parenthesis');
        } else if (p === ReservedTokens.NOT) {
            rev = !rev;
        } else {
            output.push(mutate(p));
        }
    }
    return output;
}