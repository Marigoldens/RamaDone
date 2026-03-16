import { format, addDays } from 'date-fns';

const selectedDate = '2026-03-16';
const baseDate = new Date(selectedDate);
const batchDates = [];

for (let i = 0; i < 7; i++) {
  const target = new Date(baseDate);
  target.setDate(target.getDate() + i);
  const ds = target.toISOString().split('T')[0];
  batchDates.push(ds);
}

console.log('Batch dates with setDate:', batchDates);

// Using date-fns instead
const dateFnsBatch = [];
const d = new Date(selectedDate + 'T12:00:00'); 
for(let i=0; i<7; i++) {
  dateFnsBatch.push(format(addDays(d, i), 'yyyy-MM-dd'));
}
console.log('Batch dates with date-fns:', dateFnsBatch);
