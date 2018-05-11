#!/usr/bin/env node
import 'babel-polyfill';
import {toRPN, evaluateRPN} from './parser/condition';

//testing condition
let result = evaluateRPN(toRPN(process.argv.slice(2).join(' ')));
console.log('evaluation:');
console.log(result.evaluation.join('\n'));
console.log('condition:');
console.log(result.condition);