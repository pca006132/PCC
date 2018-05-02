import {parse, compile, getDefinitions} from './file_manager';
import {outputFile, readFileSync} from 'fs-extra';
import {setGlobal, setNs, setObj} from './config';
import * as path from 'path';

let args = process.argv.slice(2);

let params = {
    config: 'config.json',
    entry: '_main.pcc',
    objective: 'common',
    'namespace': 'system',
    output: 'out/',
    global: {
        'minecraft': path.join(__dirname, '../default/minecraft.pcd'),
        'std': path.join(__dirname, '../default/std.pcd')
    },
    js: <string[]>[],
    definitions: ''
};

let shorthand = {
    '-c': 'config',
    '-e': 'entry',
    '-obj': 'objective',
    '-o': 'output',
    '-n': 'namespace',
    '-g': 'global',
    '-d': 'definitions'
}

function rageQuit() {
    console.log('Use "pcc -h" for help');
    process.exit(1);
}

//parse command line arguments
let current = '';
for (let arg of args) {
    if (!current) {
        if (arg === '-h' || arg === '--help') {
            console.log(`Usage: pcc [options]\n\nPCA's Command Compiler\n\nOptions:`);
            console.log('  -h, --help                 output usage information');
            console.log('  -c, --config <path>        specify config file path, default to "config.json" or none');
            console.log('  -e, --entry  <path>        specify entry file name, default to "_main.pcc"');
            console.log('  -obj, --objective <name>   specify scoreboard objective name for the compiler, default to "common"');
            console.log('  -o, --output <path>        specify output path for the generated files, default to "out/"');
            console.log('  -n, --namespace <name>     specify default namespace for functions/events not inside any module, default to "system"');
            console.log('  -d, --definition <file>    use definition mode, i.e. generate pcd file for referencing');
            console.log('  -g, --global <pairs...>    specify global files for import/ref, each pair include name and path, seperated by ":", and pairs are seperated by " "');

            process.exit();
        }

        if (!arg.startsWith('--')) {
            if (!arg.startsWith('-') || !shorthand[arg]) {
                console.log('Unknown argument ' + arg);
                rageQuit();
            }
            current = shorthand[arg];
        } else {
            arg = arg.substring(2);
            if (!(arg in params)) {
                console.log('Unknown argument --' + arg);
                rageQuit();
            }
            current = arg;
        }
    } else {
        if (current === 'global') {
            let index = arg.indexOf(':');
            if (index === -1) {
                console.log('Invalid global param: ' + arg);
                rageQuit();
            }
            let name = arg.substring(0, index);
            let path = arg.substring(index+1);
            params['global'][name] = path;
        } else {
            if (current === 'definitions' && !arg.endsWith('.pcd'))
                arg += '.pcd';
            params[current] = arg;
            current = '';
        }
    }
}

//parse config json
let content: string = '';
try {
    content = readFileSync(params.config, 'utf-8');
} catch (e) {
    if (params.config !== 'config.json') {
        console.log('Error reading config: ' + params.config);
        process.exit(1);
    }
}
try {
    if (content) {
        let d = JSON.parse(content);
        for (let key of Object.keys(d)) {
            if (key === 'config' || !(key in params)) {
                console.log('Unknown attribute ' + key);
                process.exit(1);
            }
            switch (key) {
                case 'definitions':
                    if (typeof(d[key]) !== typeof(true)) {
                        console.log('Attribute error: incompatible type for ' + key);
                        process.exit(1);
                    }
                    params[key] = d[key];
                    break;
                case 'global':
                    if (typeof(d[key]) !== 'object') {
                        console.log('Attribute error: incompatible type for ' + key);
                        process.exit(1);
                    }
                    for (let k of Object.keys(d[key])) {
                        if (typeof(d[key][k]) !== 'string') {
                            console.log('Attribute error: incompatible type for ' + key);
                            process.exit(1);
                        }
                        params[key][k] = d[key][k];
                    }
                    break;
                case 'js':
                    if (!Array.isArray(d[key])) {
                        console.log('Attribute error: incompatible type for ' + key);
                        process.exit(1);
                    }
                    for (let j of d[key]) {
                        if (typeof j !== 'string') {
                            console.log('Attribute error: incompatible type for ' + key);
                        }
                        params.js.push(<string>j);
                    }
                    break;
                default:
                    if (typeof(d[key]) !== 'string') {
                        console.log('Attribute error: incompatible type for ' + key);
                        process.exit(1);
                    }
                    params[key] = d[key];
                    break;
            }
        }
    }
} catch (e) {
    console.log('Error loading config: ' + params.config);
    process.exit(1);
}

setGlobal(params.global);
setObj(params.objective);
setNs(params['namespace']);

(async()=>{
    try {
        let result = await parse(params.entry, params.js);
        if (result) {
            if (params.definitions) {
                await outputFile(params.definitions, getDefinitions(result.defs, result.events));
                console.log('Generated definition');
            } else {
                let r = compile(result.defs, result.events, result.templates, result.refs);
                let promises: Promise<void>[] = [];
                for (let fn of r.fn) {
                    let index = fn.name.indexOf('.');
                    let name = params.output + fn.name.substring(0, index) + '/functions/' + fn.name.substring(index+1).replace(/\./g, '/') + '.mcfunction';
                    promises.push(outputFile(name, fn.commands.join('\n')));
                }
                for (let event of r.event) {
                    if (event.usage.length === 0)
                        continue;
                    let index = event.name.indexOf('.');
                    let name = params.output + event.name.substring(0, index) + '/tags/functions/' + event.name.substring(index+1).replace(/\./g, '/') + '.json';
                    promises.push(outputFile(name, JSON.stringify({values: event.usage})));
                }
                await Promise.all(promises);
                console.log('Generated files');
            }
        }
    } catch (e) {
        console.log(e);
        rageQuit();
    }
})();