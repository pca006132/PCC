/**
 * parser used for parsing conditions
 */

import {skipArgument} from '../util/text';
import {getObjective} from '../config';

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
    function checker(complete: boolean) {
        if (tokens.length > 0 && complete == (isCondition(tokens[tokens.length - 1]) || tokens[tokens.length - 1] === ReservedTokens.CP))
            throw new Error('Invalid condition');
    }
    let tokens: Token[] = [];
    for (; i < end; i++) {
        switch (input[i]) {
            case ' ':
                //skip spaces
                break;
            case '(':
                checker(true);
                tokens.push(ReservedTokens.OP);
                break;
            case ')':
                checker(false);
                tokens.push(ReservedTokens.CP);
                break;
            case '!':
                checker(true);
                tokens.push(ReservedTokens.NOT);
                break;
            case '&':
                checker(false);
                if (input.length - 1 > i && input[++i] === '&') {
                    tokens.push(ReservedTokens.AND);
                } else {
                    throw new Error('Single & character in condition is prohibited');
                }
                break;
            case '|':
                checker(false);
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
 * @returns Parsed tokens in RPN order
 */
export function shuntingYard(tokens: Token[]): (Condition|ReservedTokens.AND|ReservedTokens.OR)[] {
    let output: (Condition|ReservedTokens.AND|ReservedTokens.OR)[] = [];
    let operators: (ReservedTokens.OP | ReservedTokens.AND | ReservedTokens.OR | ReservedTokens.NOT)[] = [];
    //If the operator and conditions need to take negation
    let rev = false;

    //Negation for AND and OR
    function flip(token: ReservedTokens.AND | ReservedTokens.OR) {
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

    /*
        Algorithm: Basically it is just shunting yard, but with a bit additional logic to handle the not operator:
        The `not` token affects the operand (maybe an expression in parenthesis) after it, it would reverse the rev flag,
        and push a `not` token into the operators stack. When a `&&`, `||`, `)` operator is read, it indicates an end of the previous
        operand, thus it would try to pop the `not` tokens in the operators stack and switch back to the state before.
    */

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
                    operators.push(flip(t));
                    break;
                case ReservedTokens.CP:
                    //Check if any opening parenthesis is poped off
                    let poped = false;
                    while (operators.length > 0) {
                        let p = operators.pop()!;
                        if (p === ReservedTokens.OP) {
                            poped = true;
                            break;
                        }
                        if (p === ReservedTokens.NOT) {
                            rev = !rev;
                        } else {
                            output.push(p);
                        }
                    }
                    if (!poped) {
                        throw new Error('Imbalance parenthesis');
                    }
                    break;
                case ReservedTokens.NOT:
                    operators.push(t);
                    rev = !rev;
                    break;
            }
        }
    }
    //pop the remaining operators in the stack
    while (operators.length > 0) {
        let p = operators.pop()!;
        if (p === ReservedTokens.OP) {
            throw new Error('Imbalance parenthesis');
        } else if (p === ReservedTokens.NOT) {
            rev = !rev;
        } else {
            output.push(flip(p));
        }
    }
    return output;
}

/**
 * Convert the input into tokens in RPN order (just the combination of conditionTokenizer and shuntingYard)
 * @param input String input
 * @param i Start of the condition
 * @param end Index of the end of the condition, default to the input length
 * @returns Parsed tokens in RPN order
 */
export function toRPN(input: string, i = 0, end = input.length) {
    return shuntingYard(conditionTokenizer(input, i, end));
}

/**
 * Evaluate condition in RPN order, and returns the list of commands. The score in #if is the result of the condition
 * @param tokens Tokens in RPN order
 * @param finalIdOptimization Whether it is needed to convert the final id to #if
 * @returns List of commands
 */
export function evaluateRPN(tokens: (Condition|ReservedTokens.AND|ReservedTokens.OR)[], finalIdOptimization = true) {
    //id counter, to prevent id conflict
    let counter = 0;
    //string: subcommand,
    //mode: 0 for if, 1 for unless, 2 for store
    //id: score id
    let commands: (string|{mode: number, id: number})[][] = [];
    let conditionStack: (string|{mode: number, id: number})[][] = [];
    function toCommand(parts: (string|{mode: number, id: number})[]) {
        return 'execute ' + parts.map(p=>{
            if (typeof p === 'string')
                return p;
            let id;
            if (finalIdOptimization && p.id === counter)
                id = 'if';
            else
                id = p.id;
            if (p.mode === 0)
                return `if score #${p.id} ${getObjective()} matches 1`;
            if (p.mode === 1)
                return `unless score #${p.id} ${getObjective()} matches 1`;
            return `store result score #${p.id} ${getObjective()}`;
        }).join(' ');
    }

    for (let i = 0; i < tokens.length; i++) {
        let t = tokens[i];
        switch (t) {
            case ReservedTokens.AND: {
                //For the case of AND, we can just join the two conditions together in a chain
                if (conditionStack.length < 2) {
                    throw new Error('Invalid condition');
                }
                let b = conditionStack.pop()!;
                conditionStack[conditionStack.length - 1].push(...b);
            }
            break;
            case ReservedTokens.OR: {
                /*
                    For the case of OR, the logic is as follows:
                    If one of the two operands is the result of an
                    or operation before, use that id as the current id,
                    and do not need to run check for that condition.
                    Otherwise, use counter as the id and increment the counter by 1

                    For the b part (the one runs after the first condition, it would only
                    run if the score is not 1 already, otherwise it would overwrite the score.
                */
                if (conditionStack.length < 2) {
                    throw new Error('Invalid condition');
                }
                let b = conditionStack.pop()!;
                let a = conditionStack.pop()!;
                if (typeof a[0] === 'string') {
                    let b0 = b[0];
                    if (typeof b0 !== 'string' && b0.mode === 0) {
                        [a, b] = [b, a]; //swap a and b, such that a is a number
                    }
                }
                let a0 = a[0];
                let id = (typeof a0 === 'object' && a0.mode === 0)? a0.id : counter++;
                if (typeof a0 !== 'object' || a0.mode !== 0) {
                    commands.push([{mode: 2, id: id}, ...a]);
                }
                commands.push([{mode: 1, id: id}, {mode: 2, id: id}, ...b]);
                conditionStack.push([{mode: 0, id: id}]);
            }
            break;
            default:
                //Just convert the condition to an /execute command's subcommand
                conditionStack.push([`${t.negation? 'unless':'if'} ${t.subcommand}`]);
        }
    }
    if (conditionStack.length !== 1) {
        throw new Error('Invalid condition');
    }
    counter--;

    return {
        evaluation: commands.map(c=>toCommand(c)),
        condition: toCommand(conditionStack.pop()!)
    }
}