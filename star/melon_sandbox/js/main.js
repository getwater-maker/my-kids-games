// Melon Sandbox (Matter.js Implementation)
const { Engine, Render, Runner, World, Bodies, Mouse, MouseConstraint, Composite, Constraint, Events } = Matter;

let engine, render, runner, world;
let mConstraint;
let canvas;

const ENTITIES = [];

function init() {
    // Engine & World
    engine = Engine.create();
    world = engine.world;
    engine.gravity.y = 1;

    // Canvas
    const container = document.getElementById('game-container');
    render = Render.create({
        element: container,
        engine: engine,
        options: {
            width: window.innerWidth,
            height: window.innerHeight,
            wireframes: false,
            background: '#1a1a2e'
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
    const roof = Bodies.rectangle(window.innerWidth / 2, -50, window.innerWidth, 100, { isStatic: true });
    World.add(world, [ground, wallL, wallR, roof]);

    // Mouse Interaction
    const mouse = Mouse.create(render.canvas);
    mConstraint = MouseConstraint.create(engine, {
        mouse: mouse,
        constraint: {
            stiffness: 0.2,
            render: { visible: false }
        }
    });
    World.add(world, mConstraint);
    render.mouse = mouse;

    setupEventListeners();
    updateEntityCount();
}

function setupEventListeners() {
    document.getElementById('start-btn').onclick = () => {
        document.getElementById('overlay').classList.add('hidden');
    };

    document.querySelectorAll('.spawn-btn').forEach(btn => {
        btn.onclick = () => {
            const type = btn.getAttribute('data-type');
            spawnItem(type, window.innerWidth / 2, 200);
        };
    });

    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.onclick = () => {
            const tool = btn.getAttribute('data-tool');
            handleTool(tool);
        };
    });

    document.getElementById('clear-btn').onclick = clearSandbox;

    window.addEventListener('resize', () => {
        render.canvas.width = window.innerWidth;
        render.canvas.height = window.innerHeight;
    });
}

function spawnItem(type, x, y) {
    let body;
    const commonOpts = { chamfer: { radius: 5 } };

    switch (type) {
        case 'melon':
            body = createCharacter(x, y, '#2ecc71'); // Green Melon
            break;
        case 'pumpkin':
            body = createCharacter(x, y, '#e67300'); // Orange Pumpkin
            break;
        case 'box':
            body = Bodies.rectangle(x, y, 60, 60, { ...commonOpts, render: { fillStyle: '#d35400' } });
            break;
        case 'wheel':
            body = Bodies.circle(x, y, 30, { ...commonOpts, render: { fillStyle: '#555' } });
            break;
        case 'beam':
            body = Bodies.rectangle(x, y, 200, 20, { ...commonOpts, render: { fillStyle: '#bdc3c7' } });
            break;
    }

    if (body) {
        World.add(world, body);
        ENTITIES.push(body);
        updateEntityCount();
    }
}

function createCharacter(x, y, color) {
    // Ragdoll character (Head, Torso, Legs)
    const head = Bodies.circle(x, y - 50, 15, { render: { fillStyle: color } });
    const torso = Bodies.rectangle(x, y, 30, 60, { render: { fillStyle: color } });
    const leftLeg = Bodies.rectangle(x - 10, y + 50, 10, 40, { render: { fillStyle: color } });
    const rightLeg = Bodies.rectangle(x + 10, y + 50, 10, 40, { render: { fillStyle: color } });

    // Constraints (Joints)
    const neck = Constraint.create({ bodyA: head, bodyB: torso, pointA: { x: 0, y: 15 }, pointB: { x: 0, y: -30 }, stiffness: 0.8 });
    const hipL = Constraint.create({ bodyA: torso, bodyB: leftLeg, pointA: { x: -10, y: 30 }, pointB: { x: 0, y: -20 }, stiffness: 0.8 });
    const hipR = Constraint.create({ bodyA: torso, bodyB: rightLeg, pointA: { x: 10, y: 30 }, pointB: { x: 0, y: -20 }, stiffness: 0.8 });

    Composite.add(world, [head, torso, leftLeg, rightLeg, neck, hipL, hipR]);

    // For counting, just return the torso as the entity
    return null; // Characters are composites, handeled differently
}

function handleTool(tool) {
    if (tool === 'bomb') {
        // Explosion at mouse position
        const { x, y } = mConstraint.mouse.position;
        ENTITIES.forEach(body => {
            if (body.isStatic) return;
            const dist = Matter.Vector.magnitude(Matter.Vector.sub(body.position, { x, y }));
            if (dist < 300) {
                const force = Matter.Vector.normalise(Matter.Vector.sub(body.position, { x, y }));
                Matter.Body.applyForce(body, body.position, Matter.Vector.mult(force, 0.05 * (300 - dist) / 300));
            }
        });

        // Visual feedback
        createFlash(x, y);
    } else if (tool === 'chainsaw') {
        const { x, y } = mConstraint.mouse.position;
        applyLocalDamage(x, y, 100, 'slice');
    } else if (tool === 'acid') {
        const { x, y } = mConstraint.mouse.position;
        applyLocalDamage(x, y, 150, 'dissolve');
    } else if (tool === 'fire') {
        const { x, y } = mConstraint.mouse.position;
        applyLocalDamage(x, y, 200, 'burn');
    } else if (tool === 'gravity') {
        engine.gravity.y = engine.gravity.y === 1 ? -1 : 1;
    }
}

function applyLocalDamage(x, y, radius, type) {
    const bodies = Composite.allBodies(world);
    bodies.forEach(body => {
        if (body.isStatic) return;
        const dist = Matter.Vector.magnitude(Matter.Vector.sub(body.position, { x, y }));
        if (dist < radius) {
            // Visual damage: change color
            if (type === 'slice') {
                body.render.fillStyle = '#ff0000'; // Blood red
                // Forceful push
                const force = Matter.Vector.normalise(Matter.Vector.sub(body.position, { x, y }));
                Matter.Body.applyForce(body, body.position, Matter.Vector.mult(force, 0.02));
            } else if (type === 'dissolve') {
                body.render.fillStyle = '#27ae60'; // Acid green
                body.render.opacity = (body.render.opacity || 1) - 0.1;
                if (body.render.opacity <= 0) World.remove(world, body);
            } else if (type === 'burn') {
                body.render.fillStyle = '#333'; // Charred
                createFlash(body.position.x, body.position.y, 'rgba(255, 69, 0, 0.5)');
            }
        }
    });
}

function createFlash(x, y, color = 'rgba(255, 255, 255, 0.4)') {
    // Simple visual puff
    const puff = Bodies.circle(x, y, 80, { isSensor: true, render: { fillStyle: color } });
    World.add(world, puff);
    setTimeout(() => World.remove(world, puff), 100);
}

function clearSandbox() {
    Composite.clear(world, false, true);
    // Re-add boundaries
    init();
}

function updateEntityCount() {
    const bodies = Composite.allBodies(world);
    document.getElementById('entity-count').textContent = `Objects: ${bodies.length - 4}`;
}

init();
