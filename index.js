import express from 'express';
import cors from 'cors';
const app = express();

const PORT = 6543;

import Database from './database/db.js';
await Database.buildTables();

import bexxteBot from './bexxtebot/index.js';
bexxteBot.attachDatabase(Database);
bexxteBot.run();

class InvalidValueError extends Error {
  constructor(location, type, given, expected) {
    const message = `Invalid value for ${location} of type ${type} -- given ${given}, expected ${expected}`;
    super(message);
    this.name = 'InvalidValueError';
  }
}

app.use(cors());

app.get('/', (req, res) => {
  res.status(200).send('success!');
});

app.get('/previous/:type/:name', async (req, res) => {
  const prev = await Database.getPrevious(req.params.name, req.params.type);
  res.json(prev);
})

app.put('/previous/:type/:name', async (req, res) => {
  // value validation for type and newValue
  const { value } = req.query;
  const value_for_check = JSON.parse(value).previous;
  const { type, name } = req.params;

  try {
    switch(type) {
      case 'command':
      case 'timer':
        if (!Array.isArray(value_for_check)) {
          res.status(400).send('Improperly formatted request');
          throw new InvalidValueError('previous_outputs', type, value_for_check, 'array');
        }
        break;
      case 'count':
        if (!Number.isInteger(value_for_check)) {
          res.status(400).send('Improperly formatted request');
          throw new InvalidValueError('previous_outputs', type, value_for_check, 'integer');
        }
        break;
      default:
        throw new InvalidValueError('previous_outputs', type, value_for_check, '"timer", "command", or "count"');
      }
  } catch(e) {
    bexxteBot.logger.log('error', {
      stack: e.stack,
      codeRef: 'error caught sending previous data to database'
    })
  }
  
  await Database.setPrevious(name, type, value)
  res.send();
})

app.get('/config', (req, res) => {
  // should produce an object representing the full configuration
})

app.get('/config/:name', async (req, res) => {
  // should produce the value of a single variable
  const { name } = req.params;

  let record;
  try {
    record = await Database.getConfigVariable(name);
  } catch(e) {
    res.sendStatus(404);
    return;
  }
  

  res.json(record);
})

app.put('/config/:name/:type', async (req, res) => {
  const { name, type } = req.params;
  const { value } = req.query;

  if (!value) {
    res.status(400).send('Improperly formatted request');
    return;
  }
  const value_for_check = JSON.parse(value).value;

  // probably do more here to sanitize data
  try {
    switch(type) {
      case 'literal':
        if (!['string', 'number', 'boolean'].includes(typeof value_for_check)) {
          res.status(400).send('Improperly formatted request');
          throw new InvalidValueError('config', type, value_for_check, "'string', 'number', 'boolean'");
        }
        break;
      case 'array':
        if (!Array.isArray(value_for_check)) {
          res.status(400).send('Improperly formatted request');
          throw new InvalidValueError('config', type, value_for_check, 'array');
        }
        break;
      case 'object':
        if (typeof value_for_check === 'object') {
          res.status(400).send('Improperly formatted request');
          throw new InvalidValueError('config', type, value_for_check, 'object');
        }
        break;
      default:
        res.status(400).send('Improperly formatted request');
        throw new Error('Invalid config type');
  
    }
  } catch(e) {
    bexxteBot.logger.log('error', {
      stack: e.stack,
      codeRef: 'error caught sending config data to database'
    })
  }
  
  await Database.setConfigVariable(name, type, value);

  res.send();

});

app.listen(PORT, () => {});