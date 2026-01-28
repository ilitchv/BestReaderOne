const text = `Tuesday,
                
                Jan 27, 2026`;

const cleaned = text.replace(/\s+/g, ' ').trim();
console.log("Cleaned:", cleaned);

const tDate = '2026-01-27';
const dateParts = tDate.split('-');
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const mName = months[parseInt(dateParts[1]) - 1];
const dDay = parseInt(dateParts[2]);

// Original Regex
const regex1 = new RegExp(`${mName}\\s+0?${dDay},?\\s+${dateParts[0]}`, 'i');
console.log("Regex 1 match:", regex1.test(text));
console.log("Regex 1 on clean:", regex1.test(cleaned));

// Loose Regex
const regex2 = new RegExp(`${mName}.*${dDay}.*${dateParts[0]}`, 'i');
console.log("Regex 2 match:", regex2.test(text));
