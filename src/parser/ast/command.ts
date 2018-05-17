import Line from '../../util/line';
import {Command, Anonymous, ASTParser} from '../typings';

export function CommandParser(l: Line): {Node: Command | Anonymous, childrenParsers: string[]} {
    if (l.content.startsWith('execute') && l.content.endsWith('run:')) {
        return {
            Node: <Anonymous>{
                nodeType: 'anonymous',
                execute: l.content.substring(0, l.content.length - 1),
                endCommands: [],
                source: l
            },
            childrenParsers: []
        }
    }
    return {
        Node: <Command>{
            nodeType: 'command',
            command: l.content,
            source: l
        },
        childrenParsers: ['if', 'while', 'command', 'statement']
    }
}