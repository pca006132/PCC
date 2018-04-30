const REGEX_KEYWORDS = /([\$\^\-\*\(\)\[\]\\\?\+\{\}\|\.\/])/g;
const ESCAPE_PATTERN = /(\\|")/g;

/**
 * Escape a string according to minecraft NBT rules
 * @param str String to be escaped
 * @param level Level for the escape, default 1 for escaping the string once, 2 for twice...
 * @returns Escaped string
 */
export function escape(str: string, level = 1) {
    for (let i = 0; i < level; i++) {
        str = str.replace(ESCAPE_PATTERN, '\\$1');
    }
    return str;
}

/**
 * Get the parameters of the string
 * @param str The content of the line containing the parameter
 * @param offset The start of the parameter, which is the index of the starting '('
 * @returns List of parameters
 */
export function getParams(str: string, offset: number) {
    if (str.length <= offset || str[offset] !== '(')
        return [];
    let params: string[] = [];
    let temp: string[] = [];
    let inString = false;
    let escape = false;
    while (str.length > ++offset) {
        if (inString) {
            if (escape) {
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
                    params.push(temp.join(''));
                    temp = [];
                    break;
                case ')':
                    params.push(temp.join(''));
                    return params;
                case ' ':
                    //neglect spaces
                    break;
                default:
                    temp.push(str[offset]);
            }
        }
    }
    throw new Error('Not terminated paramter');
}

/**
 * Escape regex keywords
 * @param str String to be escaped
 * @returns Escaped string
 */
export function regexEscape(str: string) {
    return str.replace(REGEX_KEYWORDS, '\\$1');
}

/**
 * Match input against a list of match function, run the respective function if matched.
 * @param input Object to be matched
 * @param matchPairs Array of [a, b], where a is the function to match the input,
 * while b is the function to be run if a is matched which the parameter is the result of a
 * @param rest The function to be run if nothing matched
 * @returns Result of the function run
 */
export function matcher<T, T1, T2>(input: T, matchPairs: [(x:T)=>T1|null, (x: T1)=>T2|null][], rest: ()=>T2|null = ()=>null): T2|null {
    for (let [a, b] of matchPairs) {
        let result = a(input);
        if (result) {
            return b(result);
        }
    }
    return rest();
}