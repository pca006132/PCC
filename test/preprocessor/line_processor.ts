import { expect } from 'chai';
import getLines from '../../src/preprocessor/line_processor';
import { iterate } from '../../src/util/linked_list';

describe('getLines', function () {
    it('should combine fi and se and not combine the last \\', function () {
        const input = 'fi\\\nse\\'.split(/\r?\n/g);
        const result = getLines('file', input);
        expect(result).is.not.null;
        expect([...iterate(result!.next)]
            .map(l => ({ content: l.content, indent: l.indent }))).to.deep
            .equal([{ content: 'fise', indent: 0 }])
    })
    it('should remove //comments', function () {
        const input = 'fi\\\n//somecomment\\\nse\\'.split(/\r?\n/g);
        const result = getLines('file', input);
        expect(result).is.not.null;
        expect([...iterate(result!.next)]
            .map(l => ({ content: l.content, indent: l.indent }))).to.deep
            .equal([{ content: 'fise', indent: 0 }])
    })
})