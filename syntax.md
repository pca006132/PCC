# Syntax
## Off-side Rule
PCC uses [offside-rule](https://en.wikipedia.org/wiki/Off-side_rule), i.e. whitespace or tab indentation, to denote structure. Each file **must** have **consistent indentation**, with no mixed use of tab and spaces, and a constant number of characters to denote an indentation level.

> **Invalid example**
> ```
> def a:
>   say using 2 spaces as indentation
>       say and suddently jump to 6 spaces
> ```

## Naming & Scoreboard Objective
PCC would add *suffix* to inner functions. For example, the inner function of `a` may be named as `a_1`. We recommend users *not* to use `_(number)` as their function/template suffix, or this may cause naming conflict.

> PCC have a checking system, so it would produce an error if naming conflicts happened.

PCC by default, uses `common` as the scoreboard objective for transferring data, including `return`, `break` and `continue`. Users are required to add the objective **by themselves**.

> The name of the scoreboard objective used can be changed in the config.

## Comment & Empty Line
There are two types of comment, single-line and multi-line, which would be neglected by the compiler.
Single-line comments are lines starting with `//`.
Multi-line comment begins with a line starting with `/*` and terminate at a line which ends with `*/`.
Spaces by the two sides of the comment would be neglected, and would not be parsed as indentation.

Empty lines, which are lines containing no character or only space characters, would be neglected.

## Module System
PCC uses module system for organizing functions and tags, and would be converted into namespace + directries structure in-game, which the root module is the namespace, and others are the directries.

Users could use relative path to call/reference functions/templates/events(tag), which `foo` represents `foo` in the current module and `../foo` represents `foo` in the parent module, if it is used in annotations/function commands.
However, the function command has to be called either directly or nested inside execute commands, commands inside JSON/NBT, i.e. clickEvent of `tellraw` command, would not be parsed.

### Module Declaration
```
module <name>:
    <module content>
```
Users could use `.` to denote submodule, for example:
```
module a.b:
    //something

//is identical to

module a:
    module b:
        //something

```

### Event
Events are implemented as function tags. Functions can use event annotation to *listen* to a particular event, and invoked when the event is triggered.

Event declaration:
```
event <name>
```

Call event:
```
[excute ... run ]function #<event name>
```

### Named Function
```
def <name>:
    <commands>
```

### Function Template
Function templates are functions with parameter, and would generate the respective function when called with parameters.

```
template <name>(<parameters...>):
    <content>
```

Parameters should start with a `$` character. Parameters in the content part would be replaced with their values respectively. Users could also pass macro names as parameters, and it would be parsed if reference to that parameter is at the start of the line.

Calling function templates is similar to calling ordinary functions, except there are parameters after the name of the template. Parameters may need to be quoted and escaped if it contains `,` or `()` characters, or if it is an empty parameter. The escape rule is similar to that of NBT strings.

```
template example($a):
    say $a

def test:
    function example(hi!)

//it may generate a function like this:
def example_1:
    say hi!
```

## Function content
### Commands
*Commands* inside functions can use *line continuation* in case the command is too long, lines starting from the second line has to be indented. Lines would be joined with a space character in between, unless the previous line ends with a backslash `\\` character.

```
def example:
    say this is a long
        long
        lo\
        ng line
    //the previous command is equal to:
    say this is a long long long line
```

### Return Statement
Users could use `return` statements inside a named/template function, to skip all the commands left in the named function.

### While Loop
```
while <condition1> && <condition2> ... :
    <content>
```
Conditions are the sub-command of the `if` sub-command of `execute` command, such as `entity @s[tag=a]`. Condition could start with a `not`, indicating the it would be satisfied if the condition is not true. Multiple conditions could be joined with `&&`, indicating all have to be satisfied in order to continue the loop.

Users could use `break` and `continue` statement to terminate loop or skip the current loop.

### Anonymous Function
Users could create anonymous function by indent the function content, and turn the `execute` command into something like `execute ... run:`.

```
execute if entity @s[tag=a] run:
    say Anonymous function
```

> Note that the indent is relative to the last line of the previous command.
> ```
> execute as @a
>     if score @s test > @s test2
>     run:
>         say Anonymous function
> ```

### Annotation
Named function supports two types of annotation, including event annotation and wrapper annotation, which has to be placed before the named function.

Event annotation would add the target function to the function tag.
```
@event <event1>, <event2>...
```

Wrapper annotation would turn the named function into an internal function, and replace the original function by the specified template function with provided parameters and the name of the internal function as the last parameter.
It is similar to function decorator in Python. The top wrapper function is the outermost function, while the original named function would be the innermost function.

```
@wrapper <name>[(<parameters>...)]
```

Example:
```
template foo($fn);
    say foo
    function $fn

template bar($a, $fn):
    say bar $a
    function $fn

@wrapper foo
@wrapper bar(a)
def a:
    say something

//would generate:
def a:
    say foo
    function system:a_1
def a_1:
    say bar a
    function system:a_2
def a_2:
    say something
```

## Preprocessing
### Constants
Define constants
```
#define <name> = <value>
```

The name of the constant in the file, except in `import` and `ref` statements, and constants/macro/JSON definitions, would be replaced by its value.

> Note that the name of the constant must start with a `$` character, and the value would be trimmed.

### JSON
Define JSON
```
#json <name>:
    <YAML>
```

The name of the JSON constant must start with a `$` character, and the value would be the result of YAML to JSON in 1 line.

### Macro
Define macro
```
#macro <name>(<params...>):
    <content>
```

The name of the macro must start with a `#` character, name of the parameters should start with a `$` character. Parameters in the content would be replaced by their values respectively when called.

Users can call the macro simply by writing the name of the macro with parameters similar to template functions, but the line must contain the macro only.

```
#macro #test($a):
    say $a
    say test

def test:
    #test(a)

//result
def test:
    say a
    say test
```

### Conditional
```
#if <expression>:
    <content>
```

If the result of the JavaScript expression is true, the content would be kept, but would be unindented. Otherwise, the content would not be kept.

### Foreach Iteration
```
#for <variable> in <expression>:
    <content>
```

The variable should start with a `$` character, and would be treated as constants above. The content would be generated for *n* times, where n is the number of iteration of the JavaScript expression provided.

PCC provides a `range` function which should be identical to that in Python.

```
#for $i in range(5):
    say $i

//result
say 0
say 1
say 2
say 3
say 4
```

### Evaluate Expression
```
${<expression>}
```

This is an inline syntax, which would be replaced by its evaluated result.

```
say ${1+1}
//result
say 2
```

> Note that you cannot generate strings with line breaks, as those line breaks would not be processed.

### Raw Line
Lines with the prefix `raw:` would not be processed by the preprocessor, and the prefix would be removed at last.

## Files Import & Referencing
Import and referencing statements should be placed at the start of the file, before any other statements.

Import and referencing other files allows users to use functions/events/templates/constants etc. which are defined in other files.

### Import
```
import <name/relative path from current directory>
//such as
import test
```

Only the entry file and its dependencies (imported files) would be parsed and generated.

> Note that users could define *global* files, the *name* would be turn into the path to that file as defined in the config.
>
> The file extension `.pcc` is not needed

### Referencing
```
ref <name/relative path from current directory>
```

Reference the functions and events defined in the PCD file. PCD file is the function and event definitions of the project, which can be generated by specifying the `-d` parameter.

The content of the PCD file would not be included in the output, it is only used for checking.

> Note that users could define *global* files, the *name* would be turn into the path to that file as defined in the config.
>
> PCC by default defined a `minecraft` file for function tags.
>
> The file extension `.pcd` is not needed