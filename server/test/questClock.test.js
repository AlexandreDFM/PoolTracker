const test = require('node:test');
const assert = require('node:assert/strict');
const {
    zonedNow,
    previousDate,
    isAssignmentDue,
    initialLastAssignmentDate
} = require('../services/questClock');

test('zonedNow follows Paris time across daylight saving changes', () => {
    // Winter (UTC+1): 09:30 UTC is 10:30 in Paris
    assert.deepEqual(zonedNow(new Date('2026-01-15T09:30:00Z'), 'Europe/Paris'), { date: '2026-01-15', hour: 10 });
    // Summer (UTC+2): 08:30 UTC is 10:30 in Paris
    assert.deepEqual(zonedNow(new Date('2026-07-15T08:30:00Z'), 'Europe/Paris'), { date: '2026-07-15', hour: 10 });
    // 23:30 UTC in summer is already the next day in Paris
    assert.deepEqual(zonedNow(new Date('2026-07-15T23:30:00Z'), 'Europe/Paris'), { date: '2026-07-16', hour: 1 });
});

test('previousDate handles month and year boundaries', () => {
    assert.equal(previousDate('2026-03-01'), '2026-02-28');
    assert.equal(previousDate('2028-03-01'), '2028-02-29');
    assert.equal(previousDate('2027-01-01'), '2026-12-31');
});

test('assignment is due once the hour has passed and today is not recorded', () => {
    const config = { assignmentHour: 10, lastAssignmentDate: '2026-11-24' };
    assert.equal(isAssignmentDue(config, { date: '2026-11-25', hour: 9 }), false);
    assert.equal(isAssignmentDue(config, { date: '2026-11-25', hour: 10 }), true);
    // A restart at 15:00 still assigns the missed 10:00 run
    assert.equal(isAssignmentDue(config, { date: '2026-11-25', hour: 15 }), true);
    // Already done today
    assert.equal(isAssignmentDue({ ...config, lastAssignmentDate: '2026-11-25' }, { date: '2026-11-25', hour: 15 }), false);
    // Never recorded
    assert.equal(isAssignmentDue({ assignmentHour: 0, lastAssignmentDate: null }, { date: '2026-11-25', hour: 0 }), true);
    // Missing configuration
    assert.equal(isAssignmentDue(undefined, { date: '2026-11-25', hour: 12 }), false);
});

test('first start never assigns for an hour already passed today', () => {
    assert.equal(initialLastAssignmentDate(10, { date: '2026-11-25', hour: 14 }), '2026-11-25');
    assert.equal(initialLastAssignmentDate(10, { date: '2026-11-25', hour: 8 }), '2026-11-24');
});
