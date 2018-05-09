import { LinkedListNode } from "./linked_list";

export default class Tree<T> extends LinkedListNode {
    child?: Tree<T>;
    lastChild?: Tree<T>;
    data: T;
    constructor(data: T) {
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