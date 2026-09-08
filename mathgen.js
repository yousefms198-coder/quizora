/* QUIZORA YKS/TYT MATH GENERATOR
   Produces hundreds of correct-by-construction multiple-choice questions.
   Every question's answer is computed, never guessed; distractors are
   plausible near-misses (common student mistakes). Deterministic seed so
   every deployment generates the identical bank.
   Question shape matches the exam bank: { q, qTr, options, correct, topic }. */

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(20260908);
const ri = (min, max, step) => {
  const count = Math.floor((max - min) / step) + 1;
  return min + step * Math.floor(rng() * count);
};
const pick = (arr) => arr[Math.floor(rng() * arr.length)];
/* Turkish suffix after a written numeral: 5→'i, 10→'u, 20→'si, 30→'u, 40→'ı ... */
const trSuffix = (num) => {
  const map = { 5: '’i', 10: '’u', 15: '’i', 20: '’si', 25: '’i', 30: '’u', 35: '’i', 40: '’ı', 45: '’i', 50: '’i' };
  const d = ((num % 100) + 100) % 100;
  return map[d] !== undefined ? map[d] : '’i';
};

function shuffleArr(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/* build 4 options from the correct value + 3 plausible wrong values */
function opts(correct, wrongs) {
  const set = [correct];
  for (const w of wrongs) {
    if (set.length >= 4) break;
    if (correct > 0 && w <= 0) continue;
    if (w !== correct && Number.isFinite(w) && !set.includes(w)) set.push(w);
  }
  let bump = 1;
  while (set.length < 4) {
    const cand = correct + bump * (rng() < 0.5 ? 1 : -1) * Math.max(1, Math.round(Math.abs(correct) * 0.1));
    if (correct > 0 && cand <= 0) { bump++; continue; }
    if (!set.includes(cand)) set.push(cand);
    bump++;
  }
  const shuffled = shuffleArr(set.slice());
  return { options: shuffled, correct: shuffled.indexOf(correct) };
}

const gens = [
  /* 1. percent of a number */
  () => {
    const n = ri(20, 45, 1) * 20;
    const p = ri(1, 9, 1) * 5;
    const ans = (n * p) / 100;
    const o = opts(ans, [ans + 10, ans - 5, (n * p) / 10, ans + 2]);
    return { q: `What is ${p}% of ${n}?`, qTr: `${n} sayısının yüzde ${p}${trSuffix(p)} kaçtır?`, ...o };
  },
  /* 2. inverse percent */
  () => {
    const n = ri(3, 24, 1) * 40;
    const p = ri(1, 5, 1) * 10;
    const x = (n * p) / 100;
    const o = opts(n, [n + 40, n - 40, Math.round(n / p) * 10, n + 80]);
    return { q: `${p}% of a number is ${x}. What is the number?`, qTr: `Bir sayının yüzde ${p}${trSuffix(p)} ${x} ise bu sayı kaçtır?`, ...o };
  },
  /* 3. GCD / LCM */
  () => {
    const pairs = [[24, 36], [18, 30], [16, 40], [12, 18], [20, 30], [45, 60], [14, 21], [15, 25], [28, 42], [36, 54], [22, 33], [26, 39]];
    const [a, b] = pick(pairs);
    const gcd = (x, y) => y ? gcd(y, x % y) : x;
    const g = gcd(a, b);
    const l = (a * b) / g;
    const askGcd = rng() < 0.5;
    const ans = askGcd ? g : l;
    const o = opts(ans, askGcd ? [l, g / 2, g + 2, ans * 2] : [g, l / 2, l + 6, ans * 2]);
    return askGcd
      ? { q: `What is the greatest common divisor (GCD) of ${a} and ${b}?`, qTr: `${a} ve ${b} sayılarının en büyük ortak böleni (EBOB) kaçtır?`, ...o }
      : { q: `What is the least common multiple (LCM) of ${a} and ${b}?`, qTr: `${a} ve ${b} sayılarının en küçük ortak katı (EKOK) kaçtır?`, ...o };
  },
  /* 4. linear equation */
  () => {
    const a = ri(2, 9, 1), x = ri(2, 12, 1), b = ri(1, 25, 1);
    const c = a * x + b;
    const o = opts(x, [x + 1, x - 1, c - b, x + 2]);
    return { q: `If ${a}x + ${b} = ${c}, what is x?`, qTr: `${a}x + ${b} = ${c} ise x kaçtır?`, ...o };
  },
  /* 5. arithmetic sequence nth term */
  () => {
    const a1 = ri(2, 20, 1), d = ri(2, 9, 1), n = ri(4, 12, 1);
    const ans = a1 + (n - 1) * d;
    const o = opts(ans, [ans + d, ans - d, a1 + n * d, ans + 1]);
    return { q: `In an arithmetic sequence the first term is ${a1} and the common difference is ${d}. What is the ${n}th term?`, qTr: `İlk terimi ${a1}, ortak farkı ${d} olan aritmetik dizide ${n}. terim kaçtır?`, ...o };
  },
  /* 6. factorial */
  () => {
    const n = ri(4, 7, 1);
    const facts = { 4: 24, 5: 120, 6: 720, 7: 5040 };
    const ans = facts[n];
    const o = opts(ans, [ans / n, ans * 2, ans + n, (n - 1) * ans]);
    return { q: `What is ${n}! (${n} factorial)?`, qTr: `${n}! (${n} faktöriyel) kaçtır?`, ...o };
  },
  /* 7. powers & roots */
  () => {
    if (rng() < 0.5) {
      const a = ri(2, 12, 1), b = pick([2, 3]);
      const ans = Math.pow(a, b);
      const o = opts(ans, [ans + a, ans - a, a * b, ans * 2]);
      return { q: `What is ${a}^${b}?`, qTr: `${a} üzeri ${b} kaçtır?`, ...o };
    }
    const root = ri(11, 20, 1);
    const ans = root;
    const o = opts(ans, [ans + 1, ans - 1, ans + 2, ans - 2]);
    return { q: `What is the square root of ${root * root}?`, qTr: `${root * root} sayısının karekökü kaçtır?`, ...o };
  },
  /* 8. arithmetic mean */
  () => {
    const k = ri(3, 5, 1);
    const m = ri(25, 40, 1);
    const s = k * m;
    const nums = [];
    for (let i = 0; i < k - 1; i++) nums.push(m + ri(-2, 2, 1) * 2 * (i + 1) * (rng() < 0.5 ? 1 : -1));
    const last = s - nums.reduce((x, y) => x + y, 0);
    nums.push(last);
    const o = opts(m, [m + 2, m - 2, Math.round(last), m + 5]);
    return { q: `What is the average (arithmetic mean) of ${nums.join(', ')}?`, qTr: `${nums.join(', ')} sayılarının aritmetik ortalaması kaçtır?`, ...o };
  },
  /* 9. triangle third angle */
  () => {
    let a = ri(30, 80, 1), b = ri(30, 80, 1);
    if (a + b > 150) { a = Math.min(a, 70); b = Math.min(b, 70); }
    if (a === b) b += 5;
    const ans = 180 - a - b;
    const o = opts(ans, [ans + 5, ans - 5, 180 - a, 360 - a - b]);
    return { q: `Two angles of a triangle are ${a}° and ${b}°. What is the third angle?`, qTr: `Bir üçgenin iki açısı ${a}° ve ${b}° ise üçüncü açı kaç derecedir?`, options: o.options.map(v => v + '°'), correct: o.options.indexOf(ans) };
  },
  /* 10. circle area / circumference */
  () => {
    const r = ri(2, 12, 1);
    const area = rng() < 0.5;
    const ans = area ? r * r : 2 * r;
    const o = opts(ans, [ans * 2, ans / 2, ans + r, area ? 2 * r : r * r]);
    return area
      ? { q: `What is the area of a circle with radius ${r}? (A = πr²)`, qTr: `Yarıçapı ${r} olan dairenin alanı kaçtır? (A = πr²)`, options: o.options.map(v => v + 'π'), correct: o.options.indexOf(ans) }
      : { q: `What is the circumference of a circle with radius ${r}? (C = 2πr)`, qTr: `Yarıçapı ${r} olan dairenin çevresi kaçtır? (C = 2πr)`, options: o.options.map(v => v + 'π'), correct: o.options.indexOf(ans) };
  },
  /* 11. rectangle area / perimeter */
  () => {
    const w = ri(3, 18, 1), h = ri(3, 18, 1);
    const area = rng() < 0.5;
    const ans = area ? w * h : 2 * (w + h);
    const o = opts(ans, [w + h, area ? 2 * (w + h) : w * h, ans + w, ans - h]);
    return area
      ? { q: `What is the area of a rectangle with sides ${w} and ${h}?`, qTr: `Kenarları ${w} ve ${h} olan dikdörtgenin alanı kaçtır?`, ...o }
      : { q: `What is the perimeter of a rectangle with sides ${w} and ${h}?`, qTr: `Kenarları ${w} ve ${h} olan dikdörtgenin çevresi kaçtır?`, ...o };
  },
  /* 12. fraction of a number */
  () => {
    const k = pick([2, 3, 4, 5, 6, 8]);
    const n = ri(2, 24, 1) * k;
    const ans = n / k;
    const o = opts(ans, [ans * 2, ans + k, n - k, ans - 2]);
    return { q: `What is 1/${k} of ${n}?`, qTr: `${n} sayısının ${k}'de biri kaçtır?`, ...o };
  },
];

function generate(count) {
  const out = [];
  let i = 0;
  while (out.length < count) {
    const q = gens[i % gens.length]();
    /* options as strings — every renderer in the app expects string options */
    q.options = q.options.map(o => String(o));
    q.topic = 'matematik';
    const sig = q.q;
    if (!out.some(x => x.q === sig)) out.push(q);
    i++;
    if (i > count * 10) break; // safety
  }
  return out;
}

module.exports = { generate };
