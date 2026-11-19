import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../contact/enquiry.js', import.meta.url), 'utf8');

function fixture() {
  let focused = null;
  const handlers = {};
  const makeControl = (id, tagName = 'INPUT', custom = false) => {
    const attributes = {};
    const trigger = { attributes: {}, setAttribute(k,v) { this.attributes[k] = v; }, removeAttribute(k) { delete this.attributes[k]; }, focus() { focused = trigger; } };
    const parent = {
      error: null,
      querySelector(selector) { return selector === '.enquiry-error' ? this.error : selector === '.nw-select-trigger' ? trigger : null; },
      append(error) { this.error = error; error.remove = () => { this.error = null; }; },
    };
    return {
      id, tagName, value: `saved-${id}`, attributes, parentElement: parent, trigger,
      validity: { valid: true }, validationMessage: '',
      classList: { contains: name => custom && name === 'nw-native-select' },
      matches: selector => selector.includes(tagName.toLowerCase()),
      setAttribute(k,v) { attributes[k] = v; }, removeAttribute(k) { delete attributes[k]; },
      focus() { focused = this; },
    };
  };
  const fields = [makeControl('first-name'), makeControl('last-name'), makeControl('email'), makeControl('country', 'SELECT', true), makeControl('city'), makeControl('phone'), makeControl('subject'), makeControl('message', 'TEXTAREA')];
  const form = {
    querySelectorAll() { return fields; },
    addEventListener(name, fn, capture) { handlers[name] = { fn, capture }; },
  };
  const document = { querySelector: () => form, createElement: () => ({}) };
  vm.runInNewContext(source, { document });
  return {
    fields, form, handlers, focused: () => focused,
    submit() {
      const event = { prevented: false, stopped: false, preventDefault() { this.prevented = true; }, stopImmediatePropagation() { this.stopped = true; } };
      handlers.submit.fn(event);
      return event;
    },
    correct(field) { field.validity = { valid: true }; handlers[field.tagName === 'SELECT' ? 'change' : 'input'].fn({ target: field }); },
  };
}

test('the complete form validates before the email-draft handler and preserves entered values', () => {
  const f = fixture();
  const email = f.fields[2];
  email.validity = { valid: false, typeMismatch: true };
  const before = f.fields.map(field => field.value);
  const event = f.submit();
  assert.equal(f.handlers.submit.capture, true);
  assert.equal(event.prevented, true);
  assert.equal(event.stopped, true);
  assert.equal(f.focused(), email);
  assert.equal(email.parentElement.error.textContent, 'Enter a valid email.');
  assert.equal(email.attributes['aria-describedby'], 'email-error');
  assert.deepEqual(f.fields.map(field => field.value), before);
});

test('country errors focus the visible selector and clear after a selection', () => {
  const f = fixture();
  const country = f.fields[3];
  country.validity = { valid: false, valueMissing: true };
  f.submit();
  assert.equal(f.focused(), country.trigger);
  assert.equal(country.parentElement.error.textContent, 'Choose your country.');
  assert.equal(country.trigger.attributes['aria-invalid'], 'true');
  f.correct(country);
  assert.equal(country.parentElement.error, null);
  assert.equal(country.trigger.attributes['aria-invalid'], undefined);
  assert.equal(country.attributes['aria-describedby'], undefined);
});

test('valid input continues to the existing email draft flow without altering fields', () => {
  const f = fixture();
  const before = f.fields.map(field => field.value);
  const event = f.submit();
  assert.equal(event.prevented, false);
  assert.equal(event.stopped, false);
  assert.equal(f.focused(), null);
  assert.deepEqual(f.fields.map(field => field.value), before);
});
