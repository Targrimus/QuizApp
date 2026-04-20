const mongoose = require('mongoose');
const fs = require('fs');
const csv = require('csv-parser');
const bcrypt = require('bcryptjs');
const path = require('path');

const User = require('./models/User');
const Question = require('./models/Question');

const MONGODB_URI = 'mongodb://localhost:27017/aksaquiz';

const seedDatabase = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Question.deleteMany({});
    console.log('Cleared existing collections');

    // 1. Seed Questions
    const questionsPath = path.join(__dirname, '../mevzuat_sorulari.json');
    if (fs.existsSync(questionsPath)) {
      const rawData = fs.readFileSync(questionsPath, 'utf8');
      const jsonData = JSON.parse(rawData);
      const sorular = jsonData.sorular;
      const cevaplar = jsonData.cevaplar;

      const questionsToInsert = sorular.map((q) => ({
        id: q.id,
        soru: q.soru,
        secenekler: q.secenekler,
        cevap: cevaplar[q.id.toString()]
      }));

      await Question.insertMany(questionsToInsert);
      console.log(`Inserted ${questionsToInsert.length} questions`);
    } else {
      console.log('Warning: mevzuat_sorulari.json not found');
    }

    // 2. Seed Users
    const usersPath = path.join(__dirname, '../Personel_list.csv');
    const users = [];
    const defaultPassword = await bcrypt.hash('123456', 10);

    if (fs.existsSync(usersPath)) {
      fs.createReadStream(usersPath)
        .pipe(csv({ separator: '\t' }))
        .on('data', (row) => {
          // Normalize keys if needed (handling possible whitespace)
          const keys = Object.keys(row);
          const sicil = row[keys.find(k => k.trim() === 'SICIL')];
          const ad = row[keys.find(k => k.trim() === 'AD')];
          const soyad = row[keys.find(k => k.trim() === 'SOYAD')];
          const eposta = row[keys.find(k => k.trim() === 'E-POSTA')];
          const gorev = row[keys.find(k => k.trim() === 'GOREV')];
          const birim = row[keys.find(k => k.trim() === 'BIRIM')];

          if (sicil) {
             // No users from CSV should be admin, everyone is personel
             let role = 'personel';

             users.push({
               sicil: sicil.trim(),
               ad: ad ? ad.trim() : '',
               soyad: soyad ? soyad.trim() : '',
               eposta: eposta ? eposta.trim() : '',
               gorev: gorev ? gorev.trim() : '',
               birim: birim ? birim.trim() : '',
               role: role,
               password: defaultPassword
             });
          }
        })
        .on('end', async () => {
          try {
            // Add hardcoded admin account
            const adminPassword = await bcrypt.hash('admin', 10);
            users.push({
              sicil: 'admin',
              ad: 'Sistem',
              soyad: 'Yöneticisi',
              eposta: 'admin@aksagaz.com.tr',
              gorev: 'Yönetici',
              birim: 'IT',
              role: 'admin',
              password: adminPassword
            });

            if (users.length > 0) {
              await User.insertMany(users);
              console.log(`Inserted ${users.length} users (including admin)`);
            }
            console.log('Seeding completed');
            process.exit(0);
          } catch (err) {
            console.error('Error inserting users: ', err);
            process.exit(1);
          }
        });
    } else {
      console.log('Warning: Personel_list.csv not found');
      process.exit(0);
    }
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seedDatabase();
