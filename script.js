document.documentElement.classList.add("js");

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

setupReveal();
setupCounters();
setupImageTilt();
setupActivityBoard();
loadMountainGame();
setupMemoryButtons();
setupLightbox();
loadGarage();

function setupReveal() {
  const items = [...document.querySelectorAll(".reveal")];

  if (!("IntersectionObserver" in window) || reducedMotion) {
    items.forEach((item) => item.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.16 }
  );

  items.forEach((item) => observer.observe(item));
}

function setupCounters() {
  const counters = [...document.querySelectorAll("[data-count]")];
  const numberFormat = new Intl.NumberFormat("en-IN");

  const runCounter = (counter) => {
    const target = Number(counter.dataset.count);
    const duration = reducedMotion ? 1 : 1200;
    const start = performance.now();

    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      counter.textContent = numberFormat.format(Math.round(target * eased));

      if (progress < 1) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  };

  if (!("IntersectionObserver" in window)) {
    counters.forEach(runCounter);
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          runCounter(entry.target);
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.6 }
  );

  counters.forEach((counter) => observer.observe(counter));
}

function setupImageTilt() {
  if (reducedMotion || matchMedia("(pointer: coarse)").matches) return;

  document.querySelectorAll(".vehicle-card").forEach((card) => {
    card.addEventListener("pointermove", (event) => {
      const bounds = card.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width - 0.5;
      const y = (event.clientY - bounds.top) / bounds.height - 0.5;
      card.style.transform = `perspective(1200px) rotateX(${y * -2}deg) rotateY(${x * 2}deg)`;
    });

    card.addEventListener("pointerleave", () => {
      card.style.transform = "";
    });
  });
}

function setupActivityBoard() {
  const board = document.querySelector(".activity-board");
  if (!board) return;

  const copy = {
    activa: {
      label: "Activa mode",
      title: "Daily run, no drama.",
      text:
        "The Activa activity is simple: start, carry, wait, return. It is the everyday machine that made riding feel normal and mine.",
      distance: "41,000 km",
      mood: "Steady",
    },
    yezdi: {
      label: "Yezdi mode",
      title: "Night loop, slow glow.",
      text:
        "The Roadster activity is for quiet roads, gate lights, dark paint, and that heavy old-school feeling after sunset.",
      distance: "20,000 km",
      mood: "Cinematic",
    },
    cbr: {
      label: "CBR mode",
      title: "Hill memory, full heart.",
      text:
        "The CBR activity is the waterfall stop, the orange fairing, the photo that stayed, and the gratitude I still carry.",
      distance: "Priceless",
      mood: "Grateful",
    },
    all: {
      label: "Garage mode",
      title: "All three in one ritual.",
      text:
        "The garage activity keeps all three moving together: daily courage, night presence, and the bright sport-bike memory.",
      distance: "3 rides",
      mood: "Loved",
    },
  };

  const label = document.querySelector("#activityLabel");
  const title = document.querySelector("#activityTitle");
  const text = document.querySelector("#activityText");
  const distance = document.querySelector("#activityDistance");
  const mood = document.querySelector("#activityMood");

  const setActivity = (activity) => {
    const active = copy[activity] || copy.activa;
    board.dataset.activeRide = activity;
    document.querySelectorAll("[data-activity]").forEach((item) => {
      item.classList.toggle("is-active", item.dataset.activity === activity);
    });
    document.querySelectorAll("[data-road-activity]").forEach((item) => {
      item.setAttribute("aria-pressed", String(item.dataset.roadActivity === activity));
    });

    label.textContent = active.label;
    title.textContent = active.title;
    text.textContent = active.text;
    distance.textContent = active.distance;
    mood.textContent = active.mood;
  };

  document.querySelectorAll("[data-activity]").forEach((button) => {
    button.addEventListener("click", () => setActivity(button.dataset.activity));
  });

  document.querySelectorAll("[data-road-activity]").forEach((button) => {
    button.addEventListener("click", () => setActivity(button.dataset.roadActivity));
  });
}

async function loadMountainGame() {
  const canvas = document.querySelector("#mountainGameCanvas");
  const badge = document.querySelector("#gameStateBadge");
  if (!canvas) return;

  try {
    const THREE = await loadThreeModule();
    initMountainGame(THREE, canvas);
  } catch (error) {
    if (badge) badge.textContent = "3D could not load, opening fallback ride";
    console.warn("3D mountain game could not load", error);
    setupMountainCanvasFallback();
  }
}

async function loadThreeModule() {
  const sources = [
    "./assets/vendor/three.module.min.js",
    "https://unpkg.com/three@0.165.0/build/three.module.js",
    "https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js",
  ];

  let lastError;
  for (const source of sources) {
    try {
      return await Promise.race([
        import(source),
        new Promise((_, reject) => {
          window.setTimeout(() => reject(new Error(`Timed out loading ${source}`)), 7000);
        }),
      ]);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("Three.js could not load");
}

function initMountainGame(THREE, canvas) {
  const stage = canvas.parentElement;
  const gameRoot = canvas.closest(".mountain-game");
  if (gameRoot) gameRoot.dataset.gameRenderer = "webgl";
  const badge = document.querySelector("#gameStateBadge");
  const scoreStat = document.querySelector("#gameScore");
  const comboStat = document.querySelector("#gameCombo");
  const speedStat = document.querySelector("#gameSpeed");
  const distanceStat = document.querySelector("#gameDistance");
  const lightsStat = document.querySelector("#gameLights");
  const heartsStat = document.querySelector("#gameHearts");
  const jumpsStat = document.querySelector("#gameJumps");
  const bestStat = document.querySelector("#gameBest");
  const nitroText = document.querySelector("#gameNitroText");
  const nitroFill = document.querySelector("#gameNitroFill");
  const startButton = document.querySelector("[data-game-start]");
  const restartButton = document.querySelector("[data-game-restart]");
  const rideButtons = [...document.querySelectorAll("[data-game-ride]")];
  const controlButtons = [...document.querySelectorAll("[data-game-control]")];
  const storageKey = "tribute-3d-mountain-best-score";

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    preserveDrawingBuffer: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0xb8c4ba, 1);

  const scene = new THREE.Scene();
  scene.background = createSkyTexture(THREE);
  scene.fog = new THREE.Fog(0xa9bbb2, 82, 205);

  const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 280);
  camera.position.set(0, 3.8, 9.4);

  const ambient = new THREE.HemisphereLight(0xf9e8bd, 0x263829, 1.55);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xffd58a, 4.1);
  sun.position.set(-8, 14, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -24;
  sun.shadow.camera.right = 24;
  sun.shadow.camera.top = 24;
  sun.shadow.camera.bottom = -18;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 80;
  scene.add(sun);

  const rim = new THREE.PointLight(0xef6b1b, 15, 35);
  rim.position.set(6, 5, 4);
  scene.add(rim);

  const materials = createMaterials(THREE);
  const asphaltTexture = createAsphaltTexture(THREE);
  const roadMaterial = new THREE.MeshStandardMaterial({
    color: 0x30322e,
    roughness: 0.96,
    metalness: 0.01,
    map: asphaltTexture,
  });
  const shoulderMaterial = new THREE.MeshStandardMaterial({ color: 0x4b6243, roughness: 0.94, metalness: 0.01 });
  const edgeMaterial = new THREE.MeshStandardMaterial({
    color: 0xf1ead7,
    roughness: 0.7,
    metalness: 0.02,
    emissive: 0x15110a,
  });
  const railMaterial = new THREE.MeshStandardMaterial({ color: 0xbcb6a8, roughness: 0.42, metalness: 0.54 });
  const postMaterial = new THREE.MeshStandardMaterial({ color: 0x655640, roughness: 0.78, metalness: 0.12 });
  const scrubMaterial = new THREE.MeshStandardMaterial({ color: 0x6f7c52, roughness: 0.9, metalness: 0.01 });
  const dashMaterial = new THREE.MeshStandardMaterial({
    color: 0xd8a64d,
    roughness: 0.58,
    metalness: 0.08,
    emissive: 0x241200,
  });
  const rockMaterial = new THREE.MeshStandardMaterial({ color: 0x3d3529, roughness: 0.86, metalness: 0.02 });
  const treeTrunkMaterial = new THREE.MeshStandardMaterial({ color: 0x4a3320, roughness: 0.9, metalness: 0.01 });
  const treeLeafMaterial = new THREE.MeshStandardMaterial({ color: 0x213d2a, roughness: 0.86, metalness: 0.01 });
  const lightMaterial = new THREE.MeshStandardMaterial({
    color: 0xf8f6f0,
    emissive: 0xd8a64d,
    emissiveIntensity: 1.55,
    roughness: 0.28,
    metalness: 0.08,
  });
  const boostMaterial = new THREE.MeshStandardMaterial({
    color: 0xf07818,
    emissive: 0xb92720,
    emissiveIntensity: 1.2,
    roughness: 0.42,
    metalness: 0.18,
  });
  const checkpointMaterial = new THREE.MeshStandardMaterial({
    color: 0x20231f,
    roughness: 0.5,
    metalness: 0.58,
  });
  const checkpointAccentMaterial = new THREE.MeshStandardMaterial({
    color: 0xef6b1b,
    emissive: 0x6f1c04,
    emissiveIntensity: 0.8,
    roughness: 0.36,
    metalness: 0.34,
  });
  const reflectorMaterial = new THREE.MeshStandardMaterial({
    color: 0xfff2bd,
    emissive: 0xd86f15,
    emissiveIntensity: 1.4,
    roughness: 0.28,
  });

  const roadWidth = 8.2;
  const roadSegments = 96;
  const roadLength = 190;
  const localStart = 26;
  const localStep = roadLength / roadSegments;
  const roadGeometry = new THREE.BufferGeometry();
  const roadPositions = new Float32Array((roadSegments + 1) * 2 * 3);
  const roadUvs = new Float32Array((roadSegments + 1) * 2 * 2);
  const roadIndices = [];
  for (let i = 0; i < roadSegments; i += 1) {
    const row = i * 2;
    roadIndices.push(row, row + 1, row + 2, row + 1, row + 3, row + 2);
  }
  for (let i = 0; i <= roadSegments; i += 1) {
    const row = i * 4;
    roadUvs[row] = 0;
    roadUvs[row + 1] = i * 0.42;
    roadUvs[row + 2] = 1;
    roadUvs[row + 3] = i * 0.42;
  }
  roadGeometry.setAttribute("position", new THREE.BufferAttribute(roadPositions, 3));
  roadGeometry.setAttribute("uv", new THREE.BufferAttribute(roadUvs, 2));
  roadGeometry.setIndex(roadIndices);
  const roadMesh = new THREE.Mesh(roadGeometry, roadMaterial);
  roadMesh.receiveShadow = true;
  scene.add(roadMesh);

  const terrainGeometry = new THREE.BufferGeometry();
  const terrainPositions = new Float32Array((roadSegments + 1) * 4 * 3);
  const terrainIndices = [];
  for (let i = 0; i < roadSegments; i += 1) {
    const row = i * 4;
    terrainIndices.push(row, row + 1, row + 4, row + 1, row + 5, row + 4);
    terrainIndices.push(row + 2, row + 3, row + 6, row + 3, row + 7, row + 6);
  }
  terrainGeometry.setAttribute("position", new THREE.BufferAttribute(terrainPositions, 3));
  terrainGeometry.setIndex(terrainIndices);
  const terrainMesh = new THREE.Mesh(terrainGeometry, shoulderMaterial);
  terrainMesh.receiveShadow = true;
  scene.add(terrainMesh);

  const valleyFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(520, 640, 1, 1),
    new THREE.MeshStandardMaterial({ color: 0x6c7c60, roughness: 0.98, metalness: 0.01 })
  );
  valleyFloor.rotation.x = -Math.PI / 2;
  valleyFloor.position.set(0, -7.0, -70);
  scene.add(valleyFloor);

  const dashMeshes = Array.from({ length: 26 }, () => {
    const dash = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.035, 1.95), dashMaterial);
    scene.add(dash);
    return dash;
  });

  const roadEdgeMeshes = Array.from({ length: 48 }, (_, index) => {
    const edge = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.035, 2.6), edgeMaterial);
    edge.userData.side = index % 2 === 0 ? -1 : 1;
    edge.userData.slot = Math.floor(index / 2);
    scene.add(edge);
    return edge;
  });

  const railMeshes = Array.from({ length: 42 }, (_, index) => {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.13, 3.1), railMaterial);
    rail.userData.side = index % 2 === 0 ? -1 : 1;
    rail.userData.slot = Math.floor(index / 2);
    scene.add(rail);
    return rail;
  });

  const railPosts = Array.from({ length: 38 }, (_, index) => {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.82, 0.18), postMaterial);
    post.userData.side = index % 2 === 0 ? -1 : 1;
    post.userData.slot = Math.floor(index / 2);
    scene.add(post);
    return post;
  });

  const delineators = Array.from({ length: 34 }, (_, index) => {
    const marker = createDelineator(THREE, edgeMaterial, reflectorMaterial);
    marker.userData.side = index % 2 === 0 ? -1 : 1;
    marker.userData.slot = Math.floor(index / 2);
    scene.add(marker);
    return marker;
  });

  const chevrons = Array.from({ length: 16 }, (_, index) => {
    const sign = createChevronSign(THREE, checkpointMaterial, checkpointAccentMaterial);
    sign.userData.slot = index;
    scene.add(sign);
    return sign;
  });

  const scrubMeshes = Array.from({ length: 60 }, (_, index) => {
    const scrub = new THREE.Mesh(new THREE.DodecahedronGeometry(0.24 + Math.random() * 0.31, 0), scrubMaterial);
    scrub.userData.worldS = -10 + index * 5.3;
    scrub.userData.side = index % 2 === 0 ? -1 : 1;
    scrub.userData.offset = 4.8 + Math.random() * 7.7;
    scene.add(scrub);
    return scrub;
  });

  const skySun = new THREE.Mesh(
    new THREE.SphereGeometry(3.6, 32, 16),
    new THREE.MeshBasicMaterial({ color: 0xd8a64d })
  );
  skySun.position.set(24, 22, -92);
  scene.add(skySun);

  const sunGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: createGlowTexture(THREE),
      color: 0xffd58a,
      transparent: true,
      opacity: 0.36,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    })
  );
  sunGlow.position.copy(skySun.position);
  sunGlow.scale.set(9, 9, 1);
  scene.add(sunGlow);

  const mountainGroup = new THREE.Group();
  scene.add(mountainGroup);
  for (let i = 0; i < 24; i += 1) {
    const mountain = createMountainModel(THREE, i);
    mountain.position.set(-78 + i * 6.9, -1.5 + (i % 3), -116 - (i % 5) * 11);
    const scale = 0.78 + (i % 6) * 0.11;
    mountain.scale.set(scale, 0.9 + (i % 4) * 0.13, scale);
    mountain.rotation.y = (i % 5) * 0.27;
    mountainGroup.add(mountain);
  }

  const clouds = Array.from({ length: 8 }, (_, index) => {
    const cloud = createCloud(THREE);
    cloud.position.set(-74 + index * 21, 19 + (index % 3) * 3.2, -68 - (index % 4) * 18);
    cloud.scale.setScalar(1.8 + (index % 4) * 0.55);
    cloud.userData.drift = 0.08 + (index % 3) * 0.025;
    scene.add(cloud);
    return cloud;
  });

  const treeTemplate = createTree(THREE, treeTrunkMaterial, treeLeafMaterial);
  const trees = Array.from({ length: 54 }, (_, index) => {
    const tree = treeTemplate.clone(true);
    tree.userData.worldS = -20 + index * 6.8;
    tree.userData.side = index % 2 === 0 ? -1 : 1;
    tree.userData.offset = 5.5 + Math.random() * 11;
    tree.userData.scale = 0.75 + Math.random() * 0.95;
    tree.scale.setScalar(tree.userData.scale);
    scene.add(tree);
    return tree;
  });

  const dustField = createParticleField(THREE, 44, 0xc6a36a, 0.18, 0.52);
  const nitroField = createParticleField(THREE, 34, 0xef6b1b, 0.13, 0.88);
  scene.add(dustField.points, nitroField.points);

  const rideProfiles = {
    activa: {
      name: "Activa",
      idleSpeed: 5.4,
      maxSpeed: 20.5,
      acceleration: 8.8,
      braking: 14.5,
      steer: 15.2,
      traction: 5.0,
      jump: 8.4,
      factory: createScooter,
      scale: 1.02,
      yOffset: 0.18,
    },
    yezdi: {
      name: "Yezdi",
      idleSpeed: 5.8,
      maxSpeed: 24.5,
      acceleration: 11.2,
      braking: 15.8,
      steer: 14.2,
      traction: 4.35,
      jump: 8.1,
      factory: createRoadster,
      scale: 1.02,
      yOffset: 0.18,
    },
    cbr: {
      name: "CBR",
      idleSpeed: 6.2,
      maxSpeed: 30.5,
      acceleration: 14.6,
      braking: 18.4,
      steer: 17.2,
      traction: 5.35,
      jump: 9.1,
      factory: createSportBike,
      scale: 1.02,
      yOffset: 0.12,
    },
  };

  const controls = {
    left: false,
    right: false,
    jump: false,
    gas: false,
    brake: false,
    nitro: false,
  };

  const state = {
    ride: "activa",
    running: false,
    over: false,
    hasStarted: false,
    distance: 0,
    speed: rideProfiles.activa.idleSpeed,
    lane: 0,
    lateralVelocity: 0,
    lean: 0,
    jumpY: 0,
    jumpVelocity: 0,
    jumpCooldown: 0,
    airTime: 0,
    suspension: 0,
    landingKick: 0,
    score: 0,
    combo: 1,
    comboTimer: 0,
    nearMisses: 0,
    lights: 0,
    jumps: 0,
    hearts: 3,
    boostTimer: 0,
    nitro: 35,
    nitroActive: false,
    crashTimer: 0,
    offRoad: 0,
    bestScore: 0,
    nextSpawn: 38,
    lastSpawnType: "light",
    checkpoints: 0,
    nextCheckpoint: 62,
    checkpointGate: null,
    messageTimer: 0,
    flash: 0,
    lastTime: 0,
    obstacles: [],
    rings: [],
  };

  try {
    state.bestScore = Number(localStorage.getItem(storageKey) || 0);
  } catch {
    state.bestScore = 0;
  }

  let player = null;
  let playerLight = null;
  let resizeQueued = true;

  const randomBetween = (min, max) => min + Math.random() * (max - min);
  const scoreFormat = new Intl.NumberFormat("en-IN");
  const formatKm = (value) => `${value.toFixed(1)} km`;
  const formatScore = (value) => scoreFormat.format(Math.max(0, Math.floor(value)));
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  function roadCenterX(worldS) {
    return Math.sin(worldS * 0.038) * 4.4 + Math.sin(worldS * 0.012 + 1.2) * 6.2;
  }

  function roadY(worldS) {
    return Math.sin(worldS * 0.052) * 1.05 + Math.sin(worldS * 0.018 + 0.7) * 2.35;
  }

  function roadCurve(worldS) {
    return (roadCenterX(worldS + 2.2) - roadCenterX(worldS - 2.2)) / 4.4;
  }

  function roadBank(worldS) {
    return clamp(roadCurve(worldS) * 0.055, -0.16, 0.16);
  }

  function roadSurfaceY(worldS, lane = 0) {
    const crown = -Math.abs(lane) * 0.018;
    return roadY(worldS) + lane * roadBank(worldS) + crown;
  }

  function roadSlope(worldS, lane = 0) {
    return Math.atan2(roadSurfaceY(worldS + 1.8, lane) - roadSurfaceY(worldS - 1.8, lane), 3.6);
  }

  function roadHeading(worldS) {
    return Math.atan2(roadCenterX(worldS + 2.6) - roadCenterX(worldS - 2.6), 5.2);
  }

  function roadPoint(worldS, lane = 0) {
    return new THREE.Vector3(roadCenterX(worldS) + lane, roadSurfaceY(worldS, lane), state.distance - worldS);
  }

  function setBadge(text) {
    if (!badge) return;
    badge.textContent = text;
    state.messageTimer = 1.9;
  }

  function updateStats() {
    const nitroPercent = Math.round(state.nitro);
    const km = state.distance / 42;
    if (scoreStat) scoreStat.textContent = formatScore(state.score);
    if (comboStat) comboStat.textContent = `${state.combo}x`;
    if (speedStat) speedStat.textContent = `${Math.round(state.speed * 3.25)} km/h`;
    if (distanceStat) distanceStat.textContent = formatKm(km);
    if (lightsStat) lightsStat.textContent = String(state.lights);
    if (heartsStat) heartsStat.textContent = String(state.hearts);
    if (jumpsStat) jumpsStat.textContent = String(state.jumps);
    if (bestStat) bestStat.textContent = formatScore(Math.max(state.bestScore, state.score));
    if (nitroText) nitroText.textContent = `${nitroPercent}%`;
    if (nitroFill) nitroFill.style.transform = `scaleX(${clamp(state.nitro / 100, 0, 1)})`;
    if (gameRoot) {
      gameRoot.classList.toggle("is-nitro", state.nitroActive);
      gameRoot.dataset.gameRunning = String(state.running);
      gameRoot.dataset.gameSpeed = String(Math.round(state.speed * 3.25));
      gameRoot.dataset.gameScore = String(Math.floor(state.score));
      gameRoot.dataset.gameDistance = state.distance.toFixed(2);
      gameRoot.dataset.gameLane = state.lane.toFixed(3);
      gameRoot.dataset.gameJumps = String(state.jumps);
      gameRoot.dataset.gameOffRoad = state.offRoad.toFixed(3);
      gameRoot.dataset.gameNitro = String(nitroPercent);
      gameRoot.dataset.gameCheckpoints = String(state.checkpoints);
    }
  }

  function saveBest() {
    if (state.score <= state.bestScore) return;
    state.bestScore = state.score;
    try {
      localStorage.setItem(storageKey, String(state.bestScore));
    } catch {
      return;
    }
  }

  function addScore(points, reason) {
    const gained = Math.max(0, Math.round(points));
    if (gained === 0) return;
    state.score += gained;
    if (reason) setBadge(`+${formatScore(gained)} ${reason}`);
  }

  function buildCombo() {
    state.combo = clamp(state.combo + 1, 1, 8);
    state.comboTimer = 7.5;
  }

  function reduceCombo() {
    state.combo = 1;
    state.comboTimer = 0;
  }

  function applyRockPenalty() {
    const penalty = Math.min(450, Math.round(state.score * 0.12) + 120);
    state.score = Math.max(0, state.score - penalty);
    reduceCombo();
    return penalty;
  }

  function makePlayer(ride) {
    if (player) {
      scene.remove(player);
      player.traverse((child) => {
        child.geometry?.dispose?.();
      });
    }

    const profile = rideProfiles[ride];
    player = profile.factory(THREE, materials);
    const rider = createRider(THREE, materials, ride);
    player.add(rider);
    player.userData.rider = rider;
    player.scale.setScalar(profile.scale);
    player.rotation.y = Math.PI / 2;
    player.traverse((child) => {
      if (!child.isMesh) return;
      child.castShadow = true;
      child.receiveShadow = true;
    });
    player.userData.lights?.forEach((light) => {
      light.intensity = 0.9;
      light.distance = 4;
    });
    scene.add(player);

    if (!playerLight) {
      playerLight = new THREE.PointLight(0xffe0a6, 8, 12);
      scene.add(playerLight);
    }
  }

  function resetGame() {
    saveBest();
    state.running = false;
    state.over = false;
    state.hasStarted = false;
    state.distance = 0;
    state.speed = rideProfiles[state.ride].idleSpeed;
    state.lane = 0;
    state.lateralVelocity = 0;
    state.lean = 0;
    state.jumpY = 0;
    state.jumpVelocity = 0;
    state.jumpCooldown = 0;
    state.airTime = 0;
    state.suspension = 0;
    state.landingKick = 0;
    state.score = 0;
    state.combo = 1;
    state.comboTimer = 0;
    state.nearMisses = 0;
    state.lights = 0;
    state.jumps = 0;
    state.hearts = 3;
    state.boostTimer = 0;
    state.nitro = 35;
    state.nitroActive = false;
    state.crashTimer = 0;
    state.offRoad = 0;
    state.nextSpawn = 38;
    state.lastSpawnType = "light";
    state.checkpoints = 0;
    state.nextCheckpoint = 62;
    state.flash = 0;
    state.obstacles.forEach((item) => scene.remove(item.mesh));
    state.rings.forEach((ring) => scene.remove(ring));
    state.obstacles = [];
    state.rings = [];
    if (state.checkpointGate) scene.remove(state.checkpointGate.mesh);
    state.checkpointGate = null;
    resetParticleField(dustField);
    resetParticleField(nitroField);
    if (startButton) startButton.textContent = "Start ride";
    setBadge("Press W to throttle and Space to jump");
    updateStats();
  }

  function setRide(ride) {
    if (!rideProfiles[ride]) return;
    state.ride = ride;
    rideButtons.forEach((button) => {
      const active = button.dataset.gameRide === ride;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    makePlayer(ride);
    if (!state.running) resetGame();
    setBadge(`${rideProfiles[ride].name} selected`);
  }

  function startRide() {
    if (state.running) return;
    if (state.over) resetGame();
    state.running = true;
    state.hasStarted = true;
    canvas.focus({ preventScroll: true });
    if (startButton) startButton.textContent = "Pause";
    setBadge(`${rideProfiles[state.ride].name} is rolling - hold W for speed`);
    updateStats();
  }

  function pauseRide() {
    if (!state.running || state.over) return;
    state.running = false;
    state.nitroActive = false;
    clearControls();
    if (startButton) startButton.textContent = "Resume ride";
    setBadge("Ride paused");
    updateStats();
  }

  function toggleRide() {
    if (state.running) pauseRide();
    else startRide();
  }

  function finishRide() {
    state.running = false;
    state.over = true;
    state.nitroActive = false;
    clearControls();
    saveBest();
    if (startButton) startButton.textContent = "Start ride";
    setBadge(`Ride finished: ${formatScore(state.score)} pts`);
    updateStats();
  }

  function restartRide() {
    resetGame();
    startRide();
  }

  function jumpBike() {
    if (!state.running || state.over || state.jumpY > 0.04 || state.jumpCooldown > 0 || state.speed < 2.5) return;
    const profile = rideProfiles[state.ride];
    const speedLift = 0.78 + (state.speed / profile.maxSpeed) * 0.26;
    state.jumpVelocity = profile.jump * speedLift;
    state.jumpCooldown = 0.38;
    state.airTime = 0;
    setBadge("Airborne");
  }

  function setControl(control, active) {
    if (!(control in controls)) return;
    controls[control] = active;
    controlButtons.forEach((button) => {
      if (button.dataset.gameControl === control) button.classList.toggle("is-held", active);
    });
  }

  function clearControls() {
    Object.keys(controls).forEach((control) => setControl(control, false));
  }

  function gameHasKeyboardFocus() {
    return state.running || gameRoot?.contains(document.activeElement);
  }

  function createRock(worldS, lane) {
    const mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(randomBetween(0.34, 0.56), 0), rockMaterial);
    mesh.castShadow = false;
    return { type: "rock", worldS, lane, mesh, hit: false };
  }

  function createLight(worldS, lane) {
    const group = new THREE.Group();
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.28, 18, 12), lightMaterial);
    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(0.54, 18, 12),
      new THREE.MeshBasicMaterial({ color: 0xd8a64d, transparent: true, opacity: 0.22 })
    );
    group.add(core, halo);
    return { type: "light", worldS, lane, mesh: group, hit: false };
  }

  function createBoostPad(worldS, lane) {
    const group = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.08, 2.25), boostMaterial);
    base.receiveShadow = true;
    group.add(base);
    for (let index = -1; index <= 1; index += 1) {
      const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 0.035, 1.45),
        new THREE.MeshBasicMaterial({ color: 0xffd58a })
      );
      stripe.position.set(index * 0.38, 0.07, -0.08);
      stripe.rotation.y = -0.28;
      group.add(stripe);
    }
    return { type: "boost", worldS, lane, mesh: group, hit: false };
  }

  function createCheckpointGate(worldS) {
    const group = new THREE.Group();
    const leftPost = new THREE.Mesh(new THREE.BoxGeometry(0.24, 3.2, 0.24), checkpointMaterial);
    const rightPost = leftPost.clone();
    leftPost.position.set(-roadWidth / 2 - 0.35, 1.55, 0);
    rightPost.position.set(roadWidth / 2 + 0.35, 1.55, 0);
    const beam = new THREE.Mesh(new THREE.BoxGeometry(roadWidth + 1.1, 0.32, 0.32), checkpointAccentMaterial);
    beam.position.y = 3.12;
    const banner = new THREE.Mesh(
      new THREE.PlaneGeometry(3.2, 0.62),
      new THREE.MeshBasicMaterial({ map: createCheckpointBannerTexture(THREE), transparent: true, side: THREE.DoubleSide })
    );
    banner.position.set(0, 3.12, 0.18);
    const lamps = [];
    for (let index = 0; index < 7; index += 1) {
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 8), reflectorMaterial);
      lamp.position.set(-3 + index, 3.33, 0.08);
      lamps.push(lamp);
      group.add(lamp);
    }
    group.add(leftPost, rightPost, beam, banner);
    group.userData.lamps = lamps;
    group.traverse((child) => {
      if (child.isMesh) child.castShadow = true;
    });
    return { worldS, mesh: group, hit: false };
  }

  function updateCheckpoint(dt) {
    if (!state.checkpointGate && state.nextCheckpoint < state.distance + 108) {
      state.checkpointGate = createCheckpointGate(state.nextCheckpoint);
      scene.add(state.checkpointGate.mesh);
    }

    const gate = state.checkpointGate;
    if (!gate) return;
    const point = roadPoint(gate.worldS, 0);
    gate.mesh.position.copy(point);
    gate.mesh.rotation.y = roadHeading(gate.worldS);
    gate.mesh.userData.lamps.forEach((lamp, index) => {
      const pulse = Math.sin(performance.now() * 0.009 + index * 0.9);
      lamp.scale.setScalar(0.9 + pulse * 0.18);
    });

    const bikeWorldS = state.distance - 2.2;
    if (!gate.hit && gate.worldS <= bikeWorldS + 0.25) {
      gate.hit = true;
      state.checkpoints += 1;
      state.nitro = Math.min(100, state.nitro + 28);
      if (state.checkpoints % 3 === 0 && state.hearts < 3) state.hearts += 1;
      addScore(650 * state.combo, `checkpoint ${state.checkpoints}`);
      buildCombo();
      const ringPosition = point.clone();
      ringPosition.y += 1.5;
      addRing(ringPosition, 0xef6b1b);
    }

    if (gate.worldS < state.distance - 18) {
      scene.remove(gate.mesh);
      state.checkpointGate = null;
      state.nextCheckpoint += randomBetween(150, 185);
    }
  }

  function spawnObjects() {
    while (state.nextSpawn < state.distance + 96) {
      const lane = randomBetween(-roadWidth * 0.33, roadWidth * 0.33);
      const roll = Math.random();
      let type = roll < 0.48 ? "light" : roll < 0.82 ? "rock" : "boost";
      if (type === "rock" && state.lastSpawnType === "rock") type = Math.random() < 0.65 ? "light" : "boost";
      const item =
        type === "light"
          ? createLight(state.nextSpawn, lane)
          : type === "rock"
            ? createRock(state.nextSpawn, lane)
            : createBoostPad(state.nextSpawn, lane);
      scene.add(item.mesh);
      state.obstacles.push(item);
      state.lastSpawnType = type;
      state.nextSpawn += randomBetween(11, 18);
    }
  }

  function addRing(position, color) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.65, 0.025, 8, 32),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 })
    );
    ring.position.copy(position);
    ring.rotation.x = Math.PI / 2;
    ring.userData.age = 0;
    scene.add(ring);
    state.rings.push(ring);
  }

  function updateRoadMesh() {
    for (let i = 0; i <= roadSegments; i += 1) {
      const z = localStart - i * localStep;
      const worldS = state.distance - z;
      const center = roadCenterX(worldS);
      const roadLeft = center - roadWidth / 2;
      const roadRight = center + roadWidth / 2;
      const roadLeftY = roadSurfaceY(worldS, -roadWidth / 2);
      const roadRightY = roadSurfaceY(worldS, roadWidth / 2);
      const roadCenterY = roadSurfaceY(worldS, 0);
      const bend = Math.sin(worldS * 0.03);
      const roadIndex = i * 6;
      roadPositions[roadIndex] = roadLeft;
      roadPositions[roadIndex + 1] = roadLeftY;
      roadPositions[roadIndex + 2] = z;
      roadPositions[roadIndex + 3] = roadRight;
      roadPositions[roadIndex + 4] = roadRightY;
      roadPositions[roadIndex + 5] = z;

      const terrainIndex = i * 12;
      terrainPositions[terrainIndex] = roadLeft - 38 - bend * 3;
      terrainPositions[terrainIndex + 1] = roadCenterY - 1.35 - Math.sin(worldS * 0.026) * 0.45;
      terrainPositions[terrainIndex + 2] = z;
      terrainPositions[terrainIndex + 3] = roadLeft - 0.25;
      terrainPositions[terrainIndex + 4] = roadLeftY - 0.06;
      terrainPositions[terrainIndex + 5] = z;
      terrainPositions[terrainIndex + 6] = roadRight + 0.25;
      terrainPositions[terrainIndex + 7] = roadRightY - 0.06;
      terrainPositions[terrainIndex + 8] = z;
      terrainPositions[terrainIndex + 9] = roadRight + 38 + bend * 3;
      terrainPositions[terrainIndex + 10] = roadCenterY - 1.25 + Math.cos(worldS * 0.028) * 0.45;
      terrainPositions[terrainIndex + 11] = z;
    }

    roadGeometry.attributes.position.needsUpdate = true;
    terrainGeometry.attributes.position.needsUpdate = true;
    roadGeometry.computeVertexNormals();
    terrainGeometry.computeVertexNormals();

    dashMeshes.forEach((dash, index) => {
      const worldS = Math.floor((state.distance + index * 5.4) / 5.4) * 5.4 + 14;
      const point = roadPoint(worldS, 0);
      dash.position.copy(point);
      dash.position.y += 0.035;
      dash.rotation.set(-roadSlope(worldS, 0), roadHeading(worldS) * 0.2, -roadBank(worldS));
    });

    roadEdgeMeshes.forEach((edge) => {
      const worldS = Math.floor((state.distance + edge.userData.slot * 3.4) / 3.4) * 3.4 + 10;
      const point = roadPoint(worldS, edge.userData.side * (roadWidth / 2 - 0.22));
      edge.position.copy(point);
      edge.position.y += 0.055;
      edge.rotation.set(-roadSlope(worldS, edge.userData.side * (roadWidth / 2 - 0.22)), roadHeading(worldS) * 0.22, -roadBank(worldS));
    });

    railMeshes.forEach((rail) => {
      const worldS = Math.floor((state.distance + rail.userData.slot * 6.1) / 6.1) * 6.1 + 8;
      const point = roadPoint(worldS, rail.userData.side * (roadWidth / 2 + 1.45));
      rail.position.copy(point);
      rail.position.y += 0.92;
      rail.rotation.set(-roadSlope(worldS, rail.userData.side * (roadWidth / 2 + 1.45)), roadHeading(worldS) * 0.22, -roadBank(worldS));
    });

    railPosts.forEach((post) => {
      const worldS = Math.floor((state.distance + post.userData.slot * 7.2) / 7.2) * 7.2 + 7;
      const point = roadPoint(worldS, post.userData.side * (roadWidth / 2 + 1.5));
      post.position.copy(point);
      post.position.y += 0.42;
      post.rotation.set(-roadSlope(worldS, post.userData.side * (roadWidth / 2 + 1.5)), 0, -roadBank(worldS));
    });

    delineators.forEach((marker) => {
      const worldS = Math.floor((state.distance + marker.userData.slot * 6.6) / 6.6) * 6.6 + 9;
      const lane = marker.userData.side * (roadWidth / 2 + 0.68);
      const point = roadPoint(worldS, lane);
      marker.position.copy(point);
      marker.rotation.set(0, roadHeading(worldS), -roadBank(worldS));
    });

    chevrons.forEach((sign) => {
      const worldS = Math.floor((state.distance + sign.userData.slot * 10.8) / 10.8) * 10.8 + 18;
      const curve = roadCurve(worldS);
      const side = curve >= 0 ? -1 : 1;
      sign.visible = Math.abs(curve) > 0.08;
      const point = roadPoint(worldS, side * (roadWidth / 2 + 2.05));
      sign.position.copy(point);
      sign.rotation.set(0, roadHeading(worldS), -roadBank(worldS));
      sign.userData.arrow.scale.x = side;
    });

    scrubMeshes.forEach((scrub) => {
      if (scrub.userData.worldS < state.distance - 18) {
        scrub.userData.worldS = state.distance + 106 + Math.random() * 42;
        scrub.userData.side = Math.random() < 0.5 ? -1 : 1;
        scrub.userData.offset = 4.8 + Math.random() * 9.5;
      }

      const point = roadPoint(scrub.userData.worldS, scrub.userData.side * (roadWidth / 2 + scrub.userData.offset));
      scrub.position.copy(point);
      scrub.position.y += 0.16;
      scrub.rotation.y += 0.012;
    });
  }

  function updateTrees() {
    trees.forEach((tree) => {
      if (tree.userData.worldS < state.distance - 18) {
        tree.userData.worldS = state.distance + 118 + Math.random() * 60;
        tree.userData.side = Math.random() < 0.5 ? -1 : 1;
        tree.userData.offset = 5.8 + Math.random() * 13;
        tree.userData.scale = 0.7 + Math.random() * 1.05;
        tree.scale.setScalar(tree.userData.scale);
      }

      const worldS = tree.userData.worldS;
      const side = tree.userData.side;
      const lane = side * (roadWidth / 2 + tree.userData.offset);
      const point = roadPoint(worldS, lane);
      tree.position.copy(point);
      tree.position.y -= 0.2;
      tree.rotation.y = Math.sin(worldS) * 0.45;
    });
  }

  function updateScenery(dt) {
    clouds.forEach((cloud) => {
      cloud.position.x += cloud.userData.drift * dt;
      if (cloud.position.x > 92) cloud.position.x = -92;
    });
    skySun.rotation.y += dt * 0.015;
    sunGlow.material.opacity = 0.33 + Math.sin(performance.now() * 0.0007) * 0.04;
  }

  function updateParticleEffects(dt) {
    const worldS = state.distance - 2.2;
    const road = roadPoint(worldS, state.lane);
    if (state.running && state.speed > 4) {
      const dustRate = state.offRoad * 38 + (controls.brake ? 9 : 0);
      if (Math.random() < dt * dustRate) {
        emitParticle(
          dustField,
          new THREE.Vector3(road.x + randomBetween(-0.38, 0.38), road.y + 0.12, road.z + 0.7),
          new THREE.Vector3(randomBetween(-0.35, 0.35), randomBetween(0.18, 0.5), 0.8 + state.speed * 0.055),
          randomBetween(0.55, 0.95)
        );
      }

      if (state.nitroActive) {
        for (let index = 0; index < 2; index += 1) {
          emitParticle(
            nitroField,
            new THREE.Vector3(road.x + randomBetween(-0.22, 0.22), road.y + 0.48, road.z + 0.72),
            new THREE.Vector3(randomBetween(-0.08, 0.08), randomBetween(-0.02, 0.12), 1.8 + state.speed * 0.07),
            randomBetween(0.28, 0.48)
          );
        }
      }
    }
    stepParticleField(dustField, dt);
    stepParticleField(nitroField, dt);
  }

  function updateObjects(dt) {
    spawnObjects();
    updateCheckpoint(dt);
    const bikeWorldS = state.distance - 2.2;

    state.obstacles = state.obstacles.filter((item) => {
      const point = roadPoint(item.worldS, item.lane);
      item.mesh.position.copy(point);

      if (item.type === "light") {
        item.mesh.position.y += 1.35 + Math.sin(performance.now() * 0.004 + item.worldS) * 0.18;
        item.mesh.rotation.y += dt * 2.5;
      } else if (item.type === "rock") {
        item.mesh.position.y += 0.34;
        item.mesh.rotation.x += dt * 0.7;
      } else {
        item.mesh.position.y += 0.08;
        item.mesh.rotation.set(-roadSlope(item.worldS, item.lane), roadHeading(item.worldS) * 0.18, -roadBank(item.worldS));
        item.mesh.children.forEach((child) => {
          if (child.material?.emissiveIntensity !== undefined) {
            child.material.emissiveIntensity = 1.05 + Math.sin(performance.now() * 0.008) * 0.35;
          }
        });
      }

      const behind = item.worldS < state.distance - 16;
      if (behind) {
        scene.remove(item.mesh);
        return false;
      }

      const closeForward = Math.abs(item.worldS - bikeWorldS) < 1.5;
      const closeLane = Math.abs(item.lane - state.lane) < 1.02;
      const nearLane = Math.abs(item.lane - state.lane) < 1.48;
      if (!item.hit && closeForward && closeLane) {
        if (item.type === "light") {
          item.hit = true;
          addScore(220 * state.combo, `memory light ${state.combo}x`);
          state.lights += 1;
          state.nitro = Math.min(100, state.nitro + 18);
          buildCombo();
          addRing(item.mesh.position, 0xd8a64d);
          scene.remove(item.mesh);
          return false;
        }

        if (item.type === "boost" && state.jumpY < 0.5) {
          item.hit = true;
          state.boostTimer = 3.2;
          state.nitro = Math.min(100, state.nitro + 12);
          state.speed = Math.min(rideProfiles[state.ride].maxSpeed + 5, state.speed + 4.5);
          addScore(180 * state.combo, "road boost");
          buildCombo();
          addRing(item.mesh.position, 0xef6b1b);
          scene.remove(item.mesh);
          return false;
        }

        if (item.type === "rock" && state.jumpY < 0.65 && state.crashTimer <= 0) {
          item.hit = true;
          state.hearts -= 1;
          state.flash = 1;
          state.crashTimer = 1.15;
          state.speed *= 0.44;
          state.lateralVelocity += state.lane <= item.lane ? -1.4 : 1.4;
          const penalty = applyRockPenalty();
          addRing(item.mesh.position, 0xb92720);
          setBadge(state.hearts > 0 ? `Rock hit: -${formatScore(penalty)}` : "Ride needs a restart");
          scene.remove(item.mesh);
          if (state.hearts <= 0) finishRide();
          return false;
        }
      }

      if (!item.hit && item.type === "rock" && closeForward && nearLane) {
        item.hit = true;
        state.nearMisses += 1;
        const reason = closeLane ? "clean rock hop" : "near miss";
        addScore((closeLane ? 260 : 140) * state.combo, reason);
        buildCombo();
        addRing(item.mesh.position, closeLane ? 0xd8a64d : 0xf8f6f0);
      }

      return true;
    });

    state.rings = state.rings.filter((ring) => {
      ring.userData.age += dt;
      ring.scale.setScalar(1 + ring.userData.age * 2.4);
      ring.material.opacity = Math.max(0, 0.9 - ring.userData.age * 1.5);
      if (ring.userData.age > 0.62) {
        scene.remove(ring);
        return false;
      }
      return true;
    });
  }

  function updatePlayer(dt) {
    const profile = rideProfiles[state.ride];
    const steer = (controls.right ? 1 : 0) - (controls.left ? 1 : 0);
    const worldS = state.distance - 2.2;
    const bank = roadBank(worldS);
    const maxLane = roadWidth * 0.46;
    const roadEdge = roadWidth * 0.39;
    const speedRatio = clamp(state.speed / profile.maxSpeed, 0, 1.25);
    const steeringForce = profile.steer * (0.5 + speedRatio * 0.68) * (1 - state.offRoad * 0.3);
    state.lateralVelocity += (steer * steeringForce - bank * state.speed * 0.13) * dt;
    const grip = profile.traction * (steer === 0 ? 1.05 : 0.58);
    state.lateralVelocity *= Math.exp(-grip * dt);
    state.lateralVelocity = clamp(state.lateralVelocity, -5.2, 5.2);
    state.lane += state.lateralVelocity * dt;

    if (Math.abs(state.lane) > maxLane) {
      state.lane = clamp(state.lane, -maxLane, maxLane);
      state.lateralVelocity *= -0.3;
      state.flash = Math.max(state.flash, 0.12);
    }

    state.offRoad = clamp((Math.abs(state.lane) - roadEdge) / Math.max(0.01, maxLane - roadEdge), 0, 1);

    const leanTarget = clamp(steer * (0.48 + speedRatio * 0.34) + state.lateralVelocity * 0.11 + bank * 2.6, -1.15, 1.15);
    state.lean += (leanTarget - state.lean) * Math.min(1, dt * 8.2);

    if (state.jumpY > 0 || state.jumpVelocity > 0) {
      state.airTime += dt;
      state.jumpY += state.jumpVelocity * dt;
      state.jumpVelocity -= 18.2 * dt;
      if (state.jumpY < 0) {
        const landingAirTime = state.airTime;
        state.jumpY = 0;
        state.jumpVelocity = 0;
        state.airTime = 0;
        state.landingKick = 1;
        state.suspension = clamp(landingAirTime * 0.24, 0.12, 0.28);
        state.jumps += 1;
        if (landingAirTime > 0.48) {
          addScore((70 + state.speed * 2.2) * state.combo, "smooth landing");
          buildCombo();
        }
      }
    }

    state.landingKick = Math.max(0, state.landingKick - dt * 4.4);
    state.suspension *= 1 - Math.min(1, dt * 6.5);

    const road = roadPoint(worldS, state.lane);
    const pitch = roadSlope(worldS, state.lane);
    const heading = roadHeading(worldS);
    const roadBuzz = Math.sin(state.distance * 5.2) * Math.min(0.018, state.speed * 0.0008);
    player.position.set(road.x, road.y + profile.yOffset + state.jumpY - state.suspension + roadBuzz, road.z);
    player.rotation.x = -pitch;
    player.rotation.y = Math.PI / 2 - heading * 0.65 + state.lean * 0.08;
    player.rotation.z = -state.lean * 0.38 - bank * 0.82 + (state.crashTimer > 0 ? Math.sin(performance.now() * 0.028) * 0.035 : 0);
    player.userData.wheels?.forEach((wheel) => {
      wheel.rotation.z -= state.speed * dt * 1.2;
    });
    if (player.userData.rider) {
      const rideLean = state.ride === "cbr" ? -0.075 : controls.gas ? -0.025 : 0;
      const targetRiderLean = rideLean - state.lean * 0.025 + (state.jumpY > 0 ? 0.045 : 0);
      player.userData.rider.rotation.z +=
        (targetRiderLean - player.userData.rider.rotation.z) * Math.min(1, dt * 7.5);
    }

    playerLight.intensity = 7 + speedRatio * 3 + (state.nitroActive ? 4 : 0);
    playerLight.position.set(road.x, road.y + 1.65 + state.jumpY, road.z - 1.6);
  }

  function updateCamera(dt) {
    const profile = rideProfiles[state.ride];
    const speedRatio = clamp(state.speed / profile.maxSpeed, 0, 1.25);
    const bikeWorldS = state.distance - 2.2;
    const bikePoint = roadPoint(bikeWorldS, state.lane);
    const lookWorld = bikeWorldS + 20 + speedRatio * 8;
    const lookPoint = roadPoint(lookWorld, state.lane * 0.18);
    const heading = roadHeading(bikeWorldS);
    const shake = state.crashTimer > 0 ? state.crashTimer * 0.12 : state.offRoad * 0.035;
    const targetCamera = new THREE.Vector3(
      bikePoint.x - state.lane * 0.31 - heading * 4.2 + Math.sin(performance.now() * 0.03) * shake,
      bikePoint.y + 3.75 + speedRatio * 0.48 + state.jumpY * 0.38 + state.landingKick * 0.18,
      bikePoint.z + 11.4 + speedRatio * 1.8
    );
    camera.position.lerp(targetCamera, Math.min(1, dt * 5.8));
    camera.lookAt(lookPoint.x, lookPoint.y + 0.86, lookPoint.z);
    camera.rotation.z += (-state.lean * 0.025 - roadBank(bikeWorldS) * 0.16 - camera.rotation.z) * Math.min(1, dt * 4.8);
    const targetFov = 56 + speedRatio * 6 + (state.boostTimer > 0 ? 3 : 0) + (state.nitroActive ? 5 : 0);
    camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 3.8);
    camera.updateProjectionMatrix();
  }

  function updateGame(dt) {
    const profile = rideProfiles[state.ride];
    const roadPitch = roadSlope(state.distance + 4, 0);
    const throttle = controls.gas && !controls.brake ? 1 : 0;
    const brake = controls.brake ? 1 : 0;
    state.nitroActive = Boolean(controls.nitro && throttle && state.nitro > 0.4 && state.speed > 4);
    if (state.nitroActive) state.nitro = Math.max(0, state.nitro - dt * 23);
    else state.nitro = Math.min(100, state.nitro + dt * 0.75);
    const speedRatio = clamp(state.speed / profile.maxSpeed, 0, 1.35);
    const engineDrive = throttle ? profile.acceleration * (1 - speedRatio * 0.42) : 0;
    const idleDrive = !brake && state.speed < profile.idleSpeed ? (profile.idleSpeed - state.speed) * 1.7 : 0;
    const brakeForce = brake ? profile.braking * clamp(state.speed / 4, 0.28, 1) : 0;
    const rollingDrag = 0.72 + state.speed * 0.032 + state.offRoad * (6.5 + state.speed * 0.18);
    const gradeForce = -Math.sin(roadPitch) * 8.8;
    const boostForce = (state.boostTimer > 0 ? 5.6 : 0) + (state.nitroActive ? 10.8 : 0);
    state.speed += (engineDrive + idleDrive + gradeForce + boostForce - brakeForce - rollingDrag) * dt;
    const maxSpeed = profile.maxSpeed + (state.boostTimer > 0 ? 5.5 : 0) + (state.nitroActive ? 8.5 : 0);
    state.speed = clamp(state.speed, 0, maxSpeed);
    state.distance += state.speed * dt;
    state.score +=
      state.speed * dt * (throttle ? 4.2 : 2.8) * (state.nitroActive ? 1.35 : 1) * (1 + (state.combo - 1) * 0.12);
    state.boostTimer = Math.max(0, state.boostTimer - dt);
    state.crashTimer = Math.max(0, state.crashTimer - dt);
    state.jumpCooldown = Math.max(0, state.jumpCooldown - dt);
    state.flash = Math.max(0, state.flash - dt * 2.8);
    if (state.comboTimer > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0) reduceCombo();
    }
    if (state.messageTimer > 0) state.messageTimer -= dt;
    if (state.messageTimer <= 0 && badge && state.running) {
      if (state.nitroActive) badge.textContent = `NITRO | ${Math.round(state.speed * 3.25)} km/h`;
      else if (state.boostTimer > 0) badge.textContent = `BOOST | ${Math.round(state.speed * 3.25)} km/h`;
      else if (state.speed < 2) badge.textContent = "Hold W to accelerate";
      else if (state.offRoad > 0.2) badge.textContent = "Ease back onto the road";
      else badge.textContent = `${Math.round(state.speed * 3.25)} km/h | ${state.combo}x combo`;
    }

    updateRoadMesh();
    updateTrees();
    updateObjects(dt);
    updatePlayer(dt);
    updateCamera(dt);
    updateStats();
  }

  function resize() {
    const width = Math.max(320, stage.clientWidth || 960);
    const height = Math.max(320, stage.clientHeight || 540);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    resizeQueued = false;
  }

  function renderOverlayFlash() {
    if (state.flash <= 0) return;
    renderer.autoClear = false;
    renderer.clearDepth();
    const flashScene = new THREE.Scene();
    const flashCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const flashMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.MeshBasicMaterial({ color: 0xb92720, transparent: true, opacity: state.flash * 0.18 })
    );
    flashScene.add(flashMesh);
    renderer.render(flashScene, flashCamera);
    flashMesh.geometry.dispose();
    flashMesh.material.dispose();
    renderer.autoClear = true;
  }

  function animate(now) {
    if (resizeQueued) resize();
    const dt = Math.min((now - state.lastTime) / 1000 || 0, 0.033);
    state.lastTime = now;

    updateScenery(dt);
    if (state.running) updateGame(dt);
    else {
      updateRoadMesh();
      updateTrees();
      updatePlayer(dt);
      updateCamera(dt);
    }
    updateParticleEffects(dt);

    renderer.render(scene, camera);
    renderOverlayFlash();
    requestAnimationFrame(animate);
  }

  startButton?.addEventListener("click", toggleRide);
  restartButton?.addEventListener("click", restartRide);
  rideButtons.forEach((button) => {
    button.addEventListener("click", () => setRide(button.dataset.gameRide));
  });

  controlButtons.forEach((button) => {
    const control = button.dataset.gameControl;
    const press = (event) => {
      event.preventDefault();
      if (!state.running) startRide();
      setControl(control, true);
      if (control === "jump") jumpBike();
      button.setPointerCapture?.(event.pointerId);
    };
    const release = () => setControl(control, false);
    button.addEventListener("pointerdown", press);
    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("pointerleave", release);
  });

  canvas.addEventListener("pointerdown", () => {
    if (!state.running) startRide();
    else jumpBike();
  });

  window.addEventListener("keydown", (event) => {
    if (!gameHasKeyboardFocus()) return;
    const map = {
      ArrowLeft: "left",
      KeyA: "left",
      ArrowRight: "right",
      KeyD: "right",
      ArrowUp: "gas",
      KeyW: "gas",
      ShiftLeft: "nitro",
      ShiftRight: "nitro",
      ArrowDown: "brake",
      KeyS: "brake",
    };
    const control = map[event.code];
    if (control) {
      event.preventDefault();
      if (!state.running) startRide();
      setControl(control, true);
    }
    if (event.code === "Space") {
      event.preventDefault();
      if (!state.running) startRide();
      setControl("jump", true);
      if (!event.repeat) jumpBike();
    }
    if (event.code === "KeyP" && !event.repeat) {
      event.preventDefault();
      toggleRide();
    }
  });

  window.addEventListener("keyup", (event) => {
    if (!gameHasKeyboardFocus()) return;
    const map = {
      ArrowLeft: "left",
      KeyA: "left",
      ArrowRight: "right",
      KeyD: "right",
      ArrowUp: "gas",
      KeyW: "gas",
      ShiftLeft: "nitro",
      ShiftRight: "nitro",
      ArrowDown: "brake",
      KeyS: "brake",
    };
    const control = map[event.code];
    if (control) {
      event.preventDefault();
      setControl(control, false);
    }
    if (event.code === "Space") {
      event.preventDefault();
      setControl("jump", false);
    }
  });

  window.addEventListener("blur", clearControls);
  window.addEventListener("resize", () => {
    resizeQueued = true;
  });

  makePlayer("activa");
  resetGame();
  updateRoadMesh();
  updateTrees();
  updatePlayer(0);
  updateCamera(1);
  updateStats();
  requestAnimationFrame(animate);
}

function createTree(THREE, trunkMaterial, leafMaterial) {
  const group = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 1.1, 8), trunkMaterial);
  trunk.position.y = 0.52;
  const leaves = new THREE.Mesh(new THREE.ConeGeometry(0.58, 1.35, 9), leafMaterial);
  leaves.position.y = 1.45;
  const top = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.05, 9), leafMaterial);
  top.position.y = 2.08;
  group.add(trunk, leaves, top);
  return group;
}

function createSkyTexture(THREE) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, "#668a95");
  sky.addColorStop(0.48, "#afc4ba");
  sky.addColorStop(0.78, "#e1c78f");
  sky.addColorStop(1, "#7d8d6a");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function createGlowTexture(THREE) {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  const glow = ctx.createRadialGradient(64, 64, 3, 64, 64, 62);
  glow.addColorStop(0, "rgba(255, 246, 190, 1)");
  glow.addColorStop(0.18, "rgba(255, 203, 92, 0.72)");
  glow.addColorStop(0.55, "rgba(239, 107, 27, 0.2)");
  glow.addColorStop(1, "rgba(239, 107, 27, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function createCheckpointBannerTexture(THREE) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 112;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#151514";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#ef6b1b";
  ctx.fillRect(0, 0, canvas.width, 10);
  ctx.fillRect(0, canvas.height - 10, canvas.width, 10);
  ctx.fillStyle = "#f8f6f0";
  ctx.font = "900 48px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("MEMORY PASS", canvas.width / 2, canvas.height / 2 + 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function createMountainModel(THREE, seed) {
  const group = new THREE.Group();
  const radius = 7.5 + (seed % 5) * 1.5;
  const height = 17 + (seed % 6) * 2.7;
  const geometry = new THREE.ConeGeometry(radius, height, 8, 4, false);
  const positions = geometry.attributes.position;
  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index);
    const z = positions.getZ(index);
    const wobble = 1 + Math.sin(index * 2.17 + seed * 1.31) * 0.09;
    positions.setX(index, x * wobble);
    positions.setZ(index, z * (2 - wobble));
  }
  geometry.computeVertexNormals();
  const colors = [0x3f5548, 0x526457, 0x657160, 0x334a42];
  const mountain = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({ color: colors[seed % colors.length], roughness: 1, flatShading: true })
  );
  const cap = new THREE.Mesh(
    new THREE.ConeGeometry(radius * 0.34, height * 0.27, 8, 1),
    new THREE.MeshStandardMaterial({ color: 0xb8c0ad, roughness: 0.94, flatShading: true })
  );
  cap.position.y = height * 0.37;
  group.add(mountain, cap);
  return group;
}

function createCloud(THREE) {
  const group = new THREE.Group();
  const material = new THREE.MeshBasicMaterial({
    color: 0xe6eadf,
    transparent: true,
    opacity: 0.09,
    depthWrite: false,
    fog: false,
  });
  const parts = [
    [-0.7, 0, 0, 0.8],
    [0, 0.16, 0, 1.05],
    [0.85, -0.02, 0, 0.72],
    [0.2, -0.18, 0.1, 1.15],
  ];
  parts.forEach(([x, y, z, scale]) => {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(0.7, 10, 7), material);
    puff.position.set(x, y, z);
    puff.scale.set(scale * 1.6, scale * 0.55, scale);
    group.add(puff);
  });
  return group;
}

function createDelineator(THREE, postMaterial, reflectorMaterial) {
  const group = new THREE.Group();
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.82, 0.13), postMaterial);
  post.position.y = 0.4;
  const reflector = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.14, 0.035), reflectorMaterial);
  reflector.position.set(0, 0.65, 0.08);
  group.add(post, reflector);
  return group;
}

function createChevronSign(THREE, boardMaterial, accentMaterial) {
  const group = new THREE.Group();
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.2, 0.12), boardMaterial);
  post.position.y = 0.58;
  const board = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.52, 0.09), boardMaterial);
  board.position.y = 1.08;
  const arrow = new THREE.Group();
  const upper = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.12, 0.06), accentMaterial);
  const lower = upper.clone();
  upper.position.set(0.06, 0.15, 0.08);
  lower.position.set(0.06, -0.15, 0.08);
  upper.rotation.z = -0.58;
  lower.rotation.z = 0.58;
  arrow.position.y = 1.08;
  arrow.add(upper, lower);
  group.add(post, board, arrow);
  group.userData.arrow = arrow;
  return group;
}

function createParticleField(THREE, count, color, size, opacity) {
  const positions = new Float32Array(count * 3);
  for (let index = 0; index < count; index += 1) positions[index * 3 + 1] = -100;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color,
    size,
    transparent: true,
    opacity,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  return {
    points,
    positions,
    velocities: Array.from({ length: count }, () => new THREE.Vector3()),
    life: new Float32Array(count),
    cursor: 0,
  };
}

function emitParticle(field, position, velocity, life) {
  const count = field.life.length;
  let slot = field.cursor;
  for (let offset = 0; offset < count; offset += 1) {
    const candidate = (field.cursor + offset) % count;
    if (field.life[candidate] <= 0) {
      slot = candidate;
      break;
    }
  }
  field.cursor = (slot + 1) % count;
  field.life[slot] = life;
  field.velocities[slot].copy(velocity);
  field.positions[slot * 3] = position.x;
  field.positions[slot * 3 + 1] = position.y;
  field.positions[slot * 3 + 2] = position.z;
}

function stepParticleField(field, dt) {
  for (let index = 0; index < field.life.length; index += 1) {
    if (field.life[index] <= 0) continue;
    field.life[index] -= dt;
    if (field.life[index] <= 0) {
      field.positions[index * 3 + 1] = -100;
      continue;
    }
    const velocity = field.velocities[index];
    field.positions[index * 3] += velocity.x * dt;
    field.positions[index * 3 + 1] += velocity.y * dt;
    field.positions[index * 3 + 2] += velocity.z * dt;
    velocity.multiplyScalar(Math.max(0, 1 - dt * 1.8));
  }
  field.points.geometry.attributes.position.needsUpdate = true;
}

function resetParticleField(field) {
  field.life.fill(0);
  for (let index = 0; index < field.life.length; index += 1) field.positions[index * 3 + 1] = -100;
  field.points.geometry.attributes.position.needsUpdate = true;
}

function createRider(THREE, materials, ride) {
  const group = new THREE.Group();
  const setups = {
    activa: { hip: [-0.34, 1.33], shoulder: [-0.18, 1.82], head: [-0.12, 2.15], handle: [0.92, 1.58], foot: [0.02, 0.58] },
    yezdi: { hip: [-0.38, 1.34], shoulder: [-0.08, 1.82], head: [0.02, 2.14], handle: [1.02, 1.4], foot: [-0.02, 0.62] },
    cbr: { hip: [-0.45, 1.34], shoulder: [0.18, 1.7], head: [0.38, 1.98], handle: [1.0, 1.34], foot: [-0.02, 0.62] },
  };
  const setup = setups[ride];
  const helmetMaterial = ride === "cbr" ? materials.orange : ride === "yezdi" ? materials.green : materials.white;
  const torsoX = (setup.hip[0] + setup.shoulder[0]) / 2;
  const torsoY = (setup.hip[1] + setup.shoulder[1]) / 2;
  const torso = addSphere(THREE, group, [0.62, 0.92, 0.54], [torsoX, torsoY, 0], materials.black);
  torso.rotation.z = Math.atan2(setup.shoulder[1] - setup.hip[1], setup.shoulder[0] - setup.hip[0]) - Math.PI / 2;
  addSphere(THREE, group, [0.54, 0.56, 0.52], [setup.head[0], setup.head[1], 0], helmetMaterial);
  addSphere(THREE, group, [0.22, 0.24, 0.44], [setup.head[0] + 0.2, setup.head[1] + 0.02, 0], materials.glass);

  [-1, 1].forEach((side) => {
    const shoulder = [setup.shoulder[0], setup.shoulder[1], side * 0.19];
    const elbow = [(setup.shoulder[0] + setup.handle[0]) / 2, setup.shoulder[1] - 0.18, side * 0.24];
    const hand = [setup.handle[0], setup.handle[1], side * 0.19];
    addTube(THREE, group, shoulder, elbow, 0.075, materials.black);
    addTube(THREE, group, elbow, hand, 0.06, materials.cloth);

    const hip = [setup.hip[0], setup.hip[1], side * 0.17];
    const knee = [0.02, 0.95, side * 0.25];
    const foot = [setup.foot[0], setup.foot[1], side * 0.2];
    addTube(THREE, group, hip, knee, 0.1, materials.black);
    addTube(THREE, group, knee, foot, 0.085, materials.black);
    addSphere(THREE, group, [0.17, 0.11, 0.12], hand, materials.rubber);
  });

  return group;
}

function createAsphaltTexture(THREE) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#30322f";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < 2800; i += 1) {
    const shade = 34 + Math.floor(Math.random() * 54);
    ctx.fillStyle = `rgba(${shade}, ${shade}, ${shade - 4}, ${0.08 + Math.random() * 0.13})`;
    ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }

  for (let i = 0; i < 26; i += 1) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    ctx.strokeStyle = "rgba(10, 10, 9, 0.16)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (Math.random() - 0.5) * 70, y + 20 + Math.random() * 90);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2.2, 11);
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

function setupMountainCanvasFallback() {
  const canvas = document.querySelector("#mountainGameCanvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const gameRoot = canvas.closest(".mountain-game");
  if (gameRoot) gameRoot.dataset.gameRenderer = "canvas-2d";
  const badge = document.querySelector("#gameStateBadge");
  const scoreStat = document.querySelector("#gameScore");
  const comboStat = document.querySelector("#gameCombo");
  const speedStat = document.querySelector("#gameSpeed");
  const distanceStat = document.querySelector("#gameDistance");
  const lightsStat = document.querySelector("#gameLights");
  const heartsStat = document.querySelector("#gameHearts");
  const jumpsStat = document.querySelector("#gameJumps");
  const bestStat = document.querySelector("#gameBest");
  const nitroText = document.querySelector("#gameNitroText");
  const nitroFill = document.querySelector("#gameNitroFill");
  const startButton = document.querySelector("[data-game-start]");
  const restartButton = document.querySelector("[data-game-restart]");
  const rideButtons = [...document.querySelectorAll("[data-game-ride]")];
  const controlButtons = [...document.querySelectorAll("[data-game-control]")];
  const storageKey = "tribute-mountain-best-score";

  const rideProfiles = {
    activa: {
      name: "Activa",
      idleSpeed: 88,
      maxSpeed: 234,
      jump: 510,
      gravity: 1480,
      body: "#20201d",
      accent: "#d8a64d",
      trim: "#f8f6f0",
    },
    yezdi: {
      name: "Yezdi",
      idleSpeed: 92,
      maxSpeed: 260,
      jump: 485,
      gravity: 1520,
      body: "#263f31",
      accent: "#d8a64d",
      trim: "#151514",
    },
    cbr: {
      name: "CBR",
      idleSpeed: 98,
      maxSpeed: 304,
      jump: 540,
      gravity: 1560,
      body: "#ef6b1b",
      accent: "#b92720",
      trim: "#f2eee4",
    },
  };

  const controls = {
    left: false,
    right: false,
    jump: false,
    gas: false,
    brake: false,
    nitro: false,
  };

  let width = 960;
  let height = 520;
  let dpr = 1;

  let savedBest = 0;
  try {
    savedBest = Number(localStorage.getItem(storageKey) || 0);
  } catch {
    savedBest = 0;
  }

  const state = {
    ride: "activa",
    running: false,
    over: false,
    scroll: 0,
    distance: 0,
    score: 0,
    combo: 1,
    comboTimer: 0,
    lights: 0,
    jumps: 0,
    hearts: 3,
    nitro: 35,
    nitroActive: false,
    speed: rideProfiles.activa.idleSpeed,
    bestScore: savedBest,
    jumpY: 0,
    velocityY: 0,
    lean: 0,
    obstacles: [],
    effects: [],
    spawnAt: 1100,
    flash: 0,
    lastTime: 0,
  };

  const randomBetween = (min, max) => min + Math.random() * (max - min);
  const scoreFormat = new Intl.NumberFormat("en-IN");
  const formatKm = (value) => `${value.toFixed(1)} km`;
  const formatScore = (value) => scoreFormat.format(Math.max(0, Math.floor(value)));

  function setBadge(text) {
    if (badge) badge.textContent = text;
  }

  function resizeGame() {
    const rect = canvas.getBoundingClientRect();
    width = Math.max(320, Math.round(rect.width || 960));
    height = Math.max(320, Math.round(rect.height || 520));
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function terrainY(worldX) {
    const base = height * 0.72;
    return (
      base +
      Math.sin(worldX * 0.006) * 34 +
      Math.sin(worldX * 0.017 + 1.4) * 18 +
      Math.sin(worldX * 0.031) * 7
    );
  }

  function terrainSlope(worldX) {
    return Math.atan2(terrainY(worldX + 12) - terrainY(worldX - 12), 24);
  }

  function updateStats() {
    const nitroPercent = Math.round(state.nitro);
    if (scoreStat) scoreStat.textContent = formatScore(state.score);
    if (comboStat) comboStat.textContent = `${state.combo}x`;
    if (speedStat) speedStat.textContent = `${Math.round(state.speed * 0.32)} km/h`;
    if (distanceStat) distanceStat.textContent = formatKm(state.distance);
    if (lightsStat) lightsStat.textContent = String(state.lights);
    if (heartsStat) heartsStat.textContent = String(state.hearts);
    if (jumpsStat) jumpsStat.textContent = String(state.jumps);
    if (bestStat) bestStat.textContent = formatScore(Math.max(state.bestScore, state.score));
    if (nitroText) nitroText.textContent = `${nitroPercent}%`;
    if (nitroFill) nitroFill.style.transform = `scaleX(${Math.max(0, Math.min(1, state.nitro / 100))})`;
    if (gameRoot) {
      gameRoot.classList.toggle("is-nitro", state.nitroActive);
      gameRoot.dataset.gameRunning = String(state.running);
      gameRoot.dataset.gameSpeed = String(Math.round(state.speed * 0.32));
      gameRoot.dataset.gameScore = String(Math.floor(state.score));
      gameRoot.dataset.gameDistance = state.scroll.toFixed(2);
      gameRoot.dataset.gameJumps = String(state.jumps);
      gameRoot.dataset.gameNitro = String(nitroPercent);
    }
  }

  function resetGame() {
    saveBest();
    const profile = rideProfiles[state.ride];
    state.running = false;
    state.over = false;
    state.scroll = 0;
    state.distance = 0;
    state.score = 0;
    state.combo = 1;
    state.comboTimer = 0;
    state.lights = 0;
    state.jumps = 0;
    state.hearts = 3;
    state.nitro = 35;
    state.nitroActive = false;
    state.speed = profile.idleSpeed;
    state.jumpY = 0;
    state.velocityY = 0;
    state.lean = 0;
    state.obstacles = [];
    state.effects = [];
    state.spawnAt = width + 360;
    state.flash = 0;
    setBadge("Press W to throttle and Space to jump");
    if (startButton) startButton.textContent = "Start ride";
    updateStats();
  }

  function saveBest() {
    if (state.score <= state.bestScore) return;
    state.bestScore = state.score;
    try {
      localStorage.setItem(storageKey, String(state.bestScore));
    } catch {
      return;
    }
  }

  function addScore(points, reason) {
    const gained = Math.max(0, Math.round(points));
    if (gained === 0) return;
    state.score += gained;
    if (reason) setBadge(`+${formatScore(gained)} ${reason}`);
  }

  function buildCombo() {
    state.combo = Math.min(state.combo + 1, 8);
    state.comboTimer = 7.5;
  }

  function reduceCombo() {
    state.combo = 1;
    state.comboTimer = 0;
  }

  function applyRockPenalty() {
    const penalty = Math.min(450, Math.round(state.score * 0.12) + 120);
    state.score = Math.max(0, state.score - penalty);
    reduceCombo();
    return penalty;
  }

  function startRide() {
    if (state.running) return;
    if (state.over) resetGame();
    state.running = true;
    canvas.focus({ preventScroll: true });
    setBadge(`${rideProfiles[state.ride].name} is rolling - hold W for speed`);
    if (startButton) startButton.textContent = "Pause";
    updateStats();
  }

  function pauseRide() {
    if (!state.running || state.over) return;
    state.running = false;
    state.nitroActive = false;
    clearControls();
    setBadge("Ride paused");
    if (startButton) startButton.textContent = "Resume ride";
    updateStats();
  }

  function toggleRide() {
    if (state.running) pauseRide();
    else startRide();
  }

  function finishRide() {
    state.running = false;
    state.over = true;
    state.nitroActive = false;
    clearControls();
    saveBest();
    setBadge(`Ride finished: ${formatScore(state.score)} pts`);
    if (startButton) startButton.textContent = "Start ride";
    updateStats();
  }

  function restartRide() {
    resetGame();
    startRide();
  }

  function jumpBike() {
    if (!state.running || state.over || state.jumpY !== 0) return;
    state.velocityY = -rideProfiles[state.ride].jump;
    addScore(40 * state.combo, "clean hop");
  }

  function setRide(ride) {
    if (!rideProfiles[ride]) return;
    state.ride = ride;
    rideButtons.forEach((button) => {
      const active = button.dataset.gameRide === ride;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    if (!state.running) resetGame();
    setBadge(`${rideProfiles[ride].name} selected`);
  }

  function setControl(control, active) {
    if (!(control in controls)) return;
    controls[control] = active;
    controlButtons.forEach((button) => {
      if (button.dataset.gameControl === control) button.classList.toggle("is-held", active);
    });
  }

  function clearControls() {
    Object.keys(controls).forEach((control) => setControl(control, false));
  }

  function gameHasKeyboardFocus() {
    return state.running || gameRoot?.contains(document.activeElement);
  }

  function spawnObjects() {
    while (state.spawnAt < state.scroll + width + 260) {
      const type = Math.random() < 0.6 ? "spark" : "rock";
      state.obstacles.push({
        type,
        x: state.spawnAt,
        size: type === "rock" ? randomBetween(22, 34) : randomBetween(12, 17),
        float: randomBetween(76, 122),
        wobble: randomBetween(0, Math.PI * 2),
      });
      state.spawnAt += randomBetween(190, 330) + (type === "rock" ? 70 : 0);
    }
  }

  function getBikePose() {
    const x = width * 0.25;
    const worldX = state.scroll + x;
    const ground = terrainY(worldX);
    const y = ground - 42 + state.jumpY;
    return {
      x,
      y,
      ground,
      bottom: ground - 8 + state.jumpY,
      angle: terrainSlope(worldX) + state.lean * 0.22,
    };
  }

  function addEffect(x, y, color) {
    state.effects.push({ x, y, color, age: 0 });
  }

  function updateGame(dt) {
    const profile = rideProfiles[state.ride];
    const targetLean = (controls.right ? 1 : 0) - (controls.left ? 1 : 0);
    state.lean += (targetLean - state.lean) * Math.min(1, dt * 9);

    state.nitroActive = Boolean(controls.nitro && controls.gas && state.nitro > 0.4);
    if (state.nitroActive) state.nitro = Math.max(0, state.nitro - dt * 23);
    else state.nitro = Math.min(100, state.nitro + dt * 0.75);
    const targetSpeed = controls.brake
      ? 0
      : controls.gas
        ? profile.maxSpeed + (state.nitroActive ? 82 : 0)
        : profile.idleSpeed;
    state.speed += (targetSpeed - state.speed) * Math.min(1, dt * 3.5);
    state.scroll += state.speed * dt;
    state.distance = state.scroll / 520;
    state.score +=
      state.speed * dt * (controls.gas ? 0.12 : 0.085) * (state.nitroActive ? 1.35 : 1) * (1 + (state.combo - 1) * 0.12);

    if (state.jumpY < 0 || state.velocityY < 0) {
      state.jumpY += state.velocityY * dt;
      state.velocityY += profile.gravity * dt;
      if (state.jumpY > 0) {
        state.jumpY = 0;
        state.velocityY = 0;
        state.jumps += 1;
        addScore(70 * state.combo, "smooth landing");
        buildCombo();
      }
    }

    state.flash = Math.max(0, state.flash - dt * 2.4);
    if (state.comboTimer > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0) reduceCombo();
    }
    spawnObjects();

    const bike = getBikePose();
    state.obstacles = state.obstacles.filter((item) => {
      const screenX = item.x - state.scroll;
      if (screenX < -90) return false;
      const ground = terrainY(item.x);

      if (item.type === "spark") {
        const y = ground - item.float + Math.sin(state.scroll * 0.02 + item.wobble) * 6;
        const dx = screenX - bike.x;
        const dy = y - bike.y;
        if (Math.hypot(dx, dy) < 46) {
          addScore(220 * state.combo, `memory light ${state.combo}x`);
          state.lights += 1;
          state.nitro = Math.min(100, state.nitro + 18);
          buildCombo();
          addEffect(screenX, y, "#d8a64d");
          return false;
        }
        return true;
      }

      const rockTop = ground - item.size;
      const closeX = Math.abs(screenX - bike.x) < 48;
      const closeY = bike.bottom > rockTop + 6;
      if (closeX && closeY) {
        state.hearts -= 1;
        state.flash = 1;
        const penalty = applyRockPenalty();
        addEffect(screenX, rockTop, "#b92720");
        setBadge(state.hearts > 0 ? `Rock hit: -${formatScore(penalty)}` : "Ride needs a restart");
        if (state.hearts <= 0) finishRide();
        return false;
      }

      const nearX = Math.abs(screenX - bike.x) < 58;
      const nearY = Math.abs(bike.bottom - rockTop) < 54;
      if (!item.scored && nearX && !closeY && nearY) {
        item.scored = true;
        addScore(150 * state.combo, "near miss");
        addEffect(screenX, rockTop, "#f8f6f0");
      }

      return true;
    });

    state.effects = state.effects
      .map((effect) => ({ ...effect, age: effect.age + dt }))
      .filter((effect) => effect.age < 0.6);

    updateStats();
  }

  function drawMountainLayer(color, base, amp, speed, roughness) {
    ctx.beginPath();
    ctx.moveTo(0, height);
    ctx.lineTo(0, base);
    for (let x = 0; x <= width + 70; x += 70) {
      const world = x + state.scroll * speed;
      const y = base + Math.sin(world * roughness) * amp + Math.cos(world * roughness * 1.9) * amp * 0.55;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  function drawBackground() {
    const sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, "#202c31");
    sky.addColorStop(0.48, "#81917d");
    sky.addColorStop(1, "#161811");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.globalAlpha = 0.86;
    ctx.fillStyle = "#d8a64d";
    ctx.beginPath();
    ctx.arc(width * 0.78, height * 0.18, Math.max(36, width * 0.045), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    drawMountainLayer("#5f715f", height * 0.44, 30, 0.16, 0.008);
    drawMountainLayer("#384838", height * 0.55, 46, 0.28, 0.01);
    drawMountainLayer("#1d251d", height * 0.66, 32, 0.48, 0.014);
  }

  function drawRoad() {
    ctx.beginPath();
    ctx.moveTo(0, terrainY(state.scroll));
    for (let x = 0; x <= width + 16; x += 16) {
      ctx.lineTo(x, terrainY(state.scroll + x));
    }
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fillStyle = "#11120f";
    ctx.fill();

    ctx.strokeStyle = "rgba(248, 246, 240, 0.22)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    for (let x = 0; x <= width + 16; x += 16) {
      const y = terrainY(state.scroll + x) + 6;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    const firstDash = Math.floor(state.scroll / 130) * 130;
    for (let world = firstDash; world < state.scroll + width + 130; world += 130) {
      const x = world - state.scroll;
      const y = terrainY(world) + 38;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(terrainSlope(world));
      ctx.fillStyle = "rgba(216, 166, 77, 0.9)";
      ctx.fillRect(-22, -3, 44, 6);
      ctx.restore();
    }
  }

  function drawSpark(x, y, size, wobble) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(state.scroll * 0.018 + wobble);
    ctx.shadowColor = "#d8a64d";
    ctx.shadowBlur = 18;
    ctx.fillStyle = "#f8f6f0";
    ctx.beginPath();
    for (let i = 0; i < 8; i += 1) {
      const radius = i % 2 === 0 ? size : size * 0.45;
      const angle = (Math.PI * 2 * i) / 8;
      const px = Math.cos(angle) * radius;
      const py = Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawRock(x, ground, size) {
    ctx.save();
    ctx.translate(x, ground);
    ctx.fillStyle = "#3b3429";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-size * 0.6, 0);
    ctx.lineTo(-size * 0.35, -size * 0.72);
    ctx.lineTo(size * 0.16, -size);
    ctx.lineTo(size * 0.65, -size * 0.48);
    ctx.lineTo(size * 0.52, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawObjects() {
    state.obstacles.forEach((item) => {
      const x = item.x - state.scroll;
      const ground = terrainY(item.x);
      if (item.type === "spark") {
        const y = ground - item.float + Math.sin(state.scroll * 0.02 + item.wobble) * 6;
        drawSpark(x, y, item.size, item.wobble);
      } else {
        drawRock(x, ground, item.size);
      }
    });

    state.effects.forEach((effect) => {
      const progress = effect.age / 0.6;
      ctx.save();
      ctx.globalAlpha = 1 - progress;
      ctx.strokeStyle = effect.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, 14 + progress * 44, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    });
  }

  function drawWheel(x, y, radius) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(state.scroll * 0.04);
    ctx.fillStyle = "#090907";
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#d8a64d";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.58, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "rgba(248, 246, 240, 0.52)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i += 1) {
      ctx.rotate(Math.PI / 3);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(radius * 0.52, 0);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawBike() {
    const profile = rideProfiles[state.ride];
    const pose = getBikePose();
    const shake = state.flash > 0 ? Math.sin(performance.now() * 0.06) * state.flash * 7 : 0;

    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.ellipse(pose.x + shake, pose.ground + 12, 58, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(pose.x + shake, pose.y);
    ctx.rotate(pose.angle);

    drawWheel(-34, 24, 20);
    drawWheel(36, 24, 20);

    ctx.lineCap = "round";
    ctx.lineWidth = 6;
    ctx.strokeStyle = "#c9c3b5";
    ctx.beginPath();
    ctx.moveTo(-34, 15);
    ctx.lineTo(2, -12);
    ctx.lineTo(36, 15);
    ctx.stroke();

    if (state.ride === "activa") {
      ctx.fillStyle = profile.body;
      ctx.fillRect(-42, -22, 72, 24);
      ctx.fillStyle = "#141414";
      ctx.fillRect(-18, -38, 46, 15);
      ctx.fillStyle = profile.trim;
      ctx.fillRect(16, -40, 18, 34);
      ctx.fillStyle = profile.accent;
      ctx.fillRect(-36, -34, 24, 12);
    } else if (state.ride === "yezdi") {
      ctx.fillStyle = profile.body;
      ctx.beginPath();
      ctx.ellipse(-4, -24, 34, 17, -0.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#11110f";
      ctx.fillRect(-38, -34, 44, 10);
      ctx.fillStyle = profile.accent;
      ctx.fillRect(-8, -30, 18, 4);
      ctx.strokeStyle = "#c9c3b5";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(27, -18);
      ctx.lineTo(48, -45);
      ctx.lineTo(64, -45);
      ctx.stroke();
    } else {
      ctx.fillStyle = profile.body;
      ctx.beginPath();
      ctx.moveTo(-48, -20);
      ctx.lineTo(8, -38);
      ctx.lineTo(58, -16);
      ctx.lineTo(26, 5);
      ctx.lineTo(-40, 2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = profile.trim;
      ctx.fillRect(2, -31, 40, 13);
      ctx.fillStyle = profile.accent;
      ctx.fillRect(26, -13, 30, 17);
      ctx.fillStyle = "#10100e";
      ctx.fillRect(-42, -39, 40, 11);
    }

    ctx.fillStyle = "#11110f";
    ctx.beginPath();
    ctx.arc(-8, -54, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#11110f";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(-8, -42);
    ctx.lineTo(8, -24);
    ctx.lineTo(24, -36);
    ctx.stroke();
    ctx.restore();
  }

  function drawCenterMessage() {
    if (state.running) return;
    ctx.save();
    ctx.fillStyle = "rgba(12, 13, 11, 0.58)";
    ctx.fillRect(0, 0, width, height);
    ctx.textAlign = "center";
    ctx.fillStyle = "#fff";
    ctx.font = "900 28px system-ui, sans-serif";
    ctx.fillText(state.over ? "Ride finished" : "Mountain run ready", width / 2, height / 2 - 10);
    ctx.font = "700 15px system-ui, sans-serif";
    ctx.fillStyle = "rgba(255, 255, 255, 0.76)";
    ctx.fillText("Collect lights. Hop stones. Keep mine steady.", width / 2, height / 2 + 22);
    ctx.restore();
  }

  function drawGame() {
    drawBackground();
    drawRoad();
    drawObjects();
    drawBike();
    if (state.flash > 0) {
      ctx.save();
      ctx.globalAlpha = state.flash * 0.28;
      ctx.fillStyle = "#b92720";
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }
    drawCenterMessage();
  }

  function tick(now) {
    const dt = Math.min((now - state.lastTime) / 1000 || 0, 0.033);
    state.lastTime = now;
    if (state.running) updateGame(dt);
    drawGame();
    requestAnimationFrame(tick);
  }

  startButton?.addEventListener("click", toggleRide);
  restartButton?.addEventListener("click", restartRide);

  rideButtons.forEach((button) => {
    button.addEventListener("click", () => setRide(button.dataset.gameRide));
  });

  controlButtons.forEach((button) => {
    const control = button.dataset.gameControl;
    const press = (event) => {
      event.preventDefault();
      if (!state.running) startRide();
      setControl(control, true);
      if (control === "jump") jumpBike();
      button.setPointerCapture?.(event.pointerId);
    };
    const release = () => setControl(control, false);

    button.addEventListener("pointerdown", press);
    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("pointerleave", release);
  });

  canvas.addEventListener("pointerdown", () => {
    if (!state.running) startRide();
    else jumpBike();
  });

  window.addEventListener("keydown", (event) => {
    if (!gameHasKeyboardFocus()) return;

    const map = {
      ArrowLeft: "left",
      KeyA: "left",
      ArrowRight: "right",
      KeyD: "right",
      ArrowUp: "gas",
      KeyW: "gas",
      ShiftLeft: "nitro",
      ShiftRight: "nitro",
      ArrowDown: "brake",
      KeyS: "brake",
    };
    const control = map[event.code];
    if (control) {
      event.preventDefault();
      if (!state.running) startRide();
      setControl(control, true);
    }
    if (event.code === "Space") {
      event.preventDefault();
      if (!state.running) startRide();
      setControl("jump", true);
      if (!event.repeat) jumpBike();
    }
    if (event.code === "KeyP" && !event.repeat) {
      event.preventDefault();
      toggleRide();
    }
  });

  window.addEventListener("keyup", (event) => {
    if (!gameHasKeyboardFocus()) return;

    const map = {
      ArrowLeft: "left",
      KeyA: "left",
      ArrowRight: "right",
      KeyD: "right",
      ArrowUp: "gas",
      KeyW: "gas",
      ShiftLeft: "nitro",
      ShiftRight: "nitro",
      ArrowDown: "brake",
      KeyS: "brake",
    };
    const control = map[event.code];
    if (control) {
      event.preventDefault();
      setControl(control, false);
    }
    if (event.code === "Space") {
      event.preventDefault();
      setControl("jump", false);
    }
  });

  window.addEventListener("blur", clearControls);
  window.addEventListener("resize", () => {
    resizeGame();
    resetGame();
  });

  resizeGame();
  resetGame();
  setRide("activa");
  requestAnimationFrame(tick);
}

function setupMemoryButtons() {
  const storageKey = "tribute-lit-memories";
  const buttons = [...document.querySelectorAll("[data-memory]")];
  let lit = new Set();

  try {
    lit = new Set(JSON.parse(localStorage.getItem(storageKey) || "[]"));
  } catch {
    lit = new Set();
  }

  const render = (button) => {
    const card = button.closest(".vehicle-card");
    const status = card?.querySelector(".memory-status");
    const isLit = lit.has(button.dataset.memory);
    card?.classList.toggle("is-lit", isLit);
    button.textContent = isLit ? "Memory is lit" : "Light this memory";
    button.setAttribute("aria-pressed", String(isLit));
    if (status) status.textContent = isLit ? "Kept glowing here." : "Waiting quietly.";
  };

  buttons.forEach((button) => {
    render(button);
    button.addEventListener("click", () => {
      if (lit.has(button.dataset.memory)) lit.delete(button.dataset.memory);
      else lit.add(button.dataset.memory);
      localStorage.setItem(storageKey, JSON.stringify([...lit]));
      render(button);
    });
  });
}

function setupLightbox() {
  const dialog = document.querySelector("#photoLightbox");
  const image = document.querySelector("#lightboxImage");
  const caption = document.querySelector("#lightboxCaption");
  const openers = [...document.querySelectorAll(".photo-open")];
  if (!dialog || !image || !caption || openers.length === 0) return;

  let activeIndex = 0;

  const showPhoto = (index) => {
    activeIndex = (index + openers.length) % openers.length;
    const opener = openers[activeIndex];
    image.src = opener.dataset.photoSrc;
    image.alt = opener.getAttribute("aria-label") || "";
    caption.textContent = opener.dataset.photoCaption || "";
  };

  openers.forEach((opener, index) => {
    opener.addEventListener("click", () => {
      showPhoto(index);
      dialog.showModal();
    });
  });

  document.querySelector("[data-lightbox-close]")?.addEventListener("click", () => dialog.close());
  document.querySelector("[data-lightbox-prev]")?.addEventListener("click", () => showPhoto(activeIndex - 1));
  document.querySelector("[data-lightbox-next]")?.addEventListener("click", () => showPhoto(activeIndex + 1));

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });

  dialog.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") showPhoto(activeIndex - 1);
    if (event.key === "ArrowRight") showPhoto(activeIndex + 1);
  });
}

async function loadGarage() {
  const canvas = document.querySelector("#garageCanvas");
  const fallback = document.querySelector(".webgl-fallback");
  if (!canvas) return;

  try {
    const THREE = await loadThreeModule();
    initGarage(THREE, canvas);
  } catch (error) {
    if (fallback) fallback.hidden = false;
    console.warn("3D garage could not load", error);
  }
}

function initGarage(THREE, canvas) {
  const stage = canvas.parentElement;
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x080907, 8, 17);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 1.75, 12.6);

  const garage = new THREE.Group();
  scene.add(garage);

  const materials = createMaterials(THREE);
  const world = createWorld(THREE, scene, materials);

  const vehicles = {
    activa: createScooter(THREE, materials),
    yezdi: createRoadster(THREE, materials),
    cbr: createSportBike(THREE, materials),
  };

  vehicles.activa.position.set(-3.35, 0, 0);
  vehicles.yezdi.position.set(0, 0, 0);
  vehicles.cbr.position.set(3.35, 0, 0);

  Object.values(vehicles).forEach((vehicle) => garage.add(vehicle));

  const focusTargets = {
    all: { x: 0, y: 1.75, z: 12.6, lookX: 0 },
    activa: { x: -3.35, y: 1.35, z: 6.2, lookX: -3.35 },
    yezdi: { x: 0, y: 1.35, z: 6.0, lookX: 0 },
    cbr: { x: 3.35, y: 1.35, z: 6.2, lookX: 3.35 },
  };

  let activeTarget = focusTargets.all;
  let garageMode = "idle";
  let lightsOn = false;
  let pointerX = 0;

  document.querySelectorAll("[data-focus]").forEach((button) => {
    button.addEventListener("click", () => {
      activeTarget = focusTargets[button.dataset.focus] || focusTargets.all;
      document.querySelectorAll("[data-focus]").forEach((item) => {
        item.classList.toggle("is-active", item === button);
      });
    });
  });

  document.querySelectorAll("[data-garage-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      garageMode = button.dataset.garageMode || "idle";
      document.querySelectorAll("[data-garage-mode]").forEach((item) => {
        item.classList.toggle("is-active", item === button);
      });
    });
  });

  document.querySelector("[data-garage-lights]")?.addEventListener("click", (event) => {
    lightsOn = !lightsOn;
    event.currentTarget.classList.toggle("is-active", lightsOn);
  });

  stage.addEventListener("pointermove", (event) => {
    const bounds = stage.getBoundingClientRect();
    pointerX = (event.clientX - bounds.left) / bounds.width - 0.5;
  });

  stage.addEventListener("pointerleave", () => {
    pointerX = 0;
  });

  const lookAt = new THREE.Vector3(0, 0.85, 0);
  const clock = new THREE.Clock();

  function resize() {
    const width = stage.clientWidth;
    const height = stage.clientHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function animate() {
    resize();
    const elapsed = clock.getElapsedTime();

    const motion = reducedMotion ? 0 : 1;
    camera.position.x += (activeTarget.x + pointerX * 0.45 - camera.position.x) * 0.055;
    camera.position.y += (activeTarget.y - camera.position.y) * 0.055;
    camera.position.z += (activeTarget.z - camera.position.z) * 0.055;
    lookAt.x += (activeTarget.lookX - lookAt.x) * 0.06;

    const isCruising = garageMode === "cruise";
    const isParade = garageMode === "parade";
    const wheelSpeed = isCruising ? 0.09 : isParade ? 0.04 : 0.015;
    const dashSpeed = isCruising ? 0.06 : isParade ? 0.022 : 0;
    garage.rotation.y = Math.sin(elapsed * 0.35) * (isParade ? 0.13 : 0.06) * motion;

    world.roadDashes.forEach((dash) => {
      dash.position.z += dashSpeed * motion;
      if (dash.position.z > 5.2) dash.position.z = -5.4;
    });

    Object.values(vehicles).forEach((vehicle, index) => {
      vehicle.position.y = Math.sin(elapsed * (isCruising ? 2.2 : 1.2) + index) * (isCruising ? 0.045 : 0.025) * motion;
      vehicle.rotation.z = Math.sin(elapsed * 1.3 + index) * (isParade ? 0.018 : 0.006) * motion;
      vehicle.userData.wheels.forEach((wheel) => {
        wheel.rotation.z -= wheelSpeed * motion;
      });
      vehicle.userData.lights.forEach((light) => {
        light.intensity = lightsOn || isCruising ? 1.45 : 0.18;
      });
    });

    camera.lookAt(lookAt);
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  resize();
  animate();
}

function createMaterials(THREE) {
  return {
    tire: new THREE.MeshStandardMaterial({ color: 0x060605, roughness: 0.78, metalness: 0.18 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x11110f, roughness: 0.86, metalness: 0.05 }),
    chrome: new THREE.MeshStandardMaterial({ color: 0xc9c3b5, roughness: 0.26, metalness: 0.84 }),
    darkChrome: new THREE.MeshStandardMaterial({ color: 0x49443d, roughness: 0.32, metalness: 0.74 }),
    black: new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.62, metalness: 0.32 }),
    green: new THREE.MeshStandardMaterial({ color: 0x263f31, roughness: 0.48, metalness: 0.46 }),
    orange: new THREE.MeshStandardMaterial({ color: 0xf06d19, roughness: 0.36, metalness: 0.38 }),
    red: new THREE.MeshStandardMaterial({ color: 0xb91f1c, roughness: 0.42, metalness: 0.34 }),
    white: new THREE.MeshStandardMaterial({ color: 0xf2eee4, roughness: 0.4, metalness: 0.2 }),
    amber: new THREE.MeshStandardMaterial({ color: 0xffa12b, roughness: 0.25, metalness: 0.18, emissive: 0x5a2500 }),
    tail: new THREE.MeshStandardMaterial({ color: 0xff2c21, roughness: 0.32, metalness: 0.14, emissive: 0x4b0603 }),
    cloth: new THREE.MeshStandardMaterial({ color: 0xb99c81, roughness: 0.92, metalness: 0.02 }),
    engine: new THREE.MeshStandardMaterial({ color: 0x24211c, roughness: 0.45, metalness: 0.64 }),
    glass: new THREE.MeshPhysicalMaterial({
      color: 0x111820,
      roughness: 0.12,
      metalness: 0.1,
      transmission: 0.22,
      transparent: true,
      opacity: 0.64,
    }),
    gold: new THREE.MeshStandardMaterial({ color: 0xd8a64d, roughness: 0.4, metalness: 0.55 }),
    road: new THREE.MeshStandardMaterial({ color: 0x0c0d0b, roughness: 0.95, metalness: 0.02 }),
    roadLine: new THREE.MeshStandardMaterial({ color: 0xe2b45a, roughness: 0.75, metalness: 0.02 }),
  };
}

function createWorld(THREE, scene, materials) {
  const roadDashes = [];
  const ambient = new THREE.HemisphereLight(0xfff3d0, 0x1b241d, 1.35);
  scene.add(ambient);

  const key = new THREE.DirectionalLight(0xffd49a, 3.8);
  key.position.set(-4, 6, 5);
  scene.add(key);

  const rim = new THREE.PointLight(0xf06d19, 16, 11);
  rim.position.set(3.5, 2.6, 2.6);
  scene.add(rim);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 13), materials.road);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.02;
  floor.position.z = -0.4;
  scene.add(floor);

  for (let i = -3; i <= 3; i += 1) {
    const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 1.25), materials.roadLine);
    dash.rotation.x = -Math.PI / 2;
    dash.position.set(0, 0.005, i * 1.65 - 0.3);
    scene.add(dash);
    roadDashes.push(dash);
  }

  const backGlow = new THREE.Mesh(
    new THREE.CircleGeometry(4.8, 64),
    new THREE.MeshBasicMaterial({ color: 0xef6b1b, transparent: true, opacity: 0.07 })
  );
  backGlow.position.set(0, 2.2, -4.5);
  scene.add(backGlow);

  return { roadDashes };
}

function createWheel(THREE, materials, radius = 0.36) {
  const group = new THREE.Group();
  const tire = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.075, 18, 54), materials.tire);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.56, 0.035, 12, 36), materials.chrome);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(radius * 0.43, 36), materials.darkChrome);
  const hub = new THREE.Mesh(new THREE.CircleGeometry(radius * 0.2, 24), materials.chrome);
  disc.position.z = -0.01;
  hub.position.z = 0.02;

  group.add(tire, rim, disc, hub);
  for (let i = 0; i < 10; i += 1) {
    const angle = (Math.PI * 2 * i) / 10;
    addTube(
      THREE,
      group,
      [0, 0, 0.025],
      [Math.cos(angle) * radius * 0.48, Math.sin(angle) * radius * 0.48, 0.025],
      0.008,
      materials.chrome
    );
  }
  addBox(THREE, group, [0.08, 0.16, 0.05], [radius * 0.36, radius * 0.16, 0.06], materials.gold, [0, 0, 0.25]);
  group.userData.spin = tire;
  return group;
}

function addBox(THREE, group, size, position, material, rotation = [0, 0, 0]) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  group.add(mesh);
  return mesh;
}

function addSphere(THREE, group, scale, position, material) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 18), material);
  mesh.scale.set(...scale);
  mesh.position.set(...position);
  group.add(mesh);
  return mesh;
}

function addCylinder(THREE, group, radius, height, position, material, rotation = [0, 0, 0], segments = 24) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, segments), material);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  group.add(mesh);
  return mesh;
}

function addTube(THREE, group, from, to, radius, material) {
  const start = new THREE.Vector3(...from);
  const end = new THREE.Vector3(...to);
  const direction = new THREE.Vector3().subVectors(end, start);
  const length = direction.length();
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 18), material);
  mesh.position.copy(start.add(end).multiplyScalar(0.5));
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  group.add(mesh);
  return mesh;
}

function addHeadlight(THREE, group, position, color = 0xfff0c2) {
  const light = new THREE.PointLight(color, 0.18, 2.5);
  light.position.set(...position);
  group.add(light);
  group.userData.lights.push(light);
  return light;
}

function createScooter(THREE, materials) {
  const group = new THREE.Group();
  group.userData.wheels = [];
  group.userData.lights = [];

  const rear = createWheel(THREE, materials, 0.36);
  const front = createWheel(THREE, materials, 0.36);
  rear.position.set(-0.62, 0.36, 0);
  front.position.set(0.62, 0.36, 0);
  group.add(rear, front);
  group.userData.wheels.push(rear, front);

  addBox(THREE, group, [1.15, 0.28, 0.48], [-0.08, 0.68, 0], materials.black, [0, 0, -0.05]);
  addSphere(THREE, group, [0.75, 0.28, 0.36], [-0.22, 0.82, 0], materials.black);
  addBox(THREE, group, [0.38, 0.82, 0.4], [0.48, 1.0, 0], materials.black, [0, 0, -0.16]);
  addBox(THREE, group, [0.18, 0.52, 0.44], [0.38, 1.02, 0], materials.darkChrome, [0, 0, -0.18]);
  addBox(THREE, group, [0.52, 0.11, 0.52], [-0.22, 0.53, 0], materials.rubber, [0, 0, -0.04]);
  addBox(THREE, group, [0.72, 0.15, 0.34], [-0.36, 1.05, 0], materials.rubber);
  addBox(THREE, group, [0.58, 0.24, 0.46], [-0.54, 1.31, 0], materials.cloth, [0, 0, 0.04]);
  addTube(THREE, group, [-0.82, 1.44, -0.24], [-0.24, 1.24, 0.24], 0.011, materials.gold);
  addTube(THREE, group, [-0.86, 1.24, 0.24], [-0.24, 1.45, -0.24], 0.011, materials.gold);
  addTube(THREE, group, [0.56, 1.42, 0], [0.88, 1.62, 0], 0.025, materials.chrome);
  addTube(THREE, group, [0.72, 1.62, 0], [1.14, 1.62, 0], 0.035, materials.rubber);
  addTube(THREE, group, [-0.72, 0.72, 0.26], [0.47, 1.18, 0.26], 0.025, materials.chrome);
  addTube(THREE, group, [-0.72, 0.72, -0.26], [0.47, 1.18, -0.26], 0.025, materials.chrome);
  addSphere(THREE, group, [0.18, 0.12, 0.07], [0.63, 1.25, 0.23], materials.white);
  addHeadlight(THREE, group, [0.75, 1.24, 0.32]);
  addSphere(THREE, group, [0.06, 0.06, 0.05], [0.52, 1.19, 0.26], materials.amber);
  addSphere(THREE, group, [0.06, 0.06, 0.05], [0.52, 1.19, -0.26], materials.amber);
  addSphere(THREE, group, [0.07, 0.05, 0.05], [-0.92, 1.03, 0], materials.tail);
  addTube(THREE, group, [0.43, 0.72, 0], [0.63, 0.36, 0], 0.03, materials.chrome);
  addTube(THREE, group, [-0.72, 0.48, -0.18], [-0.25, 0.4, -0.18], 0.04, materials.black);

  return group;
}

function createRoadster(THREE, materials) {
  const group = new THREE.Group();
  group.userData.wheels = [];
  group.userData.lights = [];

  const rear = createWheel(THREE, materials, 0.42);
  const front = createWheel(THREE, materials, 0.42);
  rear.position.set(-0.86, 0.42, 0);
  front.position.set(0.9, 0.42, 0);
  group.add(rear, front);
  group.userData.wheels.push(rear, front);

  addTube(THREE, group, [-0.86, 0.72, 0], [0.55, 0.88, 0], 0.045, materials.chrome);
  addTube(THREE, group, [-0.2, 0.74, 0], [0.88, 1.18, 0], 0.035, materials.chrome);
  addSphere(THREE, group, [0.68, 0.28, 0.36], [0.04, 1.02, 0], materials.green);
  addCylinder(THREE, group, 0.06, 0.08, [0.13, 1.31, 0], materials.chrome);
  addBox(THREE, group, [0.58, 0.035, 0.39], [0.04, 1.12, 0.01], materials.gold, [0, 0, 0.02]);
  addBox(THREE, group, [0.88, 0.14, 0.38], [-0.5, 1.18, 0], materials.rubber, [0, 0, -0.04]);
  addBox(THREE, group, [0.45, 0.34, 0.34], [-0.3, 0.72, 0], materials.black);
  for (let i = 0; i < 5; i += 1) {
    addBox(THREE, group, [0.48, 0.025, 0.39], [-0.3, 0.6 + i * 0.055, 0], materials.chrome);
  }
  addBox(THREE, group, [0.28, 0.18, 0.3], [0.15, 0.68, 0], materials.engine);
  addTube(THREE, group, [-0.56, 0.58, -0.15], [0.76, 0.42, -0.15], 0.055, materials.black);
  addTube(THREE, group, [-0.48, 0.63, 0.16], [0.66, 0.48, 0.16], 0.026, materials.chrome);
  addTube(THREE, group, [0.72, 0.78, 0], [0.94, 1.38, 0], 0.035, materials.chrome);
  addTube(THREE, group, [0.82, 0.78, 0.16], [1.01, 1.34, 0.16], 0.022, materials.chrome);
  addTube(THREE, group, [0.82, 0.78, -0.16], [1.01, 1.34, -0.16], 0.022, materials.chrome);
  addTube(THREE, group, [0.72, 1.42, 0], [1.15, 1.42, 0], 0.035, materials.rubber);
  addSphere(THREE, group, [0.18, 0.18, 0.1], [0.98, 1.18, 0.2], materials.gold);
  addSphere(THREE, group, [0.16, 0.16, 0.08], [1.08, 1.22, 0], materials.white);
  addHeadlight(THREE, group, [1.12, 1.22, 0.22]);
  addSphere(THREE, group, [0.06, 0.06, 0.04], [0.88, 1.17, 0.31], materials.amber);
  addSphere(THREE, group, [0.06, 0.06, 0.04], [0.88, 1.17, -0.31], materials.amber);
  addTube(THREE, group, [-0.96, 0.75, 0.22], [-0.72, 1.1, 0.22], 0.035, materials.chrome);
  addTube(THREE, group, [-0.96, 0.75, -0.22], [-0.72, 1.1, -0.22], 0.035, materials.chrome);
  for (let i = 0; i < 4; i += 1) {
    addCylinder(THREE, group, 0.055, 0.018, [-0.84 + i * 0.035, 0.93 + i * 0.05, 0.225], materials.gold, [Math.PI / 2, 0, 0]);
    addCylinder(THREE, group, 0.055, 0.018, [-0.84 + i * 0.035, 0.93 + i * 0.05, -0.225], materials.gold, [Math.PI / 2, 0, 0]);
  }
  addTube(THREE, group, [-0.55, 0.55, 0.24], [-0.25, 0.55, 0.24], 0.022, materials.chrome);
  addSphere(THREE, group, [0.06, 0.045, 0.04], [-1.08, 1.04, 0], materials.tail);

  return group;
}

function createSportBike(THREE, materials) {
  const group = new THREE.Group();
  group.userData.wheels = [];
  group.userData.lights = [];

  const rear = createWheel(THREE, materials, 0.4);
  const front = createWheel(THREE, materials, 0.4);
  rear.position.set(-0.84, 0.4, 0);
  front.position.set(0.86, 0.4, 0);
  group.add(rear, front);
  group.userData.wheels.push(rear, front);

  addTube(THREE, group, [-0.8, 0.68, 0], [0.65, 0.85, 0], 0.045, materials.chrome);
  addBox(THREE, group, [1.12, 0.42, 0.48], [0.12, 0.95, 0], materials.orange, [0, 0, -0.06]);
  addBox(THREE, group, [0.76, 0.36, 0.5], [0.56, 1.08, 0], materials.white, [0, 0, 0.16]);
  addBox(THREE, group, [0.54, 0.3, 0.52], [0.72, 0.88, 0], materials.red, [0, 0, 0.2]);
  addBox(THREE, group, [0.9, 0.16, 0.52], [0.08, 0.74, 0], materials.black, [0, 0, -0.08]);
  addBox(THREE, group, [0.32, 0.08, 0.54], [0.32, 1.17, 0], materials.red, [0, 0, 0.1]);
  addBox(THREE, group, [0.44, 0.08, 0.55], [0.62, 1.21, 0], materials.orange, [0, 0, 0.22]);
  addBox(THREE, group, [0.28, 0.06, 0.56], [0.74, 1.01, 0], materials.white, [0, 0, -0.18]);
  addBox(THREE, group, [0.78, 0.17, 0.42], [-0.46, 1.22, 0], materials.rubber, [0, 0, -0.08]);
  addBox(THREE, group, [0.46, 0.34, 0.32], [-0.72, 1.06, 0], materials.orange, [0, 0, -0.28]);
  addBox(THREE, group, [0.42, 0.14, 0.34], [-0.92, 1.22, 0], materials.red, [0, 0, -0.2]);
  addBox(THREE, group, [0.42, 0.22, 0.36], [0.82, 1.38, 0], materials.glass, [0, 0, -0.28]);
  addSphere(THREE, group, [0.2, 0.13, 0.08], [0.92, 1.1, 0.24], materials.white);
  addSphere(THREE, group, [0.13, 0.09, 0.055], [0.93, 1.07, -0.24], materials.white);
  addHeadlight(THREE, group, [1.0, 1.12, 0.26]);
  addHeadlight(THREE, group, [1.0, 1.1, -0.26]);
  addSphere(THREE, group, [0.055, 0.055, 0.045], [0.8, 1.02, 0.33], materials.amber);
  addSphere(THREE, group, [0.055, 0.055, 0.045], [0.8, 1.02, -0.33], materials.amber);
  addTube(THREE, group, [0.72, 0.74, 0], [1.02, 1.37, 0], 0.035, materials.chrome);
  addTube(THREE, group, [0.82, 0.72, 0.17], [1.08, 1.32, 0.17], 0.023, materials.darkChrome);
  addTube(THREE, group, [0.82, 0.72, -0.17], [1.08, 1.32, -0.17], 0.023, materials.darkChrome);
  addTube(THREE, group, [0.83, 1.42, 0], [1.22, 1.42, 0], 0.035, materials.rubber);
  addTube(THREE, group, [-0.86, 0.58, -0.18], [-0.16, 0.5, -0.18], 0.055, materials.black);
  addTube(THREE, group, [-0.66, 0.62, 0.18], [0.48, 0.55, 0.18], 0.035, materials.darkChrome);
  addBox(THREE, group, [0.34, 0.24, 0.34], [-0.14, 0.72, 0], materials.engine);
  for (let i = 0; i < 4; i += 1) {
    addBox(THREE, group, [0.36, 0.018, 0.36], [-0.14, 0.62 + i * 0.045, 0], materials.chrome);
  }
  addTube(THREE, group, [-0.88, 0.65, 0], [-0.38, 1.08, 0], 0.035, materials.chrome);
  addTube(THREE, group, [-0.24, 0.52, -0.2], [0.42, 0.48, -0.2], 0.05, materials.black);
  addCylinder(THREE, group, 0.045, 0.24, [-0.18, 1.34, 0], materials.chrome);
  addSphere(THREE, group, [0.07, 0.045, 0.04], [-1.0, 1.15, 0], materials.tail);

  return group;
}
