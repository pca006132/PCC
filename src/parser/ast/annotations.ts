import Line from '../../util/line';
import {getParams} from '../../util/text';
import {DecoratorAnnotation, EventAnnotation, ASTParser} from '../typings';

export const DecoratorAnnotationParser: ASTParser = {
    childrenParsers: [],
    name: 'decorator-annotation',
    prefix: ['@decorator'],
    parse: (l: Line): DecoratorAnnotation => {
        let name: string;
        let params: string[];
        let index = l.content.indexOf('(');
        if (index > -1) {
            name = l.content.substring(11, index);
            let r = getParams(l.content, index);
            params = r.params;
            if (r.index !== l.content.length) {
                throw l.getError('Invalid decorator annotation pattern');
            }
        } else {
            name = l.content.substring(11);
            params = [];
        }
        return {
            nodeType: 'decorator-annotation',
            params: params,
            name: name,
            source: l
        }
    }
}

export const EventAnnotationParser: ASTParser = {
    childrenParsers: [],
    name: 'event-annotation',
    prefix: ['@event'],
    parse: (l: Line): EventAnnotation => {
        let name: string = l.content.substring(6);
        return {
            nodeType: 'event-annotation',
            name: name,
            source: l
        }
    }
}
