import {Line} from './line';
import * as list from '../util/linked_list';
import * as helper from '../util/textutil';

export interface Macro {
    name: RegExp;
    params: RegExp[];
    content: {indent: number, content: string}[];
}

export function parseMacro(macro: Macro, line: Line) {
    let m = macro.name.exec(line.item.content);
    if (m) {
        let params: string[];
        try {
            params = helper.getParams(line.item.content, m[0].length);
            if (!line.item.content.endsWith(')')) {
                throw new Error();
            }
            if (params.length !== macro.params.length) {
                throw new Error();
            }
        } catch (e) {
            return false;
        }
        let r = list.listToLinkedList(macro.content.map(l=>{
            let content = l.content;
            for (let i = 0; i < params.length; i++) {
                content = content.replace(macro.params[i], params[i]);
            }
            return {
                indent: l.indent + line.item.indent,
                content: content,
                lineNum: line.item.lineNum,
                file: line.item.file,
                generated: true
            }
        }))

        list.replaceSegment(line, line, r? r[0] : null, r? r[1]: null);

        return true;
    }
    return false;
}