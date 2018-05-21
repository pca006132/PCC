import Line from '../../util/line';
import Tree from '../../util/tree';
import {iterate, replaceSegment} from '../../util/linked_list';
import * as helper from '../../util/text';
import {Template, AstParser, AstNode} from '../typings';

const PATTERN = /^template ([a-z0-9_\-]+)(\(.*\)):$/;

export const TemplateParser: AstParser = {
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
        l.next!.before = first;
        return {
            nodeType: 'template',
            lines: first,
            params: params,
            name: name,
            source: l
        }
    }
}

/**
 * Get the template list in the node
 * @param m Root node to be visited
 */
export function getTemplates(m: Tree<undefined|AstNode, AstNode>): Template[] {
    let templates: Template[] = [];
    if (!m.child) {
        return [];
    }
    for (let t of iterate(m.child)) {
        switch (t.data.nodeType) {
            case 'module':
                templates = templates.concat(getTemplates(t));
                break;
            case 'template':
                templates.push(t.data);
                break;
        }
    }
    return templates;
}