import {expect} from 'chai';
import Line from '../../src/util/line';

describe('line test', function () {
    describe('copy', function () {
        it('should copy "a" with file: a and lineNum: 1', function () {
            let a = new Line('a', 0, ['', 'test'], [0, 233]);
            let copy = a.copy('a', 1);

            //these should be the same as a
            expect(copy.content).to.equal(a.content);
            expect(copy.indent).to.equal(a.indent);

            //these should be modified
            expect(copy.file).to.have.ordered.members(['a', '', 'test']);
            expect(copy.lineNum).to.have.ordered.members([1, 0, 233]);
        })
    })

    describe('toString', function () {
        it('should return simple message with no line stack trace', function () {
            let foo = new Line('a', 0, 'test', 0);

            expect(foo.toString()).to.equal('test:0\na\n');
        })
        it('should return line stack trace', function () {
            let foo = new Line('a', 0, ['a', 'b', 'test'], [1, 0, 233]);
            expect(foo.toString()).to.equal('a:1\na\n  generated from b:0\n  generated from test:233');
        })
    })
})