import Line from '../../util/line';
import {iterate, replaceSegment} from '../../util/linked_list';
import * as helper from '../../util/text';
import {Template, ASTParser} from '../typings';

const PATTERN = /^template ([a-z0-9_\-]+)(\(.*\)):$/;

export const TemplateParser: ASTParser = {
    childrenParsers: [],
    name: 'template',
    prefix: ['template'],
    parse: (l: Line): Template => {
        let m = PATTERN.exec(l.content);
        if (!m) {
            throw l.getError('Invalid template pattern');
        }
        let name = m[1];
        let params = helper.getParams(m[2]).params.map(v=>new RegExp(helper.regexEscape(v), 'g'));

        //check code block
        if (!l.next || l.next.indent <= l.indent) {
            throw l.getError('Empty template');
        }
        let first = {next: l.next!};
        let last = l.next!;
        for (let temp of iterate(l.next, temp=>temp.indent > l.indent)) {
            last = temp;
        }
        //Seperate the lines from the original lines
        replaceSegment(l.next!, last);
        return {
            nodeType: 'template',
            lines: first,
            params: params,
            name: name,
            source: l
        }
    }
}