# Structure
This file explain the project structure. Please be reminded to modify this if any changes has been made.

+ project
  + Parser:
    + Split lines, record line number(in string)
    + Remove empty lines, comments
    + Get embedded scripts, and run by JsRunner
    + Get #run commands and run by JsRunner, parse the result
    + Process inherit prefix, join lines
    + Parse into modules, procedures, chains
  + JsRunner:
    + Use eval.call in this scope
    + Load script from URL (local and http)
    + Run scripts
    + Evaluate #run command
    + Parse commands. (Check for custom commands, or parse the inline expression)
  + Chain:
    + Handle #chain command
    + Count number of commands(Determining Looping chain length)
    + Handle Wrapping, Looping
    + Handle annotation
    + Handle coordinate issues
  + CommandBlock:
    + Get final setblock command (Parse command at that time by JsRunner)
    + Handle prefix
  + Procedure:
    + Convert commands into advancements
  + CommandCombiner:
    + Combine multiple commands into one commmand.  
      (May generate multiple 'one command' if the number of characters exceeds the limit)
