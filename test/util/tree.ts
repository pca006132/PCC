import { expect } from "chai";
import Tree from "../../src/util/tree";

describe("appendChildren", function () {
    it("should set root child and lastChild to `child`", function () {
        const root = new Tree<string>("first");
        const child = new Tree<string>("A");
        root.appendChildren(child);
        expect(root.data).to.equal("first");
        expect(root.child).to.equal(child);
        expect(root.lastChild).to.equal(child);
    })
    it("should set root child to A and last child to V", function () {
        const root = new Tree<string>("root");
        const A = new Tree<string>("A");
        const B = new Tree<string>("B");
        root.appendChildren(A);
        root.appendChildren(B);
        expect(root.child).to.equal(A);
        expect(root.lastChild).to.equal(B);
    })
    it("should be {A: {B, C}}", function () {
        const root = new Tree<string>("root");
        const A = new Tree<string>("A");
        const B = new Tree<string>("B");
        const C = new Tree<string>("C");
        root.appendChildren(A);
        A.appendChildren(B);
        A.appendChildren(C);
        expect(root.child).to.equal(A);
        expect(root.lastChild).to.equal(A);
        expect(A.child).to.equal(B);
        expect(A.lastChild).to.equal(C);
    })
})