require('dotenv').config();
const mongoose = require('mongoose');
const Question = require('./models/Question');
const TestAssignment = require('./models/TestAssignment');

const groups = [
  "Lisans ve Mevzuat Temelleri",
  "Tarife, Fiyatlandırma ve Ölçüm",
  "İç Tesisat ve Tesisat Güvenliği",
  "Müşteri Hakları, Fatura ve Sayaç"
];

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/aksaquiz");
    console.log("MongoDB Connected for Seeding");
    
    console.log("Clearing existing questions and test assignments to avoid schema conflicts...");
    await Question.deleteMany({});
    await TestAssignment.deleteMany({});
    
    console.log("Generating 1000 fake questions (5 options)...");
    const questionsToInsert = [];
    
    for (let i = 1; i <= 1000; i++) {
       const groupName = groups[i % 4];
       const correctOption = ['A', 'B', 'C', 'D', 'E'][Math.floor(Math.random() * 5)];
       
       questionsToInsert.push({
         id: i,
         soru: `Oluşturulmuş Örnek Soru #${i} - Bu soru ${groupName} havuzuna ait rastgele bir şablondur. Aşağıdaki şıklardan doğru olanı (${correctOption}) seçiniz?`,
         secenekler: {
           A: `1. Seçenek (A) içeriği - Soru ${i}`,
           B: `2. Seçenek (B) içeriği - Soru ${i}`,
           C: `3. Seçenek (C) içeriği - Soru ${i}`,
           D: `4. Seçenek (D) içeriği - Soru ${i}`,
           E: `5. Seçenek (E) içeriği - Soru ${i}`
         },
         cevap: correctOption,
         grup: groupName
       });
    }
    
    await Question.insertMany(questionsToInsert);
    console.log("Successfully inserted 1000 questions.");
    process.exit(0);
  } catch (error) {
    console.error("Error with seeding:", error);
    process.exit(1);
  }
};

connectDB();
