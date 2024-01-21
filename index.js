import express from 'express';
import cors from 'cors';
const app = express();

const PORT = 6543;

import Database from './db.js';
await Database.buildTables();

import bexxteBot from './bexxtebot/index.js';
bexxteBot.attachDatabase(Database);
bexxteBot.run();

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
  switch(type) {
    case 'command':
    case 'timer':
      if (!Array.isArray(value_for_check)) {
        throw new Error(`Invalid value for previous_outputs of type ${type}, given ${value_for_check} -- expected an array`);
      }
      break;
    case 'count':
      if (!Number.isInteger(value_for_check)) {
        throw new Error(`Invalid value for previous_outputs of type ${type}, given ${value_for_check} -- expected an integer`);
      }
      break;
    default:
      throw new Error(`Invalid type for previous_outputs, given "${type}" -- expected "timer", "command", or "count"`);
    }
  await Database.setPrevious(name, type, value)
  res.send();
})

app.listen(PORT, () => {});