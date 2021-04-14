const Hapi = require('@hapi/hapi');
const { DH_CHECK_P_NOT_SAFE_PRIME } = require('constants');
const fs = require('fs');

const startServer = async (config) => {
    const httpsOptions = config.sslCert && config.sslKey ? {
        key: fs.readFileSync(config.sslKey),
        cert: fs.readFileSync(config.sslCert)
    } : undefined;

    const server = Hapi.server({
      port: config.serverPort,
      tls: httpsOptions
    });

    server.route({method: 'POST', path: config.requestPath, handler: function(request, h) {
        if (request.payload.type === 'url_verification') {
            console.log('Responding to url_verification');
            return h.response(request.payload.challenge).code(200);
        }
        if (request.payload.token !== config.botVerificationToken) {
          console.log('Received a message with the wrong bot token');
          return h.response().code(200);
        }
        console.log('Adding a message to the queue');
        config.messageQueue.push(request.payload);
        return h.response().code(200);
    }});

    await server.start();
    console.log(`Server started on port ${config.serverPort}`);


  
    if (config.redirectInsecure) {
        const insecureServer = Hapi.server({
            port: config.insecurePort
        });

        insecureServer.route({method: '*', path: '/{path*}', handler: function(request, h) {
            console.log(`Redirecting insecure request to /${request.params.path}`);
            return h.redirect(`https://${request.headers.hostname}${config.serverPort === 443 ? config.serverPort : `:${config.serverPort}`}/${request.params.path}`).code(307);
        }});

        await insecureServer.start();
        console.log(`Redirect server started on port ${config.insecurePort}`);
    }
};

module.exports = startServer;
