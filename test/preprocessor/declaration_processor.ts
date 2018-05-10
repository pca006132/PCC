import getDeclarations from '../../src/preprocessor/declaration_processor';
import Line from '../../src/util/line';
import {expect} from 'chai';

describe('declarationProcessor', () => {
    it('should parse constant with #define pattern', () => {
        let line = {next: new Line("#define $pca006132 girlClother", 0, "test.pcc", 1)};
        line.next.before = line;
        let result = getDeclarations(line);
        expect(result).to.deep.include({
            constants: [
                {
                    name: /\$pca006132/g,
                    content: 'girlClother'
                }
            ]
        })
    })
})