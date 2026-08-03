// ------------------------------------------------------------------------------
// root.js
// Root path serves the interactive URL builder web UI (public/), or redirects
// to ROOT_REDIRECT_URL when configured. Also serves the UI's static assets and
// the /leagues JSON endpoint that feeds its league dropdown.
// ------------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');
const { getAllLeagues } = require('../leagues');
const logger = require('../helpers/logger');

const publicDir = path.join(__dirname, '..', '..', 'public');

const staticFiles = {
    '/': { file: 'index.html', type: 'text/html; charset=utf-8' },
    '/app.js': { file: 'app.js', type: 'application/javascript; charset=utf-8' },
    '/styles.css': { file: 'styles.css', type: 'text/css; charset=utf-8' }
};

module.exports = {
    paths: [
        "/",
        "/app.js",
        "/styles.css",
        "/leagues"
    ],
    method: "get",
    priority: 0, // Highest priority to intercept root path early
    handler: async (req, res) => {
        if (req.path === '/') {
            const redirectUrl = process.env.ROOT_REDIRECT_URL;
            if (redirectUrl) {
                logger.info(`Root redirect enabled, redirecting to: ${redirectUrl}`);
                return res.redirect(301, redirectUrl);
            }
        }

        if (req.path === '/leagues') {
            const leagues = getAllLeagues();
            const list = Object.entries(leagues).map(([key, league]) => ({
                code: key,
                shortName: league.shortName,
                name: league.name
            }));
            return res.json(list);
        }

        const entry = staticFiles[req.path];
        if (!entry) {
            return res.status(404).json({ error: 'Not found' });
        }

        res.set('Content-Type', entry.type);
        res.send(fs.readFileSync(path.join(publicDir, entry.file)));
    }
};
