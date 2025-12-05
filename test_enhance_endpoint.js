// Test rápido del endpoint enhance-prompt
const fetch = require('node-fetch');

async function testEnhance() {
  console.log('🧪 Testing enhance-prompt endpoint...\n');
  
  // Nota: Necesitas un token JWT válido
  const token = 'TU_TOKEN_AQUI'; // Reemplazar con token real
  
  try {
    const response = await fetch('http://localhost:8081/api/ai/enhance-prompt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ 
        prompt: 'logo para cafetería' 
      })
    });
    
    console.log('Status:', response.status);
    
    const data = await response.json();
    console.log('\nResponse:', JSON.stringify(data, null, 2));
    
    if (data.success) {
      console.log('\n✅ ÉXITO!');
      console.log('\nPrompt original:', data.originalPrompt);
      console.log('\nPrompt mejorado:', data.enhancedPrompt);
    } else {
      console.log('\n❌ ERROR:', data.error);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testEnhance();
