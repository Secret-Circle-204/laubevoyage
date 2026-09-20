const { fieldReducer } = require('../node_modules/@payloadcms/ui/dist/forms/Form/fieldReducer.js');

let state = {
  title: { value: 'Test' },
  accommodations: { value: [{ order: 1 }] },
  'accommodations.0': { value: {} },
  'accommodations.0.order': { value: 1 },
  'accommodations.0.options.0.roomRates.0.occupancy': { value: 'double' }
};

console.log('Initial keys:', Object.keys(state));

const prefix = 'accommodations.';
const descendantKeys = Object.keys(state).filter(k => k.startsWith(prefix));

for (const key of descendantKeys) {
  state = fieldReducer(state, { type: 'REMOVE', path: key });
}

console.log('Keys after pruning:', Object.keys(state));

const { reduceFieldsToValues } = require('../node_modules/payload/dist/utilities/reduceFieldsToValues.js');

const unflattened = reduceFieldsToValues(state, true);
console.log('Unflattened data:', JSON.stringify(unflattened));

