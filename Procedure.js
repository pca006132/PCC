/** @module Procedure*/


const runner = require('./JsRunner.js');
const fs = require('fs');
const path = require('path');
const options = require('./options.json');
const trans = require('./Translate.js');


/**
 * @class Procedure
 * Handles advancement command module generation
 */
class Procedure {

    /**
     * constructor - New advancement module
     *
     * @param  {string} name name of the module
     * @param  {boolean} requireLoop  whether the advancement is running once per tick, or just a procedure to call by others
     */
    constructor(name, impossible, tick, loop) {
        this.namespace = options.namespace;
        let index = name.indexOf(':');
        if (index > -1) {
            this.namespace = name.substring(0, index);
            name = name.substring(index+1);
        }
        this.name = name;
        this.content = {
            criteria: {
            },
            rewards: {
                commands: [
                ]
            }
        };

        if (impossible) {
            this.content.criteria["impossible"] = {
                trigger: "minecraft:impossible"
            };
            if (!tick && !loop)
                this.content.rewards.commands.push(`advancement revoke @s only ${this.namespace}:${name}`);
        }
        if (loop) {
            this.content.criteria["main_loop"] = {
                trigger: "minecraft:arbitrary_player_tick"
            };
            //Revoke the tick trigger, so it can be triggered at the next tick
            //But for the "impossible", it will not be revoked to allow it to run at next tick
            this.content.rewards.commands.push(`advancement revoke @s only ${this.namespace}:${name} main_loop`);
        } else if (tick) {
            this.content.criteria["tick"] = {
                trigger: "minecraft:tick"
            };
            this.content.rewards.commands.push(`advancement revoke @s only ${this.namespace}:${name} tick`);
        }
        runner.scope.CurrentAdvancement = this;
    }


    /**
     * addElement - Add Command/Annotation to the procedure
     *
     * @param  {Line} line command/annotaion to add (with prefix)
     */
    addElement(line) {
        if (line.content.startsWith("@criteria")) {
            //Add criteria
            let criteria = null;
            try {
                criteria = JSON.parse('{' + line.content.substring(10) + '}');
            } catch (err) {
                throw new Error(trans.translate("CriteriaError", line.lineNum, err));
            }
            let key = Object.keys(criteria)[0];
            this.content.criteria[key] = criteria[key];
            return;
        }

        try {
            this.content.rewards.commands.push(parsePrefix(line.content));
        } catch (err) {
            throw new Error(trans.translate("AtLine", line.lineNum, err));
        }
    }


    /**
     * getJSON - Get the advancement JSON string
     *
     * @return {string}  JSON
     */
    getJSON() {
        if (Object.keys(this.content.criteria).length == 0) {
            //No criteria
            this.content.criteria["impossible"] = {
                trigger: "minecraft:impossible"
            };
            this.content.rewards.commands.splice(0, 0, `advancement revoke @s only ${this.namespace}:${this.name}`);
        }
        return JSON.stringify(this.content);
    }


    /**
     * saveToFile - Save the advancement JSON to file
     *
     * @param  {type} file_path
     */
    saveToFile(file_path) {
        fs.mkdir(path.join(file_path, this.namespace), (err) => {
            if (err && err.code !== 'EEXIST') throw new Error(trans.translate("CannotCreateNamespace", this.namespace));
            fs.writeFile(path.join(file_path, this.namespace, this.name + ".json"), this.getJSON(), "utf8", (err) => {
                if (err) throw err;
            });
        });
    }
}


/**
 * parsePrefix - Parse command in advancement procedure
 *
 * @param  {string} command
 * @return {string} parsed command
 */
function parsePrefix(command) {
    if (command.startsWith("?:")) {
        //ask for adding objective 'stats'
        command = parsePrefix(command.substring(2));
        return "execute @s[score_stats_min=1] ~ ~ ~ " + command;
    } else if (command.startsWith("!:")) {
        //ask for adding objective 'stats'
        command = parsePrefix(command.substring(2));
        return "execute @s[score_stats=0] ~ ~ ~ " + command;
    } else if (command.startsWith("r:")) {
        return command;
    } else {
        return runner.parseCommand(command);
    }
}

exports.Procedure = Procedure;
