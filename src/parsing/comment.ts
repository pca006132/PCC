/**
 * Return a comment parser for parsing comment
 * @returns a function receiving a line, and return if it has to be skipped
 */
export default function commentParser() {
    let comment = false;
    return (line: string): boolean => {
        if (line.length === 0 || line.startsWith('//')) {
            return true;
        }
        if (line.startsWith('/*')) {
            comment = true;
        }
        if (comment) {
            if (line.endsWith('*/')) {
                comment = false;
            }
            return true;
        }
        return false;
    }
}