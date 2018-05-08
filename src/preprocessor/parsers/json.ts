import Line from '../../util/line';
import {iterate, replaceSegment} from '../../util/linked_list';
import {DeclarationParser, Result} from '../typings';
import {regexEscape} from '../../util/text';
import {safeLoad} from 'js-yaml';

const JSON_PATTERN = /^#json (\$[a-zA-Z0-9_]+):$/;

export default <DeclarationParser> {
    match(l: Line) {
        return l.content.startsWith('#json');
    },
    parse(line: Line, result: Result) {
        if (line.indent > 0)
            throw line.getError('JSON constant declaration should not be inside of any code block');
        let m = JSON_PATTERN.exec(line.content);
        if (!m) {
            throw line.getError('Invalid JSON constant pattern');
        }
        if (!line.next || line.next.indent <= line.indent) {
            throw line.getError('Empty JSON constant body');
        }
        let content: string[] = [];
        let skipIndent = line.indent + 1;
        let lineEnd = line;
        for (let l of iterate(line.next, l=>l.indent >= skipIndent)) {
            content.push('  '.repeat(l.indent) + l.content);
            lineEnd = l;
        }
        let data: any;
        try {
            data = safeLoad(content.join('\n'));
        } catch (e) {
            throw line.getError('Error parsing JSON/YAML', e.reason || 'unknown reason');
        }
        result.constants.push({
            name: new RegExp(regexEscape(m[1]), 'g'),
            content: JSON.stringify(data)
        })

        replaceSegment(line, lineEnd);
    }
}
