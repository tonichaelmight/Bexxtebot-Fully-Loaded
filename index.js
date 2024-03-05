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
app.use(express.static('web/public'));

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

app.get('/config/all', async (req, res) => {
  // should produce an object representing the full configuration
  const config = await Database.getConfiguration();
  res.status(200).json(config);
})

app.get('/config', async (req, res) => {
  // should produce an object representing the full configuration
  res.status(200).sendFile('web/index.html', {root:'./'});
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
  console.log();
  const decodedValue = JSON.parse(value).value

  if (!decodedValue) {
    res.status(400).send('Improperly formatted request');
    return;
  }

  // probably do more here to sanitize data
  console.log(type);
  try {
    switch(type) {
      case 'literal':
        if (!['string', 'number', 'boolean'].includes(typeof decodedValue)) {
          throw new InvalidValueError('config', type, decodedValue, "'string', 'number', 'boolean'");
        }
        break;
      case 'array':
        if (!Array.isArray(decodedValue)) {
          throw new InvalidValueError('config', type, decodedValue, 'array');
        }
        break;
      case 'object':
        if (!typeof decodedValue === 'object') {
          throw new InvalidValueError('config', type, decodedValue, 'object');
        }
        break;
      default:
        throw new Error('Invalid config type');
  
    }
  } catch(e) {
    bexxteBot.logger.log('error', {
      stack: e.stack,
      codeRef: 'error caught sending config data to database'
    })
    res.status(400).send('Improperly formatted request');
  }
  
  await Database.setConfigVariable(name, type, value);

  res.send();

});

app.listen(PORT, () => {});