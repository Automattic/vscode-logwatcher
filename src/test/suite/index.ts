import { resolve } from 'node:path';
import * as Mocha from 'mocha';
import { glob } from 'glob';

export async function run(): Promise<void> {
    const mocha = new Mocha({
        ui: 'tdd',
        color: true,
    });

    const testsRoot = resolve(__dirname, '..');

    const files = await glob('**/**.test.js', { cwd: testsRoot });
    files.forEach((file) => mocha.addFile(resolve(testsRoot, file)));
    return new Promise<void>((resolve, reject) => {
        try {
            mocha.run((failures) => {
                if (failures > 0) {
                    reject(new Error(`${failures} tests failed.`));
                } else {
                    resolve();
                }
            });
        } catch (err) {
            console.error(err);
            reject(err);
        }
    });
}
