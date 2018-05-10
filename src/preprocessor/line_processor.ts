import Line from '../util/line';

const INDENT_PATTERN = /^\s+/;

/**
 * Process lines and return a line object representing the start of the lines
 * @param file File name of the input
 * @param lines Iterable line string
 */
export default function getLines(file: string, lines: Iterable<string>) {
    let indentLength = 0;
    let tab = false;
    let inComment = false;
    let joinLine = false;

    let lineStart: Line | null = null;
    let lineEnd: Line | null = null;
    let lineNum = 0;

    for (let l of lines) {
        lineNum++;
        let trimmed = l.trim();

        //handle empty line
        if (trimmed.length === 0)
            continue;

        //actually the latter condition must be true,
        //as there must be non-comment preceding lines to set joinLine to true
        //however, due to type check, the latter condition is needed
        if (joinLine && lineEnd) {
            joinLine = trimmed.endsWith('\\');
            if (joinLine) {
                //remove the last `\` character
                trimmed = trimmed.substring(0, trimmed.length - 1);
            }
            lineEnd.content += trimmed;
            continue;
        }

        //handle comment
        if (trimmed.startsWith('//'))
            continue;
        if (trimmed.startsWith('/*'))
            inComment = true;
        if (inComment) {
            if (trimmed.endsWith('*/'))
                inComment = false;
            continue;
        }

        joinLine = trimmed.endsWith('\\');
        if (joinLine) {
            //remove the last `\` character
            trimmed = trimmed.substring(0, trimmed.length - 1);
        }

        let m = INDENT_PATTERN.exec(l);
        let indent = 0;
        if (m) {
            if (indentLength === 0) {
                tab = m[0].indexOf('\t') > -1;
                indentLength = m[0].length;
            }
            if ((tab && m[0].indexOf(' ') > -1) || (!tab && m[0].indexOf('\t') > -1)) {
                throw new Line(trimmed, indent, file, lineNum).getError('Mixed use of tab and spaces');
            }
            if (m[0].length % indentLength > 0) {
                throw new Line(trimmed, indent, file, lineNum).getError('Inconsistent indentation');
            }
            indent = m[0].length / indentLength;
        }

        if (!lineEnd) {
            lineStart = new Line(trimmed, indent, file, lineNum);
            lineEnd = lineStart;
        } else {
            lineEnd = new Line(trimmed, indent, file, lineNum).insertAfter(lineEnd);
        }
    }

    if (lineStart) {
        let start = {next: lineStart};
        lineStart.before = start;
        return start;
    }
    return null;
}