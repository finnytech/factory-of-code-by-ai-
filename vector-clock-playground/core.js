'use strict';

function compare(a, b) {
  const length = Math.max(a.length, b.length);
  let less = false;
  let greater = false;
  for (let i = 0; i < length; i += 1) {
    const left = a[i] || 0;
    const right = b[i] || 0;
    less ||= left < right;
    greater ||= left > right;
  }
  return less && greater ? 'concurrent' : less ? 'before' : greater ? 'after' : 'same';
}
function happensBefore(a, b) { return compare(a, b) === 'before'; }
function tick(clock, replica) {
  const next = clock.slice();
  next[replica] = (next[replica] || 0) + 1;
  return next;
}
function merge(local, remote, replica) {
  const length = Math.max(local.length, remote.length);
  const next = Array.from({ length }, (_, i) => Math.max(local[i] || 0, remote[i] || 0));
  next[replica] = (next[replica] || 0) + 1;
  return next;
}
function format(clock) { return '<' + clock.join(',') + '>'; }
function makeEvent(replica, clock, label, type) {
  return { id: Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7), replica, clock: clock.slice(), label, type: type || 'local' };
}
function frontier(events, replicaCount) {
  const width = replicaCount || events.reduce((max, event) => Math.max(max, event.clock.length), 0) || 1;
  return events.reduce((result, event) => result.map((value, index) => Math.max(value, event.clock[index] || 0)), Array(width).fill(0));
}
function serializeEvents(events) {
  return JSON.stringify({ version: 1, events: events.map(event => ({
    id: String(event.id), replica: Number(event.replica), clock: event.clock.slice(), label: String(event.label), type: String(event.type || 'local')
  })) });
}
function deserializeEvents(input) {
  const payload = typeof input === 'string' ? JSON.parse(input) : input;
  if (!payload || payload.version !== 1 || !Array.isArray(payload.events)) throw new TypeError('Invalid vector clock export');
  return payload.events.map(event => {
    if (!event || !Array.isArray(event.clock) || !Number.isInteger(event.replica)) throw new TypeError('Invalid event in vector clock export');
    return { id: String(event.id), replica: event.replica, clock: event.clock.map(Number), label: String(event.label), type: String(event.type || 'local') };
  });
}
if (typeof module !== 'undefined') module.exports = { compare, happensBefore, tick, merge, format, makeEvent, frontier, serializeEvents, deserializeEvents };
if (typeof window !== 'undefined') window.VectorClockCore = { compare, happensBefore, tick, merge, format, makeEvent, frontier, serializeEvents, deserializeEvents };
