import twitch from 'tmi.js';
// import https from 'https';

import TwitchMessage from './TwitchMessage.js';
import Streamer from './Streamer.js';

export default class Bot {
  constructor(name, channel, token, clientID, commands, timers, logger, config) {
    this.name = name;
    this.channel = channel;
    this.token = token;
    this.clientID = clientID;
    this.logger = logger;
    // this.db = db;
    this.streamer = new Streamer(channel, token, clientID, commands, timers, config, this);
    this.searching = false;
    this.searchCriteria = undefined;
    this.found = undefined;

    // this.getUserId()
  }

  // getUserId() {
  //   const requestOptions = {
  //     hostname: 'api.twitch.tv',
  //     method: 'GET',
  //     path: `/helix/users?login=${this.name}`,
  //     headers: {
  //       'Authorization': `Bearer ${this.token}`,
  //       'Client-id': this.clientID
  //     }
  //   }

  //   let result = '';

  //   const userDataRequest = https.request(requestOptions, res => {

  //     res.on('data', data => {
  //       result += data;
  //       try {
  //         result = JSON.parse(result);
  //         if (result.message && result.message === 'Invalid OAuth token') {
  //           throw new Error(result.message);
  //         }
  //         result = result['data'][0]['id'];
  //       } catch(e) {
  //         if (!(e.name === 'SyntaxError' && (e.message === 'Unexpected end of JSON input' || e.message.includes('Unterminated string in JSON at position')))) {
  //           result = false;
  //           return this.bot.logger.log('error', {
  //             stack: e.stack,
  //             codeRef: 'error caught while getting user ID'
  //           });
  //         }
  //       }

  //     });

  //   });

  //   userDataRequest.on('error', e => {
  //     this.bot.logger.log('error', {
  //       stack: e.stack,
  //       codeRef: 'error caught while fetching streamer data'
  //     });
  //   });

  //   userDataRequest.end();

  //   let cycles = 0;

  //   // return result['data'][0]['id'];
  //   return new Promise((resolve, reject) => {
  //     const resolutionTimeout = setInterval(() => {
  //       if (result) {
  //         resolve(result);
  //         this.id = result;
  //         clearInterval(resolutionTimeout);
  //       } else if (result === false || cycles > 5) {
  //         reject('user id not found');
  //         this.id = false;
  //         clearInterval(resolutionTimeout);
  //       }
  //       cycles++;
  //     }, 1000)
  //   });

  // }

  // estabishes a client that can read and send messages from/to Twitch
  attachDatabase(db) {
    this.db = db;
    this.logger.attachDatabase(db);
  }
  
  async establishTwitchClient() {

    this.twitchClient = new twitch.Client({
      options: {
        debug: true
      },
      connection: {
        reconnect: true,
        secure: true
      },
      identity: {
        username: this.name,
        password: this.token
      },
      channels: [this.channel]
    });

    await this.twitchClient.connect();

    // listens for messages, determined by the "channels" property defined in the connection above
    this.twitchClient.on('message', async (channel, tags, message, self) => {
      const twitchMessage = new TwitchMessage(channel, tags, message, self);

      if (this.searching) {
        if (twitchMessage.content === this.searchCriteria)  {
          this.found = twitchMessage;
        }
      }

      try {
        // there are no errors expected here, so if something does happen it gets logged in error.txt and we keep the program running (otherwise bexxteBot stops :/ )
        await this.processTwitchMessage(twitchMessage);
      } catch(e) {
        this.logger.log('error', {
          stack: e.stack,
          codeRef: 'error caught while processing twitch message'
        }, twitchMessage);
      }

    })
  }

  // moderates twitch messages
  // moderateTwitchMessage(twitchMessage) {
  //   if (twitchMessage.needsModeration()) {
  //     this.streamer.config.forbidden.forEach(word => {
  //       if (twitchMessage.content.includes(word)) {
  //         twitchMessage.addResponse(
  //           `Naughty naughty, @${twitchMessage.tags.username}! We don't use that word here!`,
  //           true
  //         );
  //         this.logger.log('moderation', {
  //           offense: `Forbidden term: ${word}`,
  //           action: '20 second timeout'
  //         }, twitchMessage)
  //       }
  //     });
  //   }
  // }

  // assesses a twitch message to see if it has a command structure ("!lurk" anywhere in a message, or any message beginning with "!")
  searchForTwitchCommand(twitchMessage) {

    // lurk is built different; can be used anywhere in a message, not just the beginning
    const lurkCheck = /(?<!(\w))!lurk(?!(\w))/;
    if (lurkCheck.test(twitchMessage.content)) {
      return 'lurk';
    }

    // besides !lurk, all commands must be at the beginning of the message
    if (!twitchMessage.content.startsWith('!')) {
      return;
    }

    const messageWords = twitchMessage.content.split(' ');
    // get first word and remove the "!"
    const command = messageWords[0].slice(1);
    return command;

  }

  async executeTwitchCommand(twitchMessage, command) {
    // check if command exists for streamer
    if (this.streamer.commands[command]) {
      // call the command's execute() method
      await this.streamer.commands[command].execute(twitchMessage);
    }
  }

  // speaks TwitchResponse objects from the twitchMessage's .response property
  speakInTwitch(twitchMessage) {

    twitchMessage.response.forEach(responseLine => {

      // if (responseLine.mean) {
      //   // this.twitchClient.timeout(
      //   //   twitchMessage.channel,
      //   //   twitchMessage.tags.username,
      //   //   20,
      //   //   'used forbidden term'
      //   // );
      //   // // she mad
      //   // // this.twitchClient.color(
      //   // //   'red'
      //   // // );
      //   // this.updateChatColor('red')
      //   // this.twitchClient.say(
      //   //   twitchMessage.channel,
      //   //   responseLine.output
      //   // );
      //   // // cool it
      //   // // this.twitchClient.color(
      //   // //   'hotpink'
      //   // // );
      //   // this.updateChatColor('hotpink');

      // } else {
        this.twitchClient.say(
          twitchMessage.channel,
          responseLine.output,
        );
      // }

    })

  }

  // passes twitch messages through moderation and then looks for a command. sends a response message in twitch if one is created
  async processTwitchMessage(twitchMessage) {

    // this.moderateTwitchMessage(twitchMessage);
    // console.log('made it through moderation')

    // if (twitchMessage.response) {
    //   this.speakInTwitch(twitchMessage);
    //   // if a message gets modded, any commands will be ignored
    //   return;
    // }

    const command = this.searchForTwitchCommand(twitchMessage);
    await this.executeTwitchCommand(twitchMessage, command);

    // only speak if she has something to say
    if (twitchMessage.response) {
      try {
        this.speakInTwitch(twitchMessage);
      } catch (e) {
        this.logger.log('error', {
          stack: e.stack,
          codeRef: 'error caught while speaking a message in twitch'
        }, twitchMessage);
      }
      return;
    }
  }

  startTimers() {
    //console.log(this.streamer);
      this.streamer.timers.forEach(timer => {
        timer.start();
      })
  }

  // top level command -- this is called directly in bexxtebot.js
  async run() {
    try {
      await this.establishTwitchClient();
      //this.establishDiscordClient();
      this.startTimers();
    } catch (e) {
      this.logger.log('error', {
        stack: e,
        codeRef: 'error caught running bexxtebot'
      });
    }
  }

  // async updateChatColor(color) {
  //   console.log(this.id);
  //   const requestOptions = {
  //     hostname: 'api.twitch.tv',
  //     method: 'PUT',
  //     path: `/helix/chat/color?user_id=${this.id}&color=${color}`,
  //     headers: {
  //       'Authorization': `Bearer ${this.token}`,
  //       'Client-id': this.clientID
  //     }
  //   }

  //   const colorUpdateRequest = https.request(requestOptions, res => {

  //     res.on('data', data => {
  //       console.log(JSON.parse(data));
  //     })
  //   });

  //   colorUpdateRequest.on('error', e => {
  //     this.logger.log('error', {
  //       stack: e.stack,
  //       codeRef: 'error caught while attempting to update chat color'
  //     })
  //   });

  //   colorUpdateRequest.end();
  // }

  // estabishes a client that can send and receive messages from Discord
  // this is still very much WIP
  /*
  establishDiscordClient() {
    this.discordClient = new discord.Client();

    this.discordClient.once('ready', () => {
      console.log(`Logged in as ${this.discordClient.user.tag}!`);
    });

    this.discordClient.on('message', async message => {
      // console.log(message);
      if (message.content === '!ping') {
        message.channel.send('pong!');
      }

      console.log(message);
      console.log(message.channel);
      console.log(await message.author.fetchFlags().bitfield);
    });

    this.discordClient.login(ev.DISCORD_TOKEN);
  },
  */

}