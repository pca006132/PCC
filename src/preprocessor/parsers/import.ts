import Line from '../../util/line';
import {replaceSegment} from '../../util/linked_list';
import {DeclarationParser, Result} from '../typings';

export default <DeclarationParser> {
    match(l: Line) {
        return l.content.startsWith('import');
    },
    parse(line: Line, result: Result) {
        if (line.indent > 0)
            throw line.getError('Import statement should not be inside of any code block');
        if (line.content.length <= 7)
            throw line.getError('Empty import statement');
        result.imports.push([line, line.content.substring(7)]);
        //delete current line
        replaceSegment(line, line);
    }
}
