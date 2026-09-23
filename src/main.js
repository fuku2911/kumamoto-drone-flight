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

  drone.position.set(0, 3, 0);
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

function render() {
  requestAnimationFrame(render);
  renderer.render(scene, camera);
}

createGround();
createLights();
scene.add(createDrone());
resize();
window.addEventListener('resize', resize);
render();
