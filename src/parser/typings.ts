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

export type Nodes = Module;

interface Module {
    nodeType: 'module';

}