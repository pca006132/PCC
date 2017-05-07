# Introduction
PCC is a command compiler written in JavaScript(Node.js), we hope that it can be easy to understand, and efficient to write.

## Features:
+ Simple syntax
+ Output Advancement module/one(multiple) command
+ Run JavaScript dynamically during generation (Enhance command readability)

## Usage:
Use node.js.

For parsing all modules, run
```
node .\app.js (file name)
```

For parsing some modules **ONLY** (Commands not belong to any module will still be run), run
```
node .\app.js (file name) module1 module2 module3 ...
```

## Options:
see the options.json

out is the file to put the output advancements.

## Translation
Currently there are only errors translations. see the TranslateStrings.json.

> TODO: Give those key a more meaningful name.

## Documentation:
+ [Syntax](syntax.md)
+ [Project Structure](structure.md)
+ [JavaScript API(for in file scripts)](JsAPI.md)

Run JsDoc to get the full documentation.
