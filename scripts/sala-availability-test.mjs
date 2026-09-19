import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
const source = await readFile(new URL('../assets/js/sala.js', import.meta.url), 'utf8');

async function run(fetch) {
  const message = { hidden: true, setAttribute() {} };
  const month = {};
  const help = {};
  const buttons = [{ disabled: false }, { disabled: false }];
  let timeout;
  const section = {
    querySelector(selector) {
      return ({ '[data-sala-luna]': month, '[data-sala-fara-zi]': message, '.sala-ajutor': help })[selector] || null;
    },
    querySelectorAll() { return buttons; }
  };
  vm.runInNewContext(source, {
    document: { querySelectorAll: () => [section] }, window: {}, fetch,
    setTimeout(fn) { timeout = fn; return 1; }, clearTimeout() {}, AbortController
  });
  await new Promise(resolve => setImmediate(resolve));
  return { message, month, buttons, timeout };
}

for (const [name, fetch] of [
  ['network failure', () => Promise.reject(new Error('offline'))],
  ['server error', () => Promise.resolve({ ok: false })],
  ['malformed response', () => Promise.resolve({ ok: true, json: async () => ({}) })]
]) test(name + ' does not advertise free dates', async () => {
  const state = await run(fetch);
  assert.equal(state.month.textContent, 'Disponibilitate neconfirmată');
  assert.equal(state.message.hidden, false);
  assert.ok(state.buttons.every(button => button.disabled));
});

test('a stalled request times out with a contact fallback', async () => {
  const state = await run(() => new Promise(() => {}));
  state.timeout();
  await new Promise(resolve => setImmediate(resolve));
  assert.match(state.message.innerHTML, /tel:\+40720409320/);
  assert.ok(state.buttons.every(button => button.disabled));
});

test('a valid empty availability list is accepted', async () => {
  const state = await run(() => Promise.resolve({ ok: true, json: async () => ({ ocupate: [], imagini: [] }) }));
  assert.equal(state.message.hidden, true);
});