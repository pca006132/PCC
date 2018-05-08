let nameMap: {[key: string]: string} = {};

export function setNameMap(m: {[key: string]: string}) {
    nameMap = m;
}
export function getNameMap() {
    return nameMap;
}