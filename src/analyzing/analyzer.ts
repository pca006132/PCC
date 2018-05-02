import {TreeNode, printTree} from '../parsing/tree';
import ModuleManager from './module';
import {getObj} from '../config';

const FN_CALL = /(^(?:execute (?:.* )?run )?function )(\S+(?:\(.*\))?)$/;

export function analyze(manager: ModuleManager, content: TreeNode, fn: TreeNode, root: TreeNode = fn): {r: boolean, b: boolean, c: boolean} {
    let temp = content;
    let r = false; //return
    let b = false; //break
    let c = false; //continue
    do {
        if (r || b || c) {
            let def = new TreeNode('anonymous-fn', {
                commands: [],
                subcommand: temp.data.subcommand
            }, {file: fn.src.file, lineNum: temp.src.lineNum});
            manager.addDef(root.data.ns + '.' + root.data.name + '_' + (root.data.num).toString(), def, fn.src.file, true);
            fn.data.commands.push(
                `execute if score #continue ${getObj()} matches 0 if score #break ${getObj()}` +
                ` matches 0 if score #return ${getObj()} matches 0 run function `
                + manager.parseName(root.data.name + '_' + (root.data.num++).toString(),
                fn.src.file, root.data.ns, temp.src.lineNum)
            )
            let result = analyze(manager, temp, def, root);
            r = r || result.r;
            b = b || result.b;
            c = c || result.c;
            break;
        }

        switch (temp.name) {
            case 'command': {
                try {
                    fn.data.commands.push(temp.data.command.replace(FN_CALL, (_, a, m)=>a + manager.parseName(m, fn.src.file, root.data.ns, temp.src.lineNum)));
                } catch (e) {
                    throw new Error(`Line ${temp.src.lineNum}, file ${temp.src.file}:\n${e.message}`);
                }
                break;
            }
            case 'anonymous': {
                let def = new TreeNode('anonymous-fn', {
                    commands: []
                }, {file: fn.src.file, lineNum: temp.src.lineNum})
                manager.addDef(root.data.ns + '.' + root.data.name + '_' + (root.data.num).toString(), def, fn.src.file, true);
                fn.data.commands.push(temp.data.command.substring(0, temp.data.command.length - 1) + ' function '
                    + manager.parseName(root.data.name + '_' + (root.data.num++).toString(), fn.src.file, root.data.ns, temp.src.lineNum))
                let child = temp.child;
                if (child) {
                    ({r, b, c} = analyze(manager, child, def, root));
                }
                break;
            }
            case 'while': {
                let name = root.data.name + '_' + (root.data.num++).toString()
                let fullname = root.data.ns + '.' + name;
                let def = new TreeNode('while-fn', {
                    commands: [],
                    subcommand: temp.data.subcommand,
                }, {file: fn.src.file, lineNum: temp.src.lineNum})
                manager.addDef(fullname, def, fn.src.file, true);
                name = manager.parseName(name, fn.src.file, root.data.ns, temp.src.lineNum);
                def.data.fullname = name;
                if (temp.data.subcommand) {
                    fn.data.commands.push('execute ' + temp.data.subcommand + ' run function '
                    + name);
                } else {
                    fn.data.commands.push('function ' + manager.parseName(name, fn.src.file, root.data.ns, temp.src.lineNum));
                }
                let child = temp.child;
                if (child) {
                    ({r, b, c} = analyze(manager, child, def, root));
                    if (b) {
                        fn.data.commands.push(`scoreboard players set #break ${getObj()} 0`);
                        b = false;
                    }
                    if (c) {
                        fn.data.commands.push(`scoreboard players set #continue ${getObj()} 0`);
                        c = false;
                    }
                }
                break;
            }
            case 'return': {
                fn.data.commands.push(`scoreboard players set #return ${getObj()} 1`);
                return {
                    r: true,
                    b: b,
                    c: c
                }
            }
            case 'break': {
                fn.data.commands.push(`scoreboard players set #break ${getObj()} 1`);
                return {
                    r: r,
                    b: true,
                    c: c
                }
            }
            case 'continue': {
                fn.data.commands.push(`scoreboard players set #continue ${getObj()} 1`);
                return {
                    r: r,
                    b: b,
                    c: true
                }
            }
        }
    } while (temp.next && (temp = temp.next))

    if (fn.name === 'while-fn') {
        if (c) {
            fn.data.commands.push(`scoreboard players set #continue ${getObj()} 0`);
            c = false;
        }
        if (fn.data.subcommand) {
            fn.data.commands.push(`execute if score #break ${getObj()} matches 0 if score #return ${getObj()} matches 0 ` +
            fn.data.subcommand + ' run function ' + fn.data.fullname);
        } else {
            fn.data.commands.push(`execute if score #break ${getObj()} matches 0 if score #return ${getObj()} matches 0 run function ` + fn.data.fullname);
        }
    }
    if (fn.name === 'def') {
        //regular function
        if (r) {
            fn.data.commands.push(`scoreboard players set #return ${getObj()} 0`);
        }
    }

    return {
        r: r,
        b: b,
        c: c
    }
}