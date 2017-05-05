const escapeP1 = /\\/g;
const escapeP2 = /"/g;

const unescapeP1 = /\\"/g;
const unescapeP2 = /\\\\/g;

const nbtStringP = /^[\w\.\+\-]*$/g;


/**
 * escape text by added backslash
 *
 * @param  {string} text input
 * @return {string} escaped input
 */
function escape(text) {
    return text.replace(escapeP1, '\\\\').replace(escapeP2, '\\"');
}


/**
 * unescape text by removing backslash
 *
 * @param  {string} text input
 * @return {string} unescaped input
 */
function unescape(text) {
    return text.replace(unescapeP1, '"').replace(unescapeP2, '\\');
}


/**
 * Determine whether a string require escape in 1.12 command NBT spec
 *
 * @param  {string} text to determine
 * @return {boolean} If it needs escape
 */
function needEscape(text) {
    if (nbtStringP.exec(text))
        return false;
    return true;
}


/**
 * Return NBT string representation of the input
 * such as '"say hi"' and 'hi'
 *
 * @param  {string} text input
 * @return {string} NBT text
 */
function nbtString(text) {
    if (needEscape(text))
        return '"' + escape(text) + '"';
    return text;
}

exports.escape = escape;
exports.unescape = unescape;
exports.needEscape = needEscape;
exports.nbtString = nbtString;
