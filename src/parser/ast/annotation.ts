import Line from '../../util/line';
import Tree from '../../util/tree';
import {iterate} from '../../util/linked_list';
import {getParams} from '../../util/text';
import {DecoratorAnnotation, EventAnnotation, AstParser, AstNode} from '../typings';

export const DecoratorAnnotationParser: AstParser = {
    childrenParsers: [],
    name: 'decorator-annotation',
    prefix: ['@decorator'],
    parse: (l: Line): DecoratorAnnotation => {
        let name: string;
        let params: string[];
        let index = l.content.indexOf('(');
        if (index > -1) {
            name = l.content.substring(11, index);
            let r: { params: string[]; index: number; };
            try {
                r = getParams(l.content, index);
            } catch (e) {
                throw l.getError((e as Error).message);
            }
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

export const EventAnnotationParser: AstParser = {
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

/**
 * Visit modules and add the annotations to the function node
 * Throw error if there is no function node after the annotations
 * @param n Tree node to be visited
 */
export function annotationVisitor(n: Tree<AstNode|undefined, AstNode>) {
    if (!n.child) {
        return;
    }
    let events: EventAnnotation[] = [];
    let decorators: DecoratorAnnotation[] = [];

    for (let t of iterate(n.child)) {
        switch (t.data.nodeType) {
            case 'decorator-annotation':
                decorators.push(t.data);
                break;
            case 'event-annotation':
                events.push(t.data);
                break;
            case 'function':
                t.data.events = events;
                t.data.decorators = decorators;
                events = [];
                decorators = [];
                break;
            default:
                if (events.length !== 0 || decorators.length !== 0) {
                    throw t.data.source.getError('Expected function declaration after event/decorator annotation');
                }
                if (t.data.nodeType === 'module') {
                    annotationVisitor(t);
                }
                break;
        }
    }
}