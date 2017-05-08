# JavaScript API
Users can use JavaScript to define annotations, custom commands, and to write inline expression in commands.

Order:
1. load from URL
2. embed script
3. #run command
4. annotation
5. custom commands/inline expression

## Load from URL
Users can load scripts from URL, to declare variable, define useful functions, add custom commands/annotation etc.
```
#include <url>

//example
#include <www.example.com/script.js>
```

> For the URL, please specify its scheme if it is not a local file.  
> Only http and https are supported now.

## Embed script
Users can also embed scripts into the file, to declare variables, define useful functions, add custom commands/annotation etc.

> This can only occur once per file

```
#script
//JS scripts
#end script
```

## Generate multiple commands
Users can generate multiple commands for further processing. Commands(Lines) are seperated by character '\\n'. Note that this cannot generate comments, '#run' command, nor load scripts.
```
#run (expression)

//example
#run (new Array(4)).join("/say hi\n")
```

## Inline expression
Users can run inline expressions during generation. So they can use variables in commands, get coordinates of other command blocks with labels, etc.

Codes inside `#{}` will be parsed, and will be replaced by their results.

Users can escape that by adding a \` character. As \` is an escape character, users need to escape that by another \` if they need to use it in commands. Or users can just use raw string mode (prefix `?:`).

```
#script
var a = 1;
#end script

/say #{a}
```


## Define annotations
```
Annotations['your annotation name'] = function (str) {
    //function
}
```

PCC will treat the annotation like this: `name str...`. String before the first space is regarded as name, while string after the first space will be passed as the parameter.

What you can access:
+ `this.parent.InitCommands`: List of commands, will run in initialization
+ `this.parent.CommandBlockCommands`: List of commands, usually are the commands to set command blocks when importing the file
+ `this.parent.LastCommands`: List of commands, will run at last(importing the file into minecraft)
+ `this.parent.Labels`: `{key: {coordinate}}`. Coordinates of the labeled command blocks. The coordinate is the same as the format below.
+ `this.parent.CurrentCoor`: `{x: number, y: number, z: number}`. Coordinate of the next command block.
+ `this.parent.CurrentAdvancement`: Current advancement object.
    + `.name`: advancement name
    + `.namespace`: advancement namespace
    + `.content`: advancement content (criteria, rewards etc.)
+ `this.console.log`: log string to the console output.

## Define Custom Commands
```
CustomCommands['your command name'] = function (str) {
    //function
    // MUST return a string
}
```

PCC will treat the command like this: `name str...`. String before the first space is regarded as name, while string after the first space will be passed as the parameter.

What you can access:
+ `this.parent.InitCommands`: List of commands, will run in initialization
+ `this.parent.CommandBlockCommands`: List of commands, usually are the commands to set command blocks when importing the file
+ `this.parent.LastCommands`: List of commands, will run at last(importing the file into minecraft)
+ `this.parent.Labels`: `{key: {coordinate}}`. Coordinates of the labeled command blocks. The coordinate is the same as the format below.
+ `this.parent.CurrentCoor`: `{x: number, y: number, z: number}`. Coordinate of the next command block.
+ `this.parent.CurrentAdvancement`: Current advancement object.
    + `.name`: advancement name
    + `.namespace`: advancement namespace
    + `.content`: advancement content (criteria, rewards etc.)
+ `this.console.log`: log string to the console output.
