/**
 * Linked list node, note that a {next: T} is needed for storing mutable linked list
 */

interface LinkedListHead<T> {
    next?: T;
}

export abstract class LinkedListNode {
    before?: this | LinkedListHead<this>;
    next?: this;

    insertAfter(l: this) {
        this.next = l.next;
        if (l.next)
            l.next.before = this;
        this.before = l;
        l.next = this;
        return this;
    }

    insertBefore(l: this) {
        if(this.before) {
            this.before.next = l;
        }
        l.before = this.before;
        l.next = this;
        this.before = l;
        return this;
    }
}


/**
 * Iterate over the linked list
 * @param item First item to be iterated
 * @param condition Function accepting the next item, returns if it should continue to iterate
 */
export function *iterate<T extends LinkedListNode>(item: T, condition: (item: T)=>boolean = _=>true): IterableIterator<T> {
    let last: T | {next?: T} = item.before || {next: item};
    while (last.next && condition(last.next)) {
        let temp = last.next;
        yield temp;
        //last.next may be modified when waiting
        //and the new one should also be yield
        if (temp !== last.next) {
            continue;
        }

        last = last.next;
    }
}

/**
 * Replace a segment [start, end] of a linked list by *replacement* [replacementStart, replacementEnd]
 * @param start Starting node to be replaced by *replacement*
 * @param end The last node to be replaced by *replacement*
 * @param replacementStart The first node of *replacement*
 * @param replacementEnd The last node of *replacement*
 */
export function replaceSegment<T extends LinkedListNode>(start: T, end: T, replacementStart: T | null = null, replacementEnd: T | null = replacementStart) {
    if (replacementStart === null || replacementEnd === null) {
        if (start.before) {
            start.before.next = end.next;
        } else {
            throw new Error('There must be a linked list head in order to use replaceSegment');
        }
        if (end.next) {
            end.next.before = start.before;
        }

        start.before = undefined;
        end.next = undefined;
        return;
    }

    if (start.before) {
        start.before.next = replacementStart;
    }
    if (end.next) {
        end.next.before = replacementEnd;
    }
    replacementStart.before = start.before;
    replacementEnd.next = end.next;
}