// 3D Breast Reconstruction - Multiple Variants
// Размери в mm (конвертирани за 3D)

const VARIANTS = {
    1: {
        name: "Вариант 1 - Максимална (21 mm)",
        nippleHeight: 21 / 10,  // 2.1 единици
        breastBase: 155 / 10,   // 15.5 единици
        areola: 65 / 10,        // 6.5 единици
        nippleBase: 14 / 10     // 1.4 единици
    },
    2: {
        name: "Вариант 2 - Средна (18 mm)",
        nippleHeight: 18 / 10,  // 1.8 единици
        breastBase: 155 / 10,
        areola: 65 / 10,
        nippleBase: 14 / 10
    },
    3: {
        name: "Вариант 3 - Минимална (15 mm)",
        nippleHeight: 15 / 10,  // 1.5 единици
        breastBase: 155 / 10,
        areola: 65 / 10,
        nippleBase: 14 / 10
    }
};

// Сцени и компоненти за всеки вариант
const scenes = {};
const cameras = {};
const renderers = {};
const meshes = {};
let autoRotateFlags = { 1: false, 2: false, 3: false };

// Цветове
let colors = {
    breast: new THREE.Color(0xffb6c1),
    areola: new THREE.Color(0xd4516f),
    nipple: new THREE.Color(0x8b4c5f)
};

// Инициализация всички варианти
function initAllVariants() {
    [1, 2, 3].forEach(variantId => {
        initVariant(variantId);
    });
}

// Инициализация за конкретен вариант
function initVariant(variantId) {
    const container = document.getElementById(`canvas-variant${variantId}`);
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // Сцена
    scenes[variantId] = new THREE.Scene();
    scenes[variantId].background = new THREE.Color(0xf5f7fa);

    // Камера
    cameras[variantId] = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    cameras[variantId].position.set(0, 0, 25);

    // Рендериране
    renderers[variantId] = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderers[variantId].setSize(width, height);
    renderers[variantId].setPixelRatio(window.devicePixelRatio);
    renderers[variantId].shadowMap.enabled = true;
    container.appendChild(renderers[variantId].domElement);

    // Светлина
    setupLighting(variantId);

    // Създание модели
    createVariantModels(variantId);

    // События
    setupVariantEvents(variantId);

    // Начален преглед
    resetVariantCamera(variantId);

    // Анимация
    animateVariant(variantId);
}

// Светлина
function setupLighting(variantId) {
    // Амбиентна светлина
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scenes[variantId].add(ambientLight);

    // Насочена светлина 1
    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight1.position.set(10, 10, 15);
    directionalLight1.castShadow = true;
    directionalLight1.shadow.mapSize.width = 2048;
    directionalLight1.shadow.mapSize.height = 2048;
    scenes[variantId].add(directionalLight1);

    // Насочена светлина 2
    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
    directionalLight2.position.set(-10, -5, 10);
    scenes[variantId].add(directionalLight2);

    // Точкова светлина
    const pointLight = new THREE.PointLight(0xffffff, 0.5);
    pointLight.position.set(15, 15, 20);
    scenes[variantId].add(pointLight);
}

// Създаване на модели
function createVariantModels(variantId) {
    const variant = VARIANTS[variantId];
    const baseRadius = variant.breastBase / 2;
    const nippleHeight = variant.nippleHeight;

    meshes[variantId] = {};

    // Гърдото
    const breastGeometry = new THREE.LatheGeometry(
        createBreastCurve(baseRadius, nippleHeight),
        64,
        0,
        Math.PI * 2
    );

    const breastMaterial = new THREE.MeshStandardMaterial({
        color: colors.breast,
        metalness: 0.1,
        roughness: 0.7,
        side: THREE.DoubleSide
    });

    meshes[variantId].breast = new THREE.Mesh(breastGeometry, breastMaterial);
    meshes[variantId].breast.castShadow = true;
    meshes[variantId].breast.receiveShadow = true;
    meshes[variantId].breast.position.z = 0;
    scenes[variantId].add(meshes[variantId].breast);

    // Ареола
    const areolaGeometry = new THREE.CircleGeometry(variant.areola / 2, 64);
    const areolaColor = new THREE.Color(colors.breast);
    areolaColor.multiplyScalar(0.7);
    
    const areolaMaterial = new THREE.MeshStandardMaterial({
        color: areolaColor,
        metalness: 0.05,
        roughness: 0.8
    });

    meshes[variantId].areola = new THREE.Mesh(areolaGeometry, areolaMaterial);
    meshes[variantId].areola.position.z = nippleHeight + 0.01;
    meshes[variantId].areola.castShadow = true;
    meshes[variantId].areola.receiveShadow = true;
    scenes[variantId].add(meshes[variantId].areola);

    // Зърното
    const nippleGeometry = new THREE.ConeGeometry(variant.nippleBase / 2, nippleHeight, 32);
    const nippleColor = new THREE.Color(colors.breast);
    nippleColor.multiplyScalar(0.5);
    
    const nippleMaterial = new THREE.MeshStandardMaterial({
        color: nippleColor,
        metalness: 0.1,
        roughness: 0.6
    });

    meshes[variantId].nipple = new THREE.Mesh(nippleGeometry, nippleMaterial);
    meshes[variantId].nipple.position.z = nippleHeight + nippleHeight / 2;
    meshes[variantId].nipple.castShadow = true;
    meshes[variantId].nipple.receiveShadow = true;
    scenes[variantId].add(meshes[variantId].nipple);
}

// Крива на гърдото
function createBreastCurve(radius, height) {
    const points = [];
    const segments = 20;

    for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const x = radius * Math.cos(t * Math.PI);
        const y = height * Math.sin(t * Math.PI);
        points.push(new THREE.Vector2(x, y));
    }

    return points;
}

// Нулиране на камерата
function resetVariantCamera(variantId) {
    cameras[variantId].position.set(0, 0, 25);
    cameras[variantId].rotation.order = 'YXZ';
    cameras[variantId].rotation.y = 0;
    cameras[variantId].rotation.x = 0.3;
    scenes[variantId].rotation.y = 0.5;
    scenes[variantId].rotation.x = 0.2;
}

// События за взаимодействие
function setupVariantEvents(variantId) {
    const container = document.getElementById(`canvas-variant${variantId}`);
    let isDragging = false;
    let mouseX = 0, mouseY = 0;

    container.addEventListener('mousedown', (e) => {
        isDragging = true;
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    container.addEventListener('mousemove', (e) => {
        if (isDragging) {
            const deltaX = (e.clientX - mouseX) * 0.01;
            const deltaY = (e.clientY - mouseY) * 0.01;

            scenes[variantId].rotation.y += deltaX;
            scenes[variantId].rotation.x += deltaY;

            mouseX = e.clientX;
            mouseY = e.clientY;
        }
    });

    container.addEventListener('mouseup', () => {
        isDragging = false;
    });

    container.addEventListener('mouseleave', () => {
        isDragging = false;
    });

    // Touch
    container.addEventListener('touchstart', (e) => {
        isDragging = true;
        mouseX = e.touches[0].clientX;
        mouseY = e.touches[0].clientY;
    });

    container.addEventListener('touchmove', (e) => {
        if (isDragging) {
            const deltaX = (e.touches[0].clientX - mouseX) * 0.01;
            const deltaY = (e.touches[0].clientY - mouseY) * 0.01;

            scenes[variantId].rotation.y += deltaX;
            scenes[variantId].rotation.x += deltaY;

            mouseX = e.touches[0].clientX;
            mouseY = e.touches[0].clientY;
        }
    });

    container.addEventListener('touchend', () => {
        isDragging = false;
    });
}

// Автоматична ротация
function autoRotateVariant(variantId) {
    autoRotateFlags[variantId] = !autoRotateFlags[variantId];
}

// Актуализация на цветовете
function updateAllColors() {
    const breastColor = document.getElementById('globalBreastColor').value;
    colors.breast = new THREE.Color(breastColor);
    colors.areola = new THREE.Color(breastColor).multiplyScalar(0.7);
    colors.nipple = new THREE.Color(breastColor).multiplyScalar(0.5);

    [1, 2, 3].forEach(variantId => {
        if (meshes[variantId]) {
            meshes[variantId].breast.material.color.set(colors.breast);
            meshes[variantId].areola.material.color.set(colors.areola);
            meshes[variantId].nipple.material.color.set(colors.nipple);
        }
    });
}

// Анимационен цикъл за вариант
function animateVariant(variantId) {
    requestAnimationFrame(() => animateVariant(variantId));

    if (autoRotateFlags[variantId]) {
        scenes[variantId].rotation.y += 0.005;
    }

    renderers[variantId].render(scenes[variantId], cameras[variantId]);
}

// Обработка на размер на прозореца
window.addEventListener('load', initAllVariants);

window.addEventListener('resize', () => {
    [1, 2, 3].forEach(variantId => {
        const container = document.getElementById(`canvas-variant${variantId}`);
        if (!container || !renderers[variantId]) return;

        const width = container.clientWidth;
        const height = container.clientHeight;
        cameras[variantId].aspect = width / height;
        cameras[variantId].updateProjectionMatrix();
        renderers[variantId].setSize(width, height);
    });
});
