import assert from 'node:assert/strict';
import test from 'node:test';

import { initialModalState, modalReducer } from '../src/q-modal/modal-state.ts';

const request = (id, options = {}) => ({
  id,
  visible: true,
  children: null,
  priority: 0,
  interruptible: true,
  placement: 'center',
  animation: 'fade',
  backdropOpacity: 0.35,
  dismissOnBackdrop: false,
  dismissOnBack: true,
  ...options,
});

const upsert = (state, id, options) =>
  modalReducer(state, { type: 'upsert', request: request(id, options) });

test('shows the next request without closing the native host', () => {
  let state = upsert(initialModalState, 'first');
  state = upsert(state, 'second');
  assert.equal(state.active.request.id, 'first');

  state = upsert(state, 'first', { visible: false });
  assert.equal(state.active.phase, 'exiting');
  state = modalReducer(state, {
    type: 'exited',
    session: state.active.session,
  });

  assert.equal(state.active.request.id, 'second');
  assert.equal(state.nativePhase, 'open');
});

test('keeps a request reopened during its exit animation', () => {
  let state = upsert(initialModalState, 'dialog');
  const firstSession = state.active.session;

  state = upsert(state, 'dialog', { visible: false });
  state = upsert(state, 'dialog');
  assert.equal(state.active.phase, 'exiting');

  state = modalReducer(state, { type: 'exited', session: firstSession });
  assert.equal(state.active.request.id, 'dialog');
  assert.notEqual(state.active.session, firstSession);
  assert.equal(state.active.phase, 'entering');
});

test('waits for native dismissal before reopening an empty host', () => {
  let state = upsert(initialModalState, 'first');
  state = upsert(state, 'first', { visible: false });
  state = modalReducer(state, {
    type: 'exited',
    session: state.active.session,
  });
  assert.equal(state.nativePhase, 'closing');

  state = upsert(state, 'second');
  assert.equal(state.active, null);
  state = modalReducer(state, { type: 'nativeClosed' });
  assert.equal(state.active.request.id, 'second');
});

test('preempts a lower priority dialog and resumes it afterward', () => {
  let state = upsert(initialModalState, 'ordinary');
  state = upsert(state, 'urgent', { priority: 10 });
  assert.equal(state.active.request.id, 'ordinary');
  assert.equal(state.active.phase, 'exiting');

  state = modalReducer(state, {
    type: 'exited',
    session: state.active.session,
  });
  assert.equal(state.active.request.id, 'urgent');

  state = upsert(state, 'urgent', { visible: false, priority: 10 });
  state = modalReducer(state, {
    type: 'exited',
    session: state.active.session,
  });
  assert.equal(state.active.request.id, 'ordinary');
});

test('does not preempt a noninterruptible dialog', () => {
  let state = upsert(initialModalState, 'blocking', {
    interruptible: false,
  });
  state = upsert(state, 'urgent', { priority: 10 });

  assert.equal(state.active.request.id, 'blocking');
  assert.equal(state.active.phase, 'entering');
});

test('ignores callbacks from an earlier presentation', () => {
  let state = upsert(initialModalState, 'first');
  const firstSession = state.active.session;
  state = upsert(state, 'first', { visible: false });
  state = upsert(state, 'second');
  state = modalReducer(state, { type: 'exited', session: firstSession });

  state = modalReducer(state, { type: 'entered', session: firstSession });
  state = modalReducer(state, { type: 'exited', session: firstSession });
  assert.equal(state.active.request.id, 'second');
  assert.equal(state.active.phase, 'entering');
});

test('removing the active dialog still hands off after its exit', () => {
  let state = upsert(initialModalState, 'first');
  state = upsert(state, 'second');
  const session = state.active.session;

  state = modalReducer(state, { type: 'remove', id: 'first' });
  assert.equal(state.active.phase, 'exiting');
  state = modalReducer(state, { type: 'exited', session });
  assert.equal(state.active.request.id, 'second');
});
