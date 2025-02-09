import Path from 'path';
import Fs from 'fs';

import { Server } from '@hapi/hapi';
import Boom from '@hapi/boom';
import { Mimos, MimosEntry } from '@hapi/mimos'

const CLIENT_PATH = Path.resolve(__dirname, '../client');

const mimos = new Mimos();

export default (server: Server) => {

    const loadFile = (path: string) => {

        const filePath = Path.resolve(CLIENT_PATH, path);

        console.log(filePath);

        if (!Fs.existsSync(filePath)) {

            return Boom.notFound();
        }

        const mimeType = mimos.path(filePath) as MimosEntry;

        return {
            stream: Fs.createReadStream(filePath),
            type: mimeType.type,
        }
    }

    server.route({
        method: 'GET',
        path: '/{path*}',
        handler: (req, h) => {

            const res = loadFile(req.params.path || 'index.html');

            if (res instanceof Boom.Boom) {

                return res;
            }

            return h.response(res.stream).type(res.type);
        }
    });
};