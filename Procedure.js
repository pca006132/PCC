const runner = require('./JsRunner.js');
const fs = require('fs');
const path = require('path');
const options = require('./options.json');

class Procedure {
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
            this.content.rewards.commands.push(`advancement revoke @p only ${options.namespace}:${name} r`);
        } else {
            //Revoke the "impossible" trigger, to allow it to be called by itself/others
            this.content.rewards.commands.push(`advancement revoke @p only ${options.namespace}:${name} c`);
        }
    }

    addCommand(command, lineNum) {
        try {
            this.content.rewards.commands.push(parsePrefix(command));
        } catch (err) {
            throw new Error(`At line ${lineNum}, \n${err}`);
        }
    }

    getJSON() {
        return JSON.stringify(this);
    }

    saveToFile(file_path) {

        fs.writeFile(path.join(file_path, this.name + ".json"), this.getJSON(), "utf8", (err) => {
            if (err) throw err;
        });
    }
}

function parsePrefix(command) {
    if (command.startsWith("?:")) {
        //ask for adding objective 'stats'
        command = parsePrefix(command.substring(2));
        return "execute @s[score_stats_min=1] ~ ~ ~ " + command;
    } else if (command.startsWith("!:")) {
        //ask for adding objective 'stats'
        command = parsePrefix(command.substring(2));
        return "execute @s[score_stats=0] ~ ~ ~ " + command;
    } else if (command.startsWith("?:")) {
        return command;
    } else {
        return runner.parseCommand(command);
    }
}

exports.Procedure = Procedure;
