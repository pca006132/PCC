import Line from '../../util/line';
import {replaceSegment} from '../../util/linked_list';
import {DeclarationParser, Result} from '../typings';

export default <DeclarationParser> {
    match(l: Line) {
        return l.content.startsWith('ref');
    },
    parse(line: Line, result: Result) {
        if (line.indent > 0)
            throw line.getError('Reference statement should not be inside of any code block');
        if (line.content.length <= 4)
            throw line.getError('Empty reference statement');
        result.refs.push([line, line.content.substring(4)]);
        //delete current line
        replaceSegment(line, line);
    }
}
