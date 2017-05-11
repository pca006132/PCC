# Introduction
PCC is a Minecraft command compiler written in JavaScript (Node.js). Its design is focused on both simplicity and effiency.

## Features
+ Simple syntax, allowing users to focus on their commands.
+ Ability to compile commands into advancement modules, function txt files, and (eventually) command block chains.
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
(Commands not belonging to any module will still be run)

To install the module, you have two options:
+ If you're actively developing the file, you can put a link to the generated folder into `data/advancements/` in your world's folder.
+ If you don't want to deal with links or if you're done with development, copy the generated folder into `data/advancements/` in your world's folder.

## Editor support
+ [atom](https://github.com/pca006132/pcc-syntax)
+ [notepad++](https://github.com/Intipablo/PCC-Syntax-Highlighting)


## Options:
File: options.json

`Out` is the file to put the output advancements.

To disable the update checker (which will, by default, run every time you run PCC), change `autoCheckUpdate` to false.

## Translation
Currently there are some errors with translations. See the TranslateStrings.json.

> TODO: Give those translation keys more meaningful names.

## Documentation:
+ [Syntax](syntax.md)
+ [Project Structure](structure.md)
+ [JavaScript API(for in file scripts)](JsAPI.md)

Run JsDoc to get the full documentation.
