import * as sandbox from '../../util/sandbox';
import Line from '../../util/line';
import {iterate, replaceSegment} from '../../util/linked_list';

const CONDITION_PATTERN = /^#if (.+):$/;
const ELIF_PATTERN = /^#elif (.+):$/;

/**
 * Parse #if directive and the following #elif and #else directives
 * @param line Line to be checked
 * @param context sandbox context to run the expression
 * @returns whether the line is matched against the directive
 */
export default function expandConditional(line: Line, context: sandbox.Context) {
    if (line.content.startsWith('#elif')) {
        throw line.getError('#elif directive should be placed after #if directive instead of on its own');
    }
    if (line.content.startsWith('#else')) {
        throw line.getError('#else directive should be placed after #if directive instead of on its own');
    }
    if (line.content.startsWith('#if')) {
        let m = CONDITION_PATTERN.exec(line.content);
        if (!m) {
            throw line.getError('Invalid #if directive');
        }
        let condition: boolean;
        try {
            condition = Boolean(sandbox.runExpression(m[1], context));
        } catch (e) {
            throw line.getError('Error evaluating condition', e.toString());
        }

        let end = line;
        let last = line;
        if (line.next && line.next.indent > line.indent) {
            for (let l of iterate(line.next, l=>l.indent > line.indent)) {
                if (condition) {
                    l.indent--;
                } else {
                    end = l;
                }
                last = l;
            }
        } else {
            throw line.getError('Empty #if directive body');
        }
        if (last.next && last.next.indent === line.indent) {
            parseElse(condition, last.next, context);
        }
        replaceSegment(line, end);
        return true;
    }
    return false;
}

function parseElse(c: boolean, line: Line, context: sandbox.Context) {
    if (line.content.startsWith('#elif')) {
        let m = ELIF_PATTERN.exec(line.content);
        if (!m) {
            throw line.getError('Invalid #elif directive');
        }
        let condition;
        try {
            condition = !c && Boolean(sandbox.runExpression(m[1], context));
        } catch (e) {
            throw line.getError('Error evaluating condition', e.toString());
        }
        let end = line;
        let last = line;
        if (line.next && line.next.indent > line.indent) {
            for (let l of iterate(line.next, l=>l.indent > line.indent)) {
                if (condition) {
                    l.indent--;
                } else {
                    end = l;
                }
                last = l;
            }
        } else {
            throw line.getError('Empty #elif directive body');
        }
        if (last.next && last.next.indent === line.indent) {
            parseElse(c || condition, last.next, context);
        }
        replaceSegment(line, end);
    } else if (line.content.startsWith('#else')) {
        if (line.content !== '#else:') {
            throw line.getError('Invalid #else directive');
        }
        let end = line;
        if (line.next && line.next.indent > line.indent) {
            for (let l of iterate(line.next, l=>l.indent > line.indent)) {
                if (!c) {
                    l.indent--;
                } else {
                    end = l;
                }
            }
        } else {
            throw line.getError('Empty #else directive body');
        }
        replaceSegment(line, end);
    }
}