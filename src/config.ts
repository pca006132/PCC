let nameMap: {[key: string]: string} = {};
let objective = 'common';
let rootNs = ['system'];

export function setNameMap(m: {[key: string]: string}) {
    nameMap = m;
}
export function getNameMap() {
    return nameMap;
}
export function setObjective(m: string) {
    objective = m;
}
export function getObjective() {
    return objective;
}
export function setRootNs(ns: string[]) {
    rootNs = ns;
}
export function getRootNs() {
    return rootNs;
}