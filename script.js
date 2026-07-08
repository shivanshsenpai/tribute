document.documentElement.classList.add("js");

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

setupReveal();
setupCounters();
setupImageTilt();
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
  createWorld(THREE, scene, materials);

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
  let pointerX = 0;

  document.querySelectorAll("[data-focus]").forEach((button) => {
    button.addEventListener("click", () => {
      activeTarget = focusTargets[button.dataset.focus] || focusTargets.all;
      document.querySelectorAll("[data-focus]").forEach((item) => {
        item.classList.toggle("is-active", item === button);
      });
    });
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

    garage.rotation.y = Math.sin(elapsed * 0.35) * 0.06 * motion;

    Object.values(vehicles).forEach((vehicle, index) => {
      vehicle.position.y = Math.sin(elapsed * 1.2 + index) * 0.025 * motion;
      vehicle.userData.wheels.forEach((wheel) => {
        wheel.rotation.z -= 0.015 * motion;
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
  }

  const backGlow = new THREE.Mesh(
    new THREE.CircleGeometry(4.8, 64),
    new THREE.MeshBasicMaterial({ color: 0xef6b1b, transparent: true, opacity: 0.07 })
  );
  backGlow.position.set(0, 2.2, -4.5);
  scene.add(backGlow);
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

function createScooter(THREE, materials) {
  const group = new THREE.Group();
  group.userData.wheels = [];

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
