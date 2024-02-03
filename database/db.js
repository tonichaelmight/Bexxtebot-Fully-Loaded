import knex from 'knex';
import 'dotenv/config';

const PREVIOUS_TYPES = ['count', 'timer', 'command'];

const Database = {

  db: knex({
    client: 'pg',
    connection: {
      host: 'localhost',
      port: 5432,
      user: process.env['PG_USERNAME'],
      password: process.env['PG_PASSWORD'],
      database: 'bexxtedata'
    },
    sslmode: 'require',
  }),

  searchCache: {
    previous: {
      count: {},
      timer: {},
      command: {}
    },
    commands: {},
    config: {}
  },

  async buildTables() {
    if (!await this.db.schema?.hasTable('previous_outputs')) {
      await this.db.schema.createTable("previous_outputs", table => {
        table.string("name").notNullable().unique();
        table.string('type').notNullable(); // timer, command, or count
        // previous array of integers stringified for timer and command
        // { previous: [7, 2, 6] }
        // but and integer for count
        // { previous: 2 }
        table.json("previous").notNullable();

        table.primary(['name', 'type']);
      });
    }
    if (!await this.db.schema?.hasTable('config')) {
      await this.db.schema.createTable('config', table => {
        table.string('variable_name').notNullable().unique();
        table.string('type').notNullable(); // 'literal', 'array', 'object'
        // should verify that values are not executable code
        table.json('value').notNullable();
      });
    }
    if (!await this.db.schema?.hasTable('commands')) {
      await this.db.schema.createTable('commands', table => {
        table.string('command_name').notNullable().unique();
        table.string('command_type').notNullable(); // basic, async(possibly split into database vs web req commands), count
        table.string('output').notNullable(); // may need to configure a way to use a special formatted string to interpolate config variables, or just convert those to async
        // currently, count commands use a separate "outputs" property because they
        // require more than one option
        table.integer('cooldown_ms'); // default should be 10000
        table.boolean('mod_only'); // should default to false
        table.json('aliases'); // should be an array
        table.boolean('on_cooldown'); // default false
        table.boolean('refs_message'); // default false
      });
    }
    if (!await this.db.schema?.hasTable('command_use_log')) {
      await this.db.schema.createTable('command_use_log', table => {
        table.string('command_name').notNullable();
        table.string('username').notNullable();
        table.string('message').notNullable();
        table.timestamp('created_at').defaultTo(this.db.fn.now());

        //table.foreign('command_name').references('command_name').inTable('commands');
      })
    }
    if (!await this.db.schema?.hasTable('moderation_log')) {
      await this.db.schema.createTable('moderation_log', table => {
        table.string('offense').notNullable(); // term, ... ? idk what else tbh
        table.string('message').notNullable(); // i assume any mod action will come from a message in chat
        table.string('username').notNullable();
        table.string('action').notNullable();
        table.timestamp('created_at').defaultTo(this.db.fn.now());
      })
    }
    if (!await this.db.schema?.hasTable('error_log')) {
      await this.db.schema.createTable('error_log', table => {
        table.string('code_ref'); // optional message in error logging calls that describes where the message came from
        table.string('stack', 2000).notNullable(); // message from chat, code reference, etc
        table.string('message'); // message from chat if applicable
        table.string('username'); // username if error was from a chat message
        table.timestamp('created_at').defaultTo(this.db.fn.now());
      })
    }

  },


  // LOGGING
  async log(type, eventData) {
    switch (type) {
      case 'command':
        await this.logCommandUse(eventData.command, eventData.username, eventData.messageContent);
        break;
      case 'moderation':
        await this.logModerationEvent(eventData.offense, eventData.username, eventData.messageContent, eventData.action);
        break;
      case 'error':
        await this.logError(eventData.stack, eventData.codeRef, eventData.username, eventData.message);
        break;
    }
  },

  async logError(stack, codeRef, username, message) {
    await this.db('error_log').insert({
      'code_ref': codeRef,
      'stack': stack,
      'message': message,
      'username': username
    })
  },

  async logCommandUse(commandName, username, message) {
    await this.db('command_use_log').insert({
      'command_name': commandName,
      'username': username,
      'message': message
    })
  },

  async logModerationEvent(offense, username, message, action) {
    await this.db('moderation_log').insert({
      'offense': offense,
      'username': username,
      'message': message,
      'action': action
    })
  },


  // PREVIOUS
  async addPreviousIfNeeded(name, type) {
    this.searchCache.previous[type][name] = true;
    let defaultValue;
    if (type === 'timer' || type === 'command') {
      defaultValue = [];
    } else if (type === 'count') {
      defaultValue = 0;
    }

    try {
      await this.db('previous_outputs').insert({
        name: name,
        type: type,
        previous: JSON.stringify({ previous: defaultValue })
      })
    } catch (e) {
      if (!e.message.includes('duplicate key value violates unique constraint')) {
        throw e;
      }
    }
  },

  async contingentPreviousSetup(name, type) {
    if (!this.searchCache.previous[type][name]) await this.addPreviousIfNeeded(name, type);
  },

  async getPrevious(name, type) {
    if (!PREVIOUS_TYPES.includes(type)) throw new Error(`Invalid type for previous_outputs given "${type}" -- expected "timer", "command", or "count"`);

    await this.contingentPreviousSetup(name, type);
    let record = await this.db('previous_outputs')
      .where({ name: name, type: type })
      .first();
    const { previous } = record.previous;
    return previous;
  },

  async getPreviousTimerOutput(name) {
    return await this.getPrevious(name, 'timer');
  },

  async getPreviousCommandOutput(name) {
    return await this.getPrevious(name, 'command');
  },

  async getStoredCount(name) {
    return await this.getPrevious(name, 'count');
  },

  async setPrevious(name, type, newValue) {
    if (!PREVIOUS_TYPES.includes(type)) throw new Error(`Invalid type for previous_outputs, given "${type}" -- expected "timer", "command", or "count"`);

    await this.contingentPreviousSetup(name, type);
    await this.db('previous_outputs')
      .where({ name: name, type: type })
      .update({ previous: newValue })
  },

  async setPreviousCommandOutput(name, newValue) {
    await this.setPrevious(name, 'command', newValue);
  },

  async setPreviousTimerOutput(name, newValue) {
    await this.setPrevious(name, 'timer', newValue);
  },

  async setStoredCount(name, newValue) {
    try {
      await this.setPrevious(name, 'count', newValue);
      return true;
    } catch(e) {
      this.logError(e.stack, 'caught error attempting to set the stored value of a counter command')
      return false;
    }
  },

  async incrementCount(name) {
    const current = await this.getStoredCount(name);
    await this.setStoredCount(name, {'previous': current + 1});
  },


  // CONFIG
  async getConfigVariable(variableName) {
    const record = await this.db('config')
      .where({variable_name: variableName})
      .first();

    // likely need some error catching here for if the variable does not exist

    const value = record?.value.value;
    if (value === undefined) throw new Error(`attempted to retrieve a config variable "${variableName}", which does not exist`)
    return value;
  },

  async setConfigVariable(variableName, type, value) {
    try {
      await this.db('config')
        .insert({
          variable_name: variableName,
          type,
          value
        })
    } catch(e) {
      if (e.message.includes('duplicate key value violates unique constraint')) {
        await this.db('config')
          .update({
            'value': value,
            type
          })
          .where('variable_name', variableName);
      } else {
        throw e;
      }
    }
  },

  async getConfiguration() {
    const config = await this.db('config');
    return config;
  }

}

export default Database;



// await Database.addPreviousIfNeeded('bop', 'count');
// console.log(Database.db);

// Database.db.schema.createTable('test', table => {
//   table.string('first_name');
//   table.string('last_name')
// })