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
    "nameTr": "Genel Kültür",
    "emoji": "🧠",
    "color": "from-violet-500 to-purple-600",
    "questions": [
      {
        "q": "What is the capital of France?",
        "qAr": "ما هي عاصمة فرنسا؟",
        "qTr": "Fransa'nın başkenti neresidir?",
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
        "optionsTr": [
          "Londra",
          "Berlin",
          "Paris",
          "Madrid"
        ],
        "correct": 2
      },
      {
        "q": "Which planet is known as the Red Planet?",
        "qAr": "ما هو الكوكب المعروف بالكوكب الأحمر؟",
        "qTr": "Hangi gezegen 'Kızıl Gezegen' olarak bilinir?",
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
        "optionsTr": [
          "Venüs",
          "Mars",
          "Jüpiter",
          "Satürn"
        ],
        "correct": 1
      },
      {
        "q": "What is the largest ocean on Earth?",
        "qAr": "ما هو أكبر محيط على وجه الأرض؟",
        "qTr": "Dünya üzerindeki en büyük okyanus hangisidir?",
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
        "optionsTr": [
          "Atlantik",
          "Hint",
          "Kuzey Buz",
          "Pasifik"
        ],
        "correct": 3
      },
      {
        "q": "How many continents are there?",
        "qAr": "كم عدد القارات في العالم؟",
        "qTr": "Dünyada kaç kıta vardır?",
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
        "optionsTr": [
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
        "qTr": "Altının kimyasal sembolü nedir?",
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
        "optionsTr": [
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
        "qTr": "Mona Lisa'yı kim çizdi?",
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
        "optionsTr": [
          "Van Gogh",
          "Picasso",
          "Da Vinci",
          "Michelangelo"
        ],
        "correct": 2
      },
      {
        "q": "What is the tallest mountain in the world?",
        "qAr": "ما هو أطول جبل في العالم؟",
        "qTr": "Dünyanın en yüksek dağı hangisidir?",
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
        "optionsTr": [
          "K2 Dağı",
          "Kangchenjunga",
          "Everest Dağı",
          "Lhotse"
        ],
        "correct": 2
      },
      {
        "q": "In which year did the Titanic sink?",
        "qAr": "في أي عام غرقت سفينة تيتانيك؟",
        "qTr": "Titanic hangi yıl battı?",
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
        "optionsTr": [
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
        "qTr": "Dünyanın en küçük ülkesi hangisidir?",
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
        "optionsTr": [
          "Monako",
          "Vatikan",
          "San Marino",
          "Lihtenştayn"
        ],
        "correct": 1
      },
      {
        "q": "Which element has the atomic number 1?",
        "qAr": "ما هو العنصر ذو العدد الذري 1؟",
        "qTr": "Atom numarası 1 olan element hangisidir?",
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
        "optionsTr": [
          "Helyum",
          "Oksijen",
          "Hidrojen",
          "Karbon"
        ],
        "correct": 2
      },
      {
        "q": "Which country gifted the Statue of Liberty to the United States?",
        "qAr": "أي دولة أهدت تمثال الحرية إلى الولايات المتحدة؟",
        "qTr": "Özgürlük Heykeli'ni ABD'ye hangi ülke hediye etti?",
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
        "optionsTr": [
          "Fransa",
          "İngiltere",
          "İspanya",
          "İtalya"
        ],
        "correct": 0
      },
      {
        "q": "What is the currency of Japan?",
        "qAr": "ما هي عملة اليابان؟",
        "qTr": "Japonya'nın para birimi nedir?",
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
        "optionsTr": [
          "Won",
          "Yen",
          "Yuan",
          "Ringit"
        ],
        "correct": 1
      },
      {
        "q": "Which musical instrument has 88 keys?",
        "qAr": "ما هي الآلة الموسيقية التي تحتوي على 88 مفتاحاً؟",
        "qTr": "Hangi müzik aletinde 88 tuş vardır?",
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
        "optionsTr": [
          "Gitar",
          "Piyano",
          "Keman",
          "Trompet"
        ],
        "correct": 1
      },
      {
        "q": "In which country is the Taj Mahal located?",
        "qAr": "في أي دولة يقع تاج محل؟",
        "qTr": "Tac Mahal hangi ülkede bulunur?",
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
        "optionsTr": [
          "Pakistan",
          "Hindistan",
          "Bangladeş",
          "Nepal"
        ],
        "correct": 1
      },
      {
        "q": "What is the largest hot desert in the world?",
        "qAr": "ما هي أكبر صحراء حارة في العالم؟",
        "qTr": "Dünyanın en büyük sıcak çölü hangisidir?",
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
        "optionsTr": [
          "Sahra Çölü",
          "Gobi",
          "Kalahari",
          "Atacama"
        ],
        "correct": 0
      },
      {
        "q": "In which city is the Burj Khalifa located?",
        "qAr": "في أي مدينة يقع برج خليفة؟",
        "qTr": "Burç Halife hangi şehirde bulunur?",
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
        "optionsTr": [
          "Dubai",
          "Doha",
          "Riyad",
          "Kuveyt Şehri"
        ],
        "correct": 0
      },
      {
        "q": "Which language is the most spoken in the world by native speakers?",
        "qAr": "ما هي اللغة الأكثر تحدثاً في العالم كلغة أم؟",
        "qTr": "Dünyada en çok ana dil olarak konuşulan dil hangisidir?",
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
        "optionsTr": [
          "İngilizce",
          "İspanyolca",
          "Mandarin Çincesi",
          "Hintçe"
        ],
        "correct": 2
      },
      {
        "q": "Which vitamin does sunlight help the body produce?",
        "qAr": "أي فيتامين يساعد ضوء الشمس الجسم على إنتاجه؟",
        "qTr": "Güneş ışığı vücudun hangi vitamini üretmesine yardımcı olur?",
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
        "optionsTr": [
          "A vitamini",
          "B vitamini",
          "C vitamini",
          "D vitamini"
        ],
        "correct": 3
      },
      {
        "q": "How many days are in a leap year?",
        "qAr": "كم يوماً في السنة الكبيسة؟",
        "qTr": "Artık yılda kaç gün vardır?",
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
        "optionsTr": [
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
        "qTr": "Hangi hayvana 'Çöl Gemisi' denir?",
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
        "optionsTr": [
          "At",
          "Deve",
          "Eşek",
          "Fil"
        ],
        "correct": 1
      },
      {
        "q": "What is the largest mammal on Earth?",
        "qAr": "ما هو أكبر حيوان ثديي على وجه الأرض؟",
        "qTr": "Dünyadaki en büyük memeli hangisidir?",
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
        "optionsTr": [
          "Fil",
          "Mavi balina",
          "Zürafa",
          "Su aygırı"
        ],
        "correct": 1
      },
      {
        "q": "What color results from mixing red and yellow?",
        "qAr": "ما اللون الناتج عن مزج الأحمر والأصفر؟",
        "qTr": "Kırmızı ve sarı karıştırılırsa hangi renk elde edilir?",
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
        "optionsTr": [
          "Yeşil",
          "Turuncu",
          "Mor",
          "Kahverengi"
        ],
        "correct": 1
      },
      {
        "q": "Which organ pumps blood around the body?",
        "qAr": "ما هو العضو الذي يضخ الدم في الجسم؟",
        "qTr": "Hangi organ vücuda kan pompalar?",
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
        "optionsTr": [
          "Akciğerler",
          "Kalp",
          "Böbrekler",
          "Beyin"
        ],
        "correct": 1
      },
      {
        "q": "Which planet is often called the Evening Star?",
        "qAr": "أي كوكب غالباً ما يُسمى نجم المساء؟",
        "qTr": "Hangi gezegene genellikle 'Akşam Yıldızı' denir?",
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
        "optionsTr": [
          "Venüs",
          "Mars",
          "Merkür",
          "Jüpiter"
        ],
        "correct": 0
      },
      {
        "q": "How many months in a year have 28 days?",
        "qAr": "كم شهراً في السنة يحتوي على 28 يوماً؟",
        "qTr": "Yılda kaç ay 28 gün çeker?",
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
        "optionsTr": [
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
        "qTr": "World Wide Web'i kim icat etti?",
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
        "optionsTr": [
          "Bill Gates",
          "Tim Berners-Lee",
          "Steve Jobs",
          "Mark Zuckerberg"
        ],
        "correct": 1
      }
    ]
  },
  "movies": {
    "name": "Movies & TV",
    "nameAr": "سينما وتلفزيون",
    "nameTr": "Film ve TV",
    "emoji": "🎬",
    "color": "from-rose-500 to-pink-600",
    "questions": [
      {
        "q": "Who directed the movie Titanic?",
        "qAr": "من أخرج فيلم تيتانيك؟",
        "qTr": "Titanik filmini kim yönetti?",
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
        "optionsTr": [
          "Steven Spielberg",
          "James Cameron",
          "Christopher Nolan",
          "Ridley Scott"
        ],
        "correct": 1
      },
      {
        "q": "What is the fictional African country in Black Panther?",
        "qAr": "ما هي الدولة الأفريقية الخيالية في فيلم النمر الأسود؟",
        "qTr": "Black Panther'deki kurgusal Afrika ülkesi hangisidir?",
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
        "optionsTr": [
          "Zamonda",
          "Wakanda",
          "Genovia",
          "Latveria"
        ],
        "correct": 1
      },
      {
        "q": "Which movie features the quote 'I'll be back'?",
        "qAr": "ما الفيلم الذي يحتوي على الجملة الشهيرة «سأعود»؟",
        "qTr": "Hangi film 'Ger döneceğim' sözünü içerir?",
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
        "optionsTr": [
          "Predator",
          "Terminatör",
          "Yaratık",
          "RoboCop"
        ],
        "correct": 1
      },
      {
        "q": "In The Matrix, what color pill does Neo take?",
        "qAr": "في فيلم الماتريكس، ما لون الحبة التي يتناولها نيو؟",
        "qTr": "Matrix'te Neo hangi renk hapı alır?",
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
        "optionsTr": [
          "Mavi",
          "Kırmızı",
          "Yeşil",
          "Sarı"
        ],
        "correct": 1
      },
      {
        "q": "Who played Iron Man in the MCU?",
        "qAr": "من لعب دور الرجل الحديدي في أفلام مارفل؟",
        "qTr": "MCU'da Demir Adam'ı kim canlandırdı?",
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
        "optionsTr": [
          "Chris Evans",
          "Chris Hemsworth",
          "Robert Downey Jr.",
          "Mark Ruffalo"
        ],
        "correct": 2
      },
      {
        "q": "What year was the first Star Wars movie released?",
        "qAr": "في أي عام صدر أول فيلم من سلسلة حرب النجوم؟",
        "qTr": "İlk Star Wars filmi hangi yıl yayınlandı?",
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
        "optionsTr": [
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
        "qTr": "Hangi animasyon filminde Simba adlı bir karakter vardır?",
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
        "optionsTr": [
          "Aladdin",
          "Aslan Kral",
          "Karlar Ülkesi",
          "Moana"
        ],
        "correct": 1
      },
      {
        "q": "Who directed Inception?",
        "qAr": "من أخرج فيلم إنسيبشن؟",
        "qTr": "Inception'ı kim yönetti?",
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
        "optionsTr": [
          "Denis Villeneuve",
          "Christopher Nolan",
          "David Fincher",
          "Quentin Tarantino"
        ],
        "correct": 1
      },
      {
        "q": "What is the highest-grossing film of all time?",
        "qAr": "ما هو الفيلم الأعلى ربحاً في التاريخ؟",
        "qTr": "Tüm zamanların en çok hasılat yapan filmi hangisidir?",
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
        "optionsTr": [
          "Titanik",
          "Avatar",
          "Avengers: Endgame",
          "Star Wars"
        ],
        "correct": 1
      },
      {
        "q": "In Harry Potter, what house does Harry belong to?",
        "qAr": "في هاري بوتر، إلى أي منزل ينتمي هاري؟",
        "qTr": "Harry Potter'da Harry hangi evin üyesidir?",
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
        "optionsTr": [
          "Slytherin",
          "Hufflepuff",
          "Ravenclaw",
          "Gryffindor"
        ],
        "correct": 3
      },
      {
        "q": "Which actor played Jack Sparrow in Pirates of the Caribbean?",
        "qAr": "من لعب دور جاك سبارو في قراصنة الكاريبي؟",
        "qTr": "Karayip Korsanları'nda Jack Sparrow'u hangi aktör canlandırdı?",
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
        "optionsTr": [
          "Johnny Depp",
          "Brad Pitt",
          "Leonardo DiCaprio",
          "Tom Cruise"
        ],
        "correct": 0
      },
      {
        "q": "What is the name of the wizarding school in Harry Potter?",
        "qAr": "ما اسم مدرسة السحر والشعوذة في هاري بوتر؟",
        "qTr": "Harry Potter'daki büyücülük okulunun adı nedir?",
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
        "optionsTr": [
          "Beauxbatons",
          "Hogwarts",
          "Durmstrang",
          "Ilvermorny"
        ],
        "correct": 1
      },
      {
        "q": "Who won the Oscar for Best Actor as the Joker in 2019?",
        "qAr": "من فاز بجائزة الأوسكار لأفضل ممثل عن دور الجوكر عام 2019؟",
        "qTr": "2019'da Joker rolüyle En İyi Erkek Oyuncu Oscar'ını kim kazandı?",
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
        "optionsTr": [
          "Joaquin Phoenix",
          "Jared Leto",
          "Heath Ledger",
          "Jack Nicholson"
        ],
        "correct": 0
      },
      {
        "q": "Which Toy Story spaceman says 'To infinity and beyond!'?",
        "qAr": "أي رائد فضاء من لعبة «قصة لعبة» يقول «إلى ما لا نهاية وما بعدها»؟",
        "qTr": "Oyuncak Hikayesi'ndeki hangi uzay adamı 'Sınırsıza ve ötesine!' der?",
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
        "optionsTr": [
          "Buzz",
          "Woody",
          "Rex",
          "Hamm"
        ],
        "correct": 0
      },
      {
        "q": "Which animated film features the sisters Anna and Elsa?",
        "qAr": "ما الفيلم الكرتوني الذي يضم الأختين آنا وإلسا؟",
        "qTr": "Hangi animasyon filmi Anna ve Elsa kardeşleri içerir?",
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
        "optionsTr": [
          "Karlar Ülkesi",
          "Moana",
          "Rapunzel",
          "Encanto"
        ],
        "correct": 0
      },
      {
        "q": "Who directed the movie 'Avatar'?",
        "qAr": "من أخرج فيلم أفاتار؟",
        "qTr": "Avatar filmini kim yönetti?",
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
        "optionsTr": [
          "James Cameron",
          "Steven Spielberg",
          "Peter Jackson",
          "Michael Bay"
        ],
        "correct": 0
      },
      {
        "q": "Which 1977 space film introduced 'The Force'?",
        "qAr": "ما هو فيلم الفضاء الصادر عام 1977 الذي قدّم مصطلح «القوة»؟",
        "qTr": "Hangi 1977 uzay filmi 'Güç' kavramını tanıttı?",
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
        "optionsTr": [
          "Star Wars",
          "Star Trek",
          "Yaratık",
          "Flash Gordon"
        ],
        "correct": 0
      },
      {
        "q": "Which movie stars Tom Hanks as a castaway named Chuck?",
        "qAr": "ما هو الفيلم الذي يلعب فيه توم هانكس دور غريق اسمه تشاك؟",
        "qTr": "Hangi filmde Tom Hanks, Chuck adlı bir kazazede rolündedir?",
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
        "optionsTr": [
          "Kazazede",
          "Forrest Gump",
          "Terminal",
          "Philadelphia"
        ],
        "correct": 0
      },
      {
        "q": "Which Japanese studio made 'Spirited Away'?",
        "qAr": "أي استوديو ياباني أنتج فيلم «المخطوفة»؟",
        "qTr": "'Ruhların Kaçışı'nı hangi Japon stüdyosu yaptı?",
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
        "optionsTr": [
          "Studio Ghibli",
          "Toei",
          "Sunrise",
          "Madhouse"
        ],
        "correct": 0
      },
      {
        "q": "Which 2008 superhero film introduced Iron Man to the big screen?",
        "qAr": "ما هو فيلم الأبطال الخارقين لعام 2008 الذي قدّم الرجل الحديدي للشاشة الكبيرة؟",
        "qTr": "Hangi 2008 süper kahraman filmi Demir Adam'ı beyaz perdeye taşıdı?",
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
        "optionsTr": [
          "Demir Adam",
          "Kara Şövalye",
          "Çelik Adam",
          "Superman Dönüyor"
        ],
        "correct": 0
      }
    ]
  },
  "sports": {
    "name": "Sports",
    "nameAr": "الرياضة",
    "nameTr": "Spor",
    "emoji": "⚽",
    "color": "from-emerald-500 to-teal-600",
    "questions": [
      {
        "q": "How many players on a soccer team on the field?",
        "qAr": "كم عدد لاعبي فريق كرة القدم داخل الملعب؟",
        "qTr": "Bir futbol takımında sahada kaç oyuncu vardır?",
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
        "optionsTr": [
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
        "qTr": "2022 FIFA Dünya Kupası'nı hangi ülke kazandı?",
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
        "optionsTr": [
          "Fransa",
          "Brezilya",
          "Arjantin",
          "Almanya"
        ],
        "correct": 2
      },
      {
        "q": "How many points is a basketball free throw worth?",
        "qAr": "كم نقطة تساوي الرمية الحرة في كرة السلة؟",
        "qTr": "Basketbolda bir serbest atış kaç puan değerindedir?",
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
        "optionsTr": [
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
        "qTr": "Wimbledon'da hangi spor yapılır?",
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
        "optionsTr": [
          "Golf",
          "Tenis",
          "Kriket",
          "Ragbi"
        ],
        "correct": 1
      },
      {
        "q": "How many Grand Slam tennis tournaments per year?",
        "qAr": "كم عدد بطولات الغراند سلام في التنس سنوياً؟",
        "qTr": "Yılda kaç Grand Slam tenis turnuvası vardır?",
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
        "optionsTr": [
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
        "qTr": "Hangi sporcu en çok Olimpiyat altın madalyasına sahiptir?",
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
        "optionsTr": [
          "Usain Bolt",
          "Michael Phelps",
          "Carl Lewis",
          "Simone Biles"
        ],
        "correct": 1
      },
      {
        "q": "How many points is a touchdown in American football?",
        "qAr": "كم نقطة تساوي محاولة تهديف (تاتش داون) في كرة القدم الأمريكية؟",
        "qTr": "Amerikan futbolunda bir touchdown kaç puan değerindedir?",
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
        "optionsTr": [
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
        "qTr": "Basketbol potasının çapı kaç inçtir?",
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
        "optionsTr": [
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
        "qTr": "Kriketi hangi ülke icat etti?",
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
        "optionsTr": [
          "Avustralya",
          "Hindistan",
          "İngiltere",
          "Güney Afrika"
        ],
        "correct": 2
      },
      {
        "q": "How long is a marathon in km?",
        "qAr": "كم كيلومتراً يبلغ طول الماراثون؟",
        "qTr": "Maraton kaç km uzunluğundadır?",
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
        "optionsTr": [
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
        "qTr": "2022 FIFA Dünya Kupası'na hangi ülke ev sahipliği yaptı?",
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
        "optionsTr": [
          "Katar",
          "Rusya",
          "Brezilya",
          "BAE"
        ],
        "correct": 0
      },
      {
        "q": "Which Egyptian footballer is nicknamed the 'Egyptian King'?",
        "qAr": "ما هو اللاعب المصري الملقب بـ«الملك المصري»؟",
        "qTr": "Hangi Mısırlı futbolcu 'Mısır Kralı' lakabıyla anılır?",
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
        "optionsTr": [
          "Mohamed Salah",
          "Mohamed Abou Treika",
          "Trezeguet",
          "Essam El-Hadary"
        ],
        "correct": 0
      },
      {
        "q": "How many players are on a basketball team on the court?",
        "qAr": "كم عدد لاعبي كرة السلة على أرض الملعب؟",
        "qTr": "Basketbolda sahada kaç oyuncu vardır?",
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
        "optionsTr": [
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
        "qTr": "Hangi sporda tüylü top kullanılır?",
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
        "optionsTr": [
          "Badminton",
          "Tenis",
          "Squash",
          "Masa tenisi"
        ],
        "correct": 0
      },
      {
        "q": "Which country has won the most FIFA World Cups?",
        "qAr": "أي دولة فازت بأكبر عدد من كؤوس العالم؟",
        "qTr": "Hangi ülke en çok FIFA Dünya Kupası kazanmıştır?",
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
        "optionsTr": [
          "Almanya",
          "Brezilya",
          "İtalya",
          "Arjantin"
        ],
        "correct": 1
      },
      {
        "q": "What is the maximum score possible with a single dart?",
        "qAr": "ما هي أعلى نتيجة ممكنة برمية واحدة للنبلة؟",
        "qTr": "Tek bir ok atışıyla mümkün olan en yüksek skor nedir?",
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
        "optionsTr": [
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
        "qTr": "Bir kriket takımında kaç oyuncu vardır?",
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
        "optionsTr": [
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
        "qTr": "Japonya'nın geleneksel milli sporu nedir?",
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
        "optionsTr": [
          "Sumo güreşi",
          "Karate",
          "Beyzbol",
          "Judo"
        ],
        "correct": 0
      },
      {
        "q": "Which football club is the biggest and most successful in Egypt?",
        "qAr": "ما هو أكبر وأنجح نادٍ لكرة القدم في مصر؟",
        "qTr": "Mısır'ın en büyük ve en başarılı futbol kulübü hangisidir?",
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
        "optionsTr": [
          "El-Ehli",
          "Zamalek",
          "El-İsmailiy",
          "Pyramids"
        ],
        "correct": 0
      },
      {
        "q": "Which sport is known around the world as 'the beautiful game'?",
        "qAr": "أي رياضة تُعرف حول العالم بـ«اللعبة الجميلة»؟",
        "qTr": "Hangi spor dünya çapında 'güzel oyun' olarak bilinir?",
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
        "optionsTr": [
          "Futbol",
          "Basketbol",
          "Tenis",
          "Ragbi"
        ],
        "correct": 0
      }
    ]
  },
  "science": {
    "name": "Science",
    "nameAr": "العلوم",
    "nameTr": "Bilim",
    "emoji": "🔬",
    "color": "from-cyan-500 to-blue-600",
    "questions": [
      {
        "q": "What is the chemical formula for water?",
        "qAr": "ما هي الصيغة الكيميائية للماء؟",
        "qTr": "Suyun kimyasal formülü nedir?",
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
        "optionsTr": [
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
        "qTr": "Yetişkin insan vücudunda kaç kemik vardır?",
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
        "optionsTr": [
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
        "qTr": "Güneş'e en yakın gezegen hangisidir?",
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
        "optionsTr": [
          "Venüs",
          "Dünya",
          "Merkür",
          "Mars"
        ],
        "correct": 2
      },
      {
        "q": "What force keeps us on the ground?",
        "qAr": "ما هي القوة التي تبقينا على الأرض؟",
        "qTr": "Hangi kuvvet bizi yerde tutar?",
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
        "optionsTr": [
          "Manyetizma",
          "Sürtünme",
          "Yerçekimi",
          "Atalet"
        ],
        "correct": 2
      },
      {
        "q": "What is the powerhouse of the cell?",
        "qAr": "ما هو مصدر طاقة الخلية؟",
        "qTr": "Hücrenin enerji merkezi nedir?",
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
        "optionsTr": [
          "Çekirdek",
          "Ribozom",
          "Mitokondri",
          "Golgi aygıtı"
        ],
        "correct": 2
      },
      {
        "q": "What gas do plants absorb from the atmosphere?",
        "qAr": "ما هو الغاز الذي تمتصه النباتات من الجو؟",
        "qTr": "Bitkiler atmosferden hangi gazı emer?",
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
        "optionsTr": [
          "Oksijen",
          "Azot",
          "Karbondioksit",
          "Hidrojen"
        ],
        "correct": 2
      },
      {
        "q": "Approx speed of light in km/s?",
        "qAr": "ما هي سرعة الضوء تقريباً بالكيلومتر/ثانية؟",
        "qTr": "Işığın hızı yaklaşık kaç km/s'dir?",
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
        "optionsTr": [
          "150.000",
          "300.000",
          "450.000",
          "600.000"
        ],
        "correct": 1
      },
      {
        "q": "Who proposed the theory of relativity?",
        "qAr": "من وضع نظرية النسبية؟",
        "qTr": "Görelilik teorisini kim ortaya attı?",
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
        "optionsTr": [
          "Newton",
          "Einstein",
          "Hawking",
          "Tesla"
        ],
        "correct": 1
      },
      {
        "q": "What is the hardest natural substance on Earth?",
        "qAr": "ما هي أقسى مادة طبيعية على وجه الأرض؟",
        "qTr": "Dünyadaki en sert doğal madde hangisidir?",
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
        "optionsTr": [
          "Altın",
          "Demir",
          "Elmas",
          "Platin"
        ],
        "correct": 2
      },
      {
        "q": "How many elements in the periodic table?",
        "qAr": "كم عدد العناصر في الجدول الدوري؟",
        "qTr": "Periyodik tabloda kaç element vardır?",
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
        "optionsTr": [
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
        "qTr": "Hangi Müslüman bilgin 'Cebrin Babası' olarak bilinir?",
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
        "optionsTr": [
          "Harezmi",
          "İbn Sina",
          "Razi",
          "Ömer Hayyam"
        ],
        "correct": 0
      },
      {
        "q": "Which scientist formulated the three laws of motion?",
        "qAr": "من هو العالم الذي صاغ قوانين الحركة الثلاثة؟",
        "qTr": "Hangi bilim insanı üç hareket yasasını formüle etti?",
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
        "optionsTr": [
          "Isaac Newton",
          "Albert Einstein",
          "Galileo Galilei",
          "Nikola Tesla"
        ],
        "correct": 0
      },
      {
        "q": "Which gas makes up about 78% of Earth's atmosphere?",
        "qAr": "ما هو الغاز الذي يشكل حوالي 78% من الغلاف الجوي للأرض؟",
        "qTr": "Dünya atmosferinin yaklaşık %78'ini hangi gaz oluşturur?",
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
        "optionsTr": [
          "Oksijen",
          "Karbondioksit",
          "Azot",
          "Hidrojen"
        ],
        "correct": 2
      },
      {
        "q": "What is the study of weather called?",
        "qAr": "ما اسم علم دراسة الطقس؟",
        "qTr": "Hava durumunu inceleyen bilime ne denir?",
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
        "optionsTr": [
          "Jeoloji",
          "Meteoroloji",
          "Astronomi",
          "Ekoloji"
        ],
        "correct": 1
      },
      {
        "q": "Which metal is liquid at room temperature?",
        "qAr": "أي معدن يكون سائلاً في درجة حرارة الغرفة؟",
        "qTr": "Hangi metal oda sıcaklığında sıvıdır?",
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
        "optionsTr": [
          "Cıva",
          "Alüminyum",
          "Demir",
          "Bakır"
        ],
        "correct": 0
      },
      {
        "q": "Who was the first scientist to use a telescope to observe the stars?",
        "qAr": "من كان أول عالم استخدم التلسكوب لرصد النجوم؟",
        "qTr": "Yıldızları gözlemlemek için teleskop kullanan ilk bilim insanı kimdi?",
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
        "optionsTr": [
          "Galileo Galilei",
          "Isaac Newton",
          "Kopernik",
          "Kepler"
        ],
        "correct": 0
      },
      {
        "q": "What is the unit used to measure electric current?",
        "qAr": "ما هي وحدة قياس التيار الكهربائي؟",
        "qTr": "Elektrik akımını ölçmek için kullanılan birim nedir?",
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
        "optionsTr": [
          "Volt",
          "Watt",
          "Amper",
          "Ohm"
        ],
        "correct": 2
      },
      {
        "q": "Which Arab scholar is considered the 'father of optics' for his work on light and vision?",
        "qAr": "ما هو العالم العربي الملقب بـ«أبي البصريات» لدراساته عن الضوء والرؤية؟",
        "qTr": "Işık ve görme üzerine çalışmalarıyla 'optiğin babası' sayılan Arap bilgin kimdir?",
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
        "optionsTr": [
          "İbn Heysem",
          "Harezmi",
          "İbn Haldun",
          "Farabi"
        ],
        "correct": 0
      },
      {
        "q": "What does DNA stand for?",
        "qAr": "ماذا يعني DNA؟",
        "qTr": "DNA'nın açılımı nedir?",
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
        "optionsTr": [
          "Deoksiribonükleik asit",
          "Dinükleotit asit",
          "Deoksiriboz",
          "Çift azot"
        ],
        "correct": 0
      },
      {
        "q": "What is the approximate speed of sound in air?",
        "qAr": "ما هي السرعة التقريبية للصوت في الهواء؟",
        "qTr": "Sesin havadaki yaklaşık hızı nedir?",
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
        "optionsTr": [
          "343 m/s",
          "150 m/s",
          "800 m/s",
          "1000 m/s"
        ],
        "correct": 0
      }
    ]
  },
  "history": {
    "name": "History",
    "nameAr": "التاريخ",
    "nameTr": "Tarih",
    "emoji": "🏛️",
    "color": "from-amber-500 to-orange-600",
    "questions": [
      {
        "q": "In which year did World War II end?",
        "qAr": "في أي عام انتهت الحرب العالمية الثانية؟",
        "qTr": "II. Dünya Savaşı hangi yıl sona erdi?",
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
        "optionsTr": [
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
        "qTr": "Amerika Birleşik Devletleri'nin ilk başkanı kimdi?",
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
        "optionsTr": [
          "Jefferson",
          "Washington",
          "Lincoln",
          "Adams"
        ],
        "correct": 1
      },
      {
        "q": "How many hills was Rome built on?",
        "qAr": "على كم تلة بُنيت مدينة روما؟",
        "qTr": "Roma kaç tepe üzerine kuruldu?",
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
        "optionsTr": [
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
        "qTr": "Gize piramitlerini hangi uygarlık inşa etti?",
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
        "optionsTr": [
          "Maya",
          "Romalılar",
          "Mısırlılar",
          "Yunanlar"
        ],
        "correct": 2
      },
      {
        "q": "In which year did the Berlin Wall fall?",
        "qAr": "في أي عام سقط جدار برلين؟",
        "qTr": "Berlin Duvarı hangi yıl yıkıldı?",
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
        "optionsTr": [
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
        "qTr": "Cengiz Han hangi imparatorluğu yönetti?",
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
        "optionsTr": [
          "Roma",
          "Osmanlı",
          "Moğol",
          "Pers"
        ],
        "correct": 2
      },
      {
        "q": "Which city was the center of the Islamic Golden Age?",
        "qAr": "ما هي المدينة التي كانت مركز العصر الذهبي الإسلامي؟",
        "qTr": "Hangi şehir İslam Altın Çağı'nın merkeziydi?",
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
        "optionsTr": [
          "Bağdat",
          "Roma",
          "Atina",
          "Konstantinopolis"
        ],
        "correct": 0
      },
      {
        "q": "Who was the first caliph after Prophet Muhammad ﷺ?",
        "qAr": "من كان أول خليفة بعد النبي محمد ﷺ؟",
        "qTr": "Hz. Muhammed (s.a.v.)'den sonraki ilk halife kimdi?",
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
        "optionsTr": [
          "Ebu Bekir",
          "Ömer",
          "Osman",
          "Ali"
        ],
        "correct": 0
      },
      {
        "q": "In which year did the Ottoman Empire officially come to an end?",
        "qAr": "في أي عام انتهت الدولة العثمانية رسمياً؟",
        "qTr": "Osmanlı İmparatorluğu resmen hangi yıl sona erdi?",
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
        "optionsTr": [
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
        "qTr": "Haçlılara karşı Müslüman ordularına liderlik eden ve Batı'da 'Selahaddin' olarak bilinen kişi kimdir?",
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
        "optionsTr": [
          "Selahaddin Eyyubi",
          "Ömer Muhtar",
          "Halid bin Velid",
          "Tarık bin Ziyad"
        ],
        "correct": 0
      },
      {
        "q": "The Great Pyramid of Giza was built as a tomb for which pharaoh?",
        "qAr": "بُني الهرم الأكبر في الجيزة مقبرةً لأي فرعون؟",
        "qTr": "Gize'deki Büyük Piramit hangi firavun için mezar olarak inşa edildi?",
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
        "optionsTr": [
          "Kleopatra",
          "Keops",
          "II. Ramses",
          "Tutankamon"
        ],
        "correct": 1
      },
      {
        "q": "In which year did the United Arab Emirates gain independence?",
        "qAr": "في أي عام نالت الإمارات العربية المتحدة استقلالها؟",
        "qTr": "Birleşik Arap Emirlikleri hangi yıl bağımsızlığını kazandı?",
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
        "optionsTr": [
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
        "qTr": "Cebelitarık hangi Müslüman komutanın adını taşır?",
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
        "optionsTr": [
          "Tarık bin Ziyad",
          "Halid bin Velid",
          "Amr bin As",
          "Sa'd bin Ebi Vakkas"
        ],
        "correct": 0
      },
      {
        "q": "What was the writing system used by the ancient Egyptians?",
        "qAr": "ما نظام الكتابة الذي استخدمه قدماء المصريين؟",
        "qTr": "Eski Mısırlıların kullandığı yazı sistemi neydi?",
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
        "optionsTr": [
          "Hiyeroglif",
          "Çivi yazısı",
          "Latin",
          "Sanskritçe"
        ],
        "correct": 0
      },
      {
        "q": "Which country was formerly known as Persia?",
        "qAr": "أي دولة كانت تُعرف سابقاً باسم فارس؟",
        "qTr": "Eskiden Pers olarak bilinen ülke hangisidir?",
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
        "optionsTr": [
          "İran",
          "Irak",
          "Türkiye",
          "Afganistan"
        ],
        "correct": 0
      },
      {
        "q": "The Suez Canal connects the Mediterranean with which sea?",
        "qAr": "قناة السويس تصل البحر المتوسط بأي بحر؟",
        "qTr": "Süveyş Kanalı Akdeniz'i hangi denize bağlar?",
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
        "optionsTr": [
          "Kızıldeniz",
          "Karadeniz",
          "Hazar Denizi",
          "Arap Denizi"
        ],
        "correct": 0
      },
      {
        "q": "Who wrote 'Al-Muqaddimah', the founding work of sociology and historiography?",
        "qAr": "من كتب كتاب «المقدمة» المؤسس لعلم الاجتماع وفلسفة التاريخ؟",
        "qTr": "Sosyolojinin ve tarih biliminin kurucu eseri 'Mukaddime'yi kim yazdı?",
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
        "optionsTr": [
          "İbn Haldun",
          "İbn Sina",
          "Gazali",
          "Biruni"
        ],
        "correct": 0
      }
    ]
  },
  "family": {
    "name": "Family Fun",
    "nameAr": "مرح العائلة",
    "nameTr": "Aile Eğlencesi",
    "emoji": "👨‍👩‍👧‍👦",
    "color": "from-fuchsia-500 to-pink-500",
    "questions": [
      {
        "q": "What do you call a group of flamingos?",
        "qAr": "ماذا يُسمى مجموعة طيور الفلامنغو؟",
        "qTr": "Bir grup flamingoya ne ad verilir?",
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
        "optionsTr": [
          "Sürü",
          "Gösteriş",
          "Yavru",
          "Kalabalık"
        ],
        "correct": 1
      },
      {
        "q": "How many colors are in a rainbow?",
        "qAr": "كم عدد ألوان قوس قزح؟",
        "qTr": "Gökkuşağında kaç renk vardır?",
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
        "optionsTr": [
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
        "qTr": "ABD'de pizzada en popüler malzeme hangisidir?",
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
        "optionsTr": [
          "Mantar",
          "Pepperoni",
          "Sosis",
          "Zeytin"
        ],
        "correct": 1
      },
      {
        "q": "Which Disney princess has a raccoon sidekick?",
        "qAr": "أي أميرة من أميرات ديزني لديها رفيق راكون؟",
        "qTr": "Hangi Disney prensesinin rakun arkadaşı vardır?",
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
        "optionsTr": [
          "Ariel",
          "Belle",
          "Pocahontas",
          "Mulan"
        ],
        "correct": 2
      },
      {
        "q": "What is the opposite of 'day'?",
        "qAr": "ما هو عكس كلمة «نهار»؟",
        "qTr": "'Gündüz' kelimesinin zıttı nedir?",
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
        "optionsTr": [
          "Karanlık",
          "Gece",
          "Akşam",
          "Gün batımı"
        ],
        "correct": 1
      },
      {
        "q": "How many sides does a hexagon have?",
        "qAr": "كم عدد أضلاع الشكل السداسي؟",
        "qTr": "Altıgenin kaç kenarı vardır?",
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
        "optionsTr": [
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
        "qTr": "Hangi hayvan 'Ormanın Kralı'dır?",
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
        "optionsTr": [
          "Kaplan",
          "Fil",
          "Aslan",
          "Goril"
        ],
        "correct": 2
      },
      {
        "q": "Which fruit keeps the doctor away?",
        "qAr": "أي فاكهة «تُبعد الطبيب»؟",
        "qTr": "Hangi meyve doktoru uzak tutar?",
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
        "optionsTr": [
          "Muz",
          "Portakal",
          "Elma",
          "Üzüm"
        ],
        "correct": 2
      },
      {
        "q": "What do bees collect to make honey?",
        "qAr": "ماذا يجمع النحل ليصنع العسل؟",
        "qTr": "Arılar bal yapmak için ne toplar?",
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
        "optionsTr": [
          "Polen",
          "Çiçek nektarı",
          "Reçine",
          "Çiy"
        ],
        "correct": 1
      },
      {
        "q": "How many bottles of beer on the wall?",
        "qAr": "كم زجاجة بيرة على الحائط في الأغنية؟",
        "qTr": "Şarkıda duvarda kaç bira şişesi vardır?",
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
        "optionsTr": [
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
        "qTr": "Dünyada en çok tüketilen tahıl hangisidir?",
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
        "optionsTr": [
          "Pirinç",
          "Buğday",
          "Mısır",
          "Yulaf"
        ],
        "correct": 0
      },
      {
        "q": "Hummus and falafel are famous dishes of which region?",
        "qAr": "الحمص والفلافل أطباق شهيرة من أي منطقة؟",
        "qTr": "Humus ve felafel hangi bölgenin ünlü yemekleridir?",
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
        "optionsTr": [
          "Orta Doğu",
          "Asya",
          "Avrupa",
          "Latin Amerika"
        ],
        "correct": 0
      },
      {
        "q": "How many legs does a spider have?",
        "qAr": "كم عدد أرجل العنكبوت؟",
        "qTr": "Bir örümceğin kaç bacağı vardır?",
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
        "optionsTr": [
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
        "qTr": "Yemen'in milli yemeği nedir?",
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
        "optionsTr": [
          "Saltah",
          "Kabse",
          "Kuskus",
          "Biryani"
        ],
        "correct": 0
      },
      {
        "q": "Which sweet cheese dessert is famous in the Middle East during Ramadan?",
        "qAr": "ما هي حلوى الجبن الحلوة الشهيرة في الشرق الأوسط خلال رمضان؟",
        "qTr": "Ramazan'da Orta Doğu'da ünlü tatlı peynir tatlısı hangisidir?",
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
        "optionsTr": [
          "Künefe",
          "Tiramisu",
          "Cheesecake",
          "Pavlova"
        ],
        "correct": 0
      },
      {
        "q": "Which card game has kings, queens, and aces?",
        "qAr": "أي لعبة أوراق تحتوي على ملوك وملكات وآصات؟",
        "qTr": "Hangi kart oyununda papazlar, kızlar ve aslar vardır?",
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
        "optionsTr": [
          "İskambil",
          "Domino",
          "Tavla",
          "Satranç"
        ],
        "correct": 0
      },
      {
        "q": "What is the fastest land animal?",
        "qAr": "ما هو أسرع حيوان بري؟",
        "qTr": "En hızlı kara hayvanı hangisidir?",
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
        "optionsTr": [
          "Çita",
          "Aslan",
          "Devekuşu",
          "Antilop"
        ],
        "correct": 0
      },
      {
        "q": "How many colors are in a traffic light?",
        "qAr": "كم عدد ألوان إشارة المرور؟",
        "qTr": "Trafik lambasında kaç renk vardır?",
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
        "optionsTr": [
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
        "qTr": "Hangi meyvenin adı aynı zamanda bir renktir?",
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
        "optionsTr": [
          "Portakal",
          "Elma",
          "Muz",
          "Mango"
        ],
        "correct": 0
      },
      {
        "q": "How many vowels are in the English alphabet?",
        "qAr": "كم عدد حروف العلة في الأبجدية الإنجليزية؟",
        "qTr": "İngiliz alfabesinde kaç sesli harf vardır?",
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
        "optionsTr": [
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
    "nameTr": "Müzik",
    "emoji": "🎵",
    "color": "from-indigo-500 to-violet-600",
    "questions": [
      {
        "q": "How many strings does a violin have?",
        "qAr": "كم عدد أوتار الكمان؟",
        "qTr": "Bir kemanın kaç teli vardır?",
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
        "optionsTr": [
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
        "qTr": "Kim 'Popun Kralı' olarak bilinir?",
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
        "optionsTr": [
          "Michael Jackson",
          "Elvis Presley",
          "Prince",
          "Freddie Mercury"
        ],
        "correct": 0
      },
      {
        "q": "Which legendary Egyptian singer is called 'Kawkab al-Sharq' (Star of the East)?",
        "qAr": "ما هي المطربة المصرية الأسطورية الملقبة بـ«كوكب الشرق»؟",
        "qTr": "Hangi efsanevi Mısırlı şarkıcıya 'Kevkebü'ş-Şark' (Doğu'nun Yıldızı) denir?",
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
        "optionsTr": [
          "Ümmü Gülsüm",
          "Feyruz",
          "Verda",
          "Samira Said"
        ],
        "correct": 0
      },
      {
        "q": "Which Lebanese icon sings 'Nassam Alayna El Hawa'?",
        "qAr": "ما هي الأيقونة اللبنانية التي غنت «نسم علينا الهوى»؟",
        "qTr": "Hangi Lübnanlı ikon 'Nassam Aleyna El Hava'yı söyler?",
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
        "optionsTr": [
          "Feyruz",
          "Nancy Ajram",
          "Elissa",
          "Mecida Rumi"
        ],
        "correct": 0
      },
      {
        "q": "What musical term means 'loud' in Italian?",
        "qAr": "ما المصطلح الموسيقي الإيطالي الذي يعني «بصوت عالٍ»؟",
        "qTr": "Hangi müzik terimi İtalyanca'da 'yüksek sesle' anlamına gelir?",
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
        "optionsTr": [
          "Forte",
          "Piyano",
          "Allegro",
          "Adagio"
        ],
        "correct": 0
      },
      {
        "q": "Which band performed 'Bohemian Rhapsody'?",
        "qAr": "أي فرقة موسيقية أدّت أغنية «بوهيميان رابسودي»؟",
        "qTr": "'Bohemian Rhapsody'yi hangi grup seslendirdi?",
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
        "optionsTr": [
          "Queen",
          "Beatles",
          "Pink Floyd",
          "Led Zeppelin"
        ],
        "correct": 0
      },
      {
        "q": "How many semitones are in one octave?",
        "qAr": "كم عدد أنصاف النغمات في الأوكتاف الواحد؟",
        "qTr": "Bir oktavda kaç yarım ton vardır?",
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
        "optionsTr": [
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
        "qTr": "Hangi geleneksel Arap enstrümanı armut şeklinde telli bir uttur?",
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
        "optionsTr": [
          "Ud",
          "Davul",
          "Kanun",
          "Ney"
        ],
        "correct": 0
      },
      {
        "q": "Which instrument is famously called the 'King of Instruments'?",
        "qAr": "أي آلة موسيقية تُلقب بـ«ملك الآلات»؟",
        "qTr": "Hangi enstrümana 'Enstrümanların Kralı' denir?",
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
        "optionsTr": [
          "Org",
          "Piyano",
          "Gitar",
          "Keman"
        ],
        "correct": 0
      },
      {
        "q": "How many beats are in each bar of 4/4 time?",
        "qAr": "كم عدد النبضات في كل ميزان من 4/4؟",
        "qTr": "4/4'lük ölçüde her bar kaç vuruştur?",
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
        "optionsTr": [
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
        "qTr": "Hangi enstrüman üst kenardan üfleyerek çalınır?",
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
        "optionsTr": [
          "Flüt",
          "Trompet",
          "Klarnet",
          "Saksafon"
        ],
        "correct": 0
      },
      {
        "q": "Who composed 'The Four Seasons' violin concertos?",
        "qAr": "من ألف كونشيرتوهات الكمان «الفصول الأربعة»؟",
        "qTr": "'Dört Mevsim' keman konçertolarını kim besteledi?",
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
        "optionsTr": [
          "Vivaldi",
          "Mozart",
          "Bach",
          "Beethoven"
        ],
        "correct": 0
      },
      {
        "q": "Which streaming service uses a green logo with a note symbol?",
        "qAr": "أي خدمة بث موسيقي تستخدم شعاراً أخضر عليه نوتة موسيقية؟",
        "qTr": "Hangi müzik akış servisi notalı yeşil bir logo kullanır?",
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
        "optionsTr": [
          "Spotify",
          "SoundCloud",
          "Deezer",
          "YouTube Music"
        ],
        "correct": 0
      },
      {
        "q": "How many keys does a standard piano have?",
        "qAr": "كم عدد مفاتيح البيانو القياسي؟",
        "qTr": "Standart bir piyanoda kaç tuş vardır?",
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
        "optionsTr": [
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
    "nameTr": "Coğrafya",
    "emoji": "🌍",
    "color": "from-green-500 to-emerald-600",
    "questions": [
      {
        "q": "What is the capital of Egypt?",
        "qAr": "ما هي عاصمة مصر؟",
        "qTr": "Mısır'ın başkenti neresidir?",
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
        "optionsTr": [
          "Kahire",
          "İskenderiye",
          "Gize",
          "Lüksor"
        ],
        "correct": 0
      },
      {
        "q": "Which is the most populous Arab country?",
        "qAr": "ما هي الدولة العربية الأكثر سكاناً؟",
        "qTr": "En kalabalık Arap ülkesi hangisidir?",
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
        "optionsTr": [
          "Mısır",
          "Suudi Arabistan",
          "Irak",
          "Cezayir"
        ],
        "correct": 0
      },
      {
        "q": "The Nile River flows into which sea?",
        "qAr": "نهر النيل يصب في أي بحر؟",
        "qTr": "Nil Nehri hangi denize dökülür?",
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
        "optionsTr": [
          "Akdeniz",
          "Kızıldeniz",
          "Arap Denizi",
          "Karadeniz"
        ],
        "correct": 0
      },
      {
        "q": "What is the capital of the United Arab Emirates?",
        "qAr": "ما هي عاصمة الإمارات العربية المتحدة؟",
        "qTr": "Birleşik Arap Emirlikleri'nin başkenti neresidir?",
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
        "optionsTr": [
          "Abu Dabi",
          "Dubai",
          "Şarika",
          "El-Ayn"
        ],
        "correct": 0
      },
      {
        "q": "What is commonly considered the longest river in the world?",
        "qAr": "ما هو النهر الذي يُعتبر عموماً الأطول في العالم؟",
        "qTr": "Genellikle dünyanın en uzun nehri sayılan nehir hangisidir?",
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
        "optionsTr": [
          "Nil",
          "Amazon",
          "Yangtze",
          "Mississippi"
        ],
        "correct": 0
      },
      {
        "q": "Mount Everest lies on the border of Nepal and which country?",
        "qAr": "يقع جبل إيفرست على حدود نيبال مع أي دولة؟",
        "qTr": "Everest Dağı, Nepal ile hangi ülkenin sınırında yer alır?",
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
        "optionsTr": [
          "Çin",
          "Hindistan",
          "Butan",
          "Pakistan"
        ],
        "correct": 0
      },
      {
        "q": "Which sea separates the Arabian Peninsula from Iran?",
        "qAr": "أي بحر يفصل شبه الجزيرة العربية عن إيران؟",
        "qTr": "Hangi deniz Arap Yarımadası'nı İran'dan ayırır?",
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
        "optionsTr": [
          "Basra Körfezi",
          "Kızıldeniz",
          "Umman Körfezi",
          "Aden Körfezi"
        ],
        "correct": 0
      },
      {
        "q": "What is the largest Arab country by area?",
        "qAr": "ما هي أكبر دولة عربية من حيث المساحة؟",
        "qTr": "Yüzölçümü en büyük Arap ülkesi hangisidir?",
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
        "optionsTr": [
          "Cezayir",
          "Suudi Arabistan",
          "Sudan",
          "Libya"
        ],
        "correct": 0
      },
      {
        "q": "Which vast desert covers much of the Arabian Peninsula?",
        "qAr": "ما هي الصحراء الشاسعة التي تغطي معظم شبه الجزيرة العربية؟",
        "qTr": "Hangi geniş çöl Arap Yarımadası'nın büyük bölümünü kaplar?",
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
        "optionsTr": [
          "Rubülhali",
          "Sahra Çölü",
          "Thar Çölü",
          "Karakum"
        ],
        "correct": 0
      },
      {
        "q": "Which sea lies between Egypt and Saudi Arabia?",
        "qAr": "أي بحر يقع بين مصر والسعودية؟",
        "qTr": "Hangi deniz Mısır ile Suudi Arabistan arasında yer alır?",
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
        "optionsTr": [
          "Kızıldeniz",
          "Akdeniz",
          "Hazar Denizi",
          "Ege Denizi"
        ],
        "correct": 0
      },
      {
        "q": "What is the capital of Morocco?",
        "qAr": "ما هي عاصمة المغرب؟",
        "qTr": "Fas'ın başkenti neresidir?",
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
        "optionsTr": [
          "Rabat",
          "Kazablanka",
          "Marakeş",
          "Tunus"
        ],
        "correct": 0
      },
      {
        "q": "Which Arab country touches both the Mediterranean and the Atlantic?",
        "qAr": "أي دولة عربية تطل على البحر المتوسط والمحيط الأطلسي معاً؟",
        "qTr": "Hangi Arap ülkesinin hem Akdeniz'e hem Atlantik'e kıyısı vardır?",
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
        "optionsTr": [
          "Fas",
          "Tunus",
          "Cezayir",
          "Libya"
        ],
        "correct": 0
      },
      {
        "q": "Which Saudi city is the holiest city in Islam?",
        "qAr": "ما هي المدينة السعودية الأقدس في الإسلام؟",
        "qTr": "Hangi Suudi şehri İslam'ın en kutsal şehridir?",
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
        "optionsTr": [
          "Mekke",
          "Medine",
          "Riyad",
          "Cidde"
        ],
        "correct": 0
      },
      {
        "q": "What is the capital of Turkey?",
        "qAr": "ما هي عاصمة تركيا؟",
        "qTr": "Türkiye'nin başkenti neresidir?",
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
        "optionsTr": [
          "Ankara",
          "İstanbul",
          "İzmir",
          "Bursa"
        ],
        "correct": 0
      },
      {
        "q": "Which river runs through Baghdad?",
        "qAr": "أي نهر يمر عبر بغداد؟",
        "qTr": "Bağdat'tan hangi nehir geçer?",
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
        "optionsTr": [
          "Dicle",
          "Fırat",
          "Nil",
          "Ürdün"
        ],
        "correct": 0
      },
      {
        "q": "Which is the largest island in the Arab world?",
        "qAr": "ما هي أكبر جزيرة في الوطن العربي؟",
        "qTr": "Arap dünyasının en büyük adası hangisidir?",
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
        "optionsTr": [
          "Sokotra",
          "Bahreyn",
          "Keşm",
          "Aruad"
        ],
        "correct": 0
      }
    ]
  },
  "tech": {
    "name": "Tech & Internet",
    "nameAr": "التقنية والإنترنت",
    "nameTr": "Teknoloji ve İnternet",
    "emoji": "💻",
    "color": "from-sky-500 to-cyan-600",
    "questions": [
      {
        "q": "Which company makes the iPhone?",
        "qAr": "أي شركة تصنع هاتف آيفون؟",
        "qTr": "iPhone'u hangi şirket üretir?",
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
        "optionsTr": [
          "Apple",
          "Samsung",
          "Google",
          "Microsoft"
        ],
        "correct": 0
      },
      {
        "q": "What does 'HTTP' stand for?",
        "qAr": "ماذا يعني اختصار HTTP؟",
        "qTr": "'HTTP' açılımı nedir?",
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
        "optionsTr": [
          "Köprü Metni Aktarım Protokolü",
          "Yüksek Teknoloji Aktarım Protokolü",
          "Metin Aktarım Protokolü",
          "Aktarım Protokolü"
        ],
        "correct": 0
      },
      {
        "q": "Who founded Microsoft together with Paul Allen?",
        "qAr": "من أسس مايكروسوفت مع بول ألن؟",
        "qTr": "Microsoft'u Paul Allen ile birlikte kim kurdu?",
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
        "optionsTr": [
          "Bill Gates",
          "Steve Jobs",
          "Mark Zuckerberg",
          "Elon Musk"
        ],
        "correct": 0
      },
      {
        "q": "What is the most used search engine in the world?",
        "qAr": "ما هو محرك البحث الأكثر استخداماً في العالم؟",
        "qTr": "Dünyada en çok kullanılan arama motoru hangisidir?",
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
        "optionsTr": [
          "Google",
          "Bing",
          "Yahoo",
          "DuckDuckGo"
        ],
        "correct": 0
      },
      {
        "q": "What does 'AI' stand for?",
        "qAr": "ماذا يعني اختصار AI؟",
        "qTr": "'AI' açılımı nedir?",
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
        "optionsTr": [
          "Yapay Zeka",
          "Otomatik İnternet",
          "Uygulamalı Bilgi",
          "Gelişmiş Arayüz"
        ],
        "correct": 0
      },
      {
        "q": "Which language is used to style web pages?",
        "qAr": "ما هي اللغة المستخدمة في تنسيق صفحات الويب؟",
        "qTr": "Web sayfalarını biçimlendirmek için hangi dil kullanılır?",
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
        "optionsTr": [
          "CSS",
          "HTML",
          "Python",
          "Java"
        ],
        "correct": 0
      },
      {
        "q": "What does the 'www' at the start of web addresses stand for?",
        "qAr": "ماذا يعني اختصار www في بداية عناوين الويب؟",
        "qTr": "Web adreslerinin başındaki 'www' ne anlama gelir?",
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
        "optionsTr": [
          "World Wide Web",
          "Geniş Web",
          "Geniş Web Dünyası",
          "Kablosuz Site"
        ],
        "correct": 0
      },
      {
        "q": "Which app is famous for short vertical videos with music?",
        "qAr": "ما هو التطبيق الشهير بالفيديوهات العمودية القصيرة مع الموسيقى؟",
        "qTr": "Hangi uygulama müzikli kısa dikey videolarla ünlüdür?",
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
        "optionsTr": [
          "TikTok",
          "Facebook",
          "LinkedIn",
          "X"
        ],
        "correct": 0
      },
      {
        "q": "What does the term 'bit' in computing stand for?",
        "qAr": "ماذا يعني مصطلح «بت» في الحوسبة؟",
        "qTr": "Bilgisayarda 'bit' terimi ne anlama gelir?",
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
        "optionsTr": [
          "Binary digit",
          "Bilgi byte'ı",
          "Temel giriş",
          "Binary ton"
        ],
        "correct": 0
      },
      {
        "q": "Which device has a 'QWERTY' layout?",
        "qAr": "أي جهاز يحتوي على توزيع مفاتيح QWERTY؟",
        "qTr": "Hangi cihaz 'QWERTY' düzenine sahiptir?",
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
        "optionsTr": [
          "Klavye",
          "Fare",
          "Ekran",
          "Modem"
        ],
        "correct": 0
      },
      {
        "q": "Which company develops the Android operating system?",
        "qAr": "أي شركة تطوّر نظام أندرويد؟",
        "qTr": "Android işletim sistemini hangi şirket geliştirir?",
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
        "optionsTr": [
          "Google",
          "Apple",
          "Microsoft",
          "Samsung"
        ],
        "correct": 0
      },
      {
        "q": "What does 'USB' stand for?",
        "qAr": "ماذا يعني اختصار USB؟",
        "qTr": "'USB' açılımı nedir?",
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
        "optionsTr": [
          "Evrensel Seri Veriyolu",
          "Birleşik Seri Köprü",
          "Evrensel Seri Sistem",
          "Birleşik Seri Depolama"
        ],
        "correct": 0
      },
      {
        "q": "Which search engine is famous for its changing 'doodles'?",
        "qAr": "ما هو محرك البحث الشهير برسوماته المتغيرة على صفحته الرئيسية؟",
        "qTr": "Hangi arama motoru değişen 'doodle'larıyla ünlüdür?",
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
        "optionsTr": [
          "Google",
          "Yahoo",
          "Ask",
          "Bing"
        ],
        "correct": 0
      }
    ]
  },
  "islam": {
    "name": "Islam & Arab World",
    "nameAr": "الإسلام والعالم العربي",
    "nameTr": "İslam ve Arap Dünyası",
    "emoji": "🕌",
    "color": "from-emerald-500 to-teal-700",
    "questions": [
      {
        "q": "How many pillars does Islam have?",
        "qAr": "كم عدد أركان الإسلام؟",
        "qTr": "İslam'ın kaç şartı vardır?",
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
        "optionsTr": [
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
        "qTr": "Kutsal oruç ayı hangisidir?",
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
        "optionsTr": [
          "Ramazan",
          "Şevval",
          "Muharrem",
          "Recep"
        ],
        "correct": 0
      },
      {
        "q": "Towards which city do Muslims face when praying?",
        "qAr": "إلى أي مدينة يتجه المسلمون أثناء الصلاة؟",
        "qTr": "Müslümanlar namaz kılarken hangi şehre yönelir?",
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
        "optionsTr": [
          "Mekke",
          "Medine",
          "Kudüs",
          "Kahire"
        ],
        "correct": 0
      },
      {
        "q": "What is the holy book of Islam?",
        "qAr": "ما هو الكتاب المقدس في الإسلام؟",
        "qTr": "İslam'ın kutsal kitabı hangisidir?",
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
        "optionsTr": [
          "Kur'an-ı Kerim",
          "Tevrat",
          "İncil",
          "Talmud"
        ],
        "correct": 0
      },
      {
        "q": "How many daily prayers are required in Islam?",
        "qAr": "كم عدد الصلوات اليومية في الإسلام؟",
        "qTr": "İslam'da günde kaç vakit namaz farzdır?",
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
        "optionsTr": [
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
        "qTr": "Hz. Muhammed (s.a.v.)'e vahyi hangi melek getirdi?",
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
        "optionsTr": [
          "Cebrail",
          "Mikail",
          "İsrafil",
          "Azrail"
        ],
        "correct": 0
      },
      {
        "q": "What is the annual pilgrimage to Mecca called?",
        "qAr": "ما اسم الرحلة السنوية إلى مكة المكرمة؟",
        "qTr": "Mekke'ye yapılan yıllık hacca ne denir?",
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
        "optionsTr": [
          "Hac",
          "Umre",
          "Hicret",
          "Zekat"
        ],
        "correct": 0
      },
      {
        "q": "Which is the second holiest city in Islam?",
        "qAr": "ما هي ثاني أقدس مدينة في الإسلام؟",
        "qTr": "İslam'ın ikinci en kutsal şehri hangisidir?",
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
        "optionsTr": [
          "Medine",
          "Mekke",
          "Kudüs",
          "Kerbela"
        ],
        "correct": 0
      },
      {
        "q": "Who is the final prophet and messenger in Islam?",
        "qAr": "من هو خاتم الأنبياء والمرسلين في الإسلام؟",
        "qTr": "İslam'ın son peygamberi ve elçisi kimdir?",
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
        "optionsTr": [
          "Hz. Muhammed (s.a.v.)",
          "Hz. İsa",
          "Hz. Musa",
          "Hz. İbrahim"
        ],
        "correct": 0
      },
      {
        "q": "What is the obligatory yearly charity in Islam?",
        "qAr": "ما هي الصدقة الواجبة سنوياً في الإسلام؟",
        "qTr": "İslam'da yıllık zorunlu hayır hangisidir?",
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
        "optionsTr": [
          "Zekat",
          "Sadaka",
          "Fıtır",
          "Riba"
        ],
        "correct": 0
      },
      {
        "q": "Where is the Prophet's Mosque (Al-Masjid an-Nabawi)?",
        "qAr": "أين يقع المسجد النبوي؟",
        "qTr": "Mescid-i Nebevi nerededir?",
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
        "optionsTr": [
          "Suudi Arabistan",
          "Mısır",
          "Filistin",
          "Ürdün"
        ],
        "correct": 0
      },
      {
        "q": "What is the Islamic greeting meaning 'peace be upon you'?",
        "qAr": "ما هي التحية الإسلامية التي تعني «السلام عليكم»؟",
        "qTr": "'Size selam olsun' anlamına gelen İslami selam nedir?",
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
        "optionsTr": [
          "Esselamu aleyküm",
          "Bismillah",
          "Elhamdülillah",
          "Maşallah"
        ],
        "correct": 0
      },
      {
        "q": "How many surahs are in the Quran?",
        "qAr": "كم عدد سور القرآن الكريم؟",
        "qTr": "Kur'an'da kaç sure vardır?",
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
        "optionsTr": [
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
        "qTr": "Hangisi İslam'ın beş şartından biri DEĞİLDİR?",
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
        "optionsTr": [
          "Kur'an okumak",
          "Namaz",
          "Zekat",
          "Oruç"
        ],
        "correct": 0
      },
      {
        "q": "Which prophet built the Kaaba together with his son Ismail?",
        "qAr": "أي نبي بنى الكعبة مع ابنه إسماعيل؟",
        "qTr": "Hangi peygamber oğlu İsmail ile birlikte Kabe'yi inşa etti?",
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
        "optionsTr": [
          "Hz. İbrahim",
          "Hz. Nuh",
          "Hz. Yusuf",
          "Hz. Davud"
        ],
        "correct": 0
      },
      {
        "q": "During which month does the Hajj take place?",
        "qAr": "في أي شهر يتم الحج؟",
        "qTr": "Hac hangi ayda yapılır?",
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
        "optionsTr": [
          "Zilhicce",
          "Ramazan",
          "Şevval",
          "Safer"
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
        ws.send(JSON.stringify({ type: 'error', message: 'Room not found', messageAr: 'الغرفة غير موجودة', messageTr: 'Oda bulunamadı' }));
        return;
      }
      if (room.phase !== 'lobby') {
        ws.send(JSON.stringify({ type: 'error', message: 'Game already in progress', messageAr: 'اللعبة قيد التقدم بالفعل', messageTr: 'Oyun zaten devam ediyor' }));
        return;
      }
      const name = (msg.name || '').trim().substring(0, 12);
      if (!name) {
        ws.send(JSON.stringify({ type: 'error', message: 'Name required', messageAr: 'الاسم مطلوب', messageTr: 'İsim gerekli' }));
        return;
      }
      if (room.players.find(p => p.name === name)) {
        ws.send(JSON.stringify({ type: 'error', message: 'Name already taken', messageAr: 'الاسم مستخدم بالفعل', messageTr: 'Bu isim zaten alınmış' }));
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
          q: q.q, qAr: q.qAr || q.q, qTr: q.qTr || q.q, options: q.options, optionsAr: q.optionsAr || q.options, optionsTr: q.optionsTr || q.options, category: q.category,
          roundNum: room.questions.indexOf(q) + 1
        })),
        totalQuestions: room.questions.length,
        currentQuestion: {
          q: q.q, qAr: q.qAr || q.q, qTr: q.qTr || q.q, options: q.options, optionsAr: q.optionsAr || q.options, optionsTr: q.optionsTr || q.options, category: q.category,
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
        broadcastAll(room, { type: 'powerup_used', player: pname, powerup: 'freeze', message: `${pname} froze the timer! ❄️`, messageAr: `${pname} جمّد المؤقت! ❄️`, messageTr: `${pname} sayacı dondurdu! ❄️` });
        setTimeout(() => {
          if (room.phase === 'playing') startTimer(room);
        }, 5000);
      } else if (pu === 'double') {
        room.powerups[pname] = null;
        room.activeDoubles.add(pname);
        broadcastAll(room, { type: 'powerup_used', player: pname, powerup: 'double', message: `${pname} activated DOUBLE POINTS! ✨`, messageAr: `${pname} فعّل النقاط المضاعفة! ✨`, messageTr: `${pname} ÇİFT PUAN aktif etti! ✨` });
      } else if (pu === 'steal') {
        const ranked = Object.entries(room.scores).sort((a, b) => b[1] - a[1]);
        const victim = ranked.find(([n, s]) => n !== pname && s > 0);
        if (victim) {
          const stealAmount = Math.min(50, victim[1]);
          room.scores[victim[0]] -= stealAmount;
          room.scores[pname] += stealAmount;
          room.powerups[pname] = null;
          broadcastAll(room, { type: 'powerup_used', player: pname, powerup: 'steal', message: `${pname} stole ${stealAmount} pts from ${victim[0]}! 🦊`, messageAr: `${pname} سرق ${stealAmount} نقطة من ${victim[0]}! 🦊`, messageTr: `${pname}, ${victim[0]}'den ${stealAmount} puan çaldı! 🦊`, scores: room.scores, victim: victim[0], amount: stealAmount });
        } else {
          ws.send(JSON.stringify({ type: 'powerup_failed', message: 'No one to steal from!', messageAr: 'لا يوجد من تسرق منه النقاط!', messageTr: 'Çalacak kimse yok!' }));
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
      if (!room || !ws.isHost) return;
      if (room.phase !== 'playing' && room.phase !== 'reveal') return;
      if (room.skipLock) return;
      room.skipLock = true;
      clearTimeout(room.skipUnlock);
      room.skipUnlock = setTimeout(() => { room.skipLock = false; }, 600);
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
      q: q.q, qAr: q.qAr || q.q, qTr: q.qTr || q.q, options: q.options, optionsAr: q.optionsAr || q.options, optionsTr: q.optionsTr || q.options, category: q.category,
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
