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
  general: {
    name: 'General Knowledge', emoji: '🧠', color: 'from-violet-500 to-purple-600',
    questions: [
      { q: "What is the capital of France?", options: ["London", "Berlin", "Paris", "Madrid"], correct: 2 },
      { q: "Which planet is known as the Red Planet?", options: ["Venus", "Mars", "Jupiter", "Saturn"], correct: 1 },
      { q: "What is the largest ocean on Earth?", options: ["Atlantic", "Indian", "Arctic", "Pacific"], correct: 3 },
      { q: "How many continents are there?", options: ["5", "6", "7", "8"], correct: 2 },
      { q: "What is the chemical symbol for gold?", options: ["Go", "Gd", "Au", "Ag"], correct: 2 },
      { q: "Who painted the Mona Lisa?", options: ["Van Gogh", "Picasso", "Da Vinci", "Michelangelo"], correct: 2 },
      { q: "What is the tallest mountain in the world?", options: ["K2", "Kangchenjunga", "Mount Everest", "Lhotse"], correct: 2 },
      { q: "In which year did the Titanic sink?", options: ["1905", "1912", "1918", "1923"], correct: 1 },
      { q: "What is the smallest country in the world?", options: ["Monaco", "Vatican City", "San Marino", "Liechtenstein"], correct: 1 },
      { q: "Which element has the atomic number 1?", options: ["Helium", "Oxygen", "Hydrogen", "Carbon"], correct: 2 },
      { q: "Which country gifted the Statue of Liberty to the United States?", options: ["France", "England", "Spain", "Italy"], correct: 0 },
      { q: "What is the currency of Japan?", options: ["Won", "Yen", "Yuan", "Ringgit"], correct: 1 },
      { q: "Which musical instrument has 88 keys?", options: ["Guitar", "Piano", "Violin", "Trumpet"], correct: 1 },
      { q: "In which country is the Taj Mahal located?", options: ["Pakistan", "India", "Bangladesh", "Nepal"], correct: 1 },
      { q: "What is the largest hot desert in the world?", options: ["Sahara", "Gobi", "Kalahari", "Atacama"], correct: 0 },
      { q: "In which city is the Burj Khalifa located?", options: ["Dubai", "Doha", "Riyadh", "Kuwait City"], correct: 0 },
      { q: "Which language is the most spoken in the world by native speakers?", options: ["English", "Spanish", "Mandarin Chinese", "Hindi"], correct: 2 },
      { q: "Which vitamin does sunlight help the body produce?", options: ["Vitamin A", "Vitamin B", "Vitamin C", "Vitamin D"], correct: 3 },
      { q: "How many days are in a leap year?", options: ["364", "365", "366", "367"], correct: 2 },
      { q: "Which animal is called the 'Ship of the Desert'?", options: ["Horse", "Camel", "Donkey", "Elephant"], correct: 1 },
      { q: "What is the largest mammal on Earth?", options: ["Elephant", "Blue Whale", "Giraffe", "Hippopotamus"], correct: 1 },
      { q: "What color results from mixing red and yellow?", options: ["Green", "Orange", "Purple", "Brown"], correct: 1 },
      { q: "Which organ pumps blood around the body?", options: ["Lungs", "Heart", "Kidney", "Brain"], correct: 1 },
      { q: "Which planet is often called the Evening Star?", options: ["Venus", "Mars", "Mercury", "Jupiter"], correct: 0 },
      { q: "How many months in a year have 28 days?", options: ["1", "6", "12", "28"], correct: 2 },
      { q: "Who invented the World Wide Web?", options: ["Bill Gates", "Tim Berners-Lee", "Steve Jobs", "Mark Zuckerberg"], correct: 1 },
    ]
  },
  movies: {
    name: 'Movies & TV', emoji: '🎬', color: 'from-rose-500 to-pink-600',
    questions: [
      { q: "Who directed the movie Titanic?", options: ["Steven Spielberg", "James Cameron", "Christopher Nolan", "Ridley Scott"], correct: 1 },
      { q: "What is the fictional African country in Black Panther?", options: ["Zamunda", "Wakanda", "Genovia", "Latveria"], correct: 1 },
      { q: "Which movie features the quote 'I'll be back'?", options: ["Predator", "Terminator", "Aliens", "RoboCop"], correct: 1 },
      { q: "In The Matrix, what color pill does Neo take?", options: ["Blue", "Red", "Green", "Yellow"], correct: 1 },
      { q: "Who played Iron Man in the MCU?", options: ["Chris Evans", "Chris Hemsworth", "Robert Downey Jr.", "Mark Ruffalo"], correct: 2 },
      { q: "What year was the first Star Wars movie released?", options: ["1975", "1977", "1979", "1980"], correct: 1 },
      { q: "Which animated film features a character named Simba?", options: ["Aladdin", "The Lion King", "Frozen", "Moana"], correct: 1 },
      { q: "Who directed Inception?", options: ["Denis Villeneuve", "Christopher Nolan", "David Fincher", "Quentin Tarantino"], correct: 1 },
      { q: "What is the highest-grossing film of all time?", options: ["Titanic", "Avatar", "Avengers: Endgame", "Star Wars: TFA"], correct: 1 },
      { q: "In Harry Potter, what house does Harry belong to?", options: ["Slytherin", "Hufflepuff", "Ravenclaw", "Gryffindor"], correct: 3 },
      { q: "Which actor played Jack Sparrow in Pirates of the Caribbean?", options: ["Johnny Depp", "Brad Pitt", "Leonardo DiCaprio", "Tom Cruise"], correct: 0 },
      { q: "What is the name of the wizarding school in Harry Potter?", options: ["Beauxbatons", "Hogwarts", "Durmstrang", "Ilvermorny"], correct: 1 },
      { q: "Who won the Oscar for Best Actor as the Joker in 2019?", options: ["Joaquin Phoenix", "Jared Leto", "Heath Ledger", "Jack Nicholson"], correct: 0 },
      { q: "Which Toy Story spaceman says 'To infinity and beyond!'?", options: ["Buzz Lightyear", "Woody", "Rex", "Hamm"], correct: 0 },
      { q: "Which animated film features the sisters Anna and Elsa?", options: ["Frozen", "Moana", "Tangled", "Encanto"], correct: 0 },
      { q: "Who directed the movie 'Avatar'?", options: ["James Cameron", "Steven Spielberg", "Peter Jackson", "Michael Bay"], correct: 0 },
      { q: "Which 1977 space film introduced 'The Force'?", options: ["Star Wars", "Star Trek", "Alien", "Flash Gordon"], correct: 0 },
      { q: "Which movie stars Tom Hanks as a castaway named Chuck?", options: ["Cast Away", "Forrest Gump", "The Terminal", "Philadelphia"], correct: 0 },
      { q: "Which Japanese studio made 'Spirited Away'?", options: ["Studio Ghibli", "Toei", "Sunrise", "Madhouse"], correct: 0 },
      { q: "Which 2008 superhero film introduced Iron Man to the big screen?", options: ["Iron Man", "The Dark Knight", "Man of Steel", "Superman Returns"], correct: 0 },
    ]
  },
  sports: {
    name: 'Sports', emoji: '⚽', color: 'from-emerald-500 to-teal-600',
    questions: [
      { q: "How many players on a soccer team on the field?", options: ["9", "10", "11", "12"], correct: 2 },
      { q: "Which country won the 2022 FIFA World Cup?", options: ["France", "Brazil", "Argentina", "Germany"], correct: 2 },
      { q: "How many points is a basketball free throw worth?", options: ["1", "2", "3", "4"], correct: 0 },
      { q: "What sport is played at Wimbledon?", options: ["Golf", "Tennis", "Cricket", "Rugby"], correct: 1 },
      { q: "How many Grand Slam tennis tournaments per year?", options: ["3", "4", "5", "6"], correct: 1 },
      { q: "Which athlete has the most Olympic gold medals?", options: ["Usain Bolt", "Michael Phelps", "Carl Lewis", "Simone Biles"], correct: 1 },
      { q: "How many points is a touchdown in American football?", options: ["3", "6", "7", "8"], correct: 1 },
      { q: "What is the diameter of a basketball hoop in inches?", options: ["16", "18", "20", "22"], correct: 1 },
      { q: "Which country invented cricket?", options: ["Australia", "India", "England", "South Africa"], correct: 2 },
      { q: "How long is a marathon in km?", options: ["21", "32", "42", "50"], correct: 2 },
      { q: "Which country hosted the 2022 FIFA World Cup?", options: ["Qatar", "Russia", "Brazil", "United Arab Emirates"], correct: 0 },
      { q: "Which Egyptian footballer is nicknamed the 'Egyptian King'?", options: ["Mohamed Salah", "Mohamed Aboutrika", "Trezeguet", "Essam El Hadary"], correct: 0 },
      { q: "How many players are on a basketball team on the court?", options: ["4", "5", "6", "7"], correct: 1 },
      { q: "In which sport would you use a shuttlecock?", options: ["Badminton", "Tennis", "Squash", "Table Tennis"], correct: 0 },
      { q: "Which country has won the most FIFA World Cups?", options: ["Germany", "Brazil", "Italy", "Argentina"], correct: 1 },
      { q: "What is the maximum score possible with a single dart?", options: ["50", "60", "100", "180"], correct: 2 },
      { q: "How many players are on a cricket team?", options: ["9", "10", "11", "12"], correct: 2 },
      { q: "What is the traditional national sport of Japan?", options: ["Sumo Wrestling", "Karate", "Baseball", "Judo"], correct: 0 },
      { q: "Which football club is the biggest and most successful in Egypt?", options: ["Al Ahly", "Zamalek", "Ismaily", "Pyramids FC"], correct: 0 },
      { q: "Which sport is known around the world as 'the beautiful game'?", options: ["Football", "Basketball", "Tennis", "Rugby"], correct: 0 },
    ]
  },
  science: {
    name: 'Science', emoji: '🔬', color: 'from-cyan-500 to-blue-600',
    questions: [
      { q: "What is the chemical formula for water?", options: ["CO2", "H2O", "O2", "NaCl"], correct: 1 },
      { q: "How many bones in the adult human body?", options: ["186", "206", "226", "256"], correct: 1 },
      { q: "What planet is closest to the Sun?", options: ["Venus", "Earth", "Mercury", "Mars"], correct: 2 },
      { q: "What force keeps us on the ground?", options: ["Magnetism", "Friction", "Gravity", "Inertia"], correct: 2 },
      { q: "What is the powerhouse of the cell?", options: ["Nucleus", "Ribosome", "Mitochondria", "Golgi apparatus"], correct: 2 },
      { q: "What gas do plants absorb from the atmosphere?", options: ["Oxygen", "Nitrogen", "Carbon Dioxide", "Hydrogen"], correct: 2 },
      { q: "Approx speed of light in km/s?", options: ["150,000", "300,000", "450,000", "600,000"], correct: 1 },
      { q: "Who proposed the theory of relativity?", options: ["Newton", "Einstein", "Hawking", "Tesla"], correct: 1 },
      { q: "What is the hardest natural substance on Earth?", options: ["Gold", "Iron", "Diamond", "Platinum"], correct: 2 },
      { q: "How many elements in the periodic table?", options: ["92", "108", "118", "130"], correct: 2 },
      { q: "Which Muslim scholar is known as the 'Father of Algebra'?", options: ["Al-Khwarizmi", "Ibn Sina", "Al-Razi", "Omar Khayyam"], correct: 0 },
      { q: "Which scientist formulated the three laws of motion?", options: ["Isaac Newton", "Albert Einstein", "Galileo Galilei", "Nikola Tesla"], correct: 0 },
      { q: "Which gas makes up about 78% of Earth's atmosphere?", options: ["Oxygen", "Carbon Dioxide", "Nitrogen", "Hydrogen"], correct: 2 },
      { q: "What is the study of weather called?", options: ["Geology", "Meteorology", "Astronomy", "Ecology"], correct: 1 },
      { q: "Which metal is liquid at room temperature?", options: ["Mercury", "Aluminium", "Iron", "Copper"], correct: 0 },
      { q: "Who was the first scientist to use a telescope to observe the stars?", options: ["Galileo Galilei", "Isaac Newton", "Copernicus", "Kepler"], correct: 0 },
      { q: "What is the unit used to measure electric current?", options: ["Volt", "Watt", "Ampere", "Ohm"], correct: 2 },
      { q: "Which Arab scholar is considered the 'father of optics' for his work on light and vision?", options: ["Ibn al-Haytham", "Al-Khwarizmi", "Ibn Khaldun", "Al-Farabi"], correct: 0 },
      { q: "What does DNA stand for?", options: ["Deoxyribonucleic Acid", "Dinucleotide Acid", "Deoxyribose Nucleic", "Dual Nitrogen Acid"], correct: 0 },
      { q: "What is the approximate speed of sound in air?", options: ["343 m/s", "150 m/s", "800 m/s", "1000 m/s"], correct: 0 },
    ]
  },
  history: {
    name: 'History', emoji: '🏛️', color: 'from-amber-500 to-orange-600',
    questions: [
      { q: "In which year did World War II end?", options: ["1943", "1944", "1945", "1946"], correct: 2 },
      { q: "Who was the first President of the United States?", options: ["Jefferson", "Washington", "Lincoln", "Adams"], correct: 1 },
      { q: "How many hills was Rome built on?", options: ["5", "6", "7", "8"], correct: 2 },
      { q: "Which civilization built the pyramids of Giza?", options: ["Mayans", "Romans", "Egyptians", "Greeks"], correct: 2 },
      { q: "In which year did the Berlin Wall fall?", options: ["1987", "1989", "1991", "1993"], correct: 1 },
      { q: "Which empire was ruled by Genghis Khan?", options: ["Roman", "Ottoman", "Mongol", "Persian"], correct: 2 },
      { q: "Which city was the center of the Islamic Golden Age?", options: ["Baghdad", "Rome", "Athens", "Constantinople"], correct: 0 },
      { q: "Who was the first caliph after Prophet Muhammad ﷺ?", options: ["Abu Bakr", "Umar", "Uthman", "Ali"], correct: 0 },
      { q: "In which year did the Ottoman Empire officially come to an end?", options: ["1918", "1922", "1924", "1928"], correct: 1 },
      { q: "Who led the Muslim armies against the Crusaders and is known in the West as 'Saladin'?", options: ["Salah ad-Din", "Omar Mukhtar", "Khalid ibn al-Walid", "Tariq ibn Ziyad"], correct: 0 },
      { q: "The Great Pyramid of Giza was built as a tomb for which pharaoh?", options: ["Cleopatra", "Khufu", "Ramses II", "Tutankhamun"], correct: 1 },
      { q: "In which year did the United Arab Emirates gain independence?", options: ["1968", "1971", "1975", "1980"], correct: 1 },
      { q: "Gibraltar (Jabal Tariq) is named after which Muslim general?", options: ["Tariq ibn Ziyad", "Khalid ibn al-Walid", "Amr ibn al-As", "Sa'd ibn Abi Waqqas"], correct: 0 },
      { q: "What was the writing system used by the ancient Egyptians?", options: ["Hieroglyphics", "Cuneiform", "Latin", "Sanskrit"], correct: 0 },
      { q: "Which country was formerly known as Persia?", options: ["Iran", "Iraq", "Turkey", "Afghanistan"], correct: 0 },
      { q: "The Suez Canal connects the Mediterranean with which sea?", options: ["The Red Sea", "The Black Sea", "The Caspian Sea", "The Arabian Sea"], correct: 0 },
      { q: "Who wrote 'Al-Muqaddimah', the founding work of sociology and historiography?", options: ["Ibn Khaldun", "Ibn Sina", "Al-Ghazali", "Al-Biruni"], correct: 0 },
    ]
  },
  family: {
    name: 'Family Fun', emoji: '👨‍👩‍👧‍👦', color: 'from-fuchsia-500 to-pink-500',
    questions: [
      { q: "What do you call a group of flamingos?", options: ["A flock", "A flamboyance", "A herd", "A pack"], correct: 1 },
      { q: "How many colors are in a rainbow?", options: ["5", "6", "7", "8"], correct: 2 },
      { q: "Most popular pizza topping in the US?", options: ["Mushrooms", "Pepperoni", "Sausage", "Olives"], correct: 1 },
      { q: "Which Disney princess has a raccoon sidekick?", options: ["Ariel", "Belle", "Pocahontas", "Mulan"], correct: 2 },
      { q: "What is the opposite of 'day'?", options: ["Dark", "Night", "Evening", "Sunset"], correct: 1 },
      { q: "How many sides does a hexagon have?", options: ["5", "6", "7", "8"], correct: 1 },
      { q: "What animal is the 'King of the Jungle'?", options: ["Tiger", "Elephant", "Lion", "Gorilla"], correct: 2 },
      { q: "Which fruit keeps the doctor away?", options: ["Banana", "Orange", "Apple", "Grape"], correct: 2 },
      { q: "What do bees collect to make honey?", options: ["Pollen", "Nectar", "Sap", "Dew"], correct: 1 },
      { q: "How many bottles of beer on the wall?", options: ["50", "99", "100", "101"], correct: 1 },
      { q: "What is the most widely eaten grain in the world?", options: ["Rice", "Wheat", "Corn", "Oats"], correct: 0 },
      { q: "Hummus and falafel are famous dishes of which region?", options: ["The Middle East", "Asia", "Europe", "Latin America"], correct: 0 },
      { q: "How many legs does a spider have?", options: ["6", "8", "10", "12"], correct: 1 },
      { q: "What is the national dish of Yemen?", options: ["Saltah", "Kabsa", "Couscous", "Biryani"], correct: 0 },
      { q: "Which sweet cheese dessert is famous in the Middle East during Ramadan?", options: ["Kunafa", "Tiramisu", "Cheesecake", "Pavlova"], correct: 0 },
      { q: "Which card game has kings, queens, and aces?", options: ["Playing Cards", "Dominoes", "Backgammon", "Chess"], correct: 0 },
      { q: "What is the fastest land animal?", options: ["Cheetah", "Lion", "Ostrich", "Antelope"], correct: 0 },
      { q: "How many colors are in a traffic light?", options: ["2", "3", "4", "5"], correct: 1 },
      { q: "Which fruit has the same name as a color?", options: ["Orange", "Apple", "Banana", "Mango"], correct: 0 },
      { q: "How many vowels are in the English alphabet?", options: ["4", "5", "6", "7"], correct: 1 },
    ]
  },
  music: {
    name: 'Music', emoji: '🎵', color: 'from-indigo-500 to-violet-600',
    questions: [
      { q: "How many strings does a violin have?", options: ["3", "4", "5", "6"], correct: 1 },
      { q: "Who is known as the 'King of Pop'?", options: ["Michael Jackson", "Elvis Presley", "Prince", "Freddie Mercury"], correct: 0 },
      { q: "Which legendary Egyptian singer is called 'Kawkab al-Sharq' (Star of the East)?", options: ["Umm Kulthum", "Fairuz", "Warda", "Samira Said"], correct: 0 },
      { q: "Which Lebanese icon sings 'Nassam Alayna El Hawa'?", options: ["Fairuz", "Nancy Ajram", "Elissa", "Majida El Roumi"], correct: 0 },
      { q: "What musical term means 'loud' in Italian?", options: ["Forte", "Piano", "Allegro", "Adagio"], correct: 0 },
      { q: "Which band performed 'Bohemian Rhapsody'?", options: ["Queen", "The Beatles", "Pink Floyd", "Led Zeppelin"], correct: 0 },
      { q: "How many semitones are in one octave?", options: ["8", "12", "7", "10"], correct: 1 },
      { q: "Which traditional Arab instrument is a pear-shaped stringed lute?", options: ["Oud", "Tabla", "Qanun", "Ney"], correct: 0 },
      { q: "Which instrument is famously called the 'King of Instruments'?", options: ["Organ", "Piano", "Guitar", "Violin"], correct: 0 },
      { q: "How many beats are in each bar of 4/4 time?", options: ["3", "4", "5", "6"], correct: 1 },
      { q: "Which instrument is played by blowing across the top edge?", options: ["Flute", "Trumpet", "Clarinet", "Saxophone"], correct: 0 },
      { q: "Who composed 'The Four Seasons' violin concertos?", options: ["Vivaldi", "Mozart", "Bach", "Beethoven"], correct: 0 },
      { q: "Which streaming service uses a green logo with a note symbol?", options: ["Spotify", "SoundCloud", "Deezer", "YouTube Music"], correct: 0 },
      { q: "How many keys does a standard piano have?", options: ["66", "76", "88", "108"], correct: 2 },
    ]
  },
  geography: {
    name: 'Geography', emoji: '🌍', color: 'from-green-500 to-emerald-600',
    questions: [
      { q: "What is the capital of Egypt?", options: ["Cairo", "Alexandria", "Giza", "Luxor"], correct: 0 },
      { q: "Which is the most populous Arab country?", options: ["Egypt", "Saudi Arabia", "Iraq", "Algeria"], correct: 0 },
      { q: "The Nile River flows into which sea?", options: ["Mediterranean Sea", "Red Sea", "Arabian Sea", "Black Sea"], correct: 0 },
      { q: "What is the capital of the United Arab Emirates?", options: ["Abu Dhabi", "Dubai", "Sharjah", "Al Ain"], correct: 0 },
      { q: "What is commonly considered the longest river in the world?", options: ["Nile", "Amazon", "Yangtze", "Mississippi"], correct: 0 },
      { q: "Mount Everest lies on the border of Nepal and which country?", options: ["China", "India", "Bhutan", "Pakistan"], correct: 0 },
      { q: "Which sea separates the Arabian Peninsula from Iran?", options: ["Arabian Gulf", "Red Sea", "Gulf of Oman", "Gulf of Aden"], correct: 0 },
      { q: "What is the largest Arab country by area?", options: ["Algeria", "Saudi Arabia", "Sudan", "Libya"], correct: 0 },
      { q: "Which vast desert covers much of the Arabian Peninsula?", options: ["Rub' al Khali", "Sahara", "Thar", "Karakum"], correct: 0 },
      { q: "Which sea lies between Egypt and Saudi Arabia?", options: ["Red Sea", "Mediterranean Sea", "Caspian Sea", "Aegean Sea"], correct: 0 },
      { q: "What is the capital of Morocco?", options: ["Rabat", "Casablanca", "Marrakesh", "Tunis"], correct: 0 },
      { q: "Which Arab country touches both the Mediterranean and the Atlantic?", options: ["Morocco", "Tunisia", "Algeria", "Libya"], correct: 0 },
      { q: "Which Saudi city is the holiest city in Islam?", options: ["Mecca", "Medina", "Riyadh", "Jeddah"], correct: 0 },
      { q: "What is the capital of Turkey?", options: ["Ankara", "Istanbul", "Izmir", "Bursa"], correct: 0 },
      { q: "Which river runs through Baghdad?", options: ["Tigris", "Euphrates", "Nile", "Jordan"], correct: 0 },
      { q: "Which is the largest island in the Arab world?", options: ["Socotra", "Bahrain", "Qeshm", "Arwad"], correct: 0 },
    ]
  },
  tech: {
    name: 'Tech & Internet', emoji: '💻', color: 'from-sky-500 to-cyan-600',
    questions: [
      { q: "Which company makes the iPhone?", options: ["Apple", "Samsung", "Google", "Microsoft"], correct: 0 },
      { q: "What does 'HTTP' stand for?", options: ["HyperText Transfer Protocol", "High Tech Transfer Protocol", "Hyperlink Text Transfer", "Host Transfer Protocol"], correct: 0 },
      { q: "Who founded Microsoft together with Paul Allen?", options: ["Bill Gates", "Steve Jobs", "Mark Zuckerberg", "Elon Musk"], correct: 0 },
      { q: "What is the most used search engine in the world?", options: ["Google", "Bing", "Yahoo", "DuckDuckGo"], correct: 0 },
      { q: "What does 'AI' stand for?", options: ["Artificial Intelligence", "Automated Internet", "Applied Information", "Advanced Interface"], correct: 0 },
      { q: "Which language is used to style web pages?", options: ["CSS", "HTML", "Python", "Java"], correct: 0 },
      { q: "What does the 'www' at the start of web addresses stand for?", options: ["World Wide Web", "Web Wide World", "World Web Wide", "Website Without Wires"], correct: 0 },
      { q: "Which app is famous for short vertical videos with music?", options: ["TikTok", "Facebook", "LinkedIn", "X"], correct: 0 },
      { q: "What does the term 'bit' in computing stand for?", options: ["Binary digit", "Byte of information", "Basic input", "Binary transfer"], correct: 0 },
      { q: "Which device has a 'QWERTY' layout?", options: ["Keyboard", "Mouse", "Monitor", "Router"], correct: 0 },
      { q: "Which company develops the Android operating system?", options: ["Google", "Apple", "Microsoft", "Samsung"], correct: 0 },
      { q: "What does 'USB' stand for?", options: ["Universal Serial Bus", "United Serial Bridge", "Universal System Bus", "Unified Serial Buffer"], correct: 0 },
      { q: "Which search engine is famous for its changing 'doodles'?", options: ["Google", "Yahoo", "Ask", "Bing"], correct: 0 },
    ]
  },
  islam: {
    name: 'Islam & Arab World', emoji: '🕌', color: 'from-emerald-500 to-teal-700',
    questions: [
      { q: "How many pillars does Islam have?", options: ["5", "4", "6", "7"], correct: 0 },
      { q: "Which month is the holy fasting month?", options: ["Ramadan", "Shawwal", "Muharram", "Rajab"], correct: 0 },
      { q: "Towards which city do Muslims face when praying?", options: ["Mecca", "Medina", "Jerusalem", "Cairo"], correct: 0 },
      { q: "What is the holy book of Islam?", options: ["The Quran", "The Torah", "The Gospel", "The Talmud"], correct: 0 },
      { q: "How many daily prayers are required in Islam?", options: ["5", "3", "7", "8"], correct: 0 },
      { q: "Which angel brought the revelation to Prophet Muhammad ﷺ?", options: ["Jibreel", "Mika'il", "Israfil", "Azrael"], correct: 0 },
      { q: "What is the annual pilgrimage to Mecca called?", options: ["Hajj", "Umrah", "Hijrah", "Zakat"], correct: 0 },
      { q: "Which is the second holiest city in Islam?", options: ["Medina", "Mecca", "Jerusalem", "Karbala"], correct: 0 },
      { q: "Who is the final prophet and messenger in Islam?", options: ["Muhammad ﷺ", "Isa", "Musa", "Ibrahim"], correct: 0 },
      { q: "What is the obligatory yearly charity in Islam?", options: ["Zakat", "Sadaqah", "Fitr", "Riba"], correct: 0 },
      { q: "Where is the Prophet's Mosque (Al-Masjid an-Nabawi)?", options: ["Saudi Arabia", "Egypt", "Palestine", "Jordan"], correct: 0 },
      { q: "What is the Islamic greeting meaning 'peace be upon you'?", options: ["Assalamu alaikum", "Bismillah", "Alhamdulillah", "Mashallah"], correct: 0 },
      { q: "How many surahs are in the Quran?", options: ["114", "100", "120", "99"], correct: 0 },
      { q: "Which of these is NOT one of the Five Pillars?", options: ["Reading the Quran", "Prayer (Salah)", "Charity (Zakat)", "Fasting (Sawm)"], correct: 0 },
      { q: "Which prophet built the Kaaba together with his son Ismail?", options: ["Ibrahim", "Nuh", "Yusuf", "Dawood"], correct: 0 },
      { q: "During which month does the Hajj take place?", options: ["Dhul-Hijjah", "Ramadan", "Shawwal", "Safar"], correct: 0 },
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
        ws.send(JSON.stringify({ type: 'error', message: 'Room not found' }));
        return;
      }
      if (room.phase !== 'lobby') {
        ws.send(JSON.stringify({ type: 'error', message: 'Game already in progress' }));
        return;
      }
      const name = (msg.name || '').trim().substring(0, 12);
      if (!name) {
        ws.send(JSON.stringify({ type: 'error', message: 'Name required' }));
        return;
      }
      if (room.players.find(p => p.name === name)) {
        ws.send(JSON.stringify({ type: 'error', message: 'Name already taken' }));
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
          q: q.q, options: q.options, category: q.category,
          roundNum: room.questions.indexOf(q) + 1
        })),
        totalQuestions: room.questions.length,
        currentQuestion: {
          q: q.q, options: q.options, category: q.category,
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
        broadcastAll(room, { type: 'powerup_used', player: pname, powerup: 'freeze', message: `${pname} froze the timer! ❄️` });
        setTimeout(() => {
          if (room.phase === 'playing') startTimer(room);
        }, 5000);
      } else if (pu === 'double') {
        room.powerups[pname] = null;
        room.activeDoubles.add(pname);
        broadcastAll(room, { type: 'powerup_used', player: pname, powerup: 'double', message: `${pname} activated DOUBLE POINTS! ✨` });
      } else if (pu === 'steal') {
        const ranked = Object.entries(room.scores).sort((a, b) => b[1] - a[1]);
        const victim = ranked.find(([n, s]) => n !== pname && s > 0);
        if (victim) {
          const stealAmount = Math.min(50, victim[1]);
          room.scores[victim[0]] -= stealAmount;
          room.scores[pname] += stealAmount;
          room.powerups[pname] = null;
          broadcastAll(room, { type: 'powerup_used', player: pname, powerup: 'steal', message: `${pname} stole ${stealAmount} pts from ${victim[0]}! 🦊`, scores: room.scores, victim: victim[0], amount: stealAmount });
        } else {
          ws.send(JSON.stringify({ type: 'powerup_failed', message: 'No one to steal from!' }));
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
      q: q.q, options: q.options, category: q.category,
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
