import app from './app.js';

// persona una: inicia el sitio en el puerto configurado (3000 de forma predeterminada).
const puerto = Number(process.env.PORT || 3000);

app.listen(puerto, process.env.HOST || '127.0.0.1', () => {
  console.log(`E-regalos está en http://localhost:${puerto}`);
});
