import { expect } from 'chai';
import { conditionTokenizer, ReservedTokens, shuntingYard } from '../../src/parser/condition';

describe('conditionTokenizer', function () {
    it('should return a list of tokens', function () {
        let result = conditionTokenizer('(entity @s[name="foo bar"]||score @s foo matches 0) && !score @s foo = @s bar');
        expect(result).to.have.deep.ordered.members([
            ReservedTokens.OP,
            { subcommand: 'entity @s[name="foo bar"]', negation: false },
            ReservedTokens.OR,
            { subcommand: 'score @s foo matches 0', negation: false },
            ReservedTokens.CP,
            ReservedTokens.AND,
            ReservedTokens.NOT,
            { subcommand: 'score @s foo = @s bar', negation: false }
        ])
    })
})

describe('shuntingYard', function () {
    it('should return [a, b, ||, !c, &&]', function () {
        let result = shuntingYard([
            ReservedTokens.OP,
            { subcommand: 'a', negation: false },
            ReservedTokens.OR,
            { subcommand: 'b', negation: false },
            ReservedTokens.CP,
            ReservedTokens.AND,
            ReservedTokens.NOT,
            { subcommand: 'c', negation: false }
        ])
        expect(result).to.have.deep.ordered.members([
            { subcommand: 'a', negation: false },
            { subcommand: 'b', negation: false },
            ReservedTokens.OR,
            { subcommand: 'c', negation: true },
            ReservedTokens.AND
        ])
    })
    it('should return [a, b, &&, !c, !d, ||, ||]', function () {
        //(a && b) || !(c && d) => (a && b) || (!c || !d)
        let result = shuntingYard([
            ReservedTokens.OP,
            { subcommand: 'a', negation: false },
            ReservedTokens.AND,
            { subcommand: 'b', negation: false },
            ReservedTokens.CP,
            ReservedTokens.OR,
            ReservedTokens.NOT,
            ReservedTokens.OP,
            { subcommand: 'c', negation: false },
            ReservedTokens.AND,
            { subcommand: 'd', negation: false },
            ReservedTokens.CP
        ])
        expect(result).to.have.deep.ordered.members([
            { subcommand: 'a', negation: false },
            { subcommand: 'b', negation: false },
            ReservedTokens.AND,
            { subcommand: 'c', negation: true },
            { subcommand: 'd', negation: true },
            ReservedTokens.OR,
            ReservedTokens.OR
        ])
    })
    it("should throw a error about imbalance bracket", function () {
        expect(() => shuntingYard([ReservedTokens.OP])).to.throw('Imbalance parenthesis');
        expect(() => shuntingYard([ReservedTokens.OP, ReservedTokens.CP, ReservedTokens.CP])).to.throw('Imbalance parenthesis');
    })
})