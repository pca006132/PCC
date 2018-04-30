/**
 * Implementation of linked list, which is used mainly for lines and tree nodes
 */

export class LinkedListNode<T> implements Iterable<LinkedListNode<T>>{
    item: T;
    next: LinkedListNode<T> | null;
    before: LinkedListNode<T> | null;

    /**
     * Create a linked list node with the item *obj*.
     * @param obj Item of the node
     */
    constructor(obj: T) {
        this.item = obj;
        this.next = null;
        this.before = null;
    }

    /**
     * Insert an item (create a node) after the current node
     * @param obj Item to be inserted after
     * @returns The node inserted
     */
    insertItemAfter(obj: T): LinkedListNode<T> {
        let temp = new LinkedListNode(obj);
        temp.next = this.next;
        if (this.next)
            this.next.before = temp;
        temp.before = this;
        this.next = temp;
        return temp;
    }

    /**
     * Yield nodes starting from the current node, stop when the condition is false or there is no more items
     * @param condition Should the generator yield the next node
     */
    *generator(condition: (item: T)=>boolean): IterableIterator<LinkedListNode<T>> {
        let last: LinkedListNode<T> | null = new LinkedListNode(this.item);
        last.next = this;
        while (last.next !== null && condition(last.next.item)) {
            yield last.next;
            last = last.next;
        }
    }

    [Symbol.iterator]() {
        return this.generator((_)=>true);
    }
}

/**
 * Convert a list to a linked list, and return its first node
 * @param list List of items to be converted into a linked list
 * @returns Returns the first and the last node of the linked list
 */
export function listToLinkedList<T>(list: T[]): [LinkedListNode<T>,LinkedListNode<T>] | null {
    let index = 0;
    if (list.length === 0)
        return null;
    let start = new LinkedListNode(list[0]);
    let current = start;
    while (++index < list.length) {
        current = current.insertItemAfter(list[index]);
    }
    return [start, current];
}

/**
 * Replace a segment [start, end] of a linked list by *replacement* [replacementStart, replacementEnd]
 * @param start Starting node to be replaced by *replacement*
 * @param end The last node to be replaced by *replacement*
 * @param replacementStart The first node of *replacement*
 * @param replacementEnd The last node of *replacement*
 */
export function replaceSegment<T>(start: LinkedListNode<T>, end: LinkedListNode<T>, replacementStart: LinkedListNode<T> | null, replacementEnd: LinkedListNode<T> | null) {
    if (replacementStart === null) {
        deleteSegment(start, end);
        return;
    }

    start.item = replacementStart.item;
    if (replacementEnd && end)
        replacementEnd.next = end.next;
    if (end && end.next)
        end.next.before = replacementEnd;

    if (replacementEnd !== replacementStart)
        start.next = replacementStart.next;

    if (replacementStart.next)
        replacementStart.next.before = start;
}

/**
 * Delete a segment [start, end] of a linked list
 * @param start Starting node to be deleted
 * @param end The last node to be deleted
 */
export function deleteSegment<T>(start: LinkedListNode<T>, end: LinkedListNode<T>| null = null) {
    if (end === null)
        end = start;
    if (start.before)
        start.before.next = end.next;
    if (end.next)
        end.next.before = start.before;
}

/**
 * Cut the link between the node and the node after it
 * @param node The node to be cut after
 */
export function cutAfter<T>(node: LinkedListNode<T>) {
    if (node.next)
        node.next.before = null;
    node.next = null;
}
