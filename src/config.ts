let nameMap: {[key: string]: string} = {};
let objective = 'common';

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