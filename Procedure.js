/** @module Procedure*/


const runner = require('./JsRunner.js');
const fs = require('fs');
const path = require('path');
const options = require('./options.json');


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
    constructor(name, requireLoop = false) {
        this.name = name;
        this.content = {
            criteria: {
                c: {
                    trigger: "minecraft:impossible"
                }
            },
            rewards: {
                commands: [

                ]
            }
        };

        if (requireLoop) {
            this.content.criteria["r"] = {
                trigger: "minecraft:arbitrary_player_tick"
            };
            //Revoke the tick trigger, so it can be triggered at the next tick
            //But for the "impossible", it will not be revoked to allow it to run at next tick
            this.content.rewards.commands.push(`advancement revoke @s only ${options.namespace}:${name} r`);
        } else {
            //Revoke the "impossible" trigger, to allow it to be called by itself/others
            this.content.rewards.commands.push(`advancement revoke @s only ${options.namespace}:${name}`);
        }
    }


    /**
     * addElement - Add Command to the procedure
     *
     * @param  {Line} command command to add (with prefix)
     */
    addElement(line) {
        try {
            this.content.rewards.commands.push(parsePrefix(line.content));
        } catch (err) {
            throw new Error(`At line ${line.lineNum}, \n${err}`);
        }
    }


    /**
     * getJSON - Get the advancement JSON string
     *
     * @return {string}  JSON
     */
    getJSON() {
        return JSON.stringify(this.content);
    }


    /**
     * saveToFile - Save the advancement JSON to file
     *
     * @param  {type} file_path
     */
    saveToFile(file_path) {

        fs.writeFile(path.join(file_path, this.name + ".json"), this.getJSON(), "utf8", (err) => {
            if (err) throw err;
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
