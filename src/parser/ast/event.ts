import Line from '../../util/line';
import Tree from '../../util/tree';
import {iterate} from '../../util/linked_list';
import {Event, AstParser, AstNode} from '../typings';

const PATTERN = /^event ([a-z0-9_\-]+)$/;

export const EventParser: AstParser = {
    childrenParsers: [],
    name: 'event',
    prefix: ['event'],
    parse: (l: Line): Event => {
        let m = PATTERN.exec(l.content);
        if (!m) {
            throw l.getError('Invalid event pattern');
        }
        return {
            nodeType: 'event',
            name: m[1],
            source: l
        }
    }
}

/**
 * Get the event list in the node
 * @param m Root node to be visited
 */
export function getEvents(m: Tree<undefined|AstNode, AstNode>): Event[] {
    let events: Event[] = [];
    if (!m.child) {
        return [];
    }
    for (let t of iterate(m.child)) {
        switch (t.data.nodeType) {
            case 'module':
                events = events.concat(getEvents(t));
                break;
            case 'event':
                events.push(t.data);
                break;
        }
    }
    return events;
}