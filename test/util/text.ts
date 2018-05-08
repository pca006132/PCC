import {expect} from 'chai';
import {getParams} from '../../src/util/text';

describe('getParams', function () {
    describe('basic cases', function () {
        it('should return empty parameter', function () {
            const input = '()';
            const result = getParams(input);
            expect(result.params).to.be.empty;
        })
        it('should return 1 parameter', function () {
            const input = '(test 1)';
            const result = getParams(input);
            expect(result.params).to.have.ordered.members(['test 1']);
        })
        it('should return 3 parameters', function () {
            const input = '(test, test2, test3)';
            const result = getParams(input);
            expect(result.params).to.have.ordered.members(['test', 'test2', 'test3']);
        })
        it('should return the index after the last parenthesis', function () {
            const input = '(test, test2, test3)';
            const result = getParams(input);
            expect(result.index).to.equal(input.length);
        })
    })

    describe('string segment cases', function () {
        it('should return empty parameter', function () {
            const input = ' () ';
            const result = getParams(input, 1);
            expect(result.params).to.be.empty;
            expect(result.index).to.equal(input.length - 1);
        })
        it('should return the index after the last parenthesis', function () {
            const input = ' () ';
            const result = getParams(input, 1);
            expect(result.index).to.equal(input.length - 1);
        })
    })

    describe('quoted parameters cases', function () {
        it('should return ()', function () {
            const input = '("()")';
            const result = getParams(input);
            expect(result.params).to.have.ordered.members(['()']);
            expect(result.index).to.equal(input.length);
        })
        it('should return "()"', function () {
            const input = '("\\"()\\"")';
            const result = getParams(input);
            expect(result.params).to.have.ordered.members(['"()"']);
            expect(result.index).to.equal(input.length);
        })
    })

    describe('invalid cases', function () {
        it('should throw an error if the index provided is not the start of the arguments', function () {
            const input = ' () ';
            expect(()=>getParams(input)).to.throw('Invalid parameter');
        })
        it('should throw an error if the index provided is out of range', function () {
            const input = '';
            expect(()=>getParams(input, 1)).to.throw('Invalid parameter');
        })
        it('should throw an error iff the escape sequence is not permitted', function () {
            expect(()=>getParams('("\\"")')).to.not.throw();
            expect(()=>getParams('("\\\\")')).to.not.throw();
            expect(()=>getParams('("\\a)')).to.throw('Invalid escape sequence in parameters');
        })
        it('should throw an error if there is no terminating parenthesis', function () {
            expect(()=>getParams('(')).to.throw('Not terminated parameters');
        })
    })
})
