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

/**
 * Parse the lines and return the root node of the AST.
 * @param lines Line head of the lines to be parsed
 */
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
        parserFinder: for (let p of Parsers) {
            for (let prefix of p.prefix) {
                //find the appropriate parser, we use prefix of the line as criteria
                if (l.content.startsWith(prefix)) {
                    if (stack[stack.length-1].childrenParsers.indexOf(p.name) === -1) {
                        //this parser is not allowed inside a specific node
                        //for example, a function definition inside another function definition (in pcc)
                        throw l.getError('Unexpected statement');
                    }
                    n = p.parse(l);
                    childrenParsers = p.childrenParsers;
                    break parserFinder;
                }
            }
        }
        if (!n) {
            //not handled by the parsers above -> maybe a command (could be the start of an anonymous function either)
            if (stack[stack.length-1].childrenParsers.indexOf('command') === -1) {
                throw l.getError('Unexpected statement');
            }
            ({Node: n, childrenParsers} = CommandParser(l));
        }
        let tree = new Tree(n);
        stack[stack.length-1].node.appendChildren(tree);
        stack.push({node: tree, childrenParsers: childrenParsers!});
    }

    //set all the attributes in the nodes
    moduleVisitor(root);
    annotationVisitor(root);
    statementVisitor(root);
    ifVisitor(root);
    return root;
}

/**
 * Return the functions, templates and events in the AST
 * @param ast Root node of the AST
 */
export function getElements(ast: Tree<undefined, AstNode>) {
    return {
        functions: getFunctions(ast),
        templates: getTemplates(ast),
        events: getEvents(ast)
    }
}