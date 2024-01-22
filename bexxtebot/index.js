// Home of the BexxteBot object
// handles establishing client connections, moderating, sending messages, activating timers
// at the bottom of this page is what makes it all go
import 'dotenv/config';

// REQUIRES
import commands from './database_fetchers/commands.js';
import timers from './database_fetchers/timers.js';
import bexxteConfig from './database_fetchers/configuration.js';
// import Database from './classes/Database.js';

import LogHandler from './classes/LogHandler.js';

//const discord = require('discord.js');
import Bot from './classes/Bot.js';
// let db;

// (async () => {
//   db = new Database();
//   await db.buildTables();
// })();

// THE QUEEN AND LEGEND HERSELF
const bexxteBot = new Bot('bexxtebot', bexxteConfig.broadcastingChannel, process.env['BEXXTEBOT_TOKEN'], process.env['CLIENT_ID'], commands, timers, new LogHandler(), bexxteConfig);

export default bexxteBot;

// node bexxtebot.js log command
// node bexxtebot.js log error
// if (process.argv.length > 2) {
//   if (process.argv[2].match(/logs?/i)) {
//     if (process.argv[3].match(/commands?/i)) {
//       bexxteBot.logger.makeLog('command');
//     } else if (process.argv[3].match(/errors?/i)) {
//       bexxteBot.logger.makeLog('error');
//     }
//   }
// } else {
//   try {
//     bexxteBot.run();
//   } catch (e) {
//     bexxteBot.logger.log('error', {stack: e.stack});
//   }
// }

