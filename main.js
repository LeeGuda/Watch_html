import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

// --- 1. Three.js 기본 설정 ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf5f5f5);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000,
);
camera.position.set(0, 0, 6);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// --- 2. 조명 ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

// --- 3. 공용 머티리얼 ---
const watchMaterial = new THREE.MeshStandardMaterial({
  color: 0xcccccc,
  metalness: 0.7,
  roughness: 0.2,
});

const strapMaterial = new THREE.MeshStandardMaterial({
  color: 0x442211,
  roughness: 0.9,
});

const handMaterialDark = new THREE.MeshStandardMaterial({ color: 0x333333 });
const handMaterialGray = new THREE.MeshStandardMaterial({ color: 0x666666 });
const handMaterialRed = new THREE.MeshStandardMaterial({ color: 0xff0000 });

const glassMaterial = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  transparent: true,
  opacity: 0.2,
  metalness: 0.1,
  roughness: 0,
});

// --- 4. 시계 모델 ---
const watchBody = new THREE.Mesh(
  new THREE.CylinderGeometry(1.5, 1.5, 0.4, 32),
  watchMaterial,
);
watchBody.rotation.x = Math.PI / 2;
scene.add(watchBody);

const upperStrap = new THREE.Mesh(
  new THREE.BoxGeometry(1.4, 0.1, 2.2),
  strapMaterial,
);
upperStrap.position.set(0, -0.1, 1.4);

const lowerStrap = new THREE.Mesh(
  new THREE.BoxGeometry(1.4, 0.1, 2.2),
  strapMaterial,
);
lowerStrap.position.set(0, -0.1, -1.4);

watchBody.add(upperStrap, lowerStrap);

const glass = new THREE.Mesh(
  new THREE.CylinderGeometry(1.5, 1.5, 0.05, 32),
  glassMaterial,
);
glass.position.y = 0.25;
watchBody.add(glass);

function createHand(length, width, material) {
  const geometry = new THREE.BoxGeometry(width, length, 0.05);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.geometry.translate(0, length / 2, 0);
  return mesh;
}

const handsGroup = new THREE.Group();
handsGroup.position.set(0, 0.22, 0);
handsGroup.rotation.x = -Math.PI / 2;
watchBody.add(handsGroup);

const hourHand = createHand(0.6, 0.1, handMaterialDark);
const minuteHand = createHand(1.0, 0.07, handMaterialGray);
const secondHand = createHand(1.2, 0.03, handMaterialRed);

handsGroup.add(hourHand, minuteHand, secondHand);

function createDial() {
  const dialGroup = new THREE.Group();
  const radius = 1.35;

  for (let i = 0; i < 60; i++) {
    const isHourTick = i % 5 === 0;
    const tickLength = isHourTick ? 0.15 : 0.05;
    const tickWidth = isHourTick ? 0.03 : 0.01;

    const tickGeom = new THREE.BoxGeometry(tickWidth, tickLength, 0.02);
    const tickMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const tick = new THREE.Mesh(tickGeom, tickMat);

    const angle = (i / 60) * Math.PI * 2;
    tick.position.x = Math.sin(angle) * (radius - tickLength / 2);
    tick.position.y = Math.cos(angle) * (radius - tickLength / 2);
    tick.rotation.z = -angle;

    dialGroup.add(tick);
  }

  dialGroup.position.set(0, 0.21, 0);
  dialGroup.rotation.x = -Math.PI / 2;
  return dialGroup;
}

watchBody.add(createDial());

// --- 5. 컨트롤 ---
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// --- 6. UI 로드 ---
async function loadConfig() {
  try {
    const response = await fetch("./data.json");
    const data = await response.json();

    const caseMenu = document.getElementById("case-menu");
    data.caseColors.forEach((item) => {
      const btn = document.createElement("button");
      btn.innerText = item.name;
      btn.onclick = () => watchBody.material.color.setHex(item.hex);
      caseMenu.appendChild(btn);
    });

    const strapMenu = document.getElementById("strap-menu");
    data.strapStyles.forEach((item) => {
      const btn = document.createElement("button");
      btn.innerText = item.name;
      btn.onclick = () => {
        strapMaterial.color.setHex(item.hex);
        strapMaterial.metalness = item.metal;
        strapMaterial.roughness = item.rough;
      };
      strapMenu.appendChild(btn);
    });
  } catch (err) {
    console.error("JSON 로드 실패:", err);
  }
}

loadConfig();

// --- 7. 애니메이션 ---
function animate() {
  requestAnimationFrame(animate);

  const now = new Date();
  const secs = now.getSeconds();
  const mins = now.getMinutes();
  const hrs = now.getHours();

  secondHand.rotation.z = -((secs / 60) * Math.PI * 2);
  minuteHand.rotation.z = -(((mins + secs / 60) / 60) * Math.PI * 2);
  hourHand.rotation.z = -((((hrs % 12) + mins / 60) / 12) * Math.PI * 2);

  controls.update();
  renderer.render(scene, camera);
}

animate();

// --- 8. 창 크기 조절 대응 ---
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
