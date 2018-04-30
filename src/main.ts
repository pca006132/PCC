import {parse, compile} from './file_manager';

(async()=>{
    let result = await parse('./test/a.pcc');
    if (result) {
        try {
            console.log(JSON.stringify(compile(result.defs, result.events, result.templates, result.refs), undefined, 4));
        } catch (e) {
            console.log((<Error>e).stack);
        }
    }
})();