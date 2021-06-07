
/**
 * Config parser ported from arma-config-parser
 */
export class ConfigParser {

    private debug: boolean = false;

    private find(input: string, ptr: number, search: string): number {
        const idx = input.indexOf(search, ptr);
        if (idx !== -1) {
            return (idx - ptr) + search.length;
        }
        return -1;
    }

    public cfg2json(input: string, level?: number): any {
        level = (level || 0) + 1;

        input = input
            .replace(/\r\n/g, '\n')
            .replace(/\n\n/g, '\n');

        let ptr = 0;
        const output = {};

        let classMatch = null;
        let arrMatch = null;
        let stringMatch = null;
        let boolMatch = null;
        let numberMatch = null;

        while (ptr < input.length) {
            let eol = this.find(input, ptr, '\n');
            if (eol === -1) break;
            const line = input.slice(ptr, ptr + eol).trim();
            // eslint-disable-next-line no-cond-assign
            if (classMatch = line.match(/^class\s+([a-zA-Z0-9_]+)((\s*:\s*([a-zA-Z0-9_]+)){0,1})/i)) {
                const nextBracket = this.find(input, ptr, '{');
                const nextSemi = this.find(input, ptr, ';');
                if (this.debug) {
                    console.log('classMatch', classMatch[1], level, nextBracket, nextSemi);
                }
                if (nextBracket !== -1 && nextBracket < nextSemi) {
                    ptr += this.find(input, ptr, '{');
                    const innerStart = ptr;
                    let parenthesisCount = 1;
                    while (parenthesisCount > 0) {
                        const c = input[ptr];
                        if (!c) {
                            throw new Error('unexpected end of file - prob a bug when parsing the cfg');
                        }
                        if (c === '"' || c === '\'') {
                            do {
                                ptr += 1;
                                ptr += this.find(input, ptr, c);
                            } while (input[ptr] === c);
                            continue;
                        } else if (c === '{') {
                            parenthesisCount += 1;
                        } else if (c === '}') {
                            parenthesisCount -= 1;
                        }
                        ptr += 1;
                    }
                    output[classMatch[1]] = this.cfg2json(
                        `${input.slice(innerStart, ptr - 1).trim()}\n`,
                        level,
                    );
                    if (classMatch[4]) {
                        // eslint-disable-next-line prefer-destructuring
                        output[classMatch[1]].__inherited = classMatch[4];
                    }
                }
                eol = this.find(input, ptr, '\n');
            // eslint-disable-next-line no-cond-assign
            } else if (stringMatch = line.match(/^([a-zA-Z0-9]+)\s*=\s*"(.*)";/i)) {
                if (this.debug) {
                    console.log('stringMatch', stringMatch[1], level);
                }
                // eslint-disable-next-line prefer-destructuring
                output[stringMatch[1]] = stringMatch[2] ?? '';
            // eslint-disable-next-line no-cond-assign
            } else if (boolMatch = line.match(/^([a-zA-Z0-9]+)\s*=\s*(true|false);/i)) {
                if (this.debug) {
                    console.log('boolMatch', boolMatch[1], level);
                }
                // eslint-disable-next-line prefer-destructuring
                output[boolMatch[1]] = boolMatch[2] === 'true';
            // eslint-disable-next-line no-cond-assign
            } else if (numberMatch = line.match(/^([a-zA-Z0-9]+)\s*=\s*([0-9\.\-e]+);/i)) {
                if (this.debug) {
                    console.log('numberMatch', numberMatch[1], level);
                }
                output[numberMatch[1]] = parseFloat(numberMatch[2]);
            // eslint-disable-next-line no-cond-assign
            } else if (arrMatch = line.match(/^([a-zA-Z0-9]+)\s*\[\]\s*=\s*/i)) {
                if (this.debug) {
                    console.log('arrMatch', arrMatch[1], level);
                }
                ptr = input.indexOf('{', ptr) + 1;
                const innerStart = ptr;
                let parenthesisCount = 1;
                while (parenthesisCount > 0) {
                    const c = input[ptr];
                    if (c === '"' || c === '\'') {
                        ptr = input.indexOf(c, ptr + 1);
                    } else if (c === '{') {
                        parenthesisCount += 1;
                    } else if (c === '}') {
                        parenthesisCount -= 1;
                    }
                    ptr += 1;
                }
                const inner = input
                    .slice(innerStart, ptr - 1)
                    .replace(/\{/g, '[')
                    .replace(/\}/g, ']')
                    .trim();
                output[arrMatch[1]] = JSON.parse(`[${inner}]`);
                eol = this.find(input, ptr, '\n');
            }
            ptr += eol;
        }
        return output;
    }


    public json2cfg(input: any, indent? : number): string {
        indent = indent || 0;
        const tabs = '\t'.repeat(indent);
        const output = [];
        Object.keys(input).forEach((key) => {
            const val = input[key];
            let type: string = typeof val;
            if (type === 'object' && Array.isArray(val)) {
                type = 'array';
            }
            switch (type) {
                case 'number':
                case 'boolean': {
                    output.push(`${tabs}${key}=${val};`);
                    break;
                }
                case 'string': {
                    output.push(`${tabs}${key}="${val}";`);
                    break;
                }
                case 'array': {
                    if (val.some((v) => typeof v === 'string')) {
                        output.push(
                            `${tabs}${key}[]=`,
                            `${tabs}{`,
                        );
                        val.forEach((v, i, a) => {
                            if (isNaN(v)) {
                                output.push(`${tabs}\t"${v}"${(i === (a.length - 1)) ? '' : ','}`);
                            } else {
                                output.push(`${tabs}\t${v}${(i === (a.length - 1)) ? '' : ','}`);
                            }
                        });
                        output.push(`${tabs}};`);
                    } else {
                        let line = '';
                        val.forEach((v, i) => {
                            line = `${line}${v}${(i === (val.length - 1)) ? '' : ','}`;
                        });
                        output.push(`${tabs}${key}[]={${line}};`);
                    }
                    break;
                }
                case 'object': {
                    output.push(
                        `${tabs}class ${key}`,
                        `${tabs}{`,
                        this.json2cfg(val, indent + 1),
                        `${tabs}};`,
                    );
                    break;
                }
            }
        });
        return (indent === 0) ? (`${output.join('\r\n')}\r\n`) : output.join('\r\n');
    }

}
