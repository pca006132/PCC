import Line from '../util/line';
import {iterate} from '../util/linked_list';
import {Result, DeclarationParser} from './typings';

import {parser as a} from './parsers/constant';
import b from './parsers/import';
import c from './parsers/json';
import {parser as d} from './parsers/macro';
import e from './parsers/reference';

const parsers: DeclarationParser[] = [a, b, c, d, e];

/**
 * Get and remove declarations lines including dependencies, constants and macro
 * Actual preprocessing is handled by ./expansion.ts when all pcc files are processed by this function,
 * as there may be imported constants/macro that are currently unknown to the processor
 * @param lines Lines to be processed
 * @returns Result containing dependencies and declarations
 */
export default function getDeclarations(lines: {next: Line}) {
    let result = new Result();
    for (let line of iterate(lines.next)) {
        for (let p of parsers) {
            if (p.match(line)) {
                p.parse(line, result);
                break;
            }
        }
    }
    return result;
}
