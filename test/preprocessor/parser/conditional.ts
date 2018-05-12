import * as sandbox from '../../../src/util/sandbox';
import expandConditional from '../../../src/preprocessor/parsers/conditional'
import Line from '../../../src/util/line';
import getLines from '../../../src/preprocessor/line_processor';
import { expect } from 'chai';
import { iterate } from '../../../src/util/linked_list';

describe('expandConditional', function () {
    it('should return true and change the lines value(#if)', function () {
        let line1 = getLines('pca女装.mp4', [
            '#define pcaIsHentai true',
            '#if true:',
            '   say PCA IS HENTAI !!!',
        ])!
        const result1 = expandConditional(line1.next.next!, new sandbox.Context());
        expect(result1).to.equals(true);
        expect([...iterate(line1!.next)]
            .map(l => ({ content: l.content, indent: l.indent }))).to.have.deep.ordered.members([
                { content: '#define pcaIsHentai true', indent: 0 },
                { content: 'say PCA IS HENTAI !!!', indent: 0 }
            ])
    })
    it('should return true and change the lines value(#if #else)', function () {
        let line2 = getLines('南方PCA.exe', [
            '#if false:',
            '   say PCA IS NOT HENTAI !!!',
            '#else:',
            '   say PCA IS HENTAI !!!'
        ])!
        const result2 = expandConditional(line2.next, new sandbox.Context());
        expect(result2).to.equals(true);
        expect([...iterate(line2!.next)]
            .map(l => ({ content: l.content, indent: l.indent }))).to.have.deep.ordered.members([
                { content: 'say PCA IS HENTAI !!!', indent: 0 }
            ])
    })
    it('should return true and change the lines value(#if #elif)', function () {
        let line1 = getLines('南方PCA.jpg', [
            '#define pcaIsHentai true',
            '#if false:',
            '   say PCA IS NOT HENTAI !!!',
            '#elif true:',
            '   pass'
        ])!
        const result1 = expandConditional(line1.next.next!, new sandbox.Context());
        expect(result1).to.equals(true);
        expect([...iterate(line1!.next)]
            .map(l => ({ content: l.content, indent: l.indent }))).to.have.deep.ordered.members([
                { content: '#define pcaIsHentai true', indent: 0 },
                { content: 'pass', indent: 0 }
            ])
    })
    it('should return true and change the lines value(#if #elif #elif)', function () {
        let line1 = getLines('南方PCA.jpg', [
            '#define pcaIsHentai true',
            '#if false:',
            '  say PCA IS NOT HENTAI !!!',
            '#elif false:',
            '  noPASS',
            '#elif true:',
            '  say hi',
            '    indented'
        ])!
        const result1 = expandConditional(line1.next.next!, new sandbox.Context());
        expect(result1).to.equals(true);
        expect([...iterate(line1!.next)]
            .map(l => ({ content: l.content, indent: l.indent }))).to.have.deep.ordered.members([
                { content: '#define pcaIsHentai true', indent: 0 },
                { content: 'say hi', indent: 0 },
                { content: 'indented', indent: 1 }
            ])
    })
    it('should return true and change the lines value(#if #elif #else)', function () {
        let line1 = getLines('南方PCA.jpg', [
            '#define pcaIsHentai true',
            '#if false:',
            '  say PCA IS NOT HENTAI !!!',
            '#elif false:',
            '  noPASS',
            '#else:',
            '  say hi',
            '    indented'
        ])!
        const result1 = expandConditional(line1.next.next!, new sandbox.Context());
        expect(result1).to.equals(true);
        expect([...iterate(line1!.next)]
            .map(l => ({ content: l.content, indent: l.indent }))).to.have.deep.ordered.members([
                { content: '#define pcaIsHentai true', indent: 0 },
                { content: 'say hi', indent: 0 },
                { content: 'indented', indent: 1 }
            ])
    })
    it('should return false that nothing happened', function () {
        const line = getLines('pcaの不可..mp4', [
            '#define a aa'
        ]);
        expect(expandConditional(line!.next, new sandbox.Context)).to.equals(false);
    })
    it('should throw an error when Invanlid #if directive', function () {
        const line = getLines('pcaの第一....mp4', [
            '#if:'
        ]);
        expect(() => expandConditional(line!.next, new sandbox.Context)).throw('Invalid #if directive');
    })
    it('should throw an error when #elXX is not after #if', function () {
        const line1 = getLines('东方红魔乡.exe', [
            '#elif ⑨:'
        ]);
        const line2 = getLines('东方妖妖梦.exe', [
            '#else:'
        ]);
        expect(() => expandConditional(line1!.next, new sandbox.Context)).throw('#elif directive should be placed after #if directive instead of on its own');
        expect(() => expandConditional(line2!.next, new sandbox.Context)).throw('#else directive should be placed after #if directive instead of on its own');
    })
    it('should throw an error when a var is not defined', function () {
        const line = getLines('东方永夜抄.exe', [
            '#if Hakurei_Reimu:'
        ]);
        expect(() => expandConditional(line!.next, new sandbox.Context)).throw('Error evaluating condition');
    })
    it('should throw an error when a if is empty body', function () {
        const line = getLines('???.exe', [
            '#if true:'
        ]);
        expect(() => expandConditional(line!.next, new sandbox.Context)).throw('Empty #if directive body');
    })
})