import {AstNode, AstParser} from './typings';
import Tree from '../util/tree';
import Line from '../util/line';
import {iterate} from '../util/linked_list';

import {DecoratorAnnotationParser, EventAnnotationParser, annotationVisitor} from './ast/annotation';
import {CommandParser} from './ast/command';
import {EventParser, getEvents} from './ast/event';
import {FunctionParser, getFunctions} from './ast/function';
import {IfParser, ifVisitor} from './ast/if';
import {ModuleParser, moduleVisitor} from './ast/module';
import {StatementParser, statementVisitor} from './ast/statement';
import {TemplateParser, getTemplates} from './ast/template';
import {WhileParser} from './ast/while';

const Parsers: AstParser[] = [ModuleParser, TemplateParser, FunctionParser, EventParser,
    DecoratorAnnotationParser, EventAnnotationParser, IfParser, WhileParser, StatementParser];

export function buildAst(lines: {next: Line}): Tree<undefined, AstNode> {
    let root = new Tree<undefined, AstNode>(undefined);
    let stack: {node: Tree<undefined|AstNode, AstNode>, childrenParsers: string[]}[] = [
        {
            node: root,
            childrenParsers: ['module', 'function', 'template', 'event', 'decorator-annotation', 'event-annotation']
        }
    ]
    for (let l of iterate(lines.next)) {
        while (stack.length - 1 > l.indent) {
            stack.pop();
        }
        if (l.indent !== stack.length - 1) {
            throw l.getError('Unexpected indent');
        }
        let n: AstNode|undefined = undefined;
        let childrenParsers: string[];
        for (let p of Parsers) {
            let match = false;
            for (let prefix of p.prefix) {
                if (l.content.startsWith(prefix)) {
                    match = true;
                    break;
                }
            }
            if (match) {
                if (stack[stack.length-1].childrenParsers.indexOf(p.name) === -1) {
                    throw l.getError('Unexpected statement');
                }
                n = p.parse(l);
                childrenParsers = p.childrenParsers;
                break;
            }
        }
        if (!n) {
            if (stack[stack.length-1].childrenParsers.indexOf('command') === -1) {
                throw l.getError('Unexpected statement');
            }
            ({Node: n, childrenParsers} = CommandParser(l));
        }
        let tree = new Tree(n);
        stack[stack.length-1].node.appendChildren(tree);
        stack.push({node: tree, childrenParsers: childrenParsers!});
    }
    return root;
}

export function getElements(ast: Tree<undefined, AstNode>) {
    moduleVisitor(ast);
    annotationVisitor(ast);
    statementVisitor(ast);
    ifVisitor(ast);
    return {
        functions: getFunctions(ast),
        templates: getTemplates(ast),
        events: getEvents(ast)
    }
}