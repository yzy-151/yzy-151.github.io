/* Pure helpers shared by the dashboard and its dependency-free unit tests. */
(() => {
  function validDate(value) {
    const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
    if (!parts) return false;
    const [, year, month, day] = parts.map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  }

  function extractAppliedDate(history, year) {
    const text = String(history || '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, ' ');
    const events = /(?:^|[^\d])(?:(\d{4})[-/.年])?(\d{1,2})[-/.月](\d{1,2})日?\s*(?:已投(?:递)?|改投|重投|投递成功)/g;
    let latest = '';
    for (const match of text.matchAll(events)) {
      const date = `${match[1] || year}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
      if (validDate(date) && date > latest) latest = date;
    }
    return latest;
  }

  function validateDateRange(start, end) {
    return (!start || validDate(start)) && (!end || validDate(end)) && (!start || !end || start <= end);
  }

  function matches(record, filters = {}) {
    if (filters.stage && record.stage !== filters.stage) return false;
    if (filters.dateMode === 'unknown') return !record.appliedDate;
    if (filters.dateMode !== 'range') return true;
    if (!validateDateRange(filters.start, filters.end) || !record.appliedDate) return false;
    return (!filters.start || record.appliedDate >= filters.start) && (!filters.end || record.appliedDate <= filters.end);
  }

  globalThis.JobFilters = Object.freeze({ extractAppliedDate, validateDateRange, matches });
})();
