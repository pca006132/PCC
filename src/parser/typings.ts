import Line from '../util/line';

/**
 * Content for a tree node in AST
 * Use nodeType to distinguish between different type of node
 */
export type AstNode = Module
    | PlaceHolder
    | Template
    | Function
    | Event
    | DecoratorAnnotation
    | EventAnnotation
    | If
    | While
    | Anonymous
    | Command
    | Statement;

interface BaseNode {
    source: Line;
}
export interface TopLevel {
    name: string;
    namespace?: string[]; //Should be set by the visitor
}

export interface AstParser {
    childrenParsers: string[]; //Names for the parsers allowed to parse its children
    name: string;              //Name of the parser
    prefix: string[];          //Prefix of the line in order to match the parser, empty for command parser
    parse: (l: Line)=>AstNode;    //Parse a line into a node
}

export interface Module extends BaseNode, TopLevel {
    nodeType: 'module';
}
export interface PlaceHolder extends BaseNode, TopLevel {
    nodeType: 'placeholder';
    events: EventAnnotation[];
}
export interface Template extends BaseNode, TopLevel {
    nodeType: 'template';
    lines: {next: Line};
    params: RegExp[];
}
export interface Function extends BaseNode, TopLevel {
    nodeType: 'function';
    events: EventAnnotation[];
    decorators: DecoratorAnnotation[];
    commands: string[];
}
export interface Event extends BaseNode, TopLevel {
    nodeType: 'event';
}
export interface DecoratorAnnotation extends BaseNode, TopLevel {
    nodeType: 'decorator-annotation';
    params: string[];
}
export interface EventAnnotation extends BaseNode, TopLevel {
    nodeType: 'event-annotation';
}
export interface If extends BaseNode {
    nodeType: 'if';
    isElse: boolean;
    hasElse?: boolean;
    evaluation: string[]; //commands evaluating the conditions
    condition: string; //the actual execute command(without the function part) condition
}
export interface While extends BaseNode {
    nodeType: 'while';
    evaluation: string[]; //commands evaluating the conditions
    condition: string; //the actual execute command(without the function part) condition
}
export interface Anonymous extends BaseNode {
    nodeType: 'anonymous';
    execute: string;       //execute command, should end with `run`
    endCommands: string[]; //commands that should be run at the end of the anonymous function
}
export interface Command extends BaseNode {
    nodeType: 'command';
    command: string;
}
export interface Statement extends BaseNode {
    nodeType: 'statement';
    statementType: 'return' | 'continue' | 'break';
}