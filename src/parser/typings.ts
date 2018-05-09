import Line from '../util/line';

export type Nodes = Module
    | PlaceHolder
    | Template
    | Function
    | Event
    | DecoratorAnnotation
    | If
    | While
    | Anonymous
    | Command
    | Statement;

interface BaseNode {
    source: Line;
}
interface TopLevel {
    name: string;
    namespace: string[];
}

export interface Module extends BaseNode {
    nodeType: 'module';
    name: string;
}
export interface PlaceHolder extends BaseNode, TopLevel {
    nodeType: 'placeholder';
    events: EventAnnotation[];
}
export interface Template extends BaseNode, TopLevel {
    nodeType: 'template';
    lines: Line;
    params: string[];
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
    checks: string[]; //commands evaluating the conditions
}
export interface While extends BaseNode {
    nodeType: 'while';
    checks: string[]; //commands evaluating the conditions
}
export interface Anonymous extends BaseNode {
    nodeType: 'anonymous';
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