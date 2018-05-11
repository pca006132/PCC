import { expect } from 'chai';
import getLines from '../../src/preprocessor/line_processor';
import { iterate } from '../../src/util/linked_list';

describe('getLines', function () {
    it('should combine fi and se and not combine the last \\', function () {
        const input = 'fi\\\nse'.split(/\r?\n/g);
        const result = getLines('file', input);
        expect(result).is.not.null;
        expect([...iterate(result!.next)]
            .map(l => ({ content: l.content, indent: l.indent }))).to.deep
            .equal([{ content: 'fise', indent: 0 }])
    })
    it('should remove //comments', function () {
        const input = 'fi\\\n//somecomment\\\nse'.split(/\r?\n/g);
        const result = getLines('file', input);
        expect(result).is.not.null;
        expect([...iterate(result!.next)]
            .map(l => ({ content: l.content, indent: l.indent }))).to.have.deep.ordered.members([
                { content: 'fise', indent: 0 }
            ])
    })
    it('should remove /*comments*/', function () {
        const input = [
            'PCA \\ ',
            '/*',
            '女装女装女装！',
            'pca快女装！',
            '*/',
            'should dress as a girl'
        ]
        const result = getLines('file', input);
        expect(result).is.not.null;
        expect([...iterate(result!.next)]
            .map(l => ({ content: l.content, indent: l.indent }))).to.have.deep.ordered.members([
                { content: 'PCA should dress as a girl', indent: 0 }
            ])
    })
    it('should throw an error when there is no line after \\...', function () {
        const input = 'QQ号是3051812350的人女装\\';
        expect(() => getLines('file', input)).to.throw('No line after line continuation marker "\\"');
    })
    it('should know the indent', function () {
        const input = [
            'def a',
            '    say a',
            'def pca',
            '    pca = hentai'
        ]
        const result = getLines('file', input);
        expect([...iterate(result!.next)]
            .map(l => ({ content: l.content, indent: l.indent }))).to.have.deep.ordered.members([
                { content: 'def a', indent: 0 },
                { content: 'say a', indent: 1 },
                { content: 'def pca', indent: 0 },
                { content: 'pca = hentai', indent: 1 }
            ])
    })
    it('should throw an error when mixed use of tab and spaces', function () {
        const input = [
            'def reimu',
            '\t  say reimu is my'
        ]
        const error = 'Mixed use of tab and spaces';
        expect(() => getLines('file', input)).to.throw(error);
    })
    it('should throw an error when Inconsistent indentation', function () {
        const input = [
            'def ⑨',
            '   ⑨tql',
            ' I love 拉菲 forever'
        ]
        const error = 'Inconsistent indentation';
        expect(() => getLines('file', input)).to.throw(error);
    })
})