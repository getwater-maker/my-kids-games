// Kick the Buddy 2D (Matter.js Implementation)
const { Engine, Render, Runner, World, Bodies, Mouse, MouseConstraint, Composite, Constraint, Events, Body } = Matter;

let engine, render, runner, world;
let mConstraint;
let canvas;

const ENTITIES = [];
let buddyComposite = null;
let currentTool = 'punch';
let coins = 0;

function init() {
    // Engine & World
    engine = Engine.create();
    world = engine.world;
    engine.gravity.y = 1.2;

    // Renderer
    const container = document.getElementById('game-container');
    render = Render.create({
        element: container,
        engine: engine,
        options: {
            width: window.innerWidth,
            height: window.innerHeight,
            wireframes: false,
            background: 'transparent' // Room background handled by CSS
        }
    });

    Render.run(render);

    // Runner
    runner = Runner.create();
    Runner.run(runner, engine);

    // Boundaries
    const ground = Bodies.rectangle(window.innerWidth / 2, window.innerHeight + 50, window.innerWidth, 100, { isStatic: true, render: { fillStyle: '#333' } });
    const wallL = Bodies.rectangle(-50, window.innerHeight / 2, 100, window.innerHeight, { isStatic: true });
    const wallR = Bodies.rectangle(window.innerWidth + 50, window.innerHeight / 2, 100, window.innerHeight, { isStatic: true });
    const roof = Bodies.rectangle(window.innerWidth / 2, -500, window.innerWidth, 100, { isStatic: true }); // Far roof for big toss
    World.add(world, [ground, wallL, wallR, roof]);

    // Mouse Interaction
    const mouse = Mouse.create(render.canvas);
    mConstraint = MouseConstraint.create(engine, {
        mouse: mouse,
        constraint: {
            stiffness: 0.1,
            render: { visible: false }
        }
    });
    World.add(world, mConstraint);
    render.mouse = mouse;

    spawnBuddy(window.innerWidth / 2, window.innerHeight / 2);
    setupEventListeners();
}

function spawnBuddy(x, y) {
    if (buddyComposite) World.remove(world, buddyComposite);

    buddyComposite = Composite.create({ label: 'Buddy' });

    const color = '#d2b48c'; // Tan Wood
    const clothColor = '#8d6e63'; // Brownish clothes

    // Core Parts
    const head = Bodies.circle(x, y - 100, 35, { render: { fillStyle: color, strokeStyle: '#4b2c20', lineWidth: 4 } });
    const torso = Bodies.rectangle(x, y, 60, 100, { render: { fillStyle: clothColor, strokeStyle: '#4b2c20', lineWidth: 4 }, chamfer: { radius: 10 } });

    // Arms
    const lArm = Bodies.rectangle(x - 50, y - 20, 20, 80, { render: { fillStyle: color }, chamfer: { radius: 5 } });
    const rArm = Bodies.rectangle(x + 50, y - 20, 20, 80, { render: { fillStyle: color }, chamfer: { radius: 5 } });

    // Legs
    const lLeg = Bodies.rectangle(x - 20, y + 80, 25, 90, { render: { fillStyle: color }, chamfer: { radius: 5 } });
    const rLeg = Bodies.rectangle(x + 20, y + 80, 25, 90, { render: { fillStyle: color }, chamfer: { radius: 5 } });

    // Join them
    const neck = Constraint.create({ bodyA: head, bodyB: torso, pointA: { x: 0, y: 35 }, pointB: { x: 0, y: -50 }, stiffness: 0.4, length: 5, render: { visible: false } });
    const shoulderL = Constraint.create({ bodyA: lArm, bodyB: torso, pointA: { x: 0, y: -35 }, pointB: { x: -30, y: -40 }, stiffness: 0.3, render: { visible: false } });
    const shoulderR = Constraint.create({ bodyA: rArm, bodyB: torso, pointA: { x: 0, y: -35 }, pointB: { x: 30, y: -40 }, stiffness: 0.3, render: { visible: false } });
    const hipL = Constraint.create({ bodyA: lLeg, bodyB: torso, pointA: { x: 0, y: -40 }, pointB: { x: -20, y: 50 }, stiffness: 0.3, render: { visible: false } });
    const hipR = Constraint.create({ bodyA: rLeg, bodyB: torso, pointA: { x: 0, y: -40 }, pointB: { x: 20, y: 50 }, stiffness: 0.3, render: { visible: false } });

    Composite.add(buddyComposite, [head, torso, lArm, rArm, lLeg, rLeg, neck, shoulderL, shoulderR, hipL, hipR]);
    World.add(world, buddyComposite);
}

function setupEventListeners() {
    document.getElementById('start-btn').onclick = () => {
        document.getElementById('overlay').classList.add('hidden');
    };

    document.querySelectorAll('.tool-btn').forEach(btn => {
        if (btn.id === 'reset-buddy') return;
        btn.onclick = () => {
            document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentTool = btn.getAttribute('data-tool');
            document.getElementById('current-tool').textContent = currentTool.toUpperCase();
        };
    });

    document.getElementById('reset-buddy').onclick = () => spawnBuddy(window.innerWidth / 2, 100);

    // Canvas Events for Tools
    render.canvas.addEventListener('mousedown', (e) => {
        if (mConstraint.body) return; // Don't tool if dragging body

        const { x, y } = mConstraint.mouse.position;
        handleToolAction(x, y);
    });

    window.addEventListener('resize', () => {
        render.canvas.width = window.innerWidth;
        render.canvas.height = window.innerHeight;
    });
}

function handleToolAction(x, y) {
    if (currentTool === 'punch') {
        const bodies = Composite.allBodies(buddyComposite);
        bodies.forEach(b => {
            const dist = Matter.Vector.magnitude(Matter.Vector.sub(b.position, { x, y }));
            if (dist < 80) {
                applyImpact(b, x, y, 0.05);
            }
        });
    } else if (currentTool === 'bomb') {
        createExplosion(x, y);
    } else if (currentTool === 'gun') {
        fireGun(x, y);
    }
}

function applyImpact(body, x, y, strength) {
    const force = Matter.Vector.normalise(Matter.Vector.sub(body.position, { x, y }));
    Body.applyForce(body, body.position, Matter.Vector.mult(force, strength * body.mass));

    gainCoins(10);
    showImpactFX(x, y, "POW!");
}

function createExplosion(x, y) {
    const bodies = Composite.allBodies(buddyComposite);
    bodies.forEach(b => {
        const dist = Matter.Vector.magnitude(Matter.Vector.sub(b.position, { x, y }));
        if (dist < 400) {
            const force = Matter.Vector.normalise(Matter.Vector.sub(b.position, { x, y }));
            const magnitude = (400 - dist) / 400 * 0.2;
            Body.applyForce(b, b.position, Matter.Vector.mult(force, magnitude * b.mass));
        }
    });

    // Visual Flash
    const flash = Bodies.circle(x, y, 100, { isSensor: true, render: { fillStyle: 'rgba(255, 100, 0, 0.6)' } });
    World.add(world, flash);
    setTimeout(() => World.remove(world, flash), 100);

    gainCoins(100);
    showImpactFX(x, y, "BOOM!");
}

function fireGun(x, y) {
    // 3 rapid shots
    for (let i = 0; i < 3; i++) {
        setTimeout(() => {
            const bodies = Composite.allBodies(buddyComposite);
            bodies.forEach(b => {
                const dist = Matter.Vector.magnitude(Matter.Vector.sub(b.position, { x, y }));
                if (dist < 150) {
                    applyImpact(b, x, y, 0.08);
                }
            });
            showImpactFX(x, y, "BANG!");
        }, i * 100);
    }
}

function gainCoins(amount) {
    coins += amount;
    document.getElementById('coin-val').textContent = coins.toLocaleString();
}

function showImpactFX(x, y, text) {
    const el = document.createElement('div');
    el.className = 'impact-text';
    el.textContent = text;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    document.getElementById('fx-layer').appendChild(el);
    setTimeout(() => el.remove(), 800);
}

init();
