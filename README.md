# Introduction
PCC is a command compiler written in JavaScript(Node.js), focused on simplicity and effiency.

## Features:
+ Simple syntax, allows users to focus on the commands.
+ Compile advancement modules, chains, normal commands. (Currently all outputs are advancement files)
+ Run javascripts when compiling, so users can generate commands on the fly. (Can change the parameters easily later)
+ Define custom annotations and custom commands.
+ Simple syntax to generate advancements for detection.
+ Let users to choose which module to compile. (2 options: Default - This will compile all modules, to compile a set of modules it depends on the command line parameter)

## Install
First, install node.js, then run:

```
npm install minecraft-pcc -g
```

## Usage:
For parsing all modules, run
```
pcc (file name)
```

For parsing some modules **ONLY** (Commands not belong to any module will still be run), run
```
pcc (file name) (module1) (module2) (module3) ...
```

Drag the folders(namespace) to `(save)/data/advancements`

## Options:
see the options.json

Out is the file to put the output advancements.

To disable the update checker(which will run by default every time you run pcc), change the `autoCheckUpdate` to false.

## Translation
Currently there are only errors with translations. See the TranslateStrings.json.

> TODO: Give those keys a more meaningful name.

## Documentation:
+ [Syntax](syntax.md)
+ [Project Structure](structure.md)
+ [JavaScript API(for in file scripts)](JsAPI.md)

Run JsDoc to get the full documentation.

## TODO
https://github.com/nlf/node-github-hook
https://github.com/garrettjoecox/scriptserver

Githook, check git for new commit, download it, clear the server's save/data/advancements
compile the files downloaded from git to save/data/advancements, and run /reload commnad
