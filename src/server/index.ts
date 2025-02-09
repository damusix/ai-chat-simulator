import Hapi from '@hapi/hapi';
import Boom from '@hapi/boom';
import routes from './routes';

const server = Hapi.server({
    port: 3000,
    host: 'localhost',
});

async function start() {

    routes(server);

    server.events.on('response', (request) => {

        const { response, info, method, path } = request;

        const res = response as Hapi.ResponseObject;

        if (res instanceof Boom.Boom) {

            console.log(
                res.statusCode,
                info.remoteAddress,
                info.referrer,
            );

            return;
        }

        console.log(
            res.statusCode,
            method,
            path,
            info.remoteAddress,
        );
    });

    await server.start();
    console.log('Server running on %s', server.info.uri);
}

start();
