# Syntax
## Indentation
Indentation is important in PCC. Here are a few reminders:

> + Never mix tab and spaces
> + Use constant length indentation

## Comment
Comments will be **ignored** by the compiler. There are two ways to write comments:

Single line comment:
```
//comment
```

Multiline comment:
```
/* Comment
comment
comment
comment everywhere*/
```

> Caution!
>
> `//`, `/*` or `*/` must be at the start/end of the line, and cannot be inside of the commands.
> As it would be easier to do so :P.
> Also, comments inside commands would just reduce the readability of the command.

## Module
Modules can let users to sort out the commands, and sometimes users may just want to compile a single module. So PCC would allow users to write modules, and only compile that if needed.

Modules can be nested. Content of modules has to be **indented** for 1 more level.
```
#module (module name)
    //commands/other modules etc.

//For example:
#module test
    /say hello
    /say end of module
    #module test2
        /say this is in module test2 of test(test.test2)
/say this is not inside module 'test' nor 'test2'
```

> Caution: Names of the modules can only occur once!
>
> Most modules are meaningless to the compiler, compiler will just treat them as normal commands.  
> But you can specify which module to generate, and some modules with special names will be treated differently.
>
> For modules named 'init' or 'last', init commands will be executed before placing command blocks/entity markers. Whereas modules named last will be executed last, after placing command blocks/entity markers.  

## Procedure
Using advancements, we can call procedures and return them back to their original position and continue the commands execution **in 1 game tick**. PCC will allow you to generate that and name the module.

### Define procedure
Procedures can be part of a module, but you **cannot declare modules** inside a procedure. Commands inside procedures have to be **indented for 1 more level**.

Also, you **cannot use annotations and some prefixes** inside procedures, such as generating marker entities, get stats, as the procedure is not executed by command blocks, but by the player instead.
```
#procedure (name) [loop]
    //commands etc.

//Example:
#procedure test
    /say test

#procedure main loop
    /say this is run in a loop
```

> For the loop, it would use the arbitrary_player_tick
> 
> The advancement will be revoked, users doesn't have to write that.

### Run procedure
> It is implemented by PCC custom commands. See below for more information.
>
> Caution: be careful to use this inside procedure, it could cause huge problems as it may cause infinite loop.

```
run (name)

//Example:
run test
```

## Chain
By default, commands are stored in a straight chain towards +x direction. (Start at 1 0 0)

Users can start a new chain, with certain special properties. Commands in them will have to indent another level.
```
#chain (x) (y) (z) [direction1] [loop]
//or
#chain (x) (y) (z) [direction1] [wrap-(direction2)-(wrap count)]

//example
#chain 1 2 3 +x loop
    say this is in a loop
    say this is also in a loop
#chain ~ ~1 ~ +x wrap-+z-20
```

Parameters:
+ x, y, z: The initial position of command chain. If using tile(~) notation, the coordinate will start at the position of the last chain initial position.
+ direction1: the direction of the chain to be placed. By default +x. Accepts +/- x/y/z, such as +y, -z etc.

There are three modes:
+ default: no wrap, no loop, just a stright chain.
+ loop: The last command block will point towards the first command block of the loop, and command blocks will be set to UpdateLastExecution:0b. **Please be remembered to terminate the loop**, or set the gamerule to limit the number of commands execution.
+ wrap: The command blocks will be wrapped to save spaces. But this may break conditional command blocks(Will warn about that).
    + direction2: the direction to wrap towards. (After wrapping, the direction1 will be reversed, but direction2 will always stay the same)
    + wrap count: the number of command blocks in a row. (After placing that number of command blocks, it will form a new row and reverse the direction1)

```
Loop:
↓ ←
↓ ↑
↓ ↑
→ ↑

Wrap:
↓ → ↓ →
↓ ↑ ↓ ↑
↓ ↑ ↓ ↑
→ ↑ → ↑
```

## Command properties
Command properties are defined by their prefix:
+ by default: UpdateLastExecution:1b, auto:1b, none conditional, chain command block
+ r: auto:1b, repeating command block
+ i: auto:0b, impulse command block
+ ?: conditional
+ 1: auto:1b
+ 0: auto:0b
+ r: raw command(command after it will not be further parsed)

> Only ?: and r: prefixes are allowed in procedures.

You can inherit prefixes by writing a line with prefixes **only**, and commands which need to inherit them have to be indented for 1 more level.
```
?:
    /say this is a conditional command block
    /say this is conditional also!
/say while this is not a conditional command block
```

## Commands in multiline
You can split commands into multiple lines if needed, for example, a long nested /execute command or long NBT.
The lines after the first line have to be indented for 1 more level.
Note that **no empty lines are allowed in it.**

Spaces before the commands will be trimmed, but spaces after the command will **not** be trimmed.

For the following example, please note that there are spaces after line 1,2,3 (but not 4)
```
/execute @e ~ ~ ~
    execute @e ~ ~ ~
    execute @a ~ ~ ~
    say IDK why i will use so many exe
    cutes.

//will be compiled as

execute @e ~ ~ ~ execute @e ~ ~ ~ execute @a ~ ~ ~ say IDK why i will use so many execute.
```

## Annotation
This can specify some properties to the next command block.

### Label
Label the coordinate of the next command block. This can be further used by JavaScript.
```
@label (name)

//example:

@label test
say the location of this command block is labeled as test
```
> Note that there cannot be multiple label for 1 command block.
>
> Also, for the same label, there can only be one coordinate(command block)

### Marker entity
Summon a marker entity at the coordinates of the next command block.
Can specify its name and tag.  
Useful for targeting **multiple** command blocks.

> Implemented through area effect cloud, so don't have to worry about the number of markers if it is less than 10w. What users need to care about is the number of entities to execute commands.

```
@mark (name) (tag1) (tag2) ...

//example:
@mark test tag1 tag2 tag3
/say Here is an area effect cloud with name test, Tags:[tag1,tag2,tag3]
```

### Stats
Set the score of an entity/a player to the stats of a command block by stats command.

> Users have to add the objective by themselves, but the initialization of the score would be generated by the compiler.
>
> Do not recommend using player's stats score to store the command block stats, as it may be used by advancement procedures already.

```
@stats (stat) (entity/player) (objective)

//example
@stats SuccessCount @e[type=area_effect_cloud,c=1,name=stats] stats
/say this command block's stat is tracked by the scoreboard
```

## JavaScript
Users can put JavaScript in commands, and run them during generation. So they don't have to paste a lot of commands that no one can understand, and they can modify the commands later with ease.

> This is still in development, so the API is not complete/not set in stone.

Order:
1. load from URL
2. embed script
3. #run command
4. custom commands/annotation
5. inline expression

### Load from URL
Users can load scripts from URL, to declare variable, define useful functions, add custom commands/annotation etc.
```
#include <url>

//example
#include <www.example.com/script.js>
```

### Embed script
Users can also embed scripts into the file, to declare variables, define useful functions, add custom commands/annotation etc.

> This can only occur once per file

```
#script
//JS scripts
#end script
```

### Generate multiple commands
Users can generate multiple commands for further processing. Commands(Lines) are seperated by character '\\n'. Note that this cannot generate comments, '#run' command, nor load scripts.
```
#run (expression)

//example
#run (new Array(4)).join("/say hi\n")
```

### Inline expression
Users can run inline expressions during generation. So they can use variables in commands, get coordinates of other command blocks with labels, etc.

Codes inside `#{}` will be parsed, and will be replaced by their results.

Users can escape that by adding a \` character. As \` is an escape character, users need to escape that by another \` if they need to use it in commands. Or users can just use raw string mode (prefix `?:`).

```
#script
var a = 1;
#end script

/say #{a}
```
