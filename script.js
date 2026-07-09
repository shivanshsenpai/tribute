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
    const THREE = await import("https://unpkg.com/three@0.165.0/build/three.module.js");
    initMountainGame(THREE, canvas);
  } catch (error) {
    if (badge) badge.textContent = "3D could not load, opening fallback ride";
    console.warn("3D mountain game could not load", error);
    setupMountainCanvasFallback();
  }
}

function initMountainGame(THREE, canvas) {
  const stage = canvas.parentElement;
  const gameRoot = canvas.closest(".mountain-game");
  const badge = document.querySelector("#gameStateBadge");
  const distanceStat = document.querySelector("#gameDistance");
  const lightsStat = document.querySelector("#gameLights");
  const heartsStat = document.querySelector("#gameHearts");
  const bestStat = document.querySelector("#gameBest");
  const startButton = document.querySelector("[data-game-start]");
  const restartButton = document.querySelector("[data-game-restart]");
  const rideButtons = [...document.querySelectorAll("[data-game-ride]")];
  const controlButtons = [...document.querySelectorAll("[data-game-control]")];
  const storageKey = "tribute-3d-mountain-best";

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    preserveDrawingBuffer: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x202c31, 1);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x6f806f, 42, 128);

  const camera = new THREE.PerspectiveCamera(54, 1, 0.1, 260);
  camera.position.set(0, 5.2, 12);

  const ambient = new THREE.HemisphereLight(0xf9e8bd, 0x263829, 1.55);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xffd58a, 4.1);
  sun.position.set(-8, 14, 8);
  scene.add(sun);

  const rim = new THREE.PointLight(0xef6b1b, 15, 35);
  rim.position.set(6, 5, 4);
  scene.add(rim);

  const materials = createMaterials(THREE);
  const roadMaterial = new THREE.MeshStandardMaterial({ color: 0x171812, roughness: 0.88, metalness: 0.02 });
  const shoulderMaterial = new THREE.MeshStandardMaterial({ color: 0x263b2c, roughness: 0.92, metalness: 0.01 });
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

  const roadWidth = 5.8;
  const roadSegments = 72;
  const roadLength = 132;
  const localStart = 14;
  const localStep = roadLength / roadSegments;
  const roadGeometry = new THREE.BufferGeometry();
  const roadPositions = new Float32Array((roadSegments + 1) * 2 * 3);
  const roadIndices = [];
  for (let i = 0; i < roadSegments; i += 1) {
    const row = i * 2;
    roadIndices.push(row, row + 2, row + 1, row + 1, row + 2, row + 3);
  }
  roadGeometry.setAttribute("position", new THREE.BufferAttribute(roadPositions, 3));
  roadGeometry.setIndex(roadIndices);
  const roadMesh = new THREE.Mesh(roadGeometry, roadMaterial);
  scene.add(roadMesh);

  const terrainGeometry = new THREE.BufferGeometry();
  const terrainPositions = new Float32Array((roadSegments + 1) * 4 * 3);
  const terrainIndices = [];
  for (let i = 0; i < roadSegments; i += 1) {
    const row = i * 4;
    for (let j = 0; j < 3; j += 1) {
      terrainIndices.push(row + j, row + j + 4, row + j + 1, row + j + 1, row + j + 4, row + j + 5);
    }
  }
  terrainGeometry.setAttribute("position", new THREE.BufferAttribute(terrainPositions, 3));
  terrainGeometry.setIndex(terrainIndices);
  const terrainMesh = new THREE.Mesh(terrainGeometry, shoulderMaterial);
  scene.add(terrainMesh);

  const dashMeshes = Array.from({ length: 24 }, () => {
    const dash = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.035, 1.65), dashMaterial);
    scene.add(dash);
    return dash;
  });

  const skySun = new THREE.Mesh(
    new THREE.SphereGeometry(3.6, 32, 16),
    new THREE.MeshBasicMaterial({ color: 0xd8a64d })
  );
  skySun.position.set(24, 22, -92);
  scene.add(skySun);

  const mountainGroup = new THREE.Group();
  scene.add(mountainGroup);
  for (let i = 0; i < 18; i += 1) {
    const mountain = new THREE.Mesh(
      new THREE.ConeGeometry(8 + (i % 4) * 3, 16 + (i % 5) * 4, 4),
      new THREE.MeshStandardMaterial({ color: i % 2 ? 0x51644f : 0x465846, roughness: 0.96 })
    );
    mountain.position.set(-60 + i * 7.5, 2 + (i % 3), -104 - (i % 4) * 8);
    mountain.rotation.y = Math.PI / 4;
    mountainGroup.add(mountain);
  }

  const treeTemplate = createTree(THREE, treeTrunkMaterial, treeLeafMaterial);
  const trees = Array.from({ length: 44 }, (_, index) => {
    const tree = treeTemplate.clone(true);
    tree.userData.worldS = -20 + index * 6.8;
    tree.userData.side = index % 2 === 0 ? -1 : 1;
    tree.userData.offset = 5.5 + Math.random() * 11;
    tree.userData.scale = 0.75 + Math.random() * 0.95;
    tree.scale.setScalar(tree.userData.scale);
    scene.add(tree);
    return tree;
  });

  const rideProfiles = {
    activa: {
      name: "Activa",
      baseSpeed: 10.5,
      boost: 4.2,
      steer: 5.2,
      jump: 8.4,
      factory: createScooter,
      scale: 1.02,
      yOffset: 0.18,
    },
    yezdi: {
      name: "Yezdi",
      baseSpeed: 12.2,
      boost: 4.7,
      steer: 4.7,
      jump: 8.1,
      factory: createRoadster,
      scale: 1.02,
      yOffset: 0.18,
    },
    cbr: {
      name: "CBR",
      baseSpeed: 14.2,
      boost: 6.2,
      steer: 5.8,
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
  };

  const state = {
    ride: "activa",
    running: false,
    over: false,
    distance: 0,
    speed: rideProfiles.activa.baseSpeed,
    lane: 0,
    lean: 0,
    jumpY: 0,
    jumpVelocity: 0,
    lights: 0,
    hearts: 3,
    best: 0,
    nextSpawn: 38,
    messageTimer: 0,
    flash: 0,
    lastTime: 0,
    obstacles: [],
    rings: [],
  };

  try {
    state.best = Number(localStorage.getItem(storageKey) || 0);
  } catch {
    state.best = 0;
  }

  let player = null;
  let playerLight = null;
  let resizeQueued = true;

  const randomBetween = (min, max) => min + Math.random() * (max - min);
  const formatKm = (value) => `${value.toFixed(1)} km`;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  function roadCenterX(worldS) {
    return Math.sin(worldS * 0.045) * 4.8 + Math.sin(worldS * 0.014 + 1.2) * 6.8;
  }

  function roadY(worldS) {
    return Math.sin(worldS * 0.058) * 1.15 + Math.sin(worldS * 0.021 + 0.7) * 2.25;
  }

  function roadSlope(worldS) {
    return Math.atan2(roadY(worldS + 1.8) - roadY(worldS - 1.8), 3.6);
  }

  function roadPoint(worldS, lane = 0) {
    return new THREE.Vector3(roadCenterX(worldS) + lane, roadY(worldS), state.distance - worldS);
  }

  function setBadge(text) {
    if (!badge) return;
    badge.textContent = text;
    state.messageTimer = 1.9;
  }

  function updateStats() {
    const km = state.distance / 42;
    if (distanceStat) distanceStat.textContent = formatKm(km);
    if (lightsStat) lightsStat.textContent = String(state.lights);
    if (heartsStat) heartsStat.textContent = String(state.hearts);
    if (bestStat) bestStat.textContent = formatKm(Math.max(state.best, km));
  }

  function saveBest() {
    const km = state.distance / 42;
    if (km <= state.best) return;
    state.best = km;
    try {
      localStorage.setItem(storageKey, String(km));
    } catch {
      return;
    }
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
    player.scale.setScalar(profile.scale);
    player.rotation.y = Math.PI / 2;
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
    state.running = false;
    state.over = false;
    state.distance = 0;
    state.speed = rideProfiles[state.ride].baseSpeed;
    state.lane = 0;
    state.lean = 0;
    state.jumpY = 0;
    state.jumpVelocity = 0;
    state.lights = 0;
    state.hearts = 3;
    state.nextSpawn = 38;
    state.flash = 0;
    state.obstacles.forEach((item) => scene.remove(item.mesh));
    state.rings.forEach((ring) => scene.remove(ring));
    state.obstacles = [];
    state.rings = [];
    if (startButton) startButton.textContent = "Start ride";
    setBadge("Ready for the 3D hill road");
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
    canvas.focus({ preventScroll: true });
    if (startButton) startButton.textContent = "Riding";
    setBadge(`${rideProfiles[state.ride].name} is climbing`);
  }

  function finishRide() {
    state.running = false;
    state.over = true;
    saveBest();
    if (startButton) startButton.textContent = "Start ride";
    setBadge(`Ride finished at ${formatKm(state.distance / 42)}`);
    updateStats();
  }

  function restartRide() {
    resetGame();
    startRide();
  }

  function jumpBike() {
    if (!state.running || state.over || state.jumpY > 0.04) return;
    state.jumpVelocity = rideProfiles[state.ride].jump;
    setBadge("Clean hill hop");
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

  function spawnObjects() {
    while (state.nextSpawn < state.distance + 96) {
      const lane = randomBetween(-roadWidth * 0.33, roadWidth * 0.33);
      const item =
        Math.random() < 0.58 ? createLight(state.nextSpawn, lane) : createRock(state.nextSpawn, lane);
      scene.add(item.mesh);
      state.obstacles.push(item);
      state.nextSpawn += randomBetween(8, 15);
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
      const y = roadY(worldS);
      const roadLeft = center - roadWidth / 2;
      const roadRight = center + roadWidth / 2;
      const bend = Math.sin(worldS * 0.03);
      const roadIndex = i * 6;
      roadPositions[roadIndex] = roadLeft;
      roadPositions[roadIndex + 1] = y;
      roadPositions[roadIndex + 2] = z;
      roadPositions[roadIndex + 3] = roadRight;
      roadPositions[roadIndex + 4] = y;
      roadPositions[roadIndex + 5] = z;

      const terrainIndex = i * 12;
      terrainPositions[terrainIndex] = roadLeft - 34 - bend * 3;
      terrainPositions[terrainIndex + 1] = y - 2.4 - Math.sin(worldS * 0.026) * 0.7;
      terrainPositions[terrainIndex + 2] = z;
      terrainPositions[terrainIndex + 3] = roadLeft;
      terrainPositions[terrainIndex + 4] = y - 0.08;
      terrainPositions[terrainIndex + 5] = z;
      terrainPositions[terrainIndex + 6] = roadRight;
      terrainPositions[terrainIndex + 7] = y - 0.08;
      terrainPositions[terrainIndex + 8] = z;
      terrainPositions[terrainIndex + 9] = roadRight + 34 + bend * 3;
      terrainPositions[terrainIndex + 10] = y - 2.2 + Math.cos(worldS * 0.028) * 0.7;
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
      dash.rotation.set(-roadSlope(worldS), 0, 0);
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

  function updateObjects(dt) {
    spawnObjects();
    const bikeWorldS = state.distance - 2.2;

    state.obstacles = state.obstacles.filter((item) => {
      const point = roadPoint(item.worldS, item.lane);
      item.mesh.position.copy(point);

      if (item.type === "light") {
        item.mesh.position.y += 1.35 + Math.sin(performance.now() * 0.004 + item.worldS) * 0.18;
        item.mesh.rotation.y += dt * 2.5;
      } else {
        item.mesh.position.y += 0.34;
        item.mesh.rotation.x += dt * 0.7;
      }

      const behind = item.worldS < state.distance - 16;
      if (behind) {
        scene.remove(item.mesh);
        return false;
      }

      const closeForward = Math.abs(item.worldS - bikeWorldS) < 1.5;
      const closeLane = Math.abs(item.lane - state.lane) < 1.02;
      if (!item.hit && closeForward && closeLane) {
        if (item.type === "light") {
          item.hit = true;
          state.lights += 1;
          addRing(item.mesh.position, 0xd8a64d);
          setBadge("Memory light collected");
          scene.remove(item.mesh);
          return false;
        }

        if (state.jumpY < 0.65) {
          item.hit = true;
          state.hearts -= 1;
          state.flash = 1;
          addRing(item.mesh.position, 0xb92720);
          setBadge(state.hearts > 0 ? "Loose stone touched" : "Ride needs a restart");
          scene.remove(item.mesh);
          if (state.hearts <= 0) finishRide();
          return false;
        }
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
    state.lane = clamp(state.lane + steer * profile.steer * dt, -roadWidth * 0.36, roadWidth * 0.36);
    state.lean += (steer - state.lean) * Math.min(1, dt * 8);

    if (state.jumpY > 0 || state.jumpVelocity > 0) {
      state.jumpY += state.jumpVelocity * dt;
      state.jumpVelocity -= 16.5 * dt;
      if (state.jumpY < 0) {
        state.jumpY = 0;
        state.jumpVelocity = 0;
      }
    }

    const worldS = state.distance - 2.2;
    const road = roadPoint(worldS, state.lane);
    const pitch = roadSlope(worldS);
    player.position.set(road.x, road.y + profile.yOffset + state.jumpY, road.z);
    player.rotation.x = -pitch;
    player.rotation.y = Math.PI / 2 + state.lean * 0.14;
    player.rotation.z = -state.lean * 0.34;
    player.userData.wheels?.forEach((wheel) => {
      wheel.rotation.z -= state.speed * dt * 1.2;
    });

    playerLight.position.set(road.x, road.y + 1.7 + state.jumpY, road.z - 1.6);
  }

  function updateCamera(dt) {
    const bikeWorldS = state.distance - 2.2;
    const bikePoint = roadPoint(bikeWorldS, state.lane);
    const lookWorld = bikeWorldS + 26;
    const lookPoint = roadPoint(lookWorld, 0);
    const targetCamera = new THREE.Vector3(
      bikePoint.x - state.lane * 0.28,
      bikePoint.y + 4.6 + state.jumpY * 0.45,
      bikePoint.z + 10.4
    );
    camera.position.lerp(targetCamera, Math.min(1, dt * 4.8));
    camera.lookAt(lookPoint.x, lookPoint.y + 1.25, lookPoint.z);
  }

  function updateGame(dt) {
    const profile = rideProfiles[state.ride];
    const targetSpeed = profile.baseSpeed + (controls.gas ? profile.boost : 0) + Math.min(state.distance / 35, 4.4);
    state.speed += (targetSpeed - state.speed) * Math.min(1, dt * 3.4);
    state.distance += state.speed * dt;
    state.flash = Math.max(0, state.flash - dt * 2.8);
    if (state.messageTimer > 0) state.messageTimer -= dt;
    if (state.messageTimer <= 0 && badge && state.running) badge.textContent = "3D hill road running";

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

    if (state.running) updateGame(dt);
    else {
      updateRoadMesh();
      updateTrees();
      updatePlayer(dt);
      updateCamera(dt);
    }

    renderer.render(scene, camera);
    renderOverlayFlash();
    requestAnimationFrame(animate);
  }

  startButton?.addEventListener("click", startRide);
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
      ShiftLeft: "gas",
      ShiftRight: "gas",
      ArrowDown: "gas",
    };
    const control = map[event.code];
    if (control) {
      event.preventDefault();
      if (!state.running) startRide();
      setControl(control, true);
    }
    if (event.code === "Space" || event.code === "ArrowUp" || event.code === "KeyW") {
      event.preventDefault();
      if (!state.running) startRide();
      setControl("jump", true);
      if (!event.repeat) jumpBike();
    }
  });

  window.addEventListener("keyup", (event) => {
    if (!gameHasKeyboardFocus()) return;
    const map = {
      ArrowLeft: "left",
      KeyA: "left",
      ArrowRight: "right",
      KeyD: "right",
      ShiftLeft: "gas",
      ShiftRight: "gas",
      ArrowDown: "gas",
    };
    const control = map[event.code];
    if (control) {
      event.preventDefault();
      setControl(control, false);
    }
    if (event.code === "Space" || event.code === "ArrowUp" || event.code === "KeyW") {
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

function setupMountainCanvasFallback() {
  const canvas = document.querySelector("#mountainGameCanvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const gameRoot = canvas.closest(".mountain-game");
  const badge = document.querySelector("#gameStateBadge");
  const distanceStat = document.querySelector("#gameDistance");
  const lightsStat = document.querySelector("#gameLights");
  const heartsStat = document.querySelector("#gameHearts");
  const bestStat = document.querySelector("#gameBest");
  const startButton = document.querySelector("[data-game-start]");
  const restartButton = document.querySelector("[data-game-restart]");
  const rideButtons = [...document.querySelectorAll("[data-game-ride]")];
  const controlButtons = [...document.querySelectorAll("[data-game-control]")];
  const storageKey = "tribute-mountain-best";

  const rideProfiles = {
    activa: {
      name: "Activa",
      baseSpeed: 176,
      boost: 58,
      jump: 510,
      gravity: 1480,
      body: "#20201d",
      accent: "#d8a64d",
      trim: "#f8f6f0",
    },
    yezdi: {
      name: "Yezdi",
      baseSpeed: 194,
      boost: 66,
      jump: 485,
      gravity: 1520,
      body: "#263f31",
      accent: "#d8a64d",
      trim: "#151514",
    },
    cbr: {
      name: "CBR",
      baseSpeed: 218,
      boost: 86,
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
    lights: 0,
    hearts: 3,
    speed: rideProfiles.activa.baseSpeed,
    best: savedBest,
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
  const formatKm = (value) => `${value.toFixed(1)} km`;

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
    if (distanceStat) distanceStat.textContent = formatKm(state.distance);
    if (lightsStat) lightsStat.textContent = String(state.lights);
    if (heartsStat) heartsStat.textContent = String(state.hearts);
    if (bestStat) bestStat.textContent = formatKm(Math.max(state.best, state.distance));
  }

  function resetGame() {
    const profile = rideProfiles[state.ride];
    state.running = false;
    state.over = false;
    state.scroll = 0;
    state.distance = 0;
    state.lights = 0;
    state.hearts = 3;
    state.speed = profile.baseSpeed;
    state.jumpY = 0;
    state.velocityY = 0;
    state.lean = 0;
    state.obstacles = [];
    state.effects = [];
    state.spawnAt = width + 360;
    state.flash = 0;
    setBadge("Ready for the climb");
    if (startButton) startButton.textContent = "Start ride";
    updateStats();
  }

  function saveBest() {
    if (state.distance <= state.best) return;
    state.best = state.distance;
    try {
      localStorage.setItem(storageKey, String(state.best));
    } catch {
      return;
    }
  }

  function startRide() {
    if (state.running) return;
    if (state.over) resetGame();
    state.running = true;
    canvas.focus({ preventScroll: true });
    setBadge(`${rideProfiles[state.ride].name} climb running`);
    if (startButton) startButton.textContent = "Riding";
  }

  function finishRide() {
    state.running = false;
    state.over = true;
    saveBest();
    setBadge(`Ride finished at ${formatKm(state.distance)}`);
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
    setBadge("Clean hop");
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

    const targetSpeed = profile.baseSpeed + (controls.gas ? profile.boost : 0) + Math.min(state.distance * 8, 82);
    state.speed += (targetSpeed - state.speed) * Math.min(1, dt * 3.5);
    state.scroll += state.speed * dt;
    state.distance = state.scroll / 520;

    if (state.jumpY < 0 || state.velocityY < 0) {
      state.jumpY += state.velocityY * dt;
      state.velocityY += profile.gravity * dt;
      if (state.jumpY > 0) {
        state.jumpY = 0;
        state.velocityY = 0;
      }
    }

    state.flash = Math.max(0, state.flash - dt * 2.4);
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
          state.lights += 1;
          addEffect(screenX, y, "#d8a64d");
          setBadge("Memory light collected");
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
        addEffect(screenX, rockTop, "#b92720");
        setBadge(state.hearts > 0 ? "Loose stone touched" : "Ride needs a restart");
        if (state.hearts <= 0) finishRide();
        return false;
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

  startButton?.addEventListener("click", startRide);
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
      ShiftLeft: "gas",
      ShiftRight: "gas",
      ArrowDown: "gas",
    };
    const control = map[event.code];
    if (control) {
      event.preventDefault();
      if (!state.running) startRide();
      setControl(control, true);
    }
    if (event.code === "Space" || event.code === "ArrowUp" || event.code === "KeyW") {
      event.preventDefault();
      if (!state.running) startRide();
      setControl("jump", true);
      if (!event.repeat) jumpBike();
    }
  });

  window.addEventListener("keyup", (event) => {
    if (!gameHasKeyboardFocus()) return;

    const map = {
      ArrowLeft: "left",
      KeyA: "left",
      ArrowRight: "right",
      KeyD: "right",
      ShiftLeft: "gas",
      ShiftRight: "gas",
      ArrowDown: "gas",
    };
    const control = map[event.code];
    if (control) {
      event.preventDefault();
      setControl(control, false);
    }
    if (event.code === "Space" || event.code === "ArrowUp" || event.code === "KeyW") {
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
    const THREE = await import("https://unpkg.com/three@0.165.0/build/three.module.js");
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
