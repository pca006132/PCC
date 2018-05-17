import { LinkedListNode } from "./linked_list";

/**
 * A: Current tree node data type, useful for setting root node
 * T: Children nodes data type, default equal to A
 */
export default class Tree<A, T = A> extends LinkedListNode {
    child?: Tree<T>;
    lastChild?: Tree<T>;
    data: A;
    constructor(data: A) {
        super();
        this.data = data;
    }
    appendChildren(c: Tree<T>) {
        if (!this.lastChild) {
            this.child = c;
            this.lastChild = c;
        } else {
            this.lastChild = c.insertAfter(this.lastChild);
        }
    }
}