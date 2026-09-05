const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const QRCode = require('qrcode');
const path = require('path');
const crypto = require('crypto');
const os = require('os');

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return 'localhost';
}

const LOCAL_IP = getLocalIP();
const PORT = process.env.PORT || 3000;
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || null;

function resolveBase(req) {
  const host = req.headers.host || '';
  if (host.endsWith('onrender.com')) return `${req.protocol}://${host}`;
  if (PUBLIC_BASE_URL) return PUBLIC_BASE_URL;
  if (/^(localhost|127\.0\.0\.1)/.test(host)) return `http://${LOCAL_IP}:${PORT}`;
  if (host) return `${req.protocol}://${host}`;
  return `http://${LOCAL_IP}:${PORT}`;
}

const app = express();
app.set('trust proxy', 1);
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.static(path.join(__dirname, 'public')));

const rooms = new Map();

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function generateId() {
  return crypto.randomBytes(8).toString('hex');
}

const CATEGORIES = {
  "general": {
    "name": "General Knowledge",
    "nameAr": "المعلومات العامة",
    "emoji": "🧠",
    "color": "from-violet-500 to-purple-600",
    "questions": [
      {
        "q": "What is the capital of France?",
        "qAr": "ما هي عاصمة فرنسا؟",
        "options": [
          "London",
          "Berlin",
          "Paris",
          "Madrid"
        ],
        "optionsAr": [
          "لندن",
          "برلين",
          "باريس",
          "مدريد"
        ],
        "correct": 2
      },
      {
        "q": "Which planet is known as the Red Planet?",
        "qAr": "ما هو الكوكب المعروف بالكوكب الأحمر؟",
        "options": [
          "Venus",
          "Mars",
          "Jupiter",
          "Saturn"
        ],
        "optionsAr": [
          "الزهرة",
          "المريخ",
          "المشتري",
          "زحل"
        ],
        "correct": 1
      },
      {
        "q": "What is the largest ocean on Earth?",
        "qAr": "ما هو أكبر محيط على وجه الأرض؟",
        "options": [
          "Atlantic",
          "Indian",
          "Arctic",
          "Pacific"
        ],
        "optionsAr": [
          "الأطلسي",
          "الهندي",
          "المتجمد الشمالي",
          "الهادئ"
        ],
        "correct": 3
      },
      {
        "q": "How many continents are there?",
        "qAr": "كم عدد القارات في العالم؟",
        "options": [
          "5",
          "6",
          "7",
          "8"
        ],
        "optionsAr": [
          "5",
          "6",
          "7",
          "8"
        ],
        "correct": 2
      },
      {
        "q": "What is the chemical symbol for gold?",
        "qAr": "ما هو الرمز الكيميائي للذهب؟",
        "options": [
          "Go",
          "Gd",
          "Au",
          "Ag"
        ],
        "optionsAr": [
          "Go",
          "Gd",
          "Au",
          "Ag"
        ],
        "correct": 2
      },
      {
        "q": "Who painted the Mona Lisa?",
        "qAr": "من رسم لوحة الموناليزا؟",
        "options": [
          "Van Gogh",
          "Picasso",
          "Da Vinci",
          "Michelangelo"
        ],
        "optionsAr": [
          "فان جوخ",
          "بيكاسو",
          "دافنشي",
          "مايكل أنجلو"
        ],
        "correct": 2
      },
      {
        "q": "What is the tallest mountain in the world?",
        "qAr": "ما هو أطول جبل في العالم؟",
        "options": [
          "K2",
          "Kangchenjunga",
          "Mount Everest",
          "Lhotse"
        ],
        "optionsAr": [
          "جبل K2",
          "كانغشينجونغا",
          "جبل إيفرست",
          "لوتسي"
        ],
        "correct": 2
      },
      {
        "q": "In which year did the Titanic sink?",
        "qAr": "في أي عام غرقت سفينة تيتانيك؟",
        "options": [
          "1905",
          "1912",
          "1918",
          "1923"
        ],
        "optionsAr": [
          "1905",
          "1912",
          "1918",
          "1923"
        ],
        "correct": 1
      },
      {
        "q": "What is the smallest country in the world?",
        "qAr": "ما هي أصغر دولة في العالم؟",
        "options": [
          "Monaco",
          "Vatican City",
          "San Marino",
          "Liechtenstein"
        ],
        "optionsAr": [
          "موناكو",
          "الفاتيكان",
          "سان مارينو",
          "ليختنشتاين"
        ],
        "correct": 1
      },
      {
        "q": "Which element has the atomic number 1?",
        "qAr": "ما هو العنصر ذو العدد الذري 1؟",
        "options": [
          "Helium",
          "Oxygen",
          "Hydrogen",
          "Carbon"
        ],
        "optionsAr": [
          "الهيليوم",
          "الأكسجين",
          "الهيدروجين",
          "الكربون"
        ],
        "correct": 2
      },
      {
        "q": "Which country gifted the Statue of Liberty to the United States?",
        "qAr": "أي دولة أهدت تمثال الحرية إلى الولايات المتحدة؟",
        "options": [
          "France",
          "England",
          "Spain",
          "Italy"
        ],
        "optionsAr": [
          "فرنسا",
          "إنجلترا",
          "إسبانيا",
          "إيطاليا"
        ],
        "correct": 0
      },
      {
        "q": "What is the currency of Japan?",
        "qAr": "ما هي عملة اليابان؟",
        "options": [
          "Won",
          "Yen",
          "Yuan",
          "Ringgit"
        ],
        "optionsAr": [
          "الوون",
          "الين",
          "اليوان",
          "الرينغيت"
        ],
        "correct": 1
      },
      {
        "q": "Which musical instrument has 88 keys?",
        "qAr": "ما هي الآلة الموسيقية التي تحتوي على 88 مفتاحاً؟",
        "options": [
          "Guitar",
          "Piano",
          "Violin",
          "Trumpet"
        ],
        "optionsAr": [
          "الغيتار",
          "البيانو",
          "الكمان",
          "البوق"
        ],
        "correct": 1
      },
      {
        "q": "In which country is the Taj Mahal located?",
        "qAr": "في أي دولة يقع تاج محل؟",
        "options": [
          "Pakistan",
          "India",
          "Bangladesh",
          "Nepal"
        ],
        "optionsAr": [
          "باكستان",
          "الهند",
          "بنغلاديش",
          "نيبال"
        ],
        "correct": 1
      },
      {
        "q": "What is the largest hot desert in the world?",
        "qAr": "ما هي أكبر صحراء حارة في العالم؟",
        "options": [
          "Sahara",
          "Gobi",
          "Kalahari",
          "Atacama"
        ],
        "optionsAr": [
          "الصحراء الكبرى",
          "جوبي",
          "كالاهاري",
          "أتاكاما"
        ],
        "correct": 0
      },
      {
        "q": "In which city is the Burj Khalifa located?",
        "qAr": "في أي مدينة يقع برج خليفة؟",
        "options": [
          "Dubai",
          "Doha",
          "Riyadh",
          "Kuwait City"
        ],
        "optionsAr": [
          "دبي",
          "الدوحة",
          "الرياض",
          "مدينة الكويت"
        ],
        "correct": 0
      },
      {
        "q": "Which language is the most spoken in the world by native speakers?",
        "qAr": "ما هي اللغة الأكثر تحدثاً في العالم كلغة أم؟",
        "options": [
          "English",
          "Spanish",
          "Mandarin Chinese",
          "Hindi"
        ],
        "optionsAr": [
          "الإنجليزية",
          "الإسبانية",
          "الصينية الماندرين",
          "الهندية"
        ],
        "correct": 2
      },
      {
        "q": "Which vitamin does sunlight help the body produce?",
        "qAr": "أي فيتامين يساعد ضوء الشمس الجسم على إنتاجه؟",
        "options": [
          "Vitamin A",
          "Vitamin B",
          "Vitamin C",
          "Vitamin D"
        ],
        "optionsAr": [
          "فيتامين أ",
          "فيتامين ب",
          "فيتامين ج",
          "فيتامين د"
        ],
        "correct": 3
      },
      {
        "q": "How many days are in a leap year?",
        "qAr": "كم يوماً في السنة الكبيسة؟",
        "options": [
          "364",
          "365",
          "366",
          "367"
        ],
        "optionsAr": [
          "364",
          "365",
          "366",
          "367"
        ],
        "correct": 2
      },
      {
        "q": "Which animal is called the 'Ship of the Desert'?",
        "qAr": "ما هو الحيوان الملقب بـ«سفينة الصحراء»؟",
        "options": [
          "Horse",
          "Camel",
          "Donkey",
          "Elephant"
        ],
        "optionsAr": [
          "الحصان",
          "الجمل",
          "الحمار",
          "الفيل"
        ],
        "correct": 1
      },
      {
        "q": "What is the largest mammal on Earth?",
        "qAr": "ما هو أكبر حيوان ثديي على وجه الأرض؟",
        "options": [
          "Elephant",
          "Blue Whale",
          "Giraffe",
          "Hippopotamus"
        ],
        "optionsAr": [
          "الفيل",
          "الحوت الأزرق",
          "الزرافة",
          "فرس النهر"
        ],
        "correct": 1
      },
      {
        "q": "What color results from mixing red and yellow?",
        "qAr": "ما اللون الناتج عن مزج الأحمر والأصفر؟",
        "options": [
          "Green",
          "Orange",
          "Purple",
          "Brown"
        ],
        "optionsAr": [
          "الأخضر",
          "البرتقالي",
          "البنفسجي",
          "البني"
        ],
        "correct": 1
      },
      {
        "q": "Which organ pumps blood around the body?",
        "qAr": "ما هو العضو الذي يضخ الدم في الجسم؟",
        "options": [
          "Lungs",
          "Heart",
          "Kidney",
          "Brain"
        ],
        "optionsAr": [
          "الرئتان",
          "القلب",
          "الكلى",
          "الدماغ"
        ],
        "correct": 1
      },
      {
        "q": "Which planet is often called the Evening Star?",
        "qAr": "أي كوكب غالباً ما يُسمى نجم المساء؟",
        "options": [
          "Venus",
          "Mars",
          "Mercury",
          "Jupiter"
        ],
        "optionsAr": [
          "الزهرة",
          "المريخ",
          "عطارد",
          "المشتري"
        ],
        "correct": 0
      },
      {
        "q": "How many months in a year have 28 days?",
        "qAr": "كم شهراً في السنة يحتوي على 28 يوماً؟",
        "options": [
          "1",
          "6",
          "12",
          "28"
        ],
        "optionsAr": [
          "1",
          "6",
          "12",
          "28"
        ],
        "correct": 2
      },
      {
        "q": "Who invented the World Wide Web?",
        "qAr": "من اخترع الشبكة العنكبوتية العالمية؟",
        "options": [
          "Bill Gates",
          "Tim Berners-Lee",
          "Steve Jobs",
          "Mark Zuckerberg"
        ],
        "optionsAr": [
          "بيل غيتس",
          "تيم بيرنرز لي",
          "ستيف جوبز",
          "مارك زوكربيرغ"
        ],
        "correct": 1
      }
    ]
  },
  "movies": {
    "name": "Movies & TV",
    "nameAr": "سينما وتلفزيون",
    "emoji": "🎬",
    "color": "from-rose-500 to-pink-600",
    "questions": [
      {
        "q": "Who directed the movie Titanic?",
        "qAr": "من أخرج فيلم تيتانيك؟",
        "options": [
          "Steven Spielberg",
          "James Cameron",
          "Christopher Nolan",
          "Ridley Scott"
        ],
        "optionsAr": [
          "ستيفن سبيلبرغ",
          "جيمس كاميرون",
          "كريستوفر نولان",
          "ريدلي سكوت"
        ],
        "correct": 1
      },
      {
        "q": "What is the fictional African country in Black Panther?",
        "qAr": "ما هي الدولة الأفريقية الخيالية في فيلم النمر الأسود؟",
        "options": [
          "Zamunda",
          "Wakanda",
          "Genovia",
          "Latveria"
        ],
        "optionsAr": [
          "زاموندا",
          "واكاندا",
          "جنوفيا",
          "لاتفيريا"
        ],
        "correct": 1
      },
      {
        "q": "Which movie features the quote 'I'll be back'?",
        "qAr": "ما الفيلم الذي يحتوي على الجملة الشهيرة «سأعود»؟",
        "options": [
          "Predator",
          "Terminator",
          "Aliens",
          "RoboCop"
        ],
        "optionsAr": [
          "بريداتور",
          "تيرميناتور",
          "كائنات فضائية",
          "روبوكوب"
        ],
        "correct": 1
      },
      {
        "q": "In The Matrix, what color pill does Neo take?",
        "qAr": "في فيلم الماتريكس، ما لون الحبة التي يتناولها نيو؟",
        "options": [
          "Blue",
          "Red",
          "Green",
          "Yellow"
        ],
        "optionsAr": [
          "الزرقاء",
          "الحمراء",
          "الخضراء",
          "الصفراء"
        ],
        "correct": 1
      },
      {
        "q": "Who played Iron Man in the MCU?",
        "qAr": "من لعب دور الرجل الحديدي في أفلام مارفل؟",
        "options": [
          "Chris Evans",
          "Chris Hemsworth",
          "Robert Downey Jr.",
          "Mark Ruffalo"
        ],
        "optionsAr": [
          "كريس إيفانز",
          "كريس هيمسوورث",
          "روبرت داوني جونيور",
          "مارك رافالو"
        ],
        "correct": 2
      },
      {
        "q": "What year was the first Star Wars movie released?",
        "qAr": "في أي عام صدر أول فيلم من سلسلة حرب النجوم؟",
        "options": [
          "1975",
          "1977",
          "1979",
          "1980"
        ],
        "optionsAr": [
          "1975",
          "1977",
          "1979",
          "1980"
        ],
        "correct": 1
      },
      {
        "q": "Which animated film features a character named Simba?",
        "qAr": "ما الفيلم الكرتوني الذي تظهر فيه شخصية سيمبا؟",
        "options": [
          "Aladdin",
          "The Lion King",
          "Frozen",
          "Moana"
        ],
        "optionsAr": [
          "علاء الدين",
          "الأسد الملك",
          "فروزن",
          "موانا"
        ],
        "correct": 1
      },
      {
        "q": "Who directed Inception?",
        "qAr": "من أخرج فيلم إنسيبشن؟",
        "options": [
          "Denis Villeneuve",
          "Christopher Nolan",
          "David Fincher",
          "Quentin Tarantino"
        ],
        "optionsAr": [
          "دينيس فيلنوف",
          "كريستوفر نولان",
          "ديفيد فينشر",
          "كوينتن تارانتينو"
        ],
        "correct": 1
      },
      {
        "q": "What is the highest-grossing film of all time?",
        "qAr": "ما هو الفيلم الأعلى ربحاً في التاريخ؟",
        "options": [
          "Titanic",
          "Avatar",
          "Avengers: Endgame",
          "Star Wars: TFA"
        ],
        "optionsAr": [
          "تيتانيك",
          "أفاتار",
          "المنتقمون: نهاية اللعبة",
          "حرب النجوم"
        ],
        "correct": 1
      },
      {
        "q": "In Harry Potter, what house does Harry belong to?",
        "qAr": "في هاري بوتر، إلى أي منزل ينتمي هاري؟",
        "options": [
          "Slytherin",
          "Hufflepuff",
          "Ravenclaw",
          "Gryffindor"
        ],
        "optionsAr": [
          "سليذرين",
          "هافلباف",
          "رافينكلو",
          "جريفندور"
        ],
        "correct": 3
      },
      {
        "q": "Which actor played Jack Sparrow in Pirates of the Caribbean?",
        "qAr": "من لعب دور جاك سبارو في قراصنة الكاريبي؟",
        "options": [
          "Johnny Depp",
          "Brad Pitt",
          "Leonardo DiCaprio",
          "Tom Cruise"
        ],
        "optionsAr": [
          "جوني ديب",
          "براد بيت",
          "ليوناردو دي كابريو",
          "توم كروز"
        ],
        "correct": 0
      },
      {
        "q": "What is the name of the wizarding school in Harry Potter?",
        "qAr": "ما اسم مدرسة السحر والشعوذة في هاري بوتر؟",
        "options": [
          "Beauxbatons",
          "Hogwarts",
          "Durmstrang",
          "Ilvermorny"
        ],
        "optionsAr": [
          "بوباتون",
          "هوغوورتس",
          "دورمسترانغ",
          "إلفرمورني"
        ],
        "correct": 1
      },
      {
        "q": "Who won the Oscar for Best Actor as the Joker in 2019?",
        "qAr": "من فاز بجائزة الأوسكار لأفضل ممثل عن دور الجوكر عام 2019؟",
        "options": [
          "Joaquin Phoenix",
          "Jared Leto",
          "Heath Ledger",
          "Jack Nicholson"
        ],
        "optionsAr": [
          "خواكين فينيكس",
          "جاريد ليتو",
          "هيث ليدجر",
          "جاك نيكلسون"
        ],
        "correct": 0
      },
      {
        "q": "Which Toy Story spaceman says 'To infinity and beyond!'?",
        "qAr": "أي رائد فضاء من لعبة «قصة لعبة» يقول «إلى ما لا نهاية وما بعدها»؟",
        "options": [
          "Buzz Lightyear",
          "Woody",
          "Rex",
          "Hamm"
        ],
        "optionsAr": [
          "باز لايتير",
          "وودي",
          "ريكس",
          "هام"
        ],
        "correct": 0
      },
      {
        "q": "Which animated film features the sisters Anna and Elsa?",
        "qAr": "ما الفيلم الكرتوني الذي يضم الأختين آنا وإلسا؟",
        "options": [
          "Frozen",
          "Moana",
          "Tangled",
          "Encanto"
        ],
        "optionsAr": [
          "فروزن",
          "موانا",
          "رابونزيل",
          "إنكانتو"
        ],
        "correct": 0
      },
      {
        "q": "Who directed the movie 'Avatar'?",
        "qAr": "من أخرج فيلم أفاتار؟",
        "options": [
          "James Cameron",
          "Steven Spielberg",
          "Peter Jackson",
          "Michael Bay"
        ],
        "optionsAr": [
          "جيمس كاميرون",
          "ستيفن سبيلبرغ",
          "بيتر جاكسون",
          "مايكل باي"
        ],
        "correct": 0
      },
      {
        "q": "Which 1977 space film introduced 'The Force'?",
        "qAr": "ما هو فيلم الفضاء الصادر عام 1977 الذي قدّم مصطلح «القوة»؟",
        "options": [
          "Star Wars",
          "Star Trek",
          "Alien",
          "Flash Gordon"
        ],
        "optionsAr": [
          "حرب النجوم",
          "ستار تريك",
          "غريب الفضاء",
          "فلاش غوردون"
        ],
        "correct": 0
      },
      {
        "q": "Which movie stars Tom Hanks as a castaway named Chuck?",
        "qAr": "ما هو الفيلم الذي يلعب فيه توم هانكس دور غريق اسمه تشاك؟",
        "options": [
          "Cast Away",
          "Forrest Gump",
          "The Terminal",
          "Philadelphia"
        ],
        "optionsAr": [
          "كاست أواي",
          "فورست غامب",
          "المطار",
          "فيلادلفيا"
        ],
        "correct": 0
      },
      {
        "q": "Which Japanese studio made 'Spirited Away'?",
        "qAr": "أي استوديو ياباني أنتج فيلم «المخطوفة»؟",
        "options": [
          "Studio Ghibli",
          "Toei",
          "Sunrise",
          "Madhouse"
        ],
        "optionsAr": [
          "استوديو جيبلي",
          "توي",
          "صنرايز",
          "مادهاوس"
        ],
        "correct": 0
      },
      {
        "q": "Which 2008 superhero film introduced Iron Man to the big screen?",
        "qAr": "ما هو فيلم الأبطال الخارقين لعام 2008 الذي قدّم الرجل الحديدي للشاشة الكبيرة؟",
        "options": [
          "Iron Man",
          "The Dark Knight",
          "Man of Steel",
          "Superman Returns"
        ],
        "optionsAr": [
          "الرجل الحديدي",
          "الفارس الأسود",
          "رجل الفولاذ",
          "سوبرمان يعود"
        ],
        "correct": 0
      }
    ]
  },
  "sports": {
    "name": "Sports",
    "nameAr": "الرياضة",
    "emoji": "⚽",
    "color": "from-emerald-500 to-teal-600",
    "questions": [
      {
        "q": "How many players on a soccer team on the field?",
        "qAr": "كم عدد لاعبي فريق كرة القدم داخل الملعب؟",
        "options": [
          "9",
          "10",
          "11",
          "12"
        ],
        "optionsAr": [
          "9",
          "10",
          "11",
          "12"
        ],
        "correct": 2
      },
      {
        "q": "Which country won the 2022 FIFA World Cup?",
        "qAr": "أي دولة فازت بكأس العالم لكرة القدم 2022؟",
        "options": [
          "France",
          "Brazil",
          "Argentina",
          "Germany"
        ],
        "optionsAr": [
          "فرنسا",
          "البرازيل",
          "الأرجنتين",
          "ألمانيا"
        ],
        "correct": 2
      },
      {
        "q": "How many points is a basketball free throw worth?",
        "qAr": "كم نقطة تساوي الرمية الحرة في كرة السلة؟",
        "options": [
          "1",
          "2",
          "3",
          "4"
        ],
        "optionsAr": [
          "1",
          "2",
          "3",
          "4"
        ],
        "correct": 0
      },
      {
        "q": "What sport is played at Wimbledon?",
        "qAr": "ما هي الرياضة التي تُلعب في ويمبلدون؟",
        "options": [
          "Golf",
          "Tennis",
          "Cricket",
          "Rugby"
        ],
        "optionsAr": [
          "الغولف",
          "التنس",
          "الكريكيت",
          "الرغبي"
        ],
        "correct": 1
      },
      {
        "q": "How many Grand Slam tennis tournaments per year?",
        "qAr": "كم عدد بطولات الغراند سلام في التنس سنوياً؟",
        "options": [
          "3",
          "4",
          "5",
          "6"
        ],
        "optionsAr": [
          "3",
          "4",
          "5",
          "6"
        ],
        "correct": 1
      },
      {
        "q": "Which athlete has the most Olympic gold medals?",
        "qAr": "من هو الرياضي صاحب أكبر عدد من الميداليات الذهبية الأولمبية؟",
        "options": [
          "Usain Bolt",
          "Michael Phelps",
          "Carl Lewis",
          "Simone Biles"
        ],
        "optionsAr": [
          "يوسين بولت",
          "مايكل فيلبس",
          "كارل لويس",
          "سيمون بايلز"
        ],
        "correct": 1
      },
      {
        "q": "How many points is a touchdown in American football?",
        "qAr": "كم نقطة تساوي محاولة تهديف (تاتش داون) في كرة القدم الأمريكية؟",
        "options": [
          "3",
          "6",
          "7",
          "8"
        ],
        "optionsAr": [
          "3",
          "6",
          "7",
          "8"
        ],
        "correct": 1
      },
      {
        "q": "What is the diameter of a basketball hoop in inches?",
        "qAr": "كم بوصةً قطر سلة كرة السلة؟",
        "options": [
          "16",
          "18",
          "20",
          "22"
        ],
        "optionsAr": [
          "16",
          "18",
          "20",
          "22"
        ],
        "correct": 1
      },
      {
        "q": "Which country invented cricket?",
        "qAr": "أي دولة اخترعت رياضة الكريكيت؟",
        "options": [
          "Australia",
          "India",
          "England",
          "South Africa"
        ],
        "optionsAr": [
          "أستراليا",
          "الهند",
          "إنجلترا",
          "جنوب أفريقيا"
        ],
        "correct": 2
      },
      {
        "q": "How long is a marathon in km?",
        "qAr": "كم كيلومتراً يبلغ طول الماراثون؟",
        "options": [
          "21",
          "32",
          "42",
          "50"
        ],
        "optionsAr": [
          "21",
          "32",
          "42",
          "50"
        ],
        "correct": 2
      },
      {
        "q": "Which country hosted the 2022 FIFA World Cup?",
        "qAr": "أي دولة استضافت كأس العالم 2022؟",
        "options": [
          "Qatar",
          "Russia",
          "Brazil",
          "United Arab Emirates"
        ],
        "optionsAr": [
          "قطر",
          "روسيا",
          "البرازيل",
          "الإمارات العربية المتحدة"
        ],
        "correct": 0
      },
      {
        "q": "Which Egyptian footballer is nicknamed the 'Egyptian King'?",
        "qAr": "ما هو اللاعب المصري الملقب بـ«الملك المصري»؟",
        "options": [
          "Mohamed Salah",
          "Mohamed Aboutrika",
          "Trezeguet",
          "Essam El Hadary"
        ],
        "optionsAr": [
          "محمد صلاح",
          "محمد أبو تريكة",
          "تريزيغيه",
          "عصام الحضري"
        ],
        "correct": 0
      },
      {
        "q": "How many players are on a basketball team on the court?",
        "qAr": "كم عدد لاعبي كرة السلة على أرض الملعب؟",
        "options": [
          "4",
          "5",
          "6",
          "7"
        ],
        "optionsAr": [
          "4",
          "5",
          "6",
          "7"
        ],
        "correct": 1
      },
      {
        "q": "In which sport would you use a shuttlecock?",
        "qAr": "في أي رياضة يُستخدم الريشة؟",
        "options": [
          "Badminton",
          "Tennis",
          "Squash",
          "Table Tennis"
        ],
        "optionsAr": [
          "تنس الريشة",
          "التنس",
          "السكواش",
          "تنس الطاولة"
        ],
        "correct": 0
      },
      {
        "q": "Which country has won the most FIFA World Cups?",
        "qAr": "أي دولة فازت بأكبر عدد من كؤوس العالم؟",
        "options": [
          "Germany",
          "Brazil",
          "Italy",
          "Argentina"
        ],
        "optionsAr": [
          "ألمانيا",
          "البرازيل",
          "إيطاليا",
          "الأرجنتين"
        ],
        "correct": 1
      },
      {
        "q": "What is the maximum score possible with a single dart?",
        "qAr": "ما هي أعلى نتيجة ممكنة برمية واحدة للنبلة؟",
        "options": [
          "50",
          "60",
          "100",
          "180"
        ],
        "optionsAr": [
          "50",
          "60",
          "100",
          "180"
        ],
        "correct": 2
      },
      {
        "q": "How many players are on a cricket team?",
        "qAr": "كم عدد لاعبي فريق الكريكيت؟",
        "options": [
          "9",
          "10",
          "11",
          "12"
        ],
        "optionsAr": [
          "9",
          "10",
          "11",
          "12"
        ],
        "correct": 2
      },
      {
        "q": "What is the traditional national sport of Japan?",
        "qAr": "ما هي الرياضة التقليدية الوطنية في اليابان؟",
        "options": [
          "Sumo Wrestling",
          "Karate",
          "Baseball",
          "Judo"
        ],
        "optionsAr": [
          "المصارعة السومو",
          "الكاراتيه",
          "البيسبول",
          "الجودو"
        ],
        "correct": 0
      },
      {
        "q": "Which football club is the biggest and most successful in Egypt?",
        "qAr": "ما هو أكبر وأنجح نادٍ لكرة القدم في مصر؟",
        "options": [
          "Al Ahly",
          "Zamalek",
          "Ismaily",
          "Pyramids FC"
        ],
        "optionsAr": [
          "الأهلي",
          "الزمالك",
          "الإسماعيلي",
          "بيراميدز"
        ],
        "correct": 0
      },
      {
        "q": "Which sport is known around the world as 'the beautiful game'?",
        "qAr": "أي رياضة تُعرف حول العالم بـ«اللعبة الجميلة»؟",
        "options": [
          "Football",
          "Basketball",
          "Tennis",
          "Rugby"
        ],
        "optionsAr": [
          "كرة القدم",
          "كرة السلة",
          "التنس",
          "الرغبي"
        ],
        "correct": 0
      }
    ]
  },
  "science": {
    "name": "Science",
    "nameAr": "العلوم",
    "emoji": "🔬",
    "color": "from-cyan-500 to-blue-600",
    "questions": [
      {
        "q": "What is the chemical formula for water?",
        "qAr": "ما هي الصيغة الكيميائية للماء؟",
        "options": [
          "CO2",
          "H2O",
          "O2",
          "NaCl"
        ],
        "optionsAr": [
          "CO2",
          "H2O",
          "O2",
          "NaCl"
        ],
        "correct": 1
      },
      {
        "q": "How many bones in the adult human body?",
        "qAr": "كم عدد العظام في جسم الإنسان البالغ؟",
        "options": [
          "186",
          "206",
          "226",
          "256"
        ],
        "optionsAr": [
          "186",
          "206",
          "226",
          "256"
        ],
        "correct": 1
      },
      {
        "q": "What planet is closest to the Sun?",
        "qAr": "ما هو أقرب كوكب إلى الشمس؟",
        "options": [
          "Venus",
          "Earth",
          "Mercury",
          "Mars"
        ],
        "optionsAr": [
          "الزهرة",
          "الأرض",
          "عطارد",
          "المريخ"
        ],
        "correct": 2
      },
      {
        "q": "What force keeps us on the ground?",
        "qAr": "ما هي القوة التي تبقينا على الأرض؟",
        "options": [
          "Magnetism",
          "Friction",
          "Gravity",
          "Inertia"
        ],
        "optionsAr": [
          "المغناطيسية",
          "الاحتكاك",
          "الجاذبية",
          "القصور الذاتي"
        ],
        "correct": 2
      },
      {
        "q": "What is the powerhouse of the cell?",
        "qAr": "ما هو مصدر طاقة الخلية؟",
        "options": [
          "Nucleus",
          "Ribosome",
          "Mitochondria",
          "Golgi apparatus"
        ],
        "optionsAr": [
          "النواة",
          "الريبوسوم",
          "الميتوكوندريا",
          "جهاز غولجي"
        ],
        "correct": 2
      },
      {
        "q": "What gas do plants absorb from the atmosphere?",
        "qAr": "ما هو الغاز الذي تمتصه النباتات من الجو؟",
        "options": [
          "Oxygen",
          "Nitrogen",
          "Carbon Dioxide",
          "Hydrogen"
        ],
        "optionsAr": [
          "الأكسجين",
          "النيتروجين",
          "ثاني أكسيد الكربون",
          "الهيدروجين"
        ],
        "correct": 2
      },
      {
        "q": "Approx speed of light in km/s?",
        "qAr": "ما هي سرعة الضوء تقريباً بالكيلومتر/ثانية؟",
        "options": [
          "150,000",
          "300,000",
          "450,000",
          "600,000"
        ],
        "optionsAr": [
          "150,000",
          "300,000",
          "450,000",
          "600,000"
        ],
        "correct": 1
      },
      {
        "q": "Who proposed the theory of relativity?",
        "qAr": "من وضع نظرية النسبية؟",
        "options": [
          "Newton",
          "Einstein",
          "Hawking",
          "Tesla"
        ],
        "optionsAr": [
          "نيوتن",
          "أينشتاين",
          "هوكينغ",
          "تسلا"
        ],
        "correct": 1
      },
      {
        "q": "What is the hardest natural substance on Earth?",
        "qAr": "ما هي أقسى مادة طبيعية على وجه الأرض؟",
        "options": [
          "Gold",
          "Iron",
          "Diamond",
          "Platinum"
        ],
        "optionsAr": [
          "الذهب",
          "الحديد",
          "الألماس",
          "البلاتين"
        ],
        "correct": 2
      },
      {
        "q": "How many elements in the periodic table?",
        "qAr": "كم عدد العناصر في الجدول الدوري؟",
        "options": [
          "92",
          "108",
          "118",
          "130"
        ],
        "optionsAr": [
          "92",
          "108",
          "118",
          "130"
        ],
        "correct": 2
      },
      {
        "q": "Which Muslim scholar is known as the 'Father of Algebra'?",
        "qAr": "ما هو العالم المسلم المعروف بـ«أبي الجبر»؟",
        "options": [
          "Al-Khwarizmi",
          "Ibn Sina",
          "Al-Razi",
          "Omar Khayyam"
        ],
        "optionsAr": [
          "الخوارزمي",
          "ابن سينا",
          "الرازي",
          "عمر الخيام"
        ],
        "correct": 0
      },
      {
        "q": "Which scientist formulated the three laws of motion?",
        "qAr": "من هو العالم الذي صاغ قوانين الحركة الثلاثة؟",
        "options": [
          "Isaac Newton",
          "Albert Einstein",
          "Galileo Galilei",
          "Nikola Tesla"
        ],
        "optionsAr": [
          "إسحاق نيوتن",
          "ألبرت أينشتاين",
          "غاليليو غاليلي",
          "نيكولا تسلا"
        ],
        "correct": 0
      },
      {
        "q": "Which gas makes up about 78% of Earth's atmosphere?",
        "qAr": "ما هو الغاز الذي يشكل حوالي 78% من الغلاف الجوي للأرض؟",
        "options": [
          "Oxygen",
          "Carbon Dioxide",
          "Nitrogen",
          "Hydrogen"
        ],
        "optionsAr": [
          "الأكسجين",
          "ثاني أكسيد الكربون",
          "النيتروجين",
          "الهيدروجين"
        ],
        "correct": 2
      },
      {
        "q": "What is the study of weather called?",
        "qAr": "ما اسم علم دراسة الطقس؟",
        "options": [
          "Geology",
          "Meteorology",
          "Astronomy",
          "Ecology"
        ],
        "optionsAr": [
          "الجيولوجيا",
          "الأرصاد الجوية",
          "علم الفلك",
          "علم البيئة"
        ],
        "correct": 1
      },
      {
        "q": "Which metal is liquid at room temperature?",
        "qAr": "أي معدن يكون سائلاً في درجة حرارة الغرفة؟",
        "options": [
          "Mercury",
          "Aluminium",
          "Iron",
          "Copper"
        ],
        "optionsAr": [
          "الزئبق",
          "الألمنيوم",
          "الحديد",
          "النحاس"
        ],
        "correct": 0
      },
      {
        "q": "Who was the first scientist to use a telescope to observe the stars?",
        "qAr": "من كان أول عالم استخدم التلسكوب لرصد النجوم؟",
        "options": [
          "Galileo Galilei",
          "Isaac Newton",
          "Copernicus",
          "Kepler"
        ],
        "optionsAr": [
          "غاليليو غاليلي",
          "إسحاق نيوتن",
          "كوبرنيكوس",
          "كيبلر"
        ],
        "correct": 0
      },
      {
        "q": "What is the unit used to measure electric current?",
        "qAr": "ما هي وحدة قياس التيار الكهربائي؟",
        "options": [
          "Volt",
          "Watt",
          "Ampere",
          "Ohm"
        ],
        "optionsAr": [
          "الفولت",
          "الواط",
          "الأمبير",
          "الأوم"
        ],
        "correct": 2
      },
      {
        "q": "Which Arab scholar is considered the 'father of optics' for his work on light and vision?",
        "qAr": "ما هو العالم العربي الملقب بـ«أبي البصريات» لدراساته عن الضوء والرؤية؟",
        "options": [
          "Ibn al-Haytham",
          "Al-Khwarizmi",
          "Ibn Khaldun",
          "Al-Farabi"
        ],
        "optionsAr": [
          "ابن الهيثم",
          "الخوارزمي",
          "ابن خلدون",
          "الفارابي"
        ],
        "correct": 0
      },
      {
        "q": "What does DNA stand for?",
        "qAr": "ماذا يعني DNA؟",
        "options": [
          "Deoxyribonucleic Acid",
          "Dinucleotide Acid",
          "Deoxyribose Nucleic",
          "Dual Nitrogen Acid"
        ],
        "optionsAr": [
          "حامض الديوكسي ريبونوكلييك",
          "حامض ثنائي النيوكليوتيد",
          "ريبوز منقوص الأكسجين",
          "نيتروجين مزدوج"
        ],
        "correct": 0
      },
      {
        "q": "What is the approximate speed of sound in air?",
        "qAr": "ما هي السرعة التقريبية للصوت في الهواء؟",
        "options": [
          "343 m/s",
          "150 m/s",
          "800 m/s",
          "1000 m/s"
        ],
        "optionsAr": [
          "343 م/ث",
          "150 م/ث",
          "800 م/ث",
          "1000 م/ث"
        ],
        "correct": 0
      }
    ]
  },
  "history": {
    "name": "History",
    "nameAr": "التاريخ",
    "emoji": "🏛️",
    "color": "from-amber-500 to-orange-600",
    "questions": [
      {
        "q": "In which year did World War II end?",
        "qAr": "في أي عام انتهت الحرب العالمية الثانية؟",
        "options": [
          "1943",
          "1944",
          "1945",
          "1946"
        ],
        "optionsAr": [
          "1943",
          "1944",
          "1945",
          "1946"
        ],
        "correct": 2
      },
      {
        "q": "Who was the first President of the United States?",
        "qAr": "من كان أول رئيس للولايات المتحدة الأمريكية؟",
        "options": [
          "Jefferson",
          "Washington",
          "Lincoln",
          "Adams"
        ],
        "optionsAr": [
          "جيفرسون",
          "واشنطن",
          "لينكولن",
          "آدامز"
        ],
        "correct": 1
      },
      {
        "q": "How many hills was Rome built on?",
        "qAr": "على كم تلة بُنيت مدينة روما؟",
        "options": [
          "5",
          "6",
          "7",
          "8"
        ],
        "optionsAr": [
          "5",
          "6",
          "7",
          "8"
        ],
        "correct": 2
      },
      {
        "q": "Which civilization built the pyramids of Giza?",
        "qAr": "أي حضارة بنت أهرامات الجيزة؟",
        "options": [
          "Mayans",
          "Romans",
          "Egyptians",
          "Greeks"
        ],
        "optionsAr": [
          "المايا",
          "الرومان",
          "المصريون",
          "الإغريق"
        ],
        "correct": 2
      },
      {
        "q": "In which year did the Berlin Wall fall?",
        "qAr": "في أي عام سقط جدار برلين؟",
        "options": [
          "1987",
          "1989",
          "1991",
          "1993"
        ],
        "optionsAr": [
          "1987",
          "1989",
          "1991",
          "1993"
        ],
        "correct": 1
      },
      {
        "q": "Which empire was ruled by Genghis Khan?",
        "qAr": "أي إمبراطورية حكمها جنكيز خان؟",
        "options": [
          "Roman",
          "Ottoman",
          "Mongol",
          "Persian"
        ],
        "optionsAr": [
          "الرومانية",
          "العثمانية",
          "المغولية",
          "الفارسية"
        ],
        "correct": 2
      },
      {
        "q": "Which city was the center of the Islamic Golden Age?",
        "qAr": "ما هي المدينة التي كانت مركز العصر الذهبي الإسلامي؟",
        "options": [
          "Baghdad",
          "Rome",
          "Athens",
          "Constantinople"
        ],
        "optionsAr": [
          "بغداد",
          "روما",
          "أثينا",
          "القسطنطينية"
        ],
        "correct": 0
      },
      {
        "q": "Who was the first caliph after Prophet Muhammad ﷺ?",
        "qAr": "من كان أول خليفة بعد النبي محمد ﷺ؟",
        "options": [
          "Abu Bakr",
          "Umar",
          "Uthman",
          "Ali"
        ],
        "optionsAr": [
          "أبو بكر",
          "عمر",
          "عثمان",
          "علي"
        ],
        "correct": 0
      },
      {
        "q": "In which year did the Ottoman Empire officially come to an end?",
        "qAr": "في أي عام انتهت الدولة العثمانية رسمياً؟",
        "options": [
          "1918",
          "1922",
          "1924",
          "1928"
        ],
        "optionsAr": [
          "1918",
          "1922",
          "1924",
          "1928"
        ],
        "correct": 1
      },
      {
        "q": "Who led the Muslim armies against the Crusaders and is known in the West as 'Saladin'?",
        "qAr": "من قاد الجيوش الإسلامية ضد الصليبيين وعُرف في الغرب بـ«صلاح الدين»؟",
        "options": [
          "Salah ad-Din",
          "Omar Mukhtar",
          "Khalid ibn al-Walid",
          "Tariq ibn Ziyad"
        ],
        "optionsAr": [
          "صلاح الدين الأيوبي",
          "عمر المختار",
          "خالد بن الوليد",
          "طارق بن زياد"
        ],
        "correct": 0
      },
      {
        "q": "The Great Pyramid of Giza was built as a tomb for which pharaoh?",
        "qAr": "بُني الهرم الأكبر في الجيزة مقبرةً لأي فرعون؟",
        "options": [
          "Cleopatra",
          "Khufu",
          "Ramses II",
          "Tutankhamun"
        ],
        "optionsAr": [
          "كليوباترا",
          "خوفو",
          "رمسيس الثاني",
          "توت عنخ آمون"
        ],
        "correct": 1
      },
      {
        "q": "In which year did the United Arab Emirates gain independence?",
        "qAr": "في أي عام نالت الإمارات العربية المتحدة استقلالها؟",
        "options": [
          "1968",
          "1971",
          "1975",
          "1980"
        ],
        "optionsAr": [
          "1968",
          "1971",
          "1975",
          "1980"
        ],
        "correct": 1
      },
      {
        "q": "Gibraltar (Jabal Tariq) is named after which Muslim general?",
        "qAr": "سُمي جبل طارق على اسم أي قائد مسلم؟",
        "options": [
          "Tariq ibn Ziyad",
          "Khalid ibn al-Walid",
          "Amr ibn al-As",
          "Sa'd ibn Abi Waqqas"
        ],
        "optionsAr": [
          "طارق بن زياد",
          "خالد بن الوليد",
          "عمرو بن العاص",
          "سعد بن أبي وقاص"
        ],
        "correct": 0
      },
      {
        "q": "What was the writing system used by the ancient Egyptians?",
        "qAr": "ما نظام الكتابة الذي استخدمه قدماء المصريين؟",
        "options": [
          "Hieroglyphics",
          "Cuneiform",
          "Latin",
          "Sanskrit"
        ],
        "optionsAr": [
          "الهيروغليفية",
          "المسمارية",
          "اللاتينية",
          "السنسكريتية"
        ],
        "correct": 0
      },
      {
        "q": "Which country was formerly known as Persia?",
        "qAr": "أي دولة كانت تُعرف سابقاً باسم فارس؟",
        "options": [
          "Iran",
          "Iraq",
          "Turkey",
          "Afghanistan"
        ],
        "optionsAr": [
          "إيران",
          "العراق",
          "تركيا",
          "أفغانستان"
        ],
        "correct": 0
      },
      {
        "q": "The Suez Canal connects the Mediterranean with which sea?",
        "qAr": "قناة السويس تصل البحر المتوسط بأي بحر؟",
        "options": [
          "The Red Sea",
          "The Black Sea",
          "The Caspian Sea",
          "The Arabian Sea"
        ],
        "optionsAr": [
          "البحر الأحمر",
          "البحر الأسود",
          "بحر قزوين",
          "بحر العرب"
        ],
        "correct": 0
      },
      {
        "q": "Who wrote 'Al-Muqaddimah', the founding work of sociology and historiography?",
        "qAr": "من كتب كتاب «المقدمة» المؤسس لعلم الاجتماع وفلسفة التاريخ؟",
        "options": [
          "Ibn Khaldun",
          "Ibn Sina",
          "Al-Ghazali",
          "Al-Biruni"
        ],
        "optionsAr": [
          "ابن خلدون",
          "ابن سينا",
          "الغزالي",
          "البيروني"
        ],
        "correct": 0
      }
    ]
  },
  "family": {
    "name": "Family Fun",
    "nameAr": "مرح العائلة",
    "emoji": "👨‍👩‍👧‍👦",
    "color": "from-fuchsia-500 to-pink-500",
    "questions": [
      {
        "q": "What do you call a group of flamingos?",
        "qAr": "ماذا يُسمى مجموعة طيور الفلامنغو؟",
        "options": [
          "A flock",
          "A flamboyance",
          "A herd",
          "A pack"
        ],
        "optionsAr": [
          "سرب",
          "مجموعة باهرة",
          "قطيع",
          "حشد"
        ],
        "correct": 1
      },
      {
        "q": "How many colors are in a rainbow?",
        "qAr": "كم عدد ألوان قوس قزح؟",
        "options": [
          "5",
          "6",
          "7",
          "8"
        ],
        "optionsAr": [
          "5",
          "6",
          "7",
          "8"
        ],
        "correct": 2
      },
      {
        "q": "Most popular pizza topping in the US?",
        "qAr": "ما هي أكثر إضافة شيوعاً على البيتزا في أمريكا؟",
        "options": [
          "Mushrooms",
          "Pepperoni",
          "Sausage",
          "Olives"
        ],
        "optionsAr": [
          "المشروم",
          "البيبروني",
          "النقانق",
          "الزيتون"
        ],
        "correct": 1
      },
      {
        "q": "Which Disney princess has a raccoon sidekick?",
        "qAr": "أي أميرة من أميرات ديزني لديها رفيق راكون؟",
        "options": [
          "Ariel",
          "Belle",
          "Pocahontas",
          "Mulan"
        ],
        "optionsAr": [
          "آريل",
          "بيل",
          "بوكاهونتاس",
          "مولان"
        ],
        "correct": 2
      },
      {
        "q": "What is the opposite of 'day'?",
        "qAr": "ما هو عكس كلمة «نهار»؟",
        "options": [
          "Dark",
          "Night",
          "Evening",
          "Sunset"
        ],
        "optionsAr": [
          "ظلام",
          "ليل",
          "مساء",
          "غروب"
        ],
        "correct": 1
      },
      {
        "q": "How many sides does a hexagon have?",
        "qAr": "كم عدد أضلاع الشكل السداسي؟",
        "options": [
          "5",
          "6",
          "7",
          "8"
        ],
        "optionsAr": [
          "5",
          "6",
          "7",
          "8"
        ],
        "correct": 1
      },
      {
        "q": "What animal is the 'King of the Jungle'?",
        "qAr": "ما هو الحيوان الملقب بـ«ملك الغابة»؟",
        "options": [
          "Tiger",
          "Elephant",
          "Lion",
          "Gorilla"
        ],
        "optionsAr": [
          "النمر",
          "الفيل",
          "الأسد",
          "الغوريلا"
        ],
        "correct": 2
      },
      {
        "q": "Which fruit keeps the doctor away?",
        "qAr": "أي فاكهة «تُبعد الطبيب»؟",
        "options": [
          "Banana",
          "Orange",
          "Apple",
          "Grape"
        ],
        "optionsAr": [
          "الموز",
          "البرتقال",
          "التفاح",
          "العنب"
        ],
        "correct": 2
      },
      {
        "q": "What do bees collect to make honey?",
        "qAr": "ماذا يجمع النحل ليصنع العسل؟",
        "options": [
          "Pollen",
          "Nectar",
          "Sap",
          "Dew"
        ],
        "optionsAr": [
          "حبوب اللقاح",
          "رحيق الأزهار",
          "الصمغ",
          "الندى"
        ],
        "correct": 1
      },
      {
        "q": "How many bottles of beer on the wall?",
        "qAr": "كم زجاجة بيرة على الحائط في الأغنية؟",
        "options": [
          "50",
          "99",
          "100",
          "101"
        ],
        "optionsAr": [
          "50",
          "99",
          "100",
          "101"
        ],
        "correct": 1
      },
      {
        "q": "What is the most widely eaten grain in the world?",
        "qAr": "ما هي أكثر الحبوب استهلاكاً في العالم؟",
        "options": [
          "Rice",
          "Wheat",
          "Corn",
          "Oats"
        ],
        "optionsAr": [
          "الأرز",
          "القمح",
          "الذرة",
          "الشوفان"
        ],
        "correct": 0
      },
      {
        "q": "Hummus and falafel are famous dishes of which region?",
        "qAr": "الحمص والفلافل أطباق شهيرة من أي منطقة؟",
        "options": [
          "The Middle East",
          "Asia",
          "Europe",
          "Latin America"
        ],
        "optionsAr": [
          "الشرق الأوسط",
          "آسيا",
          "أوروبا",
          "أمريكا اللاتينية"
        ],
        "correct": 0
      },
      {
        "q": "How many legs does a spider have?",
        "qAr": "كم عدد أرجل العنكبوت؟",
        "options": [
          "6",
          "8",
          "10",
          "12"
        ],
        "optionsAr": [
          "6",
          "8",
          "10",
          "12"
        ],
        "correct": 1
      },
      {
        "q": "What is the national dish of Yemen?",
        "qAr": "ما هو الطبق الوطني في اليمن؟",
        "options": [
          "Saltah",
          "Kabsa",
          "Couscous",
          "Biryani"
        ],
        "optionsAr": [
          "السلتة",
          "الكبسة",
          "الكسكس",
          "البرياني"
        ],
        "correct": 0
      },
      {
        "q": "Which sweet cheese dessert is famous in the Middle East during Ramadan?",
        "qAr": "ما هي حلوى الجبن الحلوة الشهيرة في الشرق الأوسط خلال رمضان؟",
        "options": [
          "Kunafa",
          "Tiramisu",
          "Cheesecake",
          "Pavlova"
        ],
        "optionsAr": [
          "الكنافة",
          "التيراميسو",
          "تشيز كيك",
          "البافلوفا"
        ],
        "correct": 0
      },
      {
        "q": "Which card game has kings, queens, and aces?",
        "qAr": "أي لعبة أوراق تحتوي على ملوك وملكات وآصات؟",
        "options": [
          "Playing Cards",
          "Dominoes",
          "Backgammon",
          "Chess"
        ],
        "optionsAr": [
          "الورق",
          "الدومينو",
          "الطاولة",
          "الشطرنج"
        ],
        "correct": 0
      },
      {
        "q": "What is the fastest land animal?",
        "qAr": "ما هو أسرع حيوان بري؟",
        "options": [
          "Cheetah",
          "Lion",
          "Ostrich",
          "Antelope"
        ],
        "optionsAr": [
          "الفهد",
          "الأسد",
          "النعامة",
          "الظبي"
        ],
        "correct": 0
      },
      {
        "q": "How many colors are in a traffic light?",
        "qAr": "كم عدد ألوان إشارة المرور؟",
        "options": [
          "2",
          "3",
          "4",
          "5"
        ],
        "optionsAr": [
          "2",
          "3",
          "4",
          "5"
        ],
        "correct": 1
      },
      {
        "q": "Which fruit has the same name as a color?",
        "qAr": "أي فاكهة لها نفس اسم أحد الألوان؟",
        "options": [
          "Orange",
          "Apple",
          "Banana",
          "Mango"
        ],
        "optionsAr": [
          "البرتقال",
          "التفاح",
          "الموز",
          "المانجو"
        ],
        "correct": 0
      },
      {
        "q": "How many vowels are in the English alphabet?",
        "qAr": "كم عدد حروف العلة في الأبجدية الإنجليزية؟",
        "options": [
          "4",
          "5",
          "6",
          "7"
        ],
        "optionsAr": [
          "4",
          "5",
          "6",
          "7"
        ],
        "correct": 1
      }
    ]
  },
  "music": {
    "name": "Music",
    "nameAr": "الموسيقى",
    "emoji": "🎵",
    "color": "from-indigo-500 to-violet-600",
    "questions": [
      {
        "q": "How many strings does a violin have?",
        "qAr": "كم عدد أوتار الكمان؟",
        "options": [
          "3",
          "4",
          "5",
          "6"
        ],
        "optionsAr": [
          "3",
          "4",
          "5",
          "6"
        ],
        "correct": 1
      },
      {
        "q": "Who is known as the 'King of Pop'?",
        "qAr": "من يُعرف بـ«ملك البوب»؟",
        "options": [
          "Michael Jackson",
          "Elvis Presley",
          "Prince",
          "Freddie Mercury"
        ],
        "optionsAr": [
          "مايكل جاكسون",
          "إلفيس بريسلي",
          "برنس",
          "فريدي ميركوري"
        ],
        "correct": 0
      },
      {
        "q": "Which legendary Egyptian singer is called 'Kawkab al-Sharq' (Star of the East)?",
        "qAr": "ما هي المطربة المصرية الأسطورية الملقبة بـ«كوكب الشرق»؟",
        "options": [
          "Umm Kulthum",
          "Fairuz",
          "Warda",
          "Samira Said"
        ],
        "optionsAr": [
          "أم كلثوم",
          "فيروز",
          "وردة",
          "سميرة سعيد"
        ],
        "correct": 0
      },
      {
        "q": "Which Lebanese icon sings 'Nassam Alayna El Hawa'?",
        "qAr": "ما هي الأيقونة اللبنانية التي غنت «نسم علينا الهوى»؟",
        "options": [
          "Fairuz",
          "Nancy Ajram",
          "Elissa",
          "Majida El Roumi"
        ],
        "optionsAr": [
          "فيروز",
          "نانسي عجرم",
          "إليسا",
          "ماجدة الرومي"
        ],
        "correct": 0
      },
      {
        "q": "What musical term means 'loud' in Italian?",
        "qAr": "ما المصطلح الموسيقي الإيطالي الذي يعني «بصوت عالٍ»؟",
        "options": [
          "Forte",
          "Piano",
          "Allegro",
          "Adagio"
        ],
        "optionsAr": [
          "فورتي",
          "بيانو",
          "أليغرو",
          "أداجيو"
        ],
        "correct": 0
      },
      {
        "q": "Which band performed 'Bohemian Rhapsody'?",
        "qAr": "أي فرقة موسيقية أدّت أغنية «بوهيميان رابسودي»؟",
        "options": [
          "Queen",
          "The Beatles",
          "Pink Floyd",
          "Led Zeppelin"
        ],
        "optionsAr": [
          "كوين",
          "البيتلز",
          "بينك فلويد",
          "لد زيبلين"
        ],
        "correct": 0
      },
      {
        "q": "How many semitones are in one octave?",
        "qAr": "كم عدد أنصاف النغمات في الأوكتاف الواحد؟",
        "options": [
          "8",
          "12",
          "7",
          "10"
        ],
        "optionsAr": [
          "8",
          "12",
          "7",
          "10"
        ],
        "correct": 1
      },
      {
        "q": "Which traditional Arab instrument is a pear-shaped stringed lute?",
        "qAr": "ما هي الآلة العربية التقليدية التي تشبه العود على شكل كمثرى؟",
        "options": [
          "Oud",
          "Tabla",
          "Qanun",
          "Ney"
        ],
        "optionsAr": [
          "العود",
          "الطبل",
          "القانون",
          "الناي"
        ],
        "correct": 0
      },
      {
        "q": "Which instrument is famously called the 'King of Instruments'?",
        "qAr": "أي آلة موسيقية تُلقب بـ«ملك الآلات»؟",
        "options": [
          "Organ",
          "Piano",
          "Guitar",
          "Violin"
        ],
        "optionsAr": [
          "الأرغن",
          "البيانو",
          "الغيتار",
          "الكمان"
        ],
        "correct": 0
      },
      {
        "q": "How many beats are in each bar of 4/4 time?",
        "qAr": "كم عدد النبضات في كل ميزان من 4/4؟",
        "options": [
          "3",
          "4",
          "5",
          "6"
        ],
        "optionsAr": [
          "3",
          "4",
          "5",
          "6"
        ],
        "correct": 1
      },
      {
        "q": "Which instrument is played by blowing across the top edge?",
        "qAr": "أي آلة تعزف بالنفخ عبر الحافة العلوية؟",
        "options": [
          "Flute",
          "Trumpet",
          "Clarinet",
          "Saxophone"
        ],
        "optionsAr": [
          "الفلوت",
          "البوق",
          "الكلارينيت",
          "الساكسفون"
        ],
        "correct": 0
      },
      {
        "q": "Who composed 'The Four Seasons' violin concertos?",
        "qAr": "من ألف كونشيرتوهات الكمان «الفصول الأربعة»؟",
        "options": [
          "Vivaldi",
          "Mozart",
          "Bach",
          "Beethoven"
        ],
        "optionsAr": [
          "فيفالدي",
          "موتسارت",
          "باخ",
          "بيتهوفن"
        ],
        "correct": 0
      },
      {
        "q": "Which streaming service uses a green logo with a note symbol?",
        "qAr": "أي خدمة بث موسيقي تستخدم شعاراً أخضر عليه نوتة موسيقية؟",
        "options": [
          "Spotify",
          "SoundCloud",
          "Deezer",
          "YouTube Music"
        ],
        "optionsAr": [
          "سبوتيفاي",
          "ساوند كلاود",
          "ديزر",
          "يوتيوب ميوزيك"
        ],
        "correct": 0
      },
      {
        "q": "How many keys does a standard piano have?",
        "qAr": "كم عدد مفاتيح البيانو القياسي؟",
        "options": [
          "66",
          "76",
          "88",
          "108"
        ],
        "optionsAr": [
          "66",
          "76",
          "88",
          "108"
        ],
        "correct": 2
      }
    ]
  },
  "geography": {
    "name": "Geography",
    "nameAr": "الجغرافيا",
    "emoji": "🌍",
    "color": "from-green-500 to-emerald-600",
    "questions": [
      {
        "q": "What is the capital of Egypt?",
        "qAr": "ما هي عاصمة مصر؟",
        "options": [
          "Cairo",
          "Alexandria",
          "Giza",
          "Luxor"
        ],
        "optionsAr": [
          "القاهرة",
          "الإسكندرية",
          "الجيزة",
          "الأقصر"
        ],
        "correct": 0
      },
      {
        "q": "Which is the most populous Arab country?",
        "qAr": "ما هي الدولة العربية الأكثر سكاناً؟",
        "options": [
          "Egypt",
          "Saudi Arabia",
          "Iraq",
          "Algeria"
        ],
        "optionsAr": [
          "مصر",
          "السعودية",
          "العراق",
          "الجزائر"
        ],
        "correct": 0
      },
      {
        "q": "The Nile River flows into which sea?",
        "qAr": "نهر النيل يصب في أي بحر؟",
        "options": [
          "Mediterranean Sea",
          "Red Sea",
          "Arabian Sea",
          "Black Sea"
        ],
        "optionsAr": [
          "البحر المتوسط",
          "البحر الأحمر",
          "بحر العرب",
          "البحر الأسود"
        ],
        "correct": 0
      },
      {
        "q": "What is the capital of the United Arab Emirates?",
        "qAr": "ما هي عاصمة الإمارات العربية المتحدة؟",
        "options": [
          "Abu Dhabi",
          "Dubai",
          "Sharjah",
          "Al Ain"
        ],
        "optionsAr": [
          "أبوظبي",
          "دبي",
          "الشارقة",
          "العين"
        ],
        "correct": 0
      },
      {
        "q": "What is commonly considered the longest river in the world?",
        "qAr": "ما هو النهر الذي يُعتبر عموماً الأطول في العالم؟",
        "options": [
          "Nile",
          "Amazon",
          "Yangtze",
          "Mississippi"
        ],
        "optionsAr": [
          "النيل",
          "الأمازون",
          "اليانغتسي",
          "الميسيسيبي"
        ],
        "correct": 0
      },
      {
        "q": "Mount Everest lies on the border of Nepal and which country?",
        "qAr": "يقع جبل إيفرست على حدود نيبال مع أي دولة؟",
        "options": [
          "China",
          "India",
          "Bhutan",
          "Pakistan"
        ],
        "optionsAr": [
          "الصين",
          "الهند",
          "بوتان",
          "باكستان"
        ],
        "correct": 0
      },
      {
        "q": "Which sea separates the Arabian Peninsula from Iran?",
        "qAr": "أي بحر يفصل شبه الجزيرة العربية عن إيران؟",
        "options": [
          "Arabian Gulf",
          "Red Sea",
          "Gulf of Oman",
          "Gulf of Aden"
        ],
        "optionsAr": [
          "الخليج العربي",
          "البحر الأحمر",
          "خليج عمان",
          "خليج عدن"
        ],
        "correct": 0
      },
      {
        "q": "What is the largest Arab country by area?",
        "qAr": "ما هي أكبر دولة عربية من حيث المساحة؟",
        "options": [
          "Algeria",
          "Saudi Arabia",
          "Sudan",
          "Libya"
        ],
        "optionsAr": [
          "الجزائر",
          "السعودية",
          "السودان",
          "ليبيا"
        ],
        "correct": 0
      },
      {
        "q": "Which vast desert covers much of the Arabian Peninsula?",
        "qAr": "ما هي الصحراء الشاسعة التي تغطي معظم شبه الجزيرة العربية؟",
        "options": [
          "Rub' al Khali",
          "Sahara",
          "Thar",
          "Karakum"
        ],
        "optionsAr": [
          "الربع الخالي",
          "الصحراء الكبرى",
          "صحراء ثار",
          "كاراكوم"
        ],
        "correct": 0
      },
      {
        "q": "Which sea lies between Egypt and Saudi Arabia?",
        "qAr": "أي بحر يقع بين مصر والسعودية؟",
        "options": [
          "Red Sea",
          "Mediterranean Sea",
          "Caspian Sea",
          "Aegean Sea"
        ],
        "optionsAr": [
          "البحر الأحمر",
          "البحر المتوسط",
          "بحر قزوين",
          "بحر إيجة"
        ],
        "correct": 0
      },
      {
        "q": "What is the capital of Morocco?",
        "qAr": "ما هي عاصمة المغرب؟",
        "options": [
          "Rabat",
          "Casablanca",
          "Marrakesh",
          "Tunis"
        ],
        "optionsAr": [
          "الرباط",
          "الدار البيضاء",
          "مراكش",
          "تونس"
        ],
        "correct": 0
      },
      {
        "q": "Which Arab country touches both the Mediterranean and the Atlantic?",
        "qAr": "أي دولة عربية تطل على البحر المتوسط والمحيط الأطلسي معاً؟",
        "options": [
          "Morocco",
          "Tunisia",
          "Algeria",
          "Libya"
        ],
        "optionsAr": [
          "المغرب",
          "تونس",
          "الجزائر",
          "ليبيا"
        ],
        "correct": 0
      },
      {
        "q": "Which Saudi city is the holiest city in Islam?",
        "qAr": "ما هي المدينة السعودية الأقدس في الإسلام؟",
        "options": [
          "Mecca",
          "Medina",
          "Riyadh",
          "Jeddah"
        ],
        "optionsAr": [
          "مكة المكرمة",
          "المدينة المنورة",
          "الرياض",
          "جدة"
        ],
        "correct": 0
      },
      {
        "q": "What is the capital of Turkey?",
        "qAr": "ما هي عاصمة تركيا؟",
        "options": [
          "Ankara",
          "Istanbul",
          "Izmir",
          "Bursa"
        ],
        "optionsAr": [
          "أنقرة",
          "إسطنبول",
          "إزمير",
          "بورصة"
        ],
        "correct": 0
      },
      {
        "q": "Which river runs through Baghdad?",
        "qAr": "أي نهر يمر عبر بغداد؟",
        "options": [
          "Tigris",
          "Euphrates",
          "Nile",
          "Jordan"
        ],
        "optionsAr": [
          "دجلة",
          "الفرات",
          "النيل",
          "الأردن"
        ],
        "correct": 0
      },
      {
        "q": "Which is the largest island in the Arab world?",
        "qAr": "ما هي أكبر جزيرة في الوطن العربي؟",
        "options": [
          "Socotra",
          "Bahrain",
          "Qeshm",
          "Arwad"
        ],
        "optionsAr": [
          "سقطرى",
          "البحرين",
          "قشم",
          "أرواد"
        ],
        "correct": 0
      }
    ]
  },
  "tech": {
    "name": "Tech & Internet",
    "nameAr": "التقنية والإنترنت",
    "emoji": "💻",
    "color": "from-sky-500 to-cyan-600",
    "questions": [
      {
        "q": "Which company makes the iPhone?",
        "qAr": "أي شركة تصنع هاتف آيفون؟",
        "options": [
          "Apple",
          "Samsung",
          "Google",
          "Microsoft"
        ],
        "optionsAr": [
          "أبل",
          "سامسونغ",
          "غوغل",
          "مايكروسوفت"
        ],
        "correct": 0
      },
      {
        "q": "What does 'HTTP' stand for?",
        "qAr": "ماذا يعني اختصار HTTP؟",
        "options": [
          "HyperText Transfer Protocol",
          "High Tech Transfer Protocol",
          "Hyperlink Text Transfer",
          "Host Transfer Protocol"
        ],
        "optionsAr": [
          "بروتوكول نقل النصوص التشعبية",
          "بروتوكول نقل التكنولوجيا العالية",
          "نقل النص التشعبي",
          "بروتوكول نقل المضيف"
        ],
        "correct": 0
      },
      {
        "q": "Who founded Microsoft together with Paul Allen?",
        "qAr": "من أسس مايكروسوفت مع بول ألن؟",
        "options": [
          "Bill Gates",
          "Steve Jobs",
          "Mark Zuckerberg",
          "Elon Musk"
        ],
        "optionsAr": [
          "بيل غيتس",
          "ستيف جوبز",
          "مارك زوكربيرغ",
          "إيلون ماسك"
        ],
        "correct": 0
      },
      {
        "q": "What is the most used search engine in the world?",
        "qAr": "ما هو محرك البحث الأكثر استخداماً في العالم؟",
        "options": [
          "Google",
          "Bing",
          "Yahoo",
          "DuckDuckGo"
        ],
        "optionsAr": [
          "غوغل",
          "بينغ",
          "ياهو",
          "دك دك غو"
        ],
        "correct": 0
      },
      {
        "q": "What does 'AI' stand for?",
        "qAr": "ماذا يعني اختصار AI؟",
        "options": [
          "Artificial Intelligence",
          "Automated Internet",
          "Applied Information",
          "Advanced Interface"
        ],
        "optionsAr": [
          "الذكاء الاصطناعي",
          "الإنترنت الآلي",
          "المعلومات التطبيقية",
          "الواجهة المتقدمة"
        ],
        "correct": 0
      },
      {
        "q": "Which language is used to style web pages?",
        "qAr": "ما هي اللغة المستخدمة في تنسيق صفحات الويب؟",
        "options": [
          "CSS",
          "HTML",
          "Python",
          "Java"
        ],
        "optionsAr": [
          "CSS",
          "HTML",
          "بايثون",
          "جافا"
        ],
        "correct": 0
      },
      {
        "q": "What does the 'www' at the start of web addresses stand for?",
        "qAr": "ماذا يعني اختصار www في بداية عناوين الويب؟",
        "options": [
          "World Wide Web",
          "Web Wide World",
          "World Web Wide",
          "Website Without Wires"
        ],
        "optionsAr": [
          "الشبكة العنكبوتية العالمية",
          "الويب الواسع العالمي",
          "عالم الويب الواسع",
          "موقع بلا أسلاك"
        ],
        "correct": 0
      },
      {
        "q": "Which app is famous for short vertical videos with music?",
        "qAr": "ما هو التطبيق الشهير بالفيديوهات العمودية القصيرة مع الموسيقى؟",
        "options": [
          "TikTok",
          "Facebook",
          "LinkedIn",
          "X"
        ],
        "optionsAr": [
          "تيك توك",
          "فيسبوك",
          "لينكدإن",
          "إكس"
        ],
        "correct": 0
      },
      {
        "q": "What does the term 'bit' in computing stand for?",
        "qAr": "ماذا يعني مصطلح «بت» في الحوسبة؟",
        "options": [
          "Binary digit",
          "Byte of information",
          "Basic input",
          "Binary transfer"
        ],
        "optionsAr": [
          "رقم ثنائي",
          "بايت من المعلومات",
          "إدخال أساسي",
          "نقل ثنائي"
        ],
        "correct": 0
      },
      {
        "q": "Which device has a 'QWERTY' layout?",
        "qAr": "أي جهاز يحتوي على توزيع مفاتيح QWERTY؟",
        "options": [
          "Keyboard",
          "Mouse",
          "Monitor",
          "Router"
        ],
        "optionsAr": [
          "لوحة المفاتيح",
          "الفأرة",
          "الشاشة",
          "الراوتر"
        ],
        "correct": 0
      },
      {
        "q": "Which company develops the Android operating system?",
        "qAr": "أي شركة تطوّر نظام أندرويد؟",
        "options": [
          "Google",
          "Apple",
          "Microsoft",
          "Samsung"
        ],
        "optionsAr": [
          "غوغل",
          "أبل",
          "مايكروسوفت",
          "سامسونغ"
        ],
        "correct": 0
      },
      {
        "q": "What does 'USB' stand for?",
        "qAr": "ماذا يعني اختصار USB؟",
        "options": [
          "Universal Serial Bus",
          "United Serial Bridge",
          "Universal System Bus",
          "Unified Serial Buffer"
        ],
        "optionsAr": [
          "الناقل التسلسلي العام",
          "الجسر التسلسلي الموحد",
          "النظام التسلسلي العام",
          "المخزن التسلسلي الموحد"
        ],
        "correct": 0
      },
      {
        "q": "Which search engine is famous for its changing 'doodles'?",
        "qAr": "ما هو محرك البحث الشهير برسوماته المتغيرة على صفحته الرئيسية؟",
        "options": [
          "Google",
          "Yahoo",
          "Ask",
          "Bing"
        ],
        "optionsAr": [
          "غوغل",
          "ياهو",
          "أسك",
          "بينغ"
        ],
        "correct": 0
      }
    ]
  },
  "islam": {
    "name": "Islam & Arab World",
    "nameAr": "الإسلام والعالم العربي",
    "emoji": "🕌",
    "color": "from-emerald-500 to-teal-700",
    "questions": [
      {
        "q": "How many pillars does Islam have?",
        "qAr": "كم عدد أركان الإسلام؟",
        "options": [
          "5",
          "4",
          "6",
          "7"
        ],
        "optionsAr": [
          "5",
          "4",
          "6",
          "7"
        ],
        "correct": 0
      },
      {
        "q": "Which month is the holy fasting month?",
        "qAr": "ما هو شهر الصيام المبارك؟",
        "options": [
          "Ramadan",
          "Shawwal",
          "Muharram",
          "Rajab"
        ],
        "optionsAr": [
          "رمضان",
          "شوال",
          "محرم",
          "رجب"
        ],
        "correct": 0
      },
      {
        "q": "Towards which city do Muslims face when praying?",
        "qAr": "إلى أي مدينة يتجه المسلمون أثناء الصلاة؟",
        "options": [
          "Mecca",
          "Medina",
          "Jerusalem",
          "Cairo"
        ],
        "optionsAr": [
          "مكة المكرمة",
          "المدينة المنورة",
          "القدس",
          "القاهرة"
        ],
        "correct": 0
      },
      {
        "q": "What is the holy book of Islam?",
        "qAr": "ما هو الكتاب المقدس في الإسلام؟",
        "options": [
          "The Quran",
          "The Torah",
          "The Gospel",
          "The Talmud"
        ],
        "optionsAr": [
          "القرآن الكريم",
          "التوراة",
          "الإنجيل",
          "التلمود"
        ],
        "correct": 0
      },
      {
        "q": "How many daily prayers are required in Islam?",
        "qAr": "كم عدد الصلوات اليومية في الإسلام؟",
        "options": [
          "5",
          "3",
          "7",
          "8"
        ],
        "optionsAr": [
          "5",
          "3",
          "7",
          "8"
        ],
        "correct": 0
      },
      {
        "q": "Which angel brought the revelation to Prophet Muhammad ﷺ?",
        "qAr": "ما هو الملاك الذي حمل الوحي إلى النبي محمد ﷺ؟",
        "options": [
          "Jibreel",
          "Mika'il",
          "Israfil",
          "Azrael"
        ],
        "optionsAr": [
          "جبريل",
          "ميكائيل",
          "إسرافيل",
          "عزرائيل"
        ],
        "correct": 0
      },
      {
        "q": "What is the annual pilgrimage to Mecca called?",
        "qAr": "ما اسم الرحلة السنوية إلى مكة المكرمة؟",
        "options": [
          "Hajj",
          "Umrah",
          "Hijrah",
          "Zakat"
        ],
        "optionsAr": [
          "الحج",
          "العمرة",
          "الهجرة",
          "الزكاة"
        ],
        "correct": 0
      },
      {
        "q": "Which is the second holiest city in Islam?",
        "qAr": "ما هي ثاني أقدس مدينة في الإسلام؟",
        "options": [
          "Medina",
          "Mecca",
          "Jerusalem",
          "Karbala"
        ],
        "optionsAr": [
          "المدينة المنورة",
          "مكة المكرمة",
          "القدس",
          "كربلاء"
        ],
        "correct": 0
      },
      {
        "q": "Who is the final prophet and messenger in Islam?",
        "qAr": "من هو خاتم الأنبياء والمرسلين في الإسلام؟",
        "options": [
          "Muhammad ﷺ",
          "Isa",
          "Musa",
          "Ibrahim"
        ],
        "optionsAr": [
          "محمد ﷺ",
          "عيسى",
          "موسى",
          "إبراهيم"
        ],
        "correct": 0
      },
      {
        "q": "What is the obligatory yearly charity in Islam?",
        "qAr": "ما هي الصدقة الواجبة سنوياً في الإسلام؟",
        "options": [
          "Zakat",
          "Sadaqah",
          "Fitr",
          "Riba"
        ],
        "optionsAr": [
          "الزكاة",
          "الصدقة",
          "الفطرة",
          "الربا"
        ],
        "correct": 0
      },
      {
        "q": "Where is the Prophet's Mosque (Al-Masjid an-Nabawi)?",
        "qAr": "أين يقع المسجد النبوي؟",
        "options": [
          "Saudi Arabia",
          "Egypt",
          "Palestine",
          "Jordan"
        ],
        "optionsAr": [
          "السعودية",
          "مصر",
          "فلسطين",
          "الأردن"
        ],
        "correct": 0
      },
      {
        "q": "What is the Islamic greeting meaning 'peace be upon you'?",
        "qAr": "ما هي التحية الإسلامية التي تعني «السلام عليكم»؟",
        "options": [
          "Assalamu alaikum",
          "Bismillah",
          "Alhamdulillah",
          "Mashallah"
        ],
        "optionsAr": [
          "السلام عليكم",
          "بسم الله",
          "الحمد لله",
          "ما شاء الله"
        ],
        "correct": 0
      },
      {
        "q": "How many surahs are in the Quran?",
        "qAr": "كم عدد سور القرآن الكريم؟",
        "options": [
          "114",
          "100",
          "120",
          "99"
        ],
        "optionsAr": [
          "114",
          "100",
          "120",
          "99"
        ],
        "correct": 0
      },
      {
        "q": "Which of these is NOT one of the Five Pillars?",
        "qAr": "أي مما يلي ليس من أركان الإسلام الخمسة؟",
        "options": [
          "Reading the Quran",
          "Prayer (Salah)",
          "Charity (Zakat)",
          "Fasting (Sawm)"
        ],
        "optionsAr": [
          "قراءة القرآن",
          "الصلاة",
          "الزكاة",
          "الصوم"
        ],
        "correct": 0
      },
      {
        "q": "Which prophet built the Kaaba together with his son Ismail?",
        "qAr": "أي نبي بنى الكعبة مع ابنه إسماعيل؟",
        "options": [
          "Ibrahim",
          "Nuh",
          "Yusuf",
          "Dawood"
        ],
        "optionsAr": [
          "إبراهيم",
          "نوح",
          "يوسف",
          "داود"
        ],
        "correct": 0
      },
      {
        "q": "During which month does the Hajj take place?",
        "qAr": "في أي شهر يتم الحج؟",
        "options": [
          "Dhul-Hijjah",
          "Ramadan",
          "Shawwal",
          "Safar"
        ],
        "optionsAr": [
          "ذو الحجة",
          "رمضان",
          "شوال",
          "صفر"
        ],
        "correct": 0
      }
    ]
  }
};

function buildQuestions(categories, numQuestions) {
  let pool = [];
  categories.forEach(cat => {
    if (CATEGORIES[cat]) {
      pool = pool.concat(CATEGORIES[cat].questions.map(q => ({ ...q, category: cat })));
    }
  });
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, numQuestions);
}

function broadcast(room, msg, excludeId) {
  const data = JSON.stringify(msg);
  room.clients.forEach(client => {
    if (client.id !== excludeId && client.readyState === 1) {
      client.send(data);
    }
  });
}

function broadcastAll(room, msg) {
  const data = JSON.stringify(msg);
  room.clients.forEach(client => {
    if (client.readyState === 1) client.send(data);
  });
}

wss.on('connection', (ws) => {
  ws.id = generateId();

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    if (msg.type === 'create_room') {
      let code;
      do { code = generateCode(); } while (rooms.has(code));
      const room = {
        code,
        hostId: ws.id,
        hostWs: ws,
        clients: new Set([ws]),
        players: [],
        questions: [],
        currentQ: 0,
        scores: {},
        streaks: {},
        maxStreaks: {},
        correctCounts: {},
        totalBonuses: {},
        powerups: {},
        answeredThisRound: {},
        timerSeconds: msg.timerSeconds !== undefined ? msg.timerSeconds : 20,
        timerInterval: null,
        timeLeft: msg.timerSeconds !== undefined ? msg.timerSeconds : 20,
        paused: false,
        phase: 'lobby',
        selectedCategories: msg.categories || ['general', 'movies', 'family'],
        numQuestions: msg.numQuestions || 10,
        frozenTimers: {},
        activeDoubles: new Set(),
      };
      ws.isHost = true;
      ws.roomCode = code;
      rooms.set(code, room);
      ws.send(JSON.stringify({ type: 'room_created', code }));
    }

    if (msg.type === 'join_room') {
      const code = (msg.code || '').toUpperCase();
      const room = rooms.get(code);
      if (!room) {
        ws.send(JSON.stringify({ type: 'error', message: 'Room not found', messageAr: 'الغرفة غير موجودة' }));
        return;
      }
      if (room.phase !== 'lobby') {
        ws.send(JSON.stringify({ type: 'error', message: 'Game already in progress', messageAr: 'اللعبة قيد التقدم بالفعل' }));
        return;
      }
      const name = (msg.name || '').trim().substring(0, 12);
      if (!name) {
        ws.send(JSON.stringify({ type: 'error', message: 'Name required', messageAr: 'الاسم مطلوب' }));
        return;
      }
      if (room.players.find(p => p.name === name)) {
        ws.send(JSON.stringify({ type: 'error', message: 'Name already taken', messageAr: 'الاسم مستخدم بالفعل' }));
        return;
      }

      ws.isHost = false;
      ws.roomCode = code;
      ws.playerName = name;
      room.clients.add(ws);

      const emojis = ['😎','🤩','🥳','🔥','⭐','🚀','💎','🦊','🐱','🐸','🎮','🎪'];
      const player = { name, emoji: emojis[room.players.length % emojis.length], id: ws.id };
      room.players.push(player);
      room.scores[name] = 0;
      room.streaks[name] = 0;
      room.maxStreaks[name] = 0;
      room.correctCounts[name] = 0;
      room.totalBonuses[name] = 0;

      const powerupTypes = ['freeze', 'double', 'steal'];
      room.powerups[name] = powerupTypes[room.players.length % powerupTypes.length];

      ws.send(JSON.stringify({ type: 'joined', code, player, categories: room.selectedCategories, numQuestions: room.numQuestions, powerup: room.powerups[name] }));
      broadcast(room, { type: 'player_joined', player, players: room.players }, ws.id);
      broadcast(room, { type: 'player_list', players: room.players });
    }

    if (msg.type === 'start_game') {
      const room = rooms.get(ws.roomCode);
      if (!room || !ws.isHost) return;
      if (room.players.length < 1) return;

      room.questions = buildQuestions(room.selectedCategories, room.numQuestions);
      room.currentQ = 0;
      room.phase = 'playing';
      room.answeredThisRound = {};

      const q = room.questions[0];
      broadcastAll(room, {
        type: 'game_started',
        questions: room.questions.map(q => ({
          q: q.q, qAr: q.qAr || q.q, options: q.options, optionsAr: q.optionsAr || q.options, category: q.category,
          roundNum: room.questions.indexOf(q) + 1
        })),
        totalQuestions: room.questions.length,
        currentQuestion: {
          q: q.q, qAr: q.qAr || q.q, options: q.options, optionsAr: q.optionsAr || q.options, category: q.category,
          round: 1
        },
        players: room.players,
        scores: room.scores,
        timerSeconds: room.timerSeconds,
        powerups: Object.fromEntries(room.players.map(p => [p.name, room.powerups[p.name]])),
      });

      startTimer(room);
    }

    if (msg.type === 'submit_answer') {
      const room = rooms.get(ws.roomCode);
      if (!room || ws.isHost || room.phase !== 'playing') return;
      if (room.answeredThisRound[ws.playerName] !== undefined) return;
      if (room.currentQ >= room.questions.length) return;

      const q = room.questions[room.currentQ];
      const answerIndex = msg.answer;
      if (answerIndex < 0 || answerIndex > 3) return;

      room.answeredThisRound[ws.playerName] = answerIndex;
      const correct = answerIndex === q.correct;
      let pointsEarned = 0;

      if (correct) {
        const streakBonus = (room.streaks[ws.playerName] || 0) >= 2 ? 50 : 0;
        const timeBonus = Math.floor(room.timeLeft * 2);
        pointsEarned = 100 + streakBonus + timeBonus;
        if (room.activeDoubles.has(ws.playerName)) {
          pointsEarned *= 2;
          room.activeDoubles.delete(ws.playerName);
        }
        room.totalBonuses[ws.playerName] = (room.totalBonuses[ws.playerName] || 0) + pointsEarned - 100;
        room.correctCounts[ws.playerName] = (room.correctCounts[ws.playerName] || 0) + 1;
        room.streaks[ws.playerName] = (room.streaks[ws.playerName] || 0) + 1;
        room.maxStreaks[ws.playerName] = Math.max(room.maxStreaks[ws.playerName] || 0, room.streaks[ws.playerName]);
        room.scores[ws.playerName] += pointsEarned;
      } else {
        room.streaks[ws.playerName] = 0;
        room.activeDoubles.delete(ws.playerName);
      }

      ws.send(JSON.stringify({ type: 'answer_confirmed', correct, answer: answerIndex, pointsEarned, newScore: room.scores[ws.playerName] }));

      broadcast(room, {
        type: 'player_answered',
        playerName: ws.playerName,
        answeredCount: Object.keys(room.answeredThisRound).length,
        totalPlayers: room.players.length,
        scores: room.scores,
      }, ws.id);

      broadcast(room, { type: 'player_list_update', players: room.players, answered: room.answeredThisRound });

      const allAnswered = room.players.every(p => room.answeredThisRound[p.name] !== undefined);
      if (allAnswered) {
        clearInterval(room.timerInterval);
        revealAnswer(room);
      }
    }

    if (msg.type === 'update_settings') {
      const room = rooms.get(ws.roomCode);
      if (!room || !ws.isHost) return;
      room.selectedCategories = msg.categories || room.selectedCategories;
      room.numQuestions = msg.numQuestions || room.numQuestions;
      room.timerSeconds = msg.timerSeconds !== undefined ? msg.timerSeconds : room.timerSeconds;
    }

    if (msg.type === 'use_powerup') {
      const room = rooms.get(ws.roomCode);
      if (!room || ws.isHost || room.phase !== 'playing') return;
      const pname = ws.playerName;
      const pu = room.powerups[pname];
      if (!pu) return;

      if (pu === 'freeze') {
        room.frozenTimers[pname] = true;
        clearInterval(room.timerInterval);
        room.powerups[pname] = null;
        broadcastAll(room, { type: 'powerup_used', player: pname, powerup: 'freeze', message: `${pname} froze the timer! ❄️`, messageAr: `${pname} جمّد المؤقت! ❄️` });
        setTimeout(() => {
          if (room.phase === 'playing') startTimer(room);
        }, 5000);
      } else if (pu === 'double') {
        room.powerups[pname] = null;
        room.activeDoubles.add(pname);
        broadcastAll(room, { type: 'powerup_used', player: pname, powerup: 'double', message: `${pname} activated DOUBLE POINTS! ✨`, messageAr: `${pname} فعّل النقاط المضاعفة! ✨` });
      } else if (pu === 'steal') {
        const ranked = Object.entries(room.scores).sort((a, b) => b[1] - a[1]);
        const victim = ranked.find(([n, s]) => n !== pname && s > 0);
        if (victim) {
          const stealAmount = Math.min(50, victim[1]);
          room.scores[victim[0]] -= stealAmount;
          room.scores[pname] += stealAmount;
          room.powerups[pname] = null;
          broadcastAll(room, { type: 'powerup_used', player: pname, powerup: 'steal', message: `${pname} stole ${stealAmount} pts from ${victim[0]}! 🦊`, messageAr: `${pname} سرق ${stealAmount} نقطة من ${victim[0]}! 🦊`, scores: room.scores, victim: victim[0], amount: stealAmount });
        } else {
          ws.send(JSON.stringify({ type: 'powerup_failed', message: 'No one to steal from!', messageAr: 'لا يوجد من تسرق منه النقاط!' }));
          return;
        }
      }

      ws.send(JSON.stringify({ type: 'powerup_consumed', powerup: pu }));
    }

    if (msg.type === 'reveal_now') {
      const room = rooms.get(ws.roomCode);
      if (!room || !ws.isHost || room.phase !== 'playing') return;
      clearInterval(room.timerInterval);
      revealAnswer(room);
    }

    if (msg.type === 'next_question') {
      const room = rooms.get(ws.roomCode);
      if (!room || !ws.isHost) return;
      advanceQuestion(room);
    }

    if (msg.type === 'skip_question') {
      const room = rooms.get(ws.roomCode);
      if (!room || !ws.isHost || room.phase !== 'playing') return;
      clearInterval(room.timerInterval);
      room.timerInterval = null;
      room.paused = false;
      broadcastAll(room, { type: 'question_skipped' });
      advanceQuestion(room);
    }

    if (msg.type === 'pause_timer') {
      const room = rooms.get(ws.roomCode);
      if (!room || !ws.isHost || room.phase !== 'playing' || !room.timerInterval) return;
      clearInterval(room.timerInterval);
      room.timerInterval = null;
      room.paused = true;
      broadcastAll(room, { type: 'timer_paused', timeLeft: room.timeLeft });
    }

    if (msg.type === 'resume_timer') {
      const room = rooms.get(ws.roomCode);
      if (!room || !ws.isHost || room.phase !== 'playing' || !room.paused) return;
      room.paused = false;
      broadcastAll(room, { type: 'timer_tick', timeLeft: room.timeLeft });
      runTimer(room);
    }

    if (msg.type === 'restart_game') {
      const room = rooms.get(ws.roomCode);
      if (!room || !ws.isHost) return;
      room.players.forEach(p => {
        room.scores[p.name] = 0;
        room.streaks[p.name] = 0;
      });
      room.phase = 'lobby';
      room.currentQ = 0;
      room.answeredThisRound = {};
      broadcastAll(room, { type: 'back_to_lobby', players: room.players, scores: room.scores });
    }
  });

  ws.on('close', () => {
    if (ws.roomCode) {
      const room = rooms.get(ws.roomCode);
      if (!room) return;
      room.clients.delete(ws);

      if (ws.isHost) {
        broadcast(room, { type: 'host_disconnected' });
        clearInterval(room.timerInterval);
        rooms.delete(ws.roomCode);
      } else {
        room.players = room.players.filter(p => p.name !== ws.playerName);
        delete room.scores[ws.playerName];
        delete room.streaks[ws.playerName];
        broadcast(room, { type: 'player_left', playerName: ws.playerName, players: room.players, scores: room.scores });
      }
    }
  });
});

function startTimer(room) {
  clearInterval(room.timerInterval);
  room.timerInterval = null;
  room.paused = false;

  if (room.timerSeconds <= 0) {
    room.timeLeft = 0;
    broadcastAll(room, { type: 'timer_tick', timeLeft: 0 });
    return;
  }

  room.timeLeft = room.timerSeconds;
  broadcastAll(room, { type: 'timer_tick', timeLeft: room.timeLeft });

  runTimer(room);
}

function runTimer(room) {
  clearInterval(room.timerInterval);
  room.timerInterval = setInterval(() => {
    room.timeLeft--;
    broadcastAll(room, { type: 'timer_tick', timeLeft: room.timeLeft });

    if (room.timeLeft <= 0) {
      clearInterval(room.timerInterval);
      room.timerInterval = null;
      revealAnswer(room);
    }
  }, 1000);
}

function revealAnswer(room) {
  if (room.phase !== 'playing') return;
  room.phase = 'reveal';
  const q = room.questions[room.currentQ];

  const correctPlayers = Object.entries(room.answeredThisRound)
    .filter(([_, ans]) => ans === q.correct)
    .map(([name]) => name);

  const ranked = Object.entries(room.scores).sort((a, b) => b[1] - a[1]);

  broadcastAll(room, {
    type: 'answer_reveal',
    correctAnswer: q.correct,
    correctPlayers,
    scores: room.scores,
    streaks: room.streaks,
    ranked: ranked.map(([name, score], i) => ({
      name, score, rank: i + 1,
      emoji: (room.players.find(p => p.name === name) || {}).emoji || '',
      streak: room.streaks[name] || 0,
      correct: room.correctCounts[name] || 0,
    })),
  });
}

function advanceQuestion(room) {
  room.currentQ++;
  room.answeredThisRound = {};
  room.phase = 'playing';

  if (room.currentQ >= room.questions.length) {
    room.phase = 'finished';
    const ranked = Object.entries(room.scores).sort((a, b) => b[1] - a[1]);
    const totalQ = room.questions.length;

    const playerStats = {};
    room.players.forEach(p => {
      playerStats[p.name] = {
        score: room.scores[p.name] || 0,
        correct: room.correctCounts[p.name] || 0,
        total: totalQ,
        accuracy: totalQ > 0 ? Math.round(((room.correctCounts[p.name] || 0) / totalQ) * 100) : 0,
        maxStreak: room.maxStreaks[p.name] || 0,
        bonusPoints: room.totalBonuses[p.name] || 0,
        emoji: p.emoji,
      };
    });

    broadcastAll(room, {
      type: 'game_over',
      scores: room.scores,
      ranked,
      players: room.players,
      playerStats,
      totalQuestions: totalQ,
    });
    return;
  }

  const q = room.questions[room.currentQ];
  broadcastAll(room, {
    type: 'new_question',
    currentQuestion: {
      q: q.q, qAr: q.qAr || q.q, options: q.options, optionsAr: q.optionsAr || q.options, category: q.category,
      round: room.currentQ + 1
    },
    scores: room.scores,
    round: room.currentQ + 1,
    timerSeconds: room.timerSeconds,
  });

  startTimer(room);
}

app.get('/api/ping', (req, res) => res.json({ ok: true }));

app.get('/api/config', async (req, res) => {
  const localUrl = resolveBase(req);
  let publicUrl = null;
  try {
    const config = JSON.parse(require('fs').readFileSync(path.join(__dirname, 'public', 'config.json'), 'utf8'));
    if (config.publicUrl && config.publicUrl !== localUrl) {
      try {
        const ctrl = new AbortController();
        const to = setTimeout(() => ctrl.abort(), 4000);
        const pong = await fetch(`${config.publicUrl}/api/ping`, { signal: ctrl.signal });
        clearTimeout(to);
        if (pong.ok) publicUrl = config.publicUrl;
      } catch {
        publicUrl = null;
      }
    }
  } catch {}
  res.json({ publicUrl, localUrl });
});

app.get('/join/:code', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'player.html'));
});

app.get('/qr/:code', async (req, res) => {
  const code = req.params.code.toUpperCase();
  const baseUrl = resolveBase(req);
  const url = `${baseUrl}/join/${code}`;
  try {
    const qr = await QRCode.toDataURL(url, {
      width: 300, margin: 2,
      color: { dark: '#e2e8f0', light: '#0f172a' }
    });
    res.json({ qr, url });
  } catch {
    res.status(500).json({ error: 'Failed to generate QR' });
  }
});

server.listen(PORT, () => {
  console.log(`\n  ╔══════════════════════════════════════╗`);
  console.log(`  ║          QUIZORA is LIVE             ║`);
  console.log(`  ║  Host:    http://localhost:${PORT}      ║`);
  console.log(`  ║  Network: http://${LOCAL_IP}:${PORT}  ║`);
  if (PUBLIC_BASE_URL) console.log(`  ║  Public:  ${PUBLIC_BASE_URL}  ║`);
  console.log(`  ╚══════════════════════════════════════╝\n`);
});
