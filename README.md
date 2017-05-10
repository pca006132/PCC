# Introduction
PCC is a Minecraft command compiler written in JavaScript (Node.js). Its design is focused on both simplicity and effiency.

## Features
+ Simple syntax, allowing users to focus on their commands.
+ Ability to compile commands into advancement modules.
+ JavaScript command generation; for example, creating one command per direction the player could look.
+ The user can define custom annotations and command functions.

## Upcoming features
+ Ability to compile commands into command blocks.

## Installation
First, install [node.js](https://nodejs.org/en/), then (in a terminal or command prompt) run

```
npm install minecraft-pcc -g
```

## Usage
To parse all modules, run
```
pcc filename
```

To parse only **some** modules, run
```
pcc filename module1 [module2 module3 ...]
```
(Commands not belong to any module will still be run)

To install the module, you have two options:
1. If you're actively developing the file,
2. If you don't want to deal with links or if you're done with development, copy the generated files into `data/advancements/` in your world's folder.

## Editor support
+ https://github.com/pca006132/pcc-syntax (atom)
+ https://github.com/Intipablo/PCC-Syntax-Highlighting (notepad++)


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
