import Line from '../../util/line';
import {replaceSegment} from '../../util/linked_list';
import {DeclarationParser, Result, Constant} from '../typings';
import {regexEscape} from '../../util/text';

const CONSTANT_PATTERN = /^#define (\$[a-zA-Z0-9_]+) (.+)$/;

export const parser = <DeclarationParser> {
    match(l: Line) {
        return l.content.startsWith('#define');
    },
    parse(line: Line, result: Result) {
        if (line.indent > 0)
            throw line.getError('Constant declaration should not be inside of any code block');
        let m = CONSTANT_PATTERN.exec(line.content);
        if (!m) {
            throw line.getError('Invalid constant pattern');
        }
        result.constants.push({
            name: new RegExp(regexEscape(m[1]), 'g'),
            content: m[2]
        })
        //delete current line
        replaceSegment(line, line);
    }
}

export function expandConstants(line: Line, constants: Iterable<Constant>) {
    for (let c of constants) {
        line.content = line.content.replace(c.name, c.content);
    }
}