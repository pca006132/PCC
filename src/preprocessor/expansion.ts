/**
 * Expand preprocessing elements
 */

import {Constant, Macro} from './typings';
import {getParams} from '../util/text';
import Line from '../util/line';
import {iterate} from '../util/linked_list';
import * as sandbox from '../util/sandbox';

import expandConditional from './parsers/conditional';
import {expandConstants} from './parsers/constant';
import expandInlineJs from './parsers/interpolation';
import expandIteration from './parsers/iteration';
import {expandMacro} from './parsers/macro';

export default function expand(lines: {next: Line}, constants: Iterable<Constant>, macro: Iterable<Macro>, context: sandbox.Context) {
    let temp: {next?: Line} = lines;
    let skipIndent = 0;
    while (temp.next) {
        //skip template content
        if (skipIndent > 0) {
            if (temp.next.indent >= skipIndent) {
                temp = temp.next;
                continue;
            } else {
                skipIndent = 0;
            }
        }
        if (temp.next.content.startsWith('template')) {
            skipIndent = temp.next.indent + 1;
            temp = temp.next;
            continue;
        }

        if (temp.next.content.startsWith('raw:')) {
            //skip these processing
            temp.next.content = temp.next.content.substring(4);
        } else {
            expandConstants(temp.next, constants);
            expandInlineJs(temp.next, context);

            if (expandConditional(temp.next, context) || expandMacro(temp.next, macro) || expandIteration(temp.next, context)) {
                //loop the current line again
                continue;
            }

        }
        temp = temp.next;
    }
}
