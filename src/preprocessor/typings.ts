/**
 * Types declaration
 */
import Line from '../util/line';

export type Constant = {name: RegExp, content: string};
export type Macro = {name: RegExp, params: RegExp[], lineStart: Line}
export class Result {
    constants: Constant[] = [];
    macros: Macro[] = [];
    imports: string[] = [];
    refs: string[] = [];
};
export interface DeclarationParser {
    match(l: Line): boolean;
    parse(line: Line, result: Result): void;
};