/** @module CommandBlock*/


const runner = require('./JsRunner.js');
const util = require('./CommandUtil.js');
const trans = require('./Translate.js');

//directions
const UP = 0;
const DOWN = 1;
const NORTH = 2;
const SOUTH = 3;
const WEST = 4;
const EAST = 5;

const ICB = 10;
const CCB = 11;
const RCB = 12;

/**
 * Convert direction to block state string
 * @param {number} direction
 * @returns {string} Block states
 */
function directionToState(direction) {
    switch (direction) {
        case UP:
            return "facing=up";
        case DOWN:
            return "facing=down";
        case NORTH:
            return "facing=north";
        case SOUTH:
            return "facing=south";
        case WEST:
            return "facing=west";
        case EAST:
            return "facing=east";
    }
    throw new Error("Unknown direction");
}

/**
 * Convert command block type to name string
 * @param {number} type command block type
 * @returns {string} command block id name
 */
function typeToName(cbType) {
    switch (cbType) {
        case ICB:
            return "command_block";
        case CCB:
            return "chain_command_block";
        case RCB:
            return "repeating_command_block";
    }
    throw new Error("Unknown command block type");
}


/**
 * convert string(+- xyz) to direction
 *
 * @param  {string} direction string
 * @return {number} direction
 */
function stringToDirection(direction) {
    switch (direction) {
        case "+y":
            return UP;
        case "-y":
            return DOWN;
        case "+x":
            return EAST;
        case "-x":
            return WEST;
        case "+z":
            return SOUTH;
        case "-z":
            return NORTH;
    }
    throw new Error(trans.translate("InvalidDirectionError", direction));
}


/**
 * reverseDirection - Reverse input direction
 *
 * @param  {number} direction
 * @return {number} reversed direction
 */
function reverseDirection(direction) {
    switch (direction) {
        case DOWN:
            return UP;
        case UP:
            return DOWN;
        case EAST:
            return WEST;
        case WEST:
            return EAST;
        case SOUTH:
            return NORTH;
        case NORTH:
            return SOUTH;
    }
    throw new Error(trans.translate("InvalidDirectionError", direction));
}

/**
 * representing a command block
 * @class
 */
class CommandBlock {

    /**
     * @static getCommandBlock - Parse line into command block
     *
     * @param  {type} command
     * @param  {type} lineNum
     * @param  {type} coor
     * @param  {type} facing
     * @param  {type} noUpdate
     * @return {CommandBlock}
     */
    static getCommandBlock(command, lineNum, coor, facing, noUpdate = false) {
        let raw = false;
        let cbType = CCB;
        let cond = false;
        let auto = true;

        let cont = true;
        while (cont) {
            if (command.startsWith("rcb:")) {
                cbType = RCB;
                auto = true;
                command = command.substring(4);
            } else if (command.startsWith("icb:")) {
                cbType = ICB;
                auto = false;
                command = command.substring(4);
            } else if (command.startsWith("?:")) {
                cond = true;
                command = command.substring(2);
            } else if (command.startsWith("1:")) {
                auto = true;
                command = command.substring(2);
            } else if (command.startsWith("0:")) {
                auto = false;
                command = command.substring(2);
            } else if (command.startsWith("r:")) {
                raw = true;
                command = command.substring(2);
                cont = false;
            } else {
                cont = false;
            }
        }

        return new CommandBlock(command, lineNum, coor, raw, cbType, cond, auto, noUpdate, facing);
    }

    /**
     * constructor - constructor of a command block
     *
     * @param  {string} command
     * @param  {string} lineNum        Line number
     * @param  {number[]} coor         [x, y, z]
     * @param  {boolean} raw           whether the command will be parsed later
     * @param  {number} cbType         command block type
     * @param  {boolean} cond          is it conditional
     * @param  {boolean} auto          is it auto:1b
     * @param  {boolean} noUpdate      is it UpdateLastExecution:0b
     * @param  {number} facing         the direction of the command block
     */
    constructor(command, lineNum, coor, raw = false, cbType = CCB, cond = false, auto = true, noUpdate = false, facing = UP) {
        this.command = command;
        this.lineNum = lineNum;
        this.coor = coor;
        this.raw = raw;
        this.cbType = cbType;
        this.cond = cond;
        this.auto = auto;
        this.noUpdate = noUpdate;
        this.facing = facing;
    }


    /**
     * Return block state string
     * @return {string} block state
     */
    getState() {
        return directionToState(this.facing) + (this.cond ? ",conditional=true" : "");
    }


    /**
     * Return NBT of the command block
     * @return {string} NBT string
     */
    getNbt() {
        let command = this.command;
        if (!this.raw) {
            try {
                command = runner.parseCommand(command);
            } catch (err) {
                throw new Error(trans.translate("CommandParseLineError", this.lineNum, err));
            }
        }
        command = util.nbtString(command);
        let auto = this.auto? ",auto:1b" : "";
        let update = this.noUpdate ? ",UpdateLastExecution:0b" : "";

        return `{Command:${command}${auto}${update}}`;
    }


    /**
     * Get the coordinate the command block is pointing to
     * @return {number[]} coordinate [x, y, z]
     */
    getNextCoor() {
        let x = this.coor[0];
        let y = this.coor[1];
        let z = this.coor[2];

        switch (this.facing) {
            case UP:
                y++;
                break;
            case DOWN:
                y--;
                break;
            case EAST:
                x++;
                break;
            case WEST:
                x--;
                break;
            case SOUTH:
                z++;
                break;
            case NORTH:
                z--;
                break;
        }

        return [x, y, z];
    }


    /**
     * get setblock command
     *
     * @return {string}  command
     */
    getCommand() {
        return `setblock ~${this.coor[0]} ~${this.coor[1]} ~${this.coor[2]} ${typeToName(this.cbType)} ${this.getState()} replace ${this.getNbt()}`;
    }
}

exports.directionToState = directionToState;
exports.typeToName = typeToName;
exports.stringToDirection = stringToDirection;
exports.CommandBlock = CommandBlock;
exports.CCB = CCB;
exports.RCB = RCB;
exports.ICB = ICB;
exports.UP = UP;
exports.DOWN = DOWN;
exports.EAST = EAST;
exports.WEST = WEST;
exports.SOUTH = SOUTH;
exports.NORTH = NORTH;
exports.reverseDirection = reverseDirection;
