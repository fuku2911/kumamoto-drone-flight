import './style.css';
import * as THREE from 'three';

const APP_TITLE = 'Kumamoto Drone Flight';

document.title = APP_TITLE;

const app = document.querySelector('#app');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xb9def2);

const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200);
camera.position.set(24, 20, 30);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.domElement.setAttribute('aria-label', '地面を斜め上から見渡す3D空間');
app.append(renderer.domElement);

function createGround() {
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 60),
    new THREE.MeshLambertMaterial({ color: 0x80aa72 }),
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  // 地面の格子で遠近感を確認する。わずかに浮かせて描画のちらつきを防ぐ。
  const grid = new THREE.GridHelper(60, 30, 0x54764b, 0x668b5c);
  grid.position.y = 0.01;
  scene.add(grid);
}

function createLights() {
  scene.add(new THREE.AmbientLight(0xffffff, 1.5));
  const sunlight = new THREE.DirectionalLight(0xffffff, 2);
  sunlight.position.set(15, 30, 10);
  scene.add(sunlight);
}

function resize() {
  const width = window.innerWidth;
  const height = Math.max(window.innerHeight, 1);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height);
}

function render() {
  requestAnimationFrame(render);
  renderer.render(scene, camera);
}

createGround();
createLights();
resize();
window.addEventListener('resize', resize);
render();
