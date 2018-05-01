let SCB_OBJ = 'common';
let default_ns: string = 'system';
let global: {[key: string]: string} = {};

export function setObj(obj: string) {
    SCB_OBJ = obj;
}
export function setNs(ns: string) {
    default_ns = ns;
}
export function setGlobal(paths: {[key: string]: string}) {
    global = paths;
}
export function getObj() {
    return SCB_OBJ;
}
export function getDefaultNs() {
    return default_ns;
}
export function getGlobal() {
    return global;
}