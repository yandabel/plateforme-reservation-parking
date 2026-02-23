require('dotenv').config();
const cloudinary = require('cloudinary').v2;

// Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

console.log('🧪 Test de connexion Cloudinary...');
console.log('Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME ? '✓ Configuré' : '✗ Manquant');
console.log('API Key:', process.env.CLOUDINARY_API_KEY ? '✓ Configuré' : '✗ Manquant');
console.log('API Secret:', process.env.CLOUDINARY_API_SECRET ? '✓ Configuré' : '✗ Manquant');

// Tester la connexion
cloudinary.api.ping()
  .then(result => {
    console.log('✅ Cloudinary connecté avec succès!');
    console.log('Status:', result.status);
    
    // Lister les dossiers existants
    return cloudinary.api.root_folders();
  })
  .then(result => {
    console.log('\n📁 Dossiers Cloudinary:');
    result.folders.forEach(folder => {
      console.log(`  - ${folder.name}`);
    });
  })
  .catch(error => {
    console.error('❌ Erreur Cloudinary:', error.message);
    console.log('\n🔧 Solutions:');
    console.log('1. Vérifiez vos credentials dans .env');
    console.log('2. Vérifiez que Cloudinary est activé sur cloudinary.com');
    console.log('3. Testez en ligne de commande:');
    console.log('   curl -X GET "https://api.cloudinary.com/v1_1/' + 
                process.env.CLOUDINARY_CLOUD_NAME + '/ping"');
  });