import './style.css';

const APP_TITLE = 'Kumamoto Drone Flight';

document.title = APP_TITLE;

const app = document.querySelector('#app');
const heading = document.createElement('h1');
heading.textContent = APP_TITLE;

const status = document.createElement('p');
status.className = 'status';
status.textContent = 'Step 1 — 開発環境の準備完了';

const description = document.createElement('p');
description.textContent = 'Vite + Vanilla JavaScript の最小ページです。3D空間・ドローン・操作はまだ実装していません。';

app.append(heading, status, description);
