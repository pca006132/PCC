/**
 * Types declaration
 */
import Line from '../util/line';

export type Constant = {name: RegExp, content: string};
export type Macro = {name: RegExp, params: RegExp[], lineStart: Line}
export class Result {
    constants: Constant[] = [];
    macros: Macro[] = [];
    imports: [Line, string][] = [];
    refs: [Line, string][] = [];
};

/**
 * Parsing: Check if the line matches the specific parser first
 * If matched, parse that line. Could delete the current line and lines after it from the line list
 */
export interface DeclarationParser {
    match(l: Line): boolean;
    parse(line: Line, result: Result): void;
};