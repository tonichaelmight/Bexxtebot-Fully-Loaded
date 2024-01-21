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
    if (!await this.db.schema?.hasTable('config')){
      await this.db.schema.createTable('config', table => {
        table.string('config_variable_name').notNullable().unique();
        // should verify that values are not executable code
        table.json('value').notNullable();
      });
    }
    if (!await this.db.schema?.hasTable('commands')){
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

  },

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
        previous: JSON.stringify({previous: defaultValue})
      })
    } catch(e) {
      if (!e.message.includes('duplicate key value violates unique constraint')) {
        throw e;
      }
    }
  },

  async contingentPreviousSetup(name, type) {
    if (!this.searchCache.previous[type][name]) await this.addPreviousIfNeeded(name, type);
  },

  async getPrevious(name, type) {
    if (!PREVIOUS_TYPES.includes(type))throw new Error(`Invalid type for previous_outputs given "${type}" -- expected "timer", "command", or "count"`);

    await this.contingentPreviousSetup(name, type);
    let record = await this.db('previous_outputs')
      .where({name: name, type: type})
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
      .where({name: name, type: type})
      .update( { previous: newValue } )
  },

  async setPreviousCommandOutput(name, newValue) {
    await this.setPrevious(name, 'command', newValue);
  },

  async setPreviousTimerOutput(name, newValue) {
    await this.setPrevious(name, 'timer', newValue);
  },

  async setStoredCount(name, newValue) {
    await this.setPrevious(name, 'count', newValue);
  },

  async incrementCount(name) {
    const current = await this.getStoredCount(name);
    await this.setStoredCount(name, current + 1);
  },

}

export default Database;



// await Database.addPreviousIfNeeded('bop', 'count');
// console.log(Database.db);

// Database.db.schema.createTable('test', table => {
//   table.string('first_name');
//   table.string('last_name')
// })