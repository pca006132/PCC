import {createReadStream} from 'fs';
import * as es from 'event-stream';


/**
 * Object for reading file line by line using stream
 */
export default class LineReader {
    name: string;
    /**
     * @property Stream object
     */
    private s?: es.MapStream;
    /**
     * @property Callback when a line is read
     * Parameter:
     *   line: string
     */
    private line?: (l: string)=>void;
    /**
     * @property Callback when the file reading is finished
     */
    private end?: ()=>void;
    /**
     * @property Callback when there is an error during reading
     * Parameter:
     *   e: any
     */
    private err?: (e: any)=>void;
    /**
     * @property Line number of the current line
     */
    lineNum = 0;
    /**
     * @property Current line reading
     */
    current: string = '';
    /**
     * @property If the file stream is ended
     */
    ended = false;

    constructor(name: string) {
        this.name = name;
    }

    /**
     * Start reading the file, should be called at the end
     * @returns The object itself
     */
    read() {
        let s = this.s = createReadStream(this.name, 'utf-8')
            .on('error', (err)=> {
                if (this.err) {
                    this.err(err);
                } else {
                    throw err;
                }
            })
            .pipe(es.split(/\r?\n/))
            .pipe(es.mapSync((line) => {
                s.pause();
                this.lineNum++;
                this.current = line;
                if (this.line)
                    this.line(line);
            }))
            .on('end', ()=> {
                this.ended = true;
                if (this.end)
                    this.end();
            })
        return this;
    }

    /**
     * Start reading the next line.
     * @returns Whether it is allowed to read the next line
     */
    readNextLine() {
        if (this.s) {
            if (!this.ended) {
                this.s.resume();
                return true;
            }
        }
        return false;
    }

    /**
     * Line async iterator
     * @param resume Should yield the last line as the first result, default to false
     */
    async *lines(resume = false): AsyncIterableIterator<string> {
        let iPromise = () => {
            return new Promise<string|null>((resolve, reject) => {
                this.line = resolve;
                this.err = reject;
                this.end = ()=>resolve(null);
            });
        }

        if (this.ended)
            return;
        let p = iPromise();
        if (resume && this.s) {
            yield this.current;
            this.readNextLine();
        }

        if (!this.s) {
            this.read();
        }

        do {
            let l = await p;
            if (l !== null) {
                yield l;
            } else {
                return;
            }
            p = iPromise();
        } while (this.readNextLine())
    }
}

