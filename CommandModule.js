/**@module CommandModule*/


AllowParse = true;
WhiteList = [];

/**
 * @class CommandModule
 * Store module related things
 */
class CommandModule {
    constructor(name) {
        this.name = name;
        this.AllowParse = AllowParse;
        this.elements = [];
        if (!CommandModule.AllowParse) {
            if (WhiteList.indexOf(name) > -1)
                this.AllowParse = true;
        }
    }


    /**
     * addElement - Add line/another module/ to the module
     *
     * @param  {type} element description
     * @return {type}      description
     */
    addElement(element) {
        this.elements.push(element);
    }

    /**
     * getLines - Generator, yield one line per call
     * @return {Line} line
     */
    *getLines() {
        if (!this.AllowParse)
            return null;
        for (let l of this.elements) {
            if (l instanceof CommandModule) {
                for (let l1 of l.getLines())
                    yield l1;
            } else {
                yield l;
            }
        }
    }
}

exports.AllowParse = AllowParse;
exports.WhiteList = WhiteList;
exports.CommandModule = CommandModule;
