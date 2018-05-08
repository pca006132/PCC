import {expect} from 'chai';
import * as linkedList from '../../src/util/linked_list';

//simple LinkedListNode implementation for testing
class Simple extends linkedList.LinkedListNode<Simple> {
    id: number;
    constructor(id: number) {
        super();
        this.id = id;
    }
}

describe('linked list', function () {
    const ids = [0, 1, 2, 3, 4];
    let list: {next: Simple};

    beforeEach(function () {
        let nodes = ids.map(i=>new Simple(i));
        nodes.forEach((v, i)=> {
            if (i > 0)
                v.before = nodes[i-1];
            if (i < nodes.length - 1)
                v.next = nodes[i+1];
        })
        list = {next: nodes[0]}
        nodes[0].before = list;
    })

    describe('iterate', function () {
        it('should iterate in the order defined in ids', function () {
            let result =  [...(linkedList.iterate(list.next))].map(v=>v.id);
            expect(result).to.have.ordered.members(ids);
        })
        it('should iterate until 3 (3 is not included)', function () {
            let result =  [...(linkedList.iterate(list.next, i=>i.id === 0 || i.id % 3 !== 0))].map(v=>v.id);
            expect(result).to.have.ordered.members([0, 1, 2]);
        })
        it('should skip 2 only', function () {
            let result: number[] = [];
            for (let v of linkedList.iterate(list.next)) {
                if (v.id === 1) {
                    //remove 2
                    let two = v.next;
                    if (two) {
                        v.next = two.next;
                        if (two.next) {
                            two.next.before = v;
                        }
                    }
                }
                result.push(v.id);
            }
            expect(result).to.have.ordered.members(ids.filter(v=>v!==2));
        })
        it('should iterate through 0 1 5 2 3 4', function () {
            let result: number[] = [];
            for (let v of linkedList.iterate(list.next)) {
                if (v.id === 1) {
                    //insert 5
                    let five = new Simple(5);
                    five.before = v;
                    five.next = v.next;
                    if (v.next)
                        v.next.before = five;
                    v.next = five;
                }
                result.push(v.id);
            }
            expect(result).to.have.ordered.members([0, 1, 5, 2 ,3, 4]);
        })
    })
    describe('replaceSegment', function () {
        it('should seperate 1 from 0-4', function () {
            let nodes = [...(linkedList.iterate(list.next))];
            linkedList.replaceSegment(nodes[1], nodes[1]);

            expect(nodes[0].next).to.equal(nodes[2]);
            expect(nodes[2].before).to.equal(nodes[0]);
            expect(nodes[1].before).to.be.undefined;
            expect(nodes[1].next).to.be.undefined;
        })
        it('should seperate 1 and 2 from 0-4', function () {
            let nodes = [...(linkedList.iterate(list.next))];
            linkedList.replaceSegment(nodes[1], nodes[2]);

            expect(nodes[0].next).to.equal(nodes[3]);
            expect(nodes[3].before).to.equal(nodes[0]);
            expect(nodes[1].before).to.be.undefined;
            expect(nodes[2].next).to.be.undefined;
        })
    })
})