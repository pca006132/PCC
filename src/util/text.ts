const REGEX_KEYWORDS = /([\$\^\-\*\(\)\[\]\\\?\+\{\}\|\.\/])/g;

/**
 * Escape regex keywords
 * @param str String to be escaped
 * @returns Escaped string
 */
export function regexEscape(str: string) {
    return str.replace(REGEX_KEYWORDS, '\\$1');
}

/**
 * Get the parameters of the string
 * @param str The content of the line containing the parameter
 * @param offset The start of the parameter, which is the index of the starting '('
 * @returns Parameters and the index of index after the terminating parentheses
 */
export function getParams(str: string, offset: number = 0) {
    if (str.length <= offset || str[offset] !== '(')
        throw new Error('Invalid parameters');
    let params: string[] = [];
    let temp: string[] = [];
    let inString = false;
    let escape = false;
    while (str.length > ++offset) {
        if (inString) {
            if (escape) {
                if (str[offset] !== '\\' && str[offset] !== '"')
                    throw new Error('Invalid escape sequence in parameters');
                escape = false;
                temp.push(str[offset]);
                continue;
            }
            switch (str[offset]) {
                case '\\':
                    escape = true;
                    break;
                case '"':
                    inString = false;
                    break;
                default:
                    temp.push(str[offset]);
            }
        } else {
            switch (str[offset]) {
                case '"':
                    inString = true;
                    break;
                case ',':
                    params.push(temp.join('').trim());
                    temp = [];
                    break;
                case ')':
                    if (params.length !== 0 || temp.length !== 0)
                        params.push(temp.join('').trim());
                    return {params: params, index: offset+1};
                default:
                    temp.push(str[offset]);
            }
        }
    }
    throw new Error('Not terminated parameters');
}

export function skipArgument(str: string, i = 0) {
    let brackets: string[] = [];
    let inString = false;
    let escape = false;
    while (str.length > ++i) {
        if (inString) {
            if (escape) {
                escape = false;
                continue;
            }
            switch (str[i]) {
                case '\\':
                    escape = true;
                    break;
                case '"':
                    inString = false;
                    break;
            }
        } else {
            switch (str[i]) {
                case '"':
                    inString = true;
                    break;
                case ' ':
                    return i+1;
                case '{':
                    brackets.push('}');
                    break;
                case '[':
                    brackets.push(']');
                    break;
                case '}':
                case ']':
                    if (brackets.length === 0)
                        throw new Error('Brackets not match');
                    if (brackets.pop() !== str[i])
                        throw new Error('Brackets not match');
                    break;
            }
        }
    }
    if (brackets.length !== 0)
        throw new Error('Brackets not match');
    return i;
}