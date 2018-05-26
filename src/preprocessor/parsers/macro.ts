import Line from '../../util/line';
import {iterate, replaceSegment} from '../../util/linked_list';
import {DeclarationParser, Result, Macro} from '../typings';
import {regexEscape, getParams} from '../../util/text';
import {expandConstants} from './constant';

const MACRO_PATTERN = /^#macro (#[a-zA-Z0-9_]+)(\(.*\)):$/;

export const parser = <DeclarationParser> {
    match(l: Line) {
        return l.content.startsWith('#macro');
    },
    parse(line: Line, result: Result) {
        if (line.indent > 0)
            throw line.getError('Macro declaration should not be inside of any code block');
        let m = MACRO_PATTERN.exec(line.content);
        if (!m) {
            throw line.getError('Invalid macro pattern');
        }
        if (!line.next || line.next.indent <= line.indent) {
            throw line.getError('Empty macro body');
        }
        let skipIndent = line.indent + 1;
        let lineStart: Line = line.next;
        let lineEnd: Line = line.next;

        for (let l of iterate(line.next, l=>l.indent >= skipIndent)) {
            lineEnd = l;
        }
        let params;
        try {
            params = getParams(m[2]).params.map(p=>new RegExp(regexEscape(p.trim()), 'g'))
        } catch (e) {
            throw line.getError((e as Error).message);
        }

        result.macros.push({
            name: new RegExp('^' + regexEscape(m[1])),
            params: params,
            lineStart: lineStart
        })

        if (lineEnd) {
            replaceSegment(line, lineEnd);
        }
    }
}

/**
 * Expand macro
 * @param lines The line to be checked, note that there must be a linked list header at the start of the lines
 * @param macro Macro to be checked against
 * @returns If any macro is matched
 */
export function expandMacro(lines: Line, macro: Iterable<Macro>) {
    for (let i of macro) {
        let m = i.name.exec(lines.content);
        if (m) {
            let r = getParams(lines.content, m[0].length);
            if (r.index !== lines.content.length) {
                lines.getError('Macro call should occupy the entire line');
            }
            if (r.params.length !== i.params.length) {
                lines.getError(`Expected ${i.params.length} parameters, but got ${r.params.length}`);
            }

            let params = r.params.map((v, index) => ({name: i.params[index], content: v}));

            let temp = lines;
            for (let l of iterate(i.lineStart)) {
                temp = l.copy(lines.file[0], lines.lineNum[0]).insertAfter(temp);
                expandConstants(temp, params);
            }

            replaceSegment(lines, lines);
            return true;
        }
    }
    return false;
}