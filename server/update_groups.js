require('dotenv').config();
const mongoose = require('mongoose');
const Question = require('./models/Question');

mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/aksaquiz")
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));

async function updateGroups() {
  const questions = await Question.find();
  let updatedCount = 0;
  
  for (const q of questions) {
    if (q.id <= 20) {
      q.grup = "Lisans ve Mevzuat Temelleri";
    } else if (q.id <= 40) {
      q.grup = "Tarife, Fiyatlandırma ve Ölçüm";
    } else if (q.id <= 60) {
      q.grup = "İç Tesisat ve Tesisat Güvenliği";
    } else {
      q.grup = "Müşteri Hakları, Fatura ve Sayaç";
    }
    await q.save();
    updatedCount++;
  }
  
  console.log(`Successfully updated ${updatedCount} questions with groups.`);
  mongoose.connection.close();
}

updateGroups();
