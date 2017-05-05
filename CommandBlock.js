const runner = require('./JsRunner.js');
const util = require('./CommandUtil.js');

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
 * @param {number} command block type
 * @returns {string} command block id name
 */
function typeToName(cbType) {
    switch (cbType) {
        case ICB:
            return "impulse_command_block";
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
    throw new Error("Invalid direction");
}


/**
 * representing a command block
 * @class
 */
class CommandBlock {

    /**
     * constructor - constructor of a command block
     *
     * @param  {string} command
     * @param  {string} lineNum        Line number
     * @param  {number[]} coor         [x, y, z]
     * @param  {boolean} raw = false
     * @param  {number} cbType = CCB
     * @param  {boolean} cond = false
     * @param  {boolean} auto = true
     * @param  {boolean} noUpdate = false
     * @param  {number} facing = UP
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
                throw new Error(`Error parsing command at line ${this.lineNum},\n` + err);
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
