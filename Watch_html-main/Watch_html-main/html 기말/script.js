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
  const camPos = (cfg.camera && cfg.camera.position) || [0, 0, 6];
  camera.position.set(camPos[0], camPos[1], camPos[2]);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, precision: "highp" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowShadowMap;

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
  controls.dampingFactor = 0.05;
  controls.enablePan = false;
  controls.minDistance = 3;
  controls.maxDistance = 15;
  controls.autoRotate = false;
  controls.enableZoom = true;

  const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
  scene.add(ambientLight);

  const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.5);
  dirLight1.position.set(8, 8, 12);
  dirLight1.castShadow = true;
  scene.add(dirLight1);

  const dirLight2 = new THREE.DirectionalLight(0xffd700, 0.6);
  dirLight2.position.set(-6, -6, 8);
  scene.add(dirLight2);

  const pointLight = new THREE.PointLight(0xffffff, 0.8);
  pointLight.position.set(5, -5, 10);
  scene.add(pointLight);

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
      0.75,
    metalness:
      (cfg.materials && cfg.materials.strap && cfg.materials.strap.metalness) ||
      0.1,
    emissive: 0x111111,
    emissiveIntensity: 0.25,
  });
  const dialMaterial = new THREE.MeshStandardMaterial({
    color: dialColor,
    roughness:
      (cfg.materials && cfg.materials.dial && cfg.materials.dial.roughness) ||
      0.5,
  });
  const hourHandMaterial = new THREE.MeshStandardMaterial({
    color: metalColor,
    metalness: 0.8,
    roughness: 0.2,
  });
  const minuteHandMaterial = new THREE.MeshStandardMaterial({
    color: metalColor,
    metalness: 0.8,
    roughness: 0.2,
  });

  const caseGeometry = new THREE.CylinderGeometry(2, 2, 0.4, 64);
  const watchCase = new THREE.Mesh(caseGeometry, metalMaterial);
  watchCase.rotation.x = Math.PI / 2;
  wristwatch.add(watchCase);

  // 베젤 추가
  const bezelGeometry = new THREE.CylinderGeometry(2.05, 2.0, 0.08, 64);
  const bezelMaterial = new THREE.MeshStandardMaterial({
    color: metalColor,
    roughness: 0.25,
    metalness: 0.9,
  });
  const bezel = new THREE.Mesh(bezelGeometry, bezelMaterial);
  bezel.rotation.x = Math.PI / 2;
  bezel.position.z = 0.24;
  wristwatch.add(bezel);

  const dialGeometry = new THREE.CylinderGeometry(1.85, 1.85, 0.02, 64);
  const watchDial = new THREE.Mesh(dialGeometry, dialMaterial);
  watchDial.rotation.x = Math.PI / 2;
  watchDial.position.z = 0.18;
  wristwatch.add(watchDial);

  // 크리스탈(렌즈) 추가
  const crystalGeometry = new THREE.CylinderGeometry(1.82, 1.82, 0.05, 64);
  const crystalMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.05,
    metalness: 0.1,
    transparent: true,
    opacity: 0.08,
  });
  const crystal = new THREE.Mesh(crystalGeometry, crystalMaterial);
  crystal.rotation.x = Math.PI / 2;
  crystal.position.z = 0.22;
  wristwatch.add(crystal);

  const markerGeometry = new THREE.BoxGeometry(0.12, 0.32, 0.04);
  const markerMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xeeeeee,
    metalness: 0.95,
    roughness: 0.02,
    side: THREE.DoubleSide,
  });

  // 분 눈금 추가 (5분 단위, 총 60개)
  const minuteMarkerGeometry = new THREE.BoxGeometry(0.08, 0.24, 0.04);
  const minuteMarkerMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xdddddd,
    metalness: 0.95,
    roughness: 0.02,
    side: THREE.DoubleSide,
  });

  for (let m = 0; m < 60; m++) {
    const minuteAngle = (m * Math.PI) / 30; // 360도 / 60분

    // 5분 단위가 아닌 분 눈금 (작은 눈금)
    if (m % 5 !== 0) {
      const minuteMarker = new THREE.Mesh(minuteMarkerGeometry, minuteMarkerMaterial);
      minuteMarker.position.x = Math.sin(minuteAngle) * 1.74;
      minuteMarker.position.y = Math.cos(minuteAngle) * 1.74;
      minuteMarker.position.z = 0.255;
      minuteMarker.rotation.z = -minuteAngle;
      wristwatch.add(minuteMarker);
    }
  }

  const markerCount = cfg.markerCount || 12;
  for (let i = 0; i < markerCount; i++) {
    const marker = new THREE.Mesh(markerGeometry, markerMaterial);
    const angle = (i * Math.PI) / 6;
    marker.position.x = Math.sin(angle) * 1.65;
    marker.position.y = Math.cos(angle) * 1.65;
    marker.position.z = 0.265;
    marker.rotation.z = -angle;
    wristwatch.add(marker);

    // 다이아몬드 마커 추가 (12, 3, 6, 9 위치)
    if (i % 3 === 0) {
      const diamondGeometry = new THREE.BufferGeometry();

      const vertices = new Float32Array([
        0, 0.12, 0,       // 0: 위
        0.06, 0, 0,       // 1: 오른쪽
        0, -0.12, 0,      // 2: 아래
        -0.06, 0, 0,      // 3: 왼쪽
        0, 0, 0.04,       // 4: 앞
        0, 0, -0.04       // 5: 뒤
      ]);

      const indices = [
        0, 1, 4,
        1, 2, 4,
        2, 3, 4,
        3, 0, 4,
        0, 1, 5,
        1, 2, 5,
        2, 3, 5,
        3, 0, 5
      ];

      diamondGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      diamondGeometry.setIndex(new THREE.BufferAttribute(new Uint16Array(indices), 1));
      diamondGeometry.computeVertexNormals();

      const diamondMaterial = new THREE.MeshStandardMaterial({
        color: hexToInt(cfg.colors && cfg.colors.marker) || 0xffffff,
        metalness: 0.98,
        roughness: 0.02,
        emissive: 0x333333,
      });
      const diamond = new THREE.Mesh(diamondGeometry, diamondMaterial);
      const indexAngle = (i * Math.PI) / 6;
      diamond.position.x = Math.sin(indexAngle) * 1.5;
      diamond.position.y = Math.cos(indexAngle) * 1.5;
      diamond.position.z = 0.27;
      diamond.scale.set(1.5, 1.5, 1.5);
      wristwatch.add(diamond);
    }
  }

  // 다이얼에 서브다이얼 추가 (크로노그래프 스타일)
  const subDialGeometry = new THREE.CylinderGeometry(0.35, 0.35, 0.015, 32);

  // 3시 위치 서브다이얼
  const subDial1 = new THREE.Mesh(subDialGeometry, dialMaterial);
  subDial1.rotation.x = Math.PI / 2;
  subDial1.position.set(1.2, 0, 0.195);
  wristwatch.add(subDial1);

  // 6시 위치 서브다이얼
  const subDial2 = new THREE.Mesh(subDialGeometry, dialMaterial);
  subDial2.rotation.x = Math.PI / 2;
  subDial2.position.set(0, -1.2, 0.195);
  wristwatch.add(subDial2);

  // 9시 위치 서브다이얼
  const subDial3 = new THREE.Mesh(subDialGeometry, dialMaterial);
  subDial3.rotation.x = Math.PI / 2;
  subDial3.position.set(-1.2, 0, 0.195);
  wristwatch.add(subDial3);

  function createRealisticStrap(isTop) {
    const strapGroup = new THREE.Group();

    const segments = (cfg.strap && cfg.strap.segments) || 14;
    const totalLength = (cfg.strap && cfg.strap.totalLength) || 3.4;
    const segLength = totalLength / segments;

    const widthStart = (cfg.strap && cfg.strap.widthStart) || 1.3;
    const widthEnd = (cfg.strap && cfg.strap.widthEnd) || 0.9;
    const thickness = (cfg.strap && cfg.strap.thickness) || 0.18;

    for (let i = 0; i < segments; i++) {
      const ratioStart = i / segments;
      const ratioEnd = (i + 1) / segments;

      const wStart = widthStart - (widthStart - widthEnd) * ratioStart;
      const wEnd = widthStart - (widthStart - widthEnd) * ratioEnd;

      // 각 세그먼트를 여러 개의 작은 링크로 구성
      const linksPerSegment = 3;
      for (let l = 0; l < linksPerSegment; l++) {
        const linkGeometry = new THREE.BoxGeometry(
          (wStart + wEnd) / 2 * 0.85,
          segLength / linksPerSegment * 0.9,
          thickness * 0.9
        );

        const link = new THREE.Mesh(linkGeometry, strapMaterial);
        link.position.y = i * segLength + (l + 0.5) * (segLength / linksPerSegment);

        const curveFactor = Math.pow(ratioStart + l / (segments * linksPerSegment), 1.5) * 0.12;
        link.rotation.x = isTop ? -curveFactor : curveFactor;
        link.position.z = -Math.pow(ratioStart + l / (segments * linksPerSegment), 2) * 0.5;

        // 링크 사이에 작은 여백
        link.scale.set(0.95, 0.9, 0.95);

        strapGroup.add(link);
      }
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
  hourHandGroup.position.z = 0.27;
  const hourMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.8, 0.04),
    hourHandMaterial,
  );
  hourMesh.position.y = 0.4;
  hourHandGroup.add(hourMesh);

  // 시침 끝 원형 추가
  const hourCapGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.04, 16);
  const hourCap = new THREE.Mesh(hourCapGeometry, hourMesh.material);
  hourCap.position.y = 0.82;
  hourCap.rotation.x = Math.PI / 2;
  hourHandGroup.add(hourCap);
  wristwatch.add(hourHandGroup);

  const minuteHandGroup = new THREE.Group();
  minuteHandGroup.position.z = 0.27;
  const minuteMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 1.3, 0.03),
    minuteHandMaterial,
  );
  minuteMesh.position.y = 0.65;
  minuteHandGroup.add(minuteMesh);

  // 분침 끝 원형 추가
  const minuteCapGeometry = new THREE.CylinderGeometry(0.045, 0.045, 0.03, 16);
  const minuteCap = new THREE.Mesh(minuteCapGeometry, minuteMesh.material);
  minuteCap.position.y = 1.32;
  minuteCap.rotation.x = Math.PI / 2;
  minuteHandGroup.add(minuteCap);
  wristwatch.add(minuteHandGroup);

  const secondHandGroup = new THREE.Group();
  secondHandGroup.position.z = 0.28;
  const secondMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.03, 1.5, 0.02),
    new THREE.MeshBasicMaterial({
      color: hexToInt(cfg.colors && cfg.colors.second) || 0xd4af37,
    }),
  );
  secondMesh.position.y = 0.68;
  secondHandGroup.add(secondMesh);

  // 초침 끝 원형 추가
  const secondCapGeometry = new THREE.CylinderGeometry(0.035, 0.035, 0.02, 16);
  const secondCap = new THREE.Mesh(secondCapGeometry, secondMesh.material);
  secondCap.position.y = 1.48;
  secondCap.rotation.x = Math.PI / 2;
  secondHandGroup.add(secondCap);
  wristwatch.add(secondHandGroup);

  const pin = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.12, 0.08, 32),
    metalMaterial,
  );
  pin.rotation.x = Math.PI / 2;
  pin.position.z = 0.29;
  wristwatch.add(pin);

  scene.add(wristwatch);

  // --- UI: gallery, variants, cart ---
  const galleryEl = document.getElementById('product-gallery');
  const variantControls = document.getElementById('variant-controls');
  const addToCartBtn = document.getElementById('add-to-cart');
  const qtyInput = document.getElementById('qty');
  const cartBtn = document.getElementById('cart-btn');
  let activeVariant = null;

  function renderGallery(colors) {
    if (!galleryEl || !colors) return;
    galleryEl.innerHTML = '';
    colors.forEach((c, i) => {
      const sw = document.createElement('div');
      sw.className = 'swatch' + (i === 0 ? ' active' : '');
      sw.style.background = c;
      sw.dataset.color = c;
      sw.addEventListener('click', () => {
        document.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
        sw.classList.add('active');
        // set dial color on click
        dialMaterial.color.setHex(hexToInt(c));
      });
      galleryEl.appendChild(sw);
    });
  }

  // variants (change multiple materials)
  function renderVariants(variants) {
    if (!variantControls || !variants) return;
    variantControls.innerHTML = '';
    variants.forEach((v, idx) => {
      const btn = document.createElement('button');
      btn.className = 'swatch';
      btn.title = v.label;
      btn.style.background = v.dial;
      btn.addEventListener('click', () => {
        activeVariant = v;
        // update materials
        dialMaterial.color.setHex(hexToInt(v.dial));
        strapMaterial.color.setHex(hexToInt(v.strap));
        metalMaterial.color.setHex(hexToInt(v.metal));
        hourHandMaterial.color.setHex(hexToInt(v.metal));
        minuteHandMaterial.color.setHex(hexToInt(v.metal));

        // preserve strap appearance by keeping it matte and less reflective
        strapMaterial.metalness = 0.1;
        strapMaterial.roughness = 0.75;

        // mark active
        Array.from(variantControls.children).forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
      });
      if (idx === 0) {
        activeVariant = activeVariant || v;
        btn.classList.add('active');
      }
      variantControls.appendChild(btn);
    });
  }

  // simple cart
  const CART_KEY = 'demo_cart_v1';
  function getCart() { try { return JSON.parse(localStorage.getItem(CART_KEY)) || [] } catch (e) { return [] } }
  function saveCart(c) { localStorage.setItem(CART_KEY, JSON.stringify(c)); updateCartCount(); }
  function updateCartCount() { const c = getCart(); const count = c.reduce((s, i) => s + i.qty, 0); const el = document.getElementById('cart-count'); if (el) el.textContent = count; }

  function openCartDrawer() {
    let drawer = document.querySelector('.cart-drawer');
    if (!drawer) {
      drawer = document.createElement('div');
      drawer.className = 'cart-drawer';
      drawer.innerHTML = '<h4>Cart</h4><div id="cart-items"></div><div id="cart-total"></div>';
      document.body.appendChild(drawer);
    }
    drawer.classList.toggle('open');
    renderCartItems();
  }

  function renderCartItems() {
    const itemsEl = document.getElementById('cart-items'); const totalEl = document.getElementById('cart-total'); if (!itemsEl) return; const cart = getCart(); itemsEl.innerHTML = ''; let sum = 0; cart.forEach((it, idx) => {
      const row = document.createElement('div'); row.className = 'cart-item'; row.innerHTML = `
      <div>
        <strong>${it.name}</strong> <small style="color:#aaa;">(${it.variant || 'Default'})</small>
        ${it.color ? `<div style="margin-top:4px; display:flex; align-items:center;"><span style="width:12px; height:12px; border-radius:50%; background:${it.color}; display:inline-block; margin-right:8px;"></span><span style="font-size:0.85rem; color:#ccc;">Selected strap color</span></div>` : ''}
      </div>
      <div>
        <div>${it.price}</div>
        <button type="button" class="cart-remove-btn">Remove</button>
      </div>
    `; itemsEl.appendChild(row);
      const removeBtn = row.querySelector('.cart-remove-btn');
      if (removeBtn) {
        removeBtn.addEventListener('click', () => {
          cart.splice(idx, 1);
          saveCart(cart);
          renderCartItems();
        });
      }
      sum += parseInt(String(it.price).replace(/[^0-9]/g, '')) * it.qty;
    }); if (totalEl) totalEl.textContent = cart.length ? ('Total: ' + (sum ? sum + ' KRW' : '—')) : 'Cart is empty';
  }

  cartBtn && cartBtn.addEventListener('click', openCartDrawer);

  addToCartBtn && addToCartBtn.addEventListener('click', () => {
    const qty = Math.max(1, parseInt(qtyInput.value) || 1);
    const cfgProduct = cfg.product || {};
    const cart = getCart();
    const existing = cart.find(i => i.id === (cfgProduct.sku || cfgProduct.name) && i.variant === (activeVariant ? activeVariant.label : 'Default'));
    const itemData = {
      id: cfgProduct.sku || cfgProduct.name,
      name: cfgProduct.name,
      price: cfgProduct.price,
      qty,
      variant: activeVariant ? activeVariant.label : 'Default',
      color: activeVariant ? activeVariant.strap : '',
    };
    if (existing) existing.qty += qty;
    else cart.push(itemData);
    saveCart(cart);
    // brief feedback
    addToCartBtn.textContent = 'Added ✓'; setTimeout(() => addToCartBtn.textContent = 'Add to Cart', 800);
  });

  // initial render of gallery & variants & cart count
  renderGallery((cfg.product && cfg.product.gallery) || []);
  renderVariants((cfg.product && cfg.product.variants) || []);
  // ensure latest from server (workaround for any timing/cache issues)
  fetch('/data.json?ts=' + Date.now())
    .then(r => r.json())
    .then(d => {
      renderGallery((d.product && d.product.gallery) || []);
      renderVariants((d.product && d.product.variants) || []);
    })
    .catch(() => { });
  updateCartCount();

  // Make the watch face visible by default
  wristwatch.rotation.x = -0.5;
  wristwatch.rotation.y = 0.4;

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
