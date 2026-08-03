// ------------------------------------------------------------------------------
// teams.js
// Route to return the list of team names for a league (used by the URL builder
// web UI to pick random teams when switching leagues)
// ------------------------------------------------------------------------------

const providerManager = require('../helpers/ProviderManager');
const { findLeague } = require('../leagues');

module.exports = {
    paths: [
        "/:league/teams"
    ],
    method: "get",
    handler: async (req, res) => {
        const { league } = req.params;

        try {
            const leagueObj = await findLeague(league);
            if (!leagueObj) {
                return res.status(400).json({ error: `Unsupported league: ${league}` });
            }

            const teams = await providerManager.collectAllAvailableTeams(leagueObj, false);
            res.json({
                league: leagueObj.shortName || league.toUpperCase(),
                teams
            });
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }
};
