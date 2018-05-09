import { LinkedListNode } from "./linked_list";

/**
 * Implementation of Line object using linked list
 */
export default class Line extends LinkedListNode {
    content: string;
    indent: number;

    readonly file: string[];
    readonly lineNum: number[];

    /**
     * Constructor for class Line
     * @param content Content of the line, with spaces trimmed
     * @param indent Indentation level of the line
     * @param file File the line is from, same as macro/template caller for generated lines
     * @param lineNum Line number of the line, same as macro/template caller for generated lines
     * @param originalFile Source file the line is from, file containing the definition for generated lines
     * @param originalLineNum Line number of the definition for generated lines
     */
    constructor(content: string, indent: number, file: string | string[], lineNum: number | number[]) {
        super();
        this.content = content;
        this.indent = indent;
        if (Array.isArray(file)) {
            if (file.length === 0)
                throw new Error('There must be a file source');
            this.file = file;
        } else {
            this.file = [file];
        }
        if (Array.isArray(lineNum)) {
            if (lineNum.length !== this.file.length)
                throw new Error('length of line number stack should be equal to that of file name stack');
            this.lineNum = lineNum;
        } else {
            this.lineNum = [lineNum];
        }
    }

    /**
     * Generate new line which is the copy of this line
     * @param file Caller file
     * @param lineNum Caller line number
     */
    copy(file: string, lineNum: number) {
        return new Line(this.content, this.indent, [file, ...this.file], [lineNum, ...this.lineNum]);
    }

    getLineStackTrace() {
        let lines: string[] = [];
        for (let i = 1; i < this.file.length; ++i) {
            lines.push(`  generated from ${this.file[i]}:${this.lineNum[i]}`);
        }
        return lines.join('\n');
    }

    /**
     * Returns an error containing error message and line information
     * @param message Error message
     */
    getError(message: string, innerMessage: string = '') {
        return new Error(
            `${this.file[0]}:${this.lineNum[0]}\n${this.content}\nError: ${message}\n${innerMessage}\n${this.getLineStackTrace()}`
        )
    }

    toString() {
        return `${this.file[0]}:${this.lineNum[0]}\n${this.content}\n${this.getLineStackTrace()}`;
    }
}

