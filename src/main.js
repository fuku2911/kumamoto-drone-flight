import './style.css';
import * as THREE from 'three';

const APP_TITLE = 'Kumamoto Drone Flight';
const INITIAL_POSITION = new THREE.Vector3(0, 3, 0);
const GAME_STATE = { READY: 'READY', PLAYING: 'PLAYING', FINISHED: 'FINISHED' };
let gameState = GAME_STATE.READY;
let startedAt = 0;
let elapsedMilliseconds = 0;
const MOVE_SPEED = 6; // 単位 / 秒（斜め移動も同じ速さ）
const TURN_SPEED = Math.PI / 2; // ラジアン / 秒
const MIN_ALTITUDE = 0.5; // 機体中心の最低高度
const MAX_DELTA_TIME = 0.05; // 復帰時の大きな移動を防ぐ
const CAMERA_OFFSET = new THREE.Vector3(0, 7, 18); // 機体基準の上方・後方
const CAMERA_LOOK_OFFSET = new THREE.Vector3(0, 0, -2); // 少し前方を見る
const CAMERA_FOLLOW_SPEED = 8; // 大きいほど素早く追従
const RING_RADIUS = 6;
const CHECKPOINT_DISTANCE = 2; // 機体中心とリング中心の距離
const RING_POSITIONS = [
  [0, 7, -15], [-4, 8, -32], [4, 10, -49], [-3, 9, -66], [0, 11, -83],
];
let currentCheckpointIndex = 0;
const cameraTargetPosition = new THREE.Vector3();
const cameraLookTarget = new THREE.Vector3();
const pressedKeys = new Set();
const controlKeys = new Set([
  'KeyW', 'KeyS', 'KeyA', 'KeyD', 'Space', 'ShiftLeft', 'ShiftRight', 'KeyQ', 'KeyE',
]);
const movement = new THREE.Vector3();
const upAxis = new THREE.Vector3(0, 1, 0);
let previousTime;

document.title = APP_TITLE;

const app = document.querySelector('#app');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xb9def2);

const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.domElement.setAttribute('aria-label', '地面を斜め上から見渡す3D空間');
app.append(renderer.domElement);
renderer.domElement.tabIndex = -1;

function createGround() {
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(120, 120),
    new THREE.MeshLambertMaterial({ color: 0x80aa72 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.z = -35;
  scene.add(ground);

  // 地面の格子で遠近感を確認する。わずかに浮かせて描画のちらつきを防ぐ。
  const grid = new THREE.GridHelper(120, 60, 0x54764b, 0x668b5c);
  grid.position.y = 0.01;
  grid.position.z = -35;
  scene.add(grid);
}

function createLights() {
  scene.add(new THREE.AmbientLight(0xffffff, 1.5));
  const sunlight = new THREE.DirectionalLight(0xffffff, 2);
  sunlight.position.set(15, 30, 10);
  scene.add(sunlight);
}

function createDrone() {
  const drone = new THREE.Group();
  drone.name = 'drone';
  const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0xe8edf2 });
  const frameMaterial = new THREE.MeshLambertMaterial({ color: 0x263443 });
  const frontMaterial = new THREE.MeshLambertMaterial({ color: 0xff7518 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.65, 2.2), bodyMaterial);
  drone.add(body);

  // 機体の前方向はローカル-Z。オレンジの先端と前アームで示す。
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1, 4), frontMaterial);
  nose.rotation.x = -Math.PI / 2;
  nose.position.set(0, 0.3, -1.1);
  drone.add(nose);

  const armGeometry = new THREE.BoxGeometry(0.35, 0.22, 2.6);
  const motorGeometry = new THREE.CylinderGeometry(0.28, 0.28, 0.4, 16);
  const rotorGeometry = new THREE.TorusGeometry(0.95, 0.08, 6, 32);
  const bladeGeometry = new THREE.BoxGeometry(1.75, 0.06, 0.2);

  // 前・右・後・左の4本。ローターは静止した輪とブレードで表す。
  for (let index = 0; index < 4; index += 1) {
    const angle = index * Math.PI / 2;
    const x = Math.sin(angle);
    const z = -Math.cos(angle);
    const material = index === 0 ? frontMaterial : frameMaterial;

    const arm = new THREE.Mesh(armGeometry, material);
    arm.position.set(x * 1.3, 0, z * 1.3);
    arm.rotation.y = -angle;
    drone.add(arm);

    const motor = new THREE.Mesh(motorGeometry, material);
    motor.position.set(x * 2.6, 0.15, z * 2.6);
    drone.add(motor);

    const rotor = new THREE.Mesh(rotorGeometry, material);
    rotor.rotation.x = -Math.PI / 2;
    rotor.position.set(x * 2.6, 0.4, z * 2.6);
    drone.add(rotor);

    const blade = new THREE.Mesh(bladeGeometry, frameMaterial);
    blade.position.copy(rotor.position);
    blade.rotation.y = angle;
    drone.add(blade);
  }

  drone.position.copy(INITIAL_POSITION);
  return drone;
}

function resize() {
  const width = window.innerWidth;
  const height = Math.max(window.innerHeight, 1);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height);
}

function createCheckpoints() {
  const geometry = new THREE.TorusGeometry(RING_RADIUS, 0.3, 12, 64);
  return RING_POSITIONS.map((position, index) => {
    const ring = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial());
    ring.position.set(...position);
    ring.userData.order = index + 1;
    scene.add(ring);
    return ring;
  });
}

function updateCheckpointAppearance() {
  checkpoints.forEach((ring, index) => {
    const active = index === currentCheckpointIndex;
    const passed = index < currentCheckpointIndex;
    ring.material.color.setHex(active ? 0xffd83d : passed ? 0x397d53 : 0x2466a0);
    ring.material.emissive.setHex(active ? 0xffb400 : 0x000000);
    ring.material.emissiveIntensity = active ? 0.8 : 0;
  });
}

function updateCheckpoints() {
  if (gameState !== GAME_STATE.PLAYING) return;
  const target = checkpoints[currentCheckpointIndex];
  if (!target || drone.position.distanceToSquared(target.position) > CHECKPOINT_DISTANCE ** 2) return;
  currentCheckpointIndex += 1;
  updateCheckpointAppearance();
  if (currentCheckpointIndex === checkpoints.length) {
    finishGame();
  }
}

function setupInput() {
  window.addEventListener('keydown', (event) => {
    if (gameState !== GAME_STATE.PLAYING) return;
    if (!controlKeys.has(event.code)) return;
    event.preventDefault();
    pressedKeys.add(event.code);
  });
  window.addEventListener('keyup', (event) => {
    if (!controlKeys.has(event.code)) return;
    if (gameState === GAME_STATE.PLAYING) event.preventDefault();
    pressedKeys.delete(event.code);
  });
  const clearInput = () => {
    pressedKeys.clear();
    previousTime = undefined;
  };
  window.addEventListener('blur', clearInput);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) clearInput();
  });
}

function updateDrone(deltaTime) {
  if (gameState !== GAME_STATE.PLAYING) return;
  const turn = Number(pressedKeys.has('KeyQ')) - Number(pressedKeys.has('KeyE'));
  drone.rotation.y += turn * TURN_SPEED * deltaTime;

  movement.set(
    Number(pressedKeys.has('KeyD')) - Number(pressedKeys.has('KeyA')),
    Number(pressedKeys.has('Space')) - Number(pressedKeys.has('ShiftLeft') || pressedKeys.has('ShiftRight')),
    Number(pressedKeys.has('KeyS')) - Number(pressedKeys.has('KeyW')),
  );
  // ローカルの前方-Z・右方+Xを機体の向きに合わせてワールド座標へ変換。
  movement.normalize().applyAxisAngle(upAxis, drone.rotation.y);
  drone.position.addScaledVector(movement, MOVE_SPEED * deltaTime);
  drone.position.y = Math.max(MIN_ALTITUDE, drone.position.y);
}

function render(time) {
  requestAnimationFrame(render);
  const deltaTime = previousTime === undefined ? 0 : Math.min((time - previousTime) / 1000, MAX_DELTA_TIME);
  previousTime = time;
  updateDrone(deltaTime);
  updateCheckpoints();
  updateCamera(deltaTime);
  if (gameState === GAME_STATE.PLAYING) {
    elapsedMilliseconds = performance.now() - startedAt;
    updateHud();
  }
  renderer.render(scene, camera);
}

function updateCamera(deltaTime, immediate = false) {
  cameraTargetPosition.copy(CAMERA_OFFSET).applyAxisAngle(upAxis, drone.rotation.y).add(drone.position);
  cameraLookTarget.copy(CAMERA_LOOK_OFFSET).applyAxisAngle(upAxis, drone.rotation.y).add(drone.position);
  // 時間に基づく補間で、フレームレートによる追従感の差を抑える。
  const blend = immediate ? 1 : 1 - Math.exp(-CAMERA_FOLLOW_SPEED * deltaTime);
  camera.position.lerp(cameraTargetPosition, blend);
  camera.lookAt(cameraLookTarget);
}

function createGameUI() {
  const overlay = document.createElement('div');
  overlay.className = 'game-ui';
  overlay.innerHTML = `
    <section class="panel" id="ready-panel" aria-labelledby="game-title">
      <h1 id="game-title"></h1>
      <button id="start-button" type="button">START</button>
      <h2>操作方法</h2>
      <p class="controls">W/S : 前後<br>A/D : 左右<br>Space/Shift : 上下<br>Q/E : 旋回</p>
    </section>
    <div class="hud" id="hud" hidden>
      <div>TIME <span id="time-value">00:00.00</span></div>
      <div id="checkpoint-value">CHECKPOINT 1 / 5</div>
    </div>
    <section class="panel" id="finish-panel" aria-labelledby="finish-title" hidden>
      <h1 id="finish-title">FINISH</h1>
      <p class="result">TIME <span id="result-time">00:00.00</span></p>
      <button id="retry-button" type="button">RETRY</button>
    </section>`;
  app.append(overlay);
  overlay.querySelector('#game-title').textContent = APP_TITLE;
  const elements = Object.fromEntries([...overlay.querySelectorAll('[id]')].map(element => [element.id, element]));
  elements['start-button'].addEventListener('click', startGame);
  elements['retry-button'].addEventListener('click', resetGame);
  return elements;
}

function formatTime(milliseconds) {
  const hundredths = Math.floor(Math.max(0, milliseconds) / 10);
  const minutes = Math.floor(hundredths / 6000);
  const seconds = Math.floor(hundredths / 100) % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(hundredths % 100).padStart(2, '0')}`;
}

function updateHud() {
  ui['time-value'].textContent = formatTime(elapsedMilliseconds);
  ui['checkpoint-value'].textContent = `CHECKPOINT ${Math.min(currentCheckpointIndex + 1, checkpoints.length)} / ${checkpoints.length}`;
}

function startGame() {
  if (gameState !== GAME_STATE.READY) return;
  pressedKeys.clear();
  previousTime = undefined;
  elapsedMilliseconds = 0;
  startedAt = performance.now();
  gameState = GAME_STATE.PLAYING;
  ui['ready-panel'].hidden = true;
  ui.hud.hidden = false;
  updateHud();
  renderer.domElement.focus();
}

function finishGame() {
  if (gameState !== GAME_STATE.PLAYING) return;
  elapsedMilliseconds = performance.now() - startedAt;
  gameState = GAME_STATE.FINISHED;
  pressedKeys.clear();
  updateHud();
  ui.hud.hidden = true;
  ui['result-time'].textContent = formatTime(elapsedMilliseconds);
  ui['finish-panel'].hidden = false;
  ui['retry-button'].focus();
}

function resetGame() {
  gameState = GAME_STATE.READY;
  pressedKeys.clear();
  previousTime = undefined;
  startedAt = 0;
  elapsedMilliseconds = 0;
  drone.position.copy(INITIAL_POSITION);
  drone.rotation.set(0, 0, 0);
  currentCheckpointIndex = 0;
  updateCheckpointAppearance();
  updateCamera(0, true);
  updateHud();
  ui['result-time'].textContent = formatTime(0);
  ui.hud.hidden = true;
  ui['finish-panel'].hidden = true;
  ui['ready-panel'].hidden = false;
  ui['start-button'].focus();
}

createGround();
createLights();
const drone = createDrone();
scene.add(drone);
const checkpoints = createCheckpoints();
const ui = createGameUI();
setupInput();
resize();
resetGame();
window.addEventListener('resize', resize);
requestAnimationFrame(render);
