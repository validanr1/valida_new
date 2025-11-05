// Cole este código no Console do navegador (F12) enquanto estiver logado no sistema
// Isso vai testar o envio de notificação diretamente

(async () => {
  try {
    console.log('🔍 Testando envio de notificação...');
    
    const response = await fetch('https://ymuzggvvslpxaabozmck.supabase.co/functions/v1/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'notify_login',
        recipient_email: 'SEU-EMAIL@DOMINIO.COM', // AJUSTE AQUI
        data: {
          user_email: 'teste@exemplo.com',
          when: new Date().toISOString(),
          user_agent: navigator.userAgent,
        }
      })
    });
    
    const data = await response.json();
    
    console.log('📊 Status:', response.status);
    console.log('📧 Resposta:', data);
    
    if (response.ok) {
      console.log('✅ E-mail enviado com sucesso!');
    } else {
      console.error('❌ Erro ao enviar:', data);
    }
  } catch (error) {
    console.error('💥 Erro na requisição:', error);
  }
})();
