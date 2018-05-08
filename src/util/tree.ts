import { LinkedListNode } from "./linked_list";

export default class Tree<T> extends LinkedListNode<Tree<T>> {
    child?: Tree<T>;
    lastChild?: Tree<T>;
    data: T;
    constructor(data: T) {
        super();
        this.data = data;
    }
    insertAfter(t: this) {
        this.next = t.next;
        if (t.next)
            t.next.before = this;
        this.before = t;
        t.next = this;
        return this;
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