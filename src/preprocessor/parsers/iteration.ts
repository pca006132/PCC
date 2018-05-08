import * as sandbox from '../../util/sandbox';
import Line from '../../util/line';
import {iterate, replaceSegment} from '../../util/linked_list';
import {expandConstants} from './constant';
import {regexEscape} from '../../util/text';

const ITERATION_PATTERN = /^#for (\$\w+) in (.+):$/;

/**
 * Parse #for directive
 * @param line Line to be checked
 * @param context sandbox context to run the expression
 * @returns whether the line is matched against the directive
 */
export default function expandIteration(line: Line, context: sandbox.Context) {
    if (line.content.startsWith('#for')) {
        let m = ITERATION_PATTERN.exec(line.content);
        if (!m) {
            throw line.getError('Invalid #for directive format');
        }
        let name = new RegExp(regexEscape(m[1]), 'g');
        let last = line;
        let replacementStart: Line | null = null;
        let replacementEnd: Line | null = null;

        if (!line.next) {
            throw line.getError('Empty #for directive body');
        }

        for (let i of sandbox.runExpression(m[2], context)) {
            let constant = [{name: name, content: sandbox.toString(i)}];
            for (let l of iterate(line.next, l=>l.indent > line.indent)) {
                last = l;
                let n = l.copy(line.file[0], line.lineNum[0]);
                expandConstants(n, constant);
                if (!replacementStart || !replacementEnd) {
                    replacementStart = n;
                    replacementEnd = n;
                } else {
                    replacementEnd = n.insertAfter(replacementEnd);
                }
            }
        }

        replaceSegment(line, last, replacementStart, replacementEnd);
        return true;
    }
    return false;
}