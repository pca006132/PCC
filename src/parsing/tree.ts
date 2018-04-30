import {LinkedListNode} from '../util/linked_list';

export class TreeNode {
    next: TreeNode | null = null;
    before: TreeNode | null = null;
    parent: TreeNode | null = null;
    child: TreeNode | null = null;
    _last_child: TreeNode | null = null;
    name: string;
    data: any;
    src: {file: string, lineNum: number};
    constructor(name: string, data: any, src: {file: string, lineNum: number}) {
        this.name = name;
        this.data = data;
        this.src = src;
    }
    addNext(name: string, data: any, src: {file: string, lineNum: number}) {
        let n = new TreeNode(name, data, src);
        if (this.next) {
            this.next.before = n;
            n.next = this.next;
        }
        this.next = n;
        return n;
    }
    addChild(name: string, data: any, src: {file: string, lineNum: number}) {
        let n: TreeNode;
        if (this._last_child) {
            n = this._last_child.addNext(name, data, src);
        } else {
            n = new TreeNode(name, data, src);
            this.child = n;
        }
        this._last_child = n;
        n.parent = this;
        return n;
    }
}

export function printTree(node: TreeNode, level = 0) {
    console.log(`${'    '.repeat(level)}Name: ${node.name}, Data: ${JSON.stringify(node.data)}`);
    if (node.child) {
        printTree(node.child, level + 1);
    }
    if (node.next) {
        printTree(node.next, level);
    }
}