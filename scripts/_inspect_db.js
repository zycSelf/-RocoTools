const path = require('path');
const Database = require(path.join(__dirname, '../app/server/node_modules/better-sqlite3'));
const db = new Database(path.join(__dirname, '../temp/seasons/season_S1_20260521.db'), { readonly: true });

const result = db.prepare("SELECT uid, pet_id, name, thumb_url FROM pets WHERE pet_id='309' LIMIT 3").all();
console.log('pet_309:', result);

db.close();