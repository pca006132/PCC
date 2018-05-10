import Line from '../../src/util/line';
import {expect} from 'chai';
import * as linked_list from '../../src/util/linked_list';
import {Result} from '../../src/preprocessor/typings'

import {parser as constant} from '../../src/preprocessor/parsers/constant';
import imp from '../../src/preprocessor/parsers/import';
import json from '../../src/preprocessor/parsers/json';
import {parser as macro} from '../../src/preprocessor/parsers/macro';
import ref from '../../src/preprocessor/parsers/reference';

describe('declarationProcessors', () => {
    describe('constantParser', () => {
        it('should parse constant successfully', () => {
            let line = new Line("#define $pca006132 hentai", 0, "test.pcc", 1);
            let result = new Result();
            let header: {next: Line};
            header = {next: line};
            line.before = header;
            constant.parse(line, result);
            expect(result).to.deep.include({
                constants: [
                    {
                        name: /\$pca006132/g,
                        content: 'hentai'
                    }
                ]
            })
        })
        it('should throw error caused by no-$', () => {
            let line = new Line("#define pca006132 hentai", 0, "test.pcc", 1);
            let result = new Result();
            let header: {next: Line};
            header = {next: line};
            line.before = header;
            expect(() => {
                constant.parse(line, result);
            }).to.throw();
        })
        it('should throw error caused by error indent', () => {
            let line = new Line("#define $pca006132 hentai", 1, "test.pcc", 1);
            let result = new Result();
            let header: {next: Line};
            header = {next: line};
            line.before = header;
            expect(() => {
                constant.parse(line, result);
            }).to.throw();
        })
        it('should throw error caused by unsupported charactor', () => {
            let line = new Line("#define $_#$%#pca006132 hentai", 0, "test.pcc", 1);
            let result = new Result();
            let header: {next: Line};
            header = {next: line};
            line.before = header;
            expect(() => {
                constant.parse(line, result);
            }).to.throw();
        })
    })
})