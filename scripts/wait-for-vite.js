const http = require('http');

const MAX_RETRIES = 30;
const RETRY_INTERVAL = 1000;

function checkServer(retries = 0) {
  if (retries >= MAX_RETRIES) {
    console.error('Vite server did not start in time');
    process.exit(1);
  }

  http.get('http://localhost:5174', (res) => {
    if (res.statusCode === 200) {
      console.log('Vite server is ready');
      process.exit(0);
    } else {
      retry(retries);
    }
  }).on('error', () => {
    retry(retries);
  });
}

function retry(retries) {
  console.log(`Waiting for Vite server... (${retries + 1}/${MAX_RETRIES})`);
  setTimeout(() => checkServer(retries + 1), RETRY_INTERVAL);
}

checkServer();
