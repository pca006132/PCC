import * as sandbox from '../../util/sandbox';
import Line from '../../util/line';

export default function expandInlineJs(line: Line, context: sandbox.Context) {
    //skip {js expression}, offset is the index of the starting '{'
    function skipJs(str: string,  offset: number) {
        //offset is the index of the starting double quote
        function skipQuote(str: string,  offset: number, double = false) {
            let escape = false;
            while (++offset < str.length) {
                if (escape) {
                    escape = false;
                    continue;
                }
                switch (str[offset]) {
                    case '\\':
                        escape = true;
                        break;
                    case '"':
                        if (double) {
                            return offset;
                        }
                        break;
                    case '\'':
                        if (!double) {
                            return offset;
                        }
                        break;
                }
            }
            throw new Error("Not terminated string");
        }

        //offset is the index of the starting '/'
        function skipRegex(str: string,  offset: number) {
            let escape = false;
            while (++offset < str.length) {
                if (escape) {
                    escape = false;
                    continue;
                }
                switch (str[offset]) {
                    case '\\':
                        escape = true;
                        break;
                    case '/':
                        return offset;
                }
            }
            throw new Error("Not terminated RegExp expression");
        }

        //offset is the index of the start of the comment ('*' of '/*')
        function skipComment(str: string,  offset: number) {
            let star = false;
            while (++offset < str.length) {
                if (star) {
                    if (str[offset] === '/')
                        return offset;
                    star = false;
                } else {
                    if (str[offset] === '*')
                        star = true;
                }
            }
            throw new Error("Not terminated comment");
        }

        //offset is the index of the starting '`'
        function skipTemplateString(str: string,  offset: number) {
            let dollar = false;
            let escape = false;

            while (++offset < str.length) {
                if (escape) {
                    escape = false;
                    continue;
                }
                if (dollar) {
                    dollar = false;
                    if (str[offset] === '{') {
                        offset = skipJs(str,  offset);
                        continue;
                    }
                }
                switch (str[offset]) {
                    case '\\':
                        escape = true;
                        break;
                    case '`':
                        return offset;
                    case '$':
                        dollar = true;
                        break;
                }
            }
            throw new Error("Not terminated template string");
        }

        let brackets: Number[] = []; //bracket stack, 0 for {, 1 for [, 2 for (
        let slash = false;

        while (++offset < str.length) {
            if (slash) {
                if (str[offset] === '/')
                    throw new Error("Single line comment is prohibited");
                if (str[offset] === '*')
                    offset = skipComment(str,  offset);
                else
                    offset = skipRegex(str,  offset-1);
                continue;
            }
            switch (str[offset]) {
                case '(':
                    brackets.push(2);
                    break;
                case '[':
                    brackets.push(1);
                    break;
                case '{':
                    brackets.push(0);
                    break;
                case ')':
                    if (brackets.length === 0)
                        throw new Error("Imbalanced parentheses");
                    if (brackets.pop() !== 2)
                        throw new Error("Imbalanced parentheses");
                    break;
                case ']':
                    if (brackets.length === 0)
                        throw new Error("Imbalanced brackets");
                    if (brackets.pop() !== 1)
                        throw new Error("Imbalanced brackets");
                    break;
                case '}':
                    if (brackets.length === 0)
                        return offset; //exit condition
                    if (brackets.pop() !== 0)
                        throw new Error("Imbalanced brackets");
                    break;
                case '"':
                    offset = skipQuote(str,  offset, true);
                    break;
                case '\'':
                    offset = skipQuote(str,  offset, false);
                    break;
                case '`':
                    offset = skipTemplateString(str,  offset);
                    break;
            }
        }
        throw new Error("Not terminated js expression")
    }

    let i;
    while ((i = line.content.indexOf('${')) > -1) {
        try {
            let last = skipJs(line.content, i+1);
            let result = sandbox.toString(sandbox.runExpression(line.content.substring(i+2, last), context));
            line.content = line.content.substring(0, i) + result + line.content.substring(last + 1);
        } catch (e) {
            throw line.getError(e.message);
        }
    }
}
