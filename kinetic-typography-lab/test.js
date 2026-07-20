const assert=require('node:assert/strict');
const {rng,esc,posterSvg}=require('./app.js');
const a=rng(42),b=rng(42);assert.equal(a(),b());
assert.equal(esc('<&>'),'&lt;&amp;&gt;');
const s=posterSvg('A&B',123,62,'ember');assert.match(s,/A&amp;B/);assert.match(s,/stroke="#219c91"/);assert.ok((s.match(/<path/g)||[]).length>=3);
assert.equal(posterSvg('same',9,20,'lagoon'),posterSvg('same',9,20,'lagoon'));
console.log('kinetic typography tests: ok');