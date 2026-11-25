/**
 * Dates and hours of the quest schedule, in the pool's time zone
 * (QUEST_TIME_ZONE, Europe/Paris by default) whatever the server's zone.
 * Pure functions: tested in test/questClock.test.js.
 */

const DEFAULT_TIME_ZONE = 'Europe/Paris';

const timeZone = () => process.env.QUEST_TIME_ZONE || DEFAULT_TIME_ZONE;

// { date: 'YYYY-MM-DD', hour: 0-23 } of `now` in the quest time zone
const zonedNow = (now = new Date(), zone = timeZone()) => {
    const parts = Object.fromEntries(
        new Intl.DateTimeFormat('en-CA', {
            timeZone: zone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            hourCycle: 'h23'
        })
            .formatToParts(now)
            .map((part) => [part.type, part.value])
    );
    return { date: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour) };
};

// Today's date in the quest time zone (YYYY-MM-DD)
const questDate = (now = new Date(), zone = timeZone()) => zonedNow(now, zone).date;

// Previous calendar day of a YYYY-MM-DD date
const previousDate = (date) => {
    const day = new Date(`${date}T12:00:00Z`);
    day.setUTCDate(day.getUTCDate() - 1);
    return day.toISOString().slice(0, 10);
};

// The daily assignment is due once the configured hour has passed today and
// today's assignment is not recorded yet
const isAssignmentDue = (config, now) => {
    if (!config) return false;
    const hour = Number(config.assignmentHour);
    if (!Number.isInteger(hour)) return false;
    if (now.hour < hour) return false;
    return !config.lastAssignmentDate || config.lastAssignmentDate < now.date;
};

// Starting value of lastAssignmentDate, so that the first start never assigns
// for an hour that has already passed today
const initialLastAssignmentDate = (assignmentHour, now) =>
    now.hour >= Number(assignmentHour) ? now.date : previousDate(now.date);

module.exports = {
    zonedNow,
    questDate,
    previousDate,
    isAssignmentDue,
    initialLastAssignmentDate,
    DEFAULT_TIME_ZONE
};
