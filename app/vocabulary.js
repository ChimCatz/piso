/**
 * Piso vocabulary: the words Piso listens for.
 * Add your own stores, foods and nicknames here, then run `npm test`.
 *
 * - Write everything in lowercase. "G-Cash" and "B.D.O." are matched as "g cash" and "b d o".
 * - Longer phrases win: "grab food" (Food) beats "grab" (Transport), "water bill" beats "water".
 * - An account alias only counts if that account is in the app's Settings.
 */
(function (root) {
  'use strict';

  // The starting accounts. Change yours in the app: Settings -> Accounts.
  const DEFAULT_ACCOUNTS = ['BDO', 'GCash', 'Maya', 'Cash'];

  // What you might say -> the account name in Settings
  const ACCOUNT_ALIASES = {
    // banks
    'bdo': 'BDO', 'b d o': 'BDO', 'bee dee oh': 'BDO', 'bdo unibank': 'BDO',
    'bpi': 'BPI', 'b p i': 'BPI', 'bee pee eye': 'BPI',
    'metrobank': 'Metrobank', 'metro bank': 'Metrobank',
    'unionbank': 'UnionBank', 'union bank': 'UnionBank', 'ub': 'UnionBank',
    'security bank': 'Security Bank', 'secbank': 'Security Bank',
    'landbank': 'Landbank', 'land bank': 'Landbank', 'lbp': 'Landbank',
    'pnb': 'PNB', 'p n b': 'PNB', 'philippine national bank': 'PNB',
    'rcbc': 'RCBC', 'r c b c': 'RCBC',
    'china bank': 'China Bank', 'chinabank': 'China Bank',
    'eastwest': 'EastWest', 'east west': 'EastWest',
    'psbank': 'PSBank', 'ps bank': 'PSBank',
    'aub': 'AUB', 'asia united bank': 'AUB',
    // digital banks
    'gotyme': 'GoTyme', 'go tyme': 'GoTyme', 'go time': 'GoTyme', 'gotime': 'GoTyme',
    'seabank': 'SeaBank', 'sea bank': 'SeaBank', 'maribank': 'MariBank', 'mari bank': 'MariBank',
    'tonik': 'Tonik', 'cimb': 'CIMB', 'c i m b': 'CIMB', 'komo': 'Komo', 'ownbank': 'OwnBank', 'own bank': 'OwnBank',
    'uno': 'UNO', 'uno digital': 'UNO',
    // e-wallets
    'gcash': 'GCash', 'g cash': 'GCash', 'gee cash': 'GCash', 'ji cash': 'GCash',
    'maya': 'Maya', 'maia': 'Maya', 'paymaya': 'Maya', 'pay maya': 'Maya', 'maya savings': 'Maya',
    'shopeepay': 'ShopeePay', 'shopee pay': 'ShopeePay', 'spaylater': 'SPayLater', 's pay later': 'SPayLater',
    'grabpay': 'GrabPay', 'grab pay': 'GrabPay',
    'coins ph': 'Coins.ph', 'coins dot ph': 'Coins.ph',
    'paypal': 'PayPal', 'pay pal': 'PayPal',
    'lazada wallet': 'Lazada Wallet', 'gcredit': 'GCredit', 'g credit': 'GCredit', 'gsave': 'GSave', 'g save': 'GSave',
    // cash
    'cash': 'Cash', 'wallet': 'Cash', 'pitaka': 'Cash', 'pera': 'Cash'
  };

  const CATEGORIES = ['Food', 'Groceries', 'Transport', 'Load/Bills', 'Shopping', 'Household', 'Personal Care', 'Health',
    'Entertainment', 'Savings', 'Salary', 'Other Income', 'Opening Balance', 'Other'];

  // Categories an Income can have. "Opening Balance" sets an account's starting amount
  // and, like transfers, is left out of the Summary's income and spending.
  const INCOME_CATEGORIES = ['Salary', 'Other Income', 'Opening Balance'];

  const CATEGORY_KEYWORDS = {
    'Food': [
      // meals and drinks
      'food', 'lunch', 'dinner', 'breakfast', 'brunch', 'snack', 'snacks', 'merienda', 'meryenda', 'almusal', 'tanghalian', 'hapunan',
      'ulam', 'kain', 'kumain', 'pagkain', 'kainan', 'carinderia', 'karinderya', 'turo turo', 'eat out', 'take out', 'takeout', 'delivery',
      'coffee', 'kape', 'iced coffee', 'milk tea', 'milktea', 'tea', 'juice', 'shake', 'smoothie', 'water', 'mineral water',
      'softdrinks', 'soft drinks', 'soda', 'coke', 'royal', 'sprite', 'beer', 'red horse', 'san mig', 'alak', 'drinks',
      'pizza', 'burger', 'fries', 'chicken joy', 'chickenjoy', 'fried chicken', 'lechon', 'lechon manok', 'litson', 'inasal', 'bbq', 'barbecue',
      'isaw', 'kwek kwek', 'fishball', 'fish ball', 'siomai', 'siopao', 'dimsum', 'dim sum', 'pancit', 'mami', 'lugaw', 'goto', 'arroz caldo',
      'silog', 'tapsilog', 'longsilog', 'tocilog', 'sisig', 'adobo', 'sinigang', 'kare kare', 'bulalo', 'shawarma', 'ramen', 'samgyup', 'samgyupsal',
      'unli rice', 'rice meal', 'ice cream', 'halo halo', 'taho', 'balut', 'cake', 'donut', 'donuts', 'doughnut', 'pastry', 'pandesal',
      'bread', 'tinapay', 'ensaymada', 'chips', 'chichirya', 'candy', 'chocolate', 'biscuit', 'biscuits',
      // sari-sari store and convenience store brands
      'kopiko', 'nescafe', 'great taste', 'milo', 'c2', 'zesto', 'yakult', 'chuckie', 'nestea', 'tang', 'cobra', 'sting',
      'gatorade', 'pocari', 'pocari sweat', 'mountain dew', 'red bull', 'nature spring', 'wilkins', 'absolute water',
      'chippy', 'piattos', 'nova', 'oishi', 'boy bawang', 'clover', 'skyflakes', 'sky flakes', 'rebisco', 'fita', 'hansel',
      'cream o', 'cloud 9', 'choco mucho', 'mentos', 'selecta', 'magnolia ice cream', 'siopao asado', 'lumpia', 'turon', 'banana cue',
      // restaurants and food delivery
      'jollibee', 'jolibee', 'mcdo', 'mcdonalds', 'mc donalds', 'kfc', 'chowking', 'greenwich', 'mang inasal', 'red ribbon', 'goldilocks',
      'maxs', 'max s', 'shakeys', 'pizza hut', 'dominos', 'yellow cab', 'bonchon', 'army navy', 'tokyo tokyo', 'potato corner', 'zarks',
      'burger king', 'wendys', 'subway', 'popeyes', 'jco', 'j co', 'krispy kreme', 'dunkin', 'dunkin donuts', 'andoks', 'baliwag',
      'kenny rogers', 'sbarro', 'yoshinoya', 'ramen nagi', 'chatime', 'coco', 'macao imperial', 'gong cha', 'tiger sugar', 'serenitea',
      'starbucks', 'tim hortons', 'coffee bean', 'bos coffee', 'boss coffee', 'but first coffee', 'pickup coffee', 'dear joe', 'zus',
      'grab food', 'grabfood', 'foodpanda', 'food panda',
      // convenience stores (mostly snacks and drinks)
      '7 eleven', '7-eleven', 'seven eleven', 'ministop', 'alfamart', 'lawson', 'family mart', 'familymart', 'uncle johns'
    ],
    'Groceries': [
      'grocery', 'groceries', 'grocery store', 'supermarket', 'palengke', 'market', 'wet market', 'sari sari', 'sari sari store', 'tindahan',
      'rice', 'bigas', 'eggs', 'egg', 'itlog', 'meat', 'karne', 'pork', 'baboy', 'beef', 'baka', 'manok', 'chicken breast', 'fish', 'isda',
      'tilapia', 'bangus', 'galunggong', 'shrimp', 'hipon', 'vegetables', 'veggies', 'gulay', 'fruits', 'fruit', 'prutas', 'banana', 'saging',
      'milk', 'gatas', 'sugar', 'asukal', 'salt', 'asin', 'cooking oil', 'mantika', 'soy sauce', 'toyo', 'vinegar', 'suka', 'canned goods',
      'de lata', 'sardinas', 'sardines', 'corned beef', 'noodles', 'instant noodles', 'pancit canton', 'lucky me', 'cup noodles',
      'coffee 3 in 1', 'creamer', 'cereal', 'oatmeal', 'butter', 'cheese', 'hotdog', 'hot dog', 'longganisa', 'tocino', 'ham', 'bacon',
      'sm supermarket', 'sm hypermarket', 'savemore', 'save more', 'puregold', 'robinsons supermarket', 'gaisano', 'metro supermarket',
      'landers', 's and r', 's&r', 'snr', 'walter mart', 'waltermart', 'shopwise', 'rustans', 'marketplace', 'nccc', 'prince hypermart',
      'cdo market', 'cogon market', 'carmen market'
    ],
    'Transport': [
      'jeep', 'jeepney', 'multicab', 'taxi', 'grab', 'grab car', 'grabcar', 'angkas', 'joyride', 'move it', 'maxim', 'indrive', 'in drive',
      'habal habal', 'habal', 'motor taxi', 'fare', 'pamasahe', 'pasahe', 'bus', 'bus fare', 'tricycle', 'trike', 'pedicab', 'lrt', 'mrt',
      'train', 'ferry', 'boat', 'barko', 'plane ticket', 'flight', 'cebu pacific', 'philippine airlines', 'pal', 'airasia', 'air asia', '2go',
      'gas', 'gasoline', 'diesel', 'fuel', 'gasolina', 'petron', 'shell', 'caltex', 'seaoil', 'sea oil', 'phoenix', 'cleanfuel', 'unioil',
      'parking', 'toll', 'autosweep', 'easytrip', 'car wash', 'oil change', 'tire', 'vulcanizing', 'motor repair', 'car repair'
    ],
    'Load/Bills': [
      'load', 'prepaid load', 'dito', 'globe', 'smart', 'tm', 'tnt', 'gomo', 'internet', 'wifi', 'pldt', 'converge', 'sky cable', 'cignal',
      'globe at home', 'starlink', 'electric', 'electricity', 'kuryente', 'meralco', 'cepalco', 'davao light', 'veco', 'visayan electric',
      'water bill', 'tubig bill', 'maynilad', 'manila water', 'cowd', 'water district', 'bill', 'bills', 'rent', 'upa', 'renta', 'dorm',
      'boarding house', 'association dues', 'subscription', 'insurance', 'philhealth', 'sss', 'pag ibig', 'pagibig', 'loan', 'utang',
      'credit card', 'card payment', 'tuition', 'school fees'
    ],
    'Shopping': [
      'shopping', 'shopee', 'lazada', 'tiktok shop', 'shein', 'temu', 'zalora', 'amazon', 'ukay', 'ukay ukay', 'thrift',
      'clothes', 'damit', 'shirt', 'pants', 'shoes', 'sapatos', 'tsinelas', 'slippers', 'bag', 'gadget', 'phone case', 'charger', 'earphones',
      'mall', 'sm', 'sm store', 'sm department store', 'robinsons', 'ayala', 'centrio', 'limketkai', 'uniqlo', 'h and m', 'h&m',
      'penshoppe', 'bench', 'cotton on', 'national bookstore', 'fully booked', 'miniso', 'daiso', 'japan home', 'mr diy', 'abenson',
      'anson', 'octagon', 'silicon valley', 'datablitz', 'gift for', 'regalo para', 'books', 'school supplies'
    ],
    'Household': [
      'household', 'detergent', 'sabon panlaba', 'laundry', 'laba', 'laundry shop', 'fabric conditioner', 'downy', 'tide', 'ariel', 'surf',
      'breeze', 'zonrox', 'bleach', 'dishwashing', 'joy', 'dish soap', 'tissue', 'toilet paper', 'paper towels', 'trash bags', 'garbage bags',
      'lpg', 'gasul', 'gas tank', 'light bulb', 'bumbilya', 'batteries', 'battery', 'ace hardware', 'wilcon', 'handyman', 'citi hardware',
      'hardware', 'ikea', 'our home', 'furniture', 'kitchenware', 'plates', 'repair', 'plumber', 'electrician', 'helper', 'kasambahay'
    ],
    'Personal Care': [
      'shampoo', 'conditioner', 'soap', 'sabon', 'body wash', 'toothpaste', 'toothbrush', 'lotion', 'deodorant', 'perfume', 'cologne',
      'skincare', 'sunscreen', 'makeup', 'lipstick', 'haircut', 'gupit', 'barber', 'barbershop', 'salon', 'spa', 'massage', 'hilot',
      'manicure', 'pedicure', 'nails', 'watsons', 'sm beauty', 'the face shop', 'innisfree', 'happy skin', 'pads', 'napkin', 'diapers', 'diaper'
    ],
    'Health': [
      'medicine', 'gamot', 'meds', 'vitamins', 'botika', 'pharmacy', 'drugstore', 'mercury drug', 'mercury', 'rose pharmacy', 'generika',
      'tgp', 'south star', 'southstar', 'doctor', 'clinic', 'checkup', 'check up', 'consultation', 'lab test', 'laboratory', 'x ray',
      'dentist', 'dental', 'optical', 'eyeglasses', 'hospital', 'confinement', 'hmo', 'maxicare', 'intellicare'
    ],
    'Entertainment': [
      'game', 'games', 'gaming', 'steam', 'mobile legends', 'ml diamonds', 'diamonds', 'dota', 'valorant', 'genshin', 'top up', 'topup',
      'netflix', 'spotify', 'youtube premium', 'disney', 'disney plus', 'hbo', 'hbo max', 'viu', 'iqiyi', 'prime video', 'apple music',
      'movie', 'movies', 'sine', 'cinema', 'concert', 'videoke', 'karaoke', 'bar', 'night out', 'inuman', 'party', 'outing', 'resort',
      'beach', 'swimming', 'travel', 'hotel', 'airbnb', 'staycation', 'gym', 'gym membership', 'badminton', 'basketball', 'bowling', 'arcade',
      'timezone', 'tom s world', 'toms world'
    ],
    'Savings': ['savings', 'save', 'ipon', 'investment', 'invest', 'stocks', 'mp2', 'time deposit', 'emergency fund', 'crypto'],
    'Salary': ['salary', 'sweldo', 'sahod', 'payroll', 'payday', 'paycheck', 'kinsenas', 'katapusan', '13th month', 'thirteenth month'],
    'Other Income': ['refund', 'gift', 'regalo', 'bonus', 'allowance', 'padala', 'remittance', 'cashback', 'cash back', 'rebate', 'interest',
      'sold', 'sale', 'benta', 'freelance', 'commission', 'tip', 'tips', 'side hustle', 'raket', 'sideline', 'reimbursement', 'reimburse'],
    'Opening Balance': ['opening balance', 'starting balance', 'current balance', 'initial balance', 'beginning balance']
  };

  // Words that set the type when there's no + or - sign
  const INCOME_WORDS = ['plus', 'add', 'added', 'income', 'received', 'receive', 'deposit', 'deposited', 'earned', 'got', 'salary',
    'sweldo', 'sahod', 'natanggap', 'nakatanggap', 'binayaran', 'nabayaran'];
  const EXPENSE_WORDS = ['minus', 'less', 'spent', 'spend', 'expense', 'paid', 'pay', 'bought', 'buy', 'deduct', 'gastos', 'gumastos',
    'bayad', 'binayad', 'nagbayad', 'bumili', 'binili', 'nabili'];
  const TRANSFER_WORDS = ['transfer', 'transferred', 'lipat', 'inilipat', 'cash in', 'cashin', 'cash out', 'cashout'];
  const WITHDRAW_WORDS = ['withdraw', 'withdrew', 'withdrawal', 'withdrawn']; // ATM: account -> Cash

  const vocabulary = { DEFAULT_ACCOUNTS, ACCOUNT_ALIASES, CATEGORIES, INCOME_CATEGORIES, CATEGORY_KEYWORDS,
    INCOME_WORDS, EXPENSE_WORDS, TRANSFER_WORDS, WITHDRAW_WORDS };
  if (typeof module === 'object' && module.exports) module.exports = vocabulary;
  else root.PisoVocabulary = vocabulary;
})(typeof self !== 'undefined' ? self : this);
