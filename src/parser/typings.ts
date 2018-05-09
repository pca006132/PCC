import Line from '../util/line';

type NodeType = 'module'
    | 'placeholder' //special placeholder for decorator
    | 'template'
    | 'function'
    | 'event'
    | 'decorator-annotation'
    | 'event-annotation'
    //these should be placed inside functions
    | 'if'
    | 'while'
    | 'anonymous'
    | 'command'
    | 'return'
    | 'continue'
    | 'break';

export type Nodes = Module | PlaceHolder | Template;

interface BaseNode {
    source: Line;
}
interface TopLevel {
    name: string;
    namespace: string[];
}

interface Module extends BaseNode {
    nodeType: 'module';
    name: string;
}
interface PlaceHolder extends BaseNode, TopLevel {
    nodeType: 'placeholder';
    events: EventAnnotation[];
}
interface Template extends BaseNode, TopLevel {
    nodeType: 'template';
    lines: Line;
    params: string[];
}
interface Function extends BaseNode, TopLevel {
    nodeType: 'function';
    events: EventAnnotation[];
    decorators: DecoratorAnnotation[];
    commands: string[];
}
interface Event extends BaseNode, TopLevel {
    nodeType: 'event';
}
interface DecoratorAnnotation extends BaseNode, TopLevel {
    nodeType: 'decorator-annotation';
    params: string[];
}
interface EventAnnotation extends BaseNode, TopLevel {
    nodeType: 'event-annotation';
}
interface If extends BaseNode {
    nodeType: 'if';
    isElse: boolean;
    checks: string[]; //commands evaluating the conditions
}
interface While extends BaseNode {
    nodeType: 'while';
    checks: string[]; //commands evaluating the conditions
}