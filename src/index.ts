#!/usr/bin/env node
import 'babel-polyfill';
import {toRPN, evaluateRPN} from './parser/condition';

//testing condition
console.log(evaluateRPN(toRPN(process.argv.slice(2).join(' '))).join('\n'));