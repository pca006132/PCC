/** @module Translate*/

const OPTIONS = require('./options.json');
const data = require('./TranslateStrings.json');


/**
 * getTranslated - Get translation
 * Let the items in the list of translation string in JSON be a,
 * let the items in the options be b
 * There would be 4 possible combinations depends on the number of items
 * 1. ababab (number of a = number of b)
 * 2. ababa (number of a = number of b + 1)
 * 3. babab (number of a + 1 = number of b)
 * 4. Error (for other cases)
 *
 * @param  {string} name     Key name of the string
 * @param  {...Object} options Insert options into intervals between TranslatedStrings.
 * @return {string}            translated string
 */
function getTranslated(name, ...options) {
    if (name != "NoTranslation" && name != "UnknownKeyError" && Object.keys(data).indexOf(name) == -1)
        throw new Error(getTranslated("UnknownKeyError", name));
    if (name != "NoTranslation" && name != "UnknownKeyError" && Object.keys(data[name]).indexOf(OPTIONS.language) == -1)
        throw new Error(getTranslated("NoTranslation", name));

    let parts = data[name][OPTIONS.language];
    let temp = [];

    if (options) {
        if (parts.length == options.length + 1) {
            for (let i = 0; i < options.length; i++) {
                temp.push(parts[i]);
                temp.push(options[i]);
            }
            temp.push(parts[parts.length - 1]);
        } else if (parts.length == options.length) {
            for (let i = 0; i < options.length; i++) {
                temp.push(parts[i]);
                temp.push(options[i]);
            }
        } else if (parts.length + 1 == options.length) {
            for (let i = 0; i < parts.length; i++) {
                temp.push(options[i]);
                temp.push(parts[i]);
            }
            temp.push(options[options.length - 1]);
        } else {
            throw new Error(data['Error'][OPTIONS.language].join(''));
        }
    } else {
        if (parts.length == 1)
            return parts[0];
        else
            throw new Error(data['Error'][OPTIONS.language].join(''));
    }

    return temp.join('');
}

exports.translate = getTranslated;
