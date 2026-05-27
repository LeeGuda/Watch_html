async function loadConfig() {
  try {
    const res = await fetch("data.json");
    if (!res.ok) throw new Error("config fetch failed");
    return await res.json();
  } catch (e) {
    console.warn("Could not load data.json, using defaults.", e);
    return {};
  }
}

function hexToInt(hex) {
  if (!hex) return 0;
  if (typeof hex !== "string") return Number(hex) || 0;
  if (hex.startsWith("#")) hex = hex.slice(1);
  return parseInt(hex, 16);
}

(async function init() {
  const cfg = await loadConfig();

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    1000,
  );
  const camPos = (cfg.camera && cfg.camera.position) || [0, -6, 6];
  camera.position.set(camPos[0], camPos[1], camPos[2]);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);

  const viewer = document.getElementById("viewer") || document.body;
  function resizeRenderer() {
    const w = viewer.clientWidth || window.innerWidth;
    const h = viewer.clientHeight || window.innerHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  viewer.appendChild(renderer.domElement);
  resizeRenderer();

  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.minDistance = 4;
  controls.maxDistance = 12;

  const ambientLight = new THREE.AmbientLight(0x555555);
  scene.add(ambientLight);

  const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.2);
  dirLight1.position.set(5, 5, 10);
  scene.add(dirLight1);

  const dirLight2 = new THREE.DirectionalLight(
    hexToInt(cfg.colors && cfg.colors.second) || 0x00ecff,
    0.4,
  );
  dirLight2.position.set(-5, 5, -5);
  scene.add(dirLight2);

  const wristwatch = new THREE.Group();

  const metalColor = hexToInt(cfg.colors && cfg.colors.metal) || 0x2c3540;
  const strapColor = hexToInt(cfg.colors && cfg.colors.strap) || 0x191b1f;
  const dialColor = hexToInt(cfg.colors && cfg.colors.dial) || 0x0b0d13;

  const metalMaterial = new THREE.MeshStandardMaterial({
    color: metalColor,
    roughness:
      (cfg.materials && cfg.materials.metal && cfg.materials.metal.roughness) ||
      0.2,
    metalness:
      (cfg.materials && cfg.materials.metal && cfg.materials.metal.metalness) ||
      0.8,
  });
  const strapMaterial = new THREE.MeshStandardMaterial({
    color: strapColor,
    roughness:
      (cfg.materials && cfg.materials.strap && cfg.materials.strap.roughness) ||
      0.6,
    metalness:
      (cfg.materials && cfg.materials.strap && cfg.materials.strap.metalness) ||
      0.1,
  });
  const dialMaterial = new THREE.MeshStandardMaterial({
    color: dialColor,
    roughness:
      (cfg.materials && cfg.materials.dial && cfg.materials.dial.roughness) ||
      0.5,
  });

  const caseGeometry = new THREE.CylinderGeometry(2, 2, 0.4, 32);
  const watchCase = new THREE.Mesh(caseGeometry, metalMaterial);
  watchCase.rotation.x = Math.PI / 2;
  wristwatch.add(watchCase);

  const dialGeometry = new THREE.CylinderGeometry(1.85, 1.85, 0.02, 32);
  const watchDial = new THREE.Mesh(dialGeometry, dialMaterial);
  watchDial.rotation.x = Math.PI / 2;
  watchDial.position.z = 0.18;
  wristwatch.add(watchDial);

  const markerGeometry = new THREE.BoxGeometry(0.06, 0.2, 0.02);
  const markerMaterial = new THREE.MeshStandardMaterial({
    color: hexToInt(cfg.colors && cfg.colors.marker) || 0xffffff,
    metalness: 0.8,
  });
  const markerCount = cfg.markerCount || 12;
  for (let i = 0; i < markerCount; i++) {
    const marker = new THREE.Mesh(markerGeometry, markerMaterial);
    const angle = (i * Math.PI) / 6;
    marker.position.x = Math.sin(angle) * 1.6;
    marker.position.y = Math.cos(angle) * 1.6;
    marker.position.z = 0.2;
    marker.rotation.z = -angle;
    wristwatch.add(marker);
  }

  function createRealisticStrap(isTop) {
    const strapGroup = new THREE.Group();

    const segments = (cfg.strap && cfg.strap.segments) || 10;
    const totalLength = (cfg.strap && cfg.strap.totalLength) || 3.2;
    const segLength = totalLength / segments;

    const widthStart = (cfg.strap && cfg.strap.widthStart) || 1.3;
    const widthEnd = (cfg.strap && cfg.strap.widthEnd) || 0.9;
    const thickness = (cfg.strap && cfg.strap.thickness) || 0.15;

    for (let i = 0; i < segments; i++) {
      const ratioStart = i / segments;
      const ratioEnd = (i + 1) / segments;

      const wStart = widthStart - (widthStart - widthEnd) * ratioStart;
      const wEnd = widthStart - (widthStart - widthEnd) * ratioEnd;

      const geometry = new THREE.BufferGeometry();

      const xS = wStart / 2;
      const xE = wEnd / 2;
      const yS = 0;
      const yE = segLength;
      const zH = thickness / 2;

      const vertices = new Float32Array([
        -xS,
        yS,
        zH,
        xS,
        yS,
        zH,
        -xE,
        yE,
        zH,
        xS,
        yS,
        zH,
        xE,
        yE,
        zH,
        -xE,
        yE,
        zH,
        -xS,
        yS,
        -zH,
        -xE,
        yE,
        -zH,
        xS,
        yS,
        -zH,
        xS,
        yS,
        -zH,
        -xE,
        yE,
        -zH,
        xE,
        yE,
        -zH,
        -xS,
        yS,
        -zH,
        -xE,
        yE,
        -zH,
        -xS,
        yS,
        zH,
        -xE,
        yE,
        -zH,
        -xE,
        yE,
        zH,
        -xS,
        yS,
        zH,
        -xS,
        yS,
        -zH,
        xS,
        yS,
        zH,
        xE,
        yE,
        -zH,
        xE,
        yE,
        -zH,
        xS,
        yS,
        zH,
        xE,
        yE,
        zH,
      ]);

      geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
      geometry.computeVertexNormals();

      const segmentMesh = new THREE.Mesh(geometry, strapMaterial);

      segmentMesh.position.y = i * segLength;

      const curveFactor = Math.pow(ratioStart, 1.5) * 0.15;
      segmentMesh.rotation.x = isTop ? -curveFactor : curveFactor;

      segmentMesh.position.z = -Math.pow(ratioStart, 2) * 0.6;

      strapGroup.add(segmentMesh);
    }

    strapGroup.position.y = isTop ? 1.85 : -1.85;
    if (!isTop) strapGroup.rotation.z = Math.PI;

    return strapGroup;
  }

  const topStrap = createRealisticStrap(true);
  const bottomStrap = createRealisticStrap(false);
  wristwatch.add(topStrap);
  wristwatch.add(bottomStrap);

  const hourHandGroup = new THREE.Group();
  hourHandGroup.position.z = 0.21;
  const hourMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.07, 0.9, 0.02),
    new THREE.MeshStandardMaterial({ color: 0xffffff }),
  );
  hourMesh.position.y = 0.45;
  hourHandGroup.add(hourMesh);
  wristwatch.add(hourHandGroup);

  const minuteHandGroup = new THREE.Group();
  minuteHandGroup.position.z = 0.22;
  const minuteMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 1.4, 0.02),
    new THREE.MeshStandardMaterial({ color: 0xcccccc }),
  );
  minuteMesh.position.y = 0.7;
  minuteHandGroup.add(minuteMesh);
  wristwatch.add(minuteHandGroup);

  const secondHandGroup = new THREE.Group();
  secondHandGroup.position.z = 0.23;
  const secondMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.025, 1.5, 0.01),
    new THREE.MeshBasicMaterial({
      color: hexToInt(cfg.colors && cfg.colors.second) || 0x00ecff,
    }),
  );
  secondMesh.position.y = 0.65;
  secondHandGroup.add(secondMesh);
  wristwatch.add(secondHandGroup);

  const pin = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.07, 0.05, 16),
    metalMaterial,
  );
  pin.rotation.x = Math.PI / 2;
  pin.position.z = 0.24;
  wristwatch.add(pin);

  scene.add(wristwatch);

  // populate product info panel from config
  if (cfg.product) {
    const setText = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };
    setText("product-brand", cfg.product.brand || "");
    setText("product-name", cfg.product.name || "");
    setText("product-price", cfg.product.price || "");
    setText("product-tagline", cfg.product.tagline || "");
    setText("product-description", cfg.product.description || "");
  }

  function updateClockHands() {
    const now = new Date();
    const exactSecond = now.getSeconds() + now.getMilliseconds() / 1000;
    const exactMinute = now.getMinutes() + exactSecond / 60;
    const exactHour = (now.getHours() % 12) + exactMinute / 60;

    secondHandGroup.rotation.z = -(exactSecond * (Math.PI / 30));
    minuteHandGroup.rotation.z = -(exactMinute * (Math.PI / 30));
    hourHandGroup.rotation.z = -(exactHour * (Math.PI / 6));
  }

  function animate() {
    requestAnimationFrame(animate);
    updateClockHands();
    controls.update();

    if (controls.state === -1) {
      wristwatch.rotation.x = -0.5;
      wristwatch.rotation.y = 0.4;
    }

    renderer.render(scene, camera);
  }

  window.addEventListener("resize", () => {
    resizeRenderer();
  });

  animate();
})();
