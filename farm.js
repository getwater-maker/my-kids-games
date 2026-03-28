document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const moneyText = document.getElementById('moneyText');
    const farmGrid = document.getElementById('farmGrid');
    const toolBtns = document.querySelectorAll('.tool-btn');
    const cursorHint = document.getElementById('cursorHint');
    const infoTitle = document.getElementById('infoTitle');
    const infoDesc = document.getElementById('infoDesc');

    const guideBtn = document.getElementById('guideBtn');
    const guideScreen = document.getElementById('guideScreen');
    const closeGuideBtn = document.getElementById('closeGuideBtn');

    // SFX
    const sfxPlant = document.getElementById('sfx-plant');
    const sfxWater = document.getElementById('sfx-water');
    const sfxHarvest = document.getElementById('sfx-harvest');
    const sfxError = document.getElementById('sfx-error');
    const sfxCoin = document.getElementById('sfx-coin');

    // Game Variables
    let money = 100;
    let currentTool = 'water';
    let currentSeed = null;
    let currentCost = 0;

    // Seed definitions
    const seeds = {
        carrot: { name: '당근', emoji: '🥕', cost: 10, time: 5, reward: 20 },
        tomato: { name: '토마토', emoji: '🍅', cost: 20, time: 8, reward: 45 },
        corn: { name: '옥수수', emoji: '🌽', cost: 50, time: 15, reward: 120 },
        watermelon: { name: '수박', emoji: '🍉', cost: 100, time: 25, reward: 300 }
    };

    // Plant stages based on progress (0 to 1)
    const getStageEmoji = (seedKey, progress) => {
        if (progress < 0.3) return '🌱'; // Sprout
        if (progress < 0.7) return '🌿'; // Plant
        return seeds[seedKey].emoji; // Mature
    };

    // Initialize UI
    moneyText.innerText = money;

    // Create Farm Plots
    const plots = [];
    for (let i = 0; i < 16; i++) {
        const plot = document.createElement('div');
        plot.className = 'plot';
        plot.dataset.index = i;

        // Internal state
        plot.state = {
            hasPlant: false,
            seed: null,
            progress: 0,
            isWatered: false, // Must be watered to grow
            waterReqInterval: null,
            growInterval: null,
            isReady: false
        };

        // Create visual elements
        const plantEl = document.createElement('div');
        plantEl.className = 'plant-emoji';

        const waterReqEl = document.createElement('div');
        waterReqEl.className = 'water-req';
        waterReqEl.innerText = '💧';

        const sparkEl = document.createElement('div');
        sparkEl.className = 'harvest-ready';
        sparkEl.innerText = '✨';

        plot.appendChild(plantEl);
        plot.appendChild(waterReqEl);
        plot.appendChild(sparkEl);

        farmGrid.appendChild(plot);
        plots.push(plot);

        // Plot Interaction
        plot.addEventListener('click', () => handlePlotClick(plot, plantEl, waterReqEl, sparkEl));
        plot.addEventListener('mouseenter', () => handlePlotHover(plot));
    }

    // Tool Selection Logic
    toolBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            toolBtns.forEach(b => b.classList.remove('active'));
            let target = e.currentTarget;
            target.classList.add('active');

            currentTool = target.dataset.tool;
            if (currentTool === 'plant') {
                currentSeed = target.dataset.seed;
                currentCost = parseInt(target.dataset.cost);
                cursorHint.innerText = seeds[currentSeed].emoji;
                updateInfo(seeds[currentSeed].name + " 심기", `비용: ${currentCost}원\n선택한 칸에 심습니다.`);
            } else {
                currentSeed = null;
                if (currentTool === 'water') {
                    cursorHint.innerText = '🚿';
                    updateInfo("물주기", "말라버린 작물에게 물을 줍니다.");
                } else if (currentTool === 'harvest') {
                    cursorHint.innerText = '🧺';
                    updateInfo("수확하기", "다 자란 작물을 수확해 돈을 법니다.");
                } else if (currentTool === 'shovel') {
                    cursorHint.innerText = '⛏️';
                    updateInfo("파내기", "작물을 제거하고 빈 밭으로 만듭니다.");
                }
            }
        });
    });

    // Cursor tracking for tools
    const farmArea = document.querySelector('.farm-area');
    farmArea.addEventListener('mousemove', (e) => {
        const rect = farmArea.getBoundingClientRect();
        cursorHint.style.left = (e.clientX - rect.left) + 'px';
        cursorHint.style.top = (e.clientY - rect.top) + 'px';
    });
    farmArea.addEventListener('mouseenter', () => cursorHint.style.display = 'block');
    farmArea.addEventListener('mouseleave', () => cursorHint.style.display = 'none');

    // Guide Handlers
    guideBtn.addEventListener('click', () => guideScreen.classList.remove('hidden'));
    closeGuideBtn.addEventListener('click', () => guideScreen.classList.add('hidden'));

    // Information Panel Update
    function updateInfo(title, desc) {
        infoTitle.innerText = title;
        infoDesc.innerText = desc;
    }

    // Interaction Logic
    function handlePlotClick(plot, plantEl, waterReqEl, sparkEl) {
        let s = plot.state;

        if (currentTool === 'plant') {
            if (s.hasPlant) {
                playAudio(sfxError);
                updateInfo("에러!", "이미 작물이 심어져 있는 밭입니다.");
                return;
            }
            if (money < currentCost) {
                playAudio(sfxError);
                updateInfo("돈 부족", "씨앗을 살 돈이 부족합니다.");
                return;
            }
            // Plant success
            money -= currentCost;
            updateMoneyDisplay();

            s.hasPlant = true;
            s.seed = currentSeed;
            s.progress = 0;
            s.isReady = false;

            // Starts thirsty
            setWaterState(plot, waterReqEl, false);

            updatePlantVisuals(plot, plantEl);

            // Pop animation
            plantEl.classList.remove('pop-anim');
            void plantEl.offsetWidth;
            plantEl.classList.add('pop-anim');

            playAudio(sfxPlant);
            updateInfo("씨앗 심음", `${seeds[currentSeed].name} 씨앗을 심었습니다! 물을 주세요.`);

        } else if (currentTool === 'water') {
            if (!s.hasPlant) return;
            if (s.isReady) return; // Full grown don't need water

            if (!s.isWatered) {
                setWaterState(plot, waterReqEl, true);
                startGrowing(plot, plantEl, sparkEl);
                playAudio(sfxWater);
                // Particle effect (CSS)
                createParticles(plot, '#3498db');
            }

        } else if (currentTool === 'harvest') {
            if (!s.hasPlant) return;

            if (s.isReady) {
                // Success Harvest
                let reward = seeds[s.seed].reward;
                money += reward;
                updateMoneyDisplay();

                resetPlot(plot, plantEl, waterReqEl, sparkEl);
                playAudio(sfxHarvest);
                setTimeout(() => playAudio(sfxCoin), 200);

                createParticles(plot, '#f1c40f'); // gold particles

                // Floating text for reward
                createFloatingText(plot, `+${reward}원`, '#f1c40f');
                updateInfo("수확 완료!", `${reward}원을 벌었습니다!`);

            } else {
                playAudio(sfxError);
                updateInfo("수확 불가", "아직 다 자라지 않았습니다.");
            }

        } else if (currentTool === 'shovel') {
            if (!s.hasPlant) return;

            resetPlot(plot, plantEl, waterReqEl, sparkEl);
            playAudio(sfxPlant); // Dirt sound
            createParticles(plot, '#8B5A2B'); // dirt particles
            updateInfo("밭 정리", "작물을 파내고 밭을 정리했습니다.");
        }
    }

    function handlePlotHover(plot) {
        let s = plot.state;
        if (!s.hasPlant) {
            if (currentTool !== 'plant') updateInfo("빈 밭", "씨앗을 심을 수 있습니다.");
        } else {
            let name = seeds[s.seed].name;
            if (s.isReady) {
                updateInfo("수확 준비 완료!", `${name}이(가) 다 자랐습니다. 수확하세요!`);
            } else {
                let perc = Math.floor(s.progress * 100);
                let stat = s.isWatered ? "자라는 중" : "목마름";
                updateInfo(`${name} 재배 중`, `성장도: ${perc}%\n상태: ${stat}`);
            }
        }
    }

    function setWaterState(plot, waterReqEl, isWatered) {
        plot.state.isWatered = isWatered;
        if (isWatered) {
            plot.classList.add('watered');
            waterReqEl.style.display = 'none';
        } else {
            plot.classList.remove('watered');
            waterReqEl.style.display = 'block';
        }
    }

    function startGrowing(plot, plantEl, sparkEl) {
        let s = plot.state;
        let seedTimeTotal = seeds[s.seed].time * 1000; // ms
        let updateRate = 500; // ms
        let progressPerTick = updateRate / seedTimeTotal;

        clearInterval(s.growInterval);
        clearTimeout(s.waterReqInterval);

        // Randomly dries out after 3-7 seconds
        let dryTimer = (Math.random() * 4 + 3) * 1000;
        s.waterReqInterval = setTimeout(() => {
            if (s.hasPlant && !s.isReady) {
                setWaterState(plot, plot.querySelector('.water-req'), false);
                clearInterval(s.growInterval); // stop growing when dry
            }
        }, dryTimer);

        // Growing Loop
        s.growInterval = setInterval(() => {
            if (!s.isWatered) {
                clearInterval(s.growInterval);
                return;
            }

            s.progress += progressPerTick;

            if (s.progress >= 1.0) {
                s.progress = 1.0;
                s.isReady = true;

                clearInterval(s.growInterval);
                clearTimeout(s.waterReqInterval);
                plot.classList.remove('watered'); // looks visually better when grown

                sparkEl.style.display = 'block';
            }

            updatePlantVisuals(plot, plantEl);

        }, updateRate);
    }

    function updatePlantVisuals(plot, plantEl) {
        let s = plot.state;
        if (!s.hasPlant) {
            plantEl.innerText = '';
            return;
        }

        plantEl.innerText = getStageEmoji(s.seed, s.progress);

        // Increase size over time slightly
        let size = 30 + (s.progress * 40); // 30px to 70px
        plantEl.style.fontSize = `${size}px`;
    }

    function resetPlot(plot, plantEl, waterReqEl, sparkEl) {
        let s = plot.state;
        s.hasPlant = false;
        s.seed = null;
        s.progress = 0;
        s.isReady = false;

        clearInterval(s.growInterval);
        clearTimeout(s.waterReqInterval);

        plot.classList.remove('watered');
        waterReqEl.style.display = 'none';
        sparkEl.style.display = 'none';

        updatePlantVisuals(plot, plantEl);
    }

    function updateMoneyDisplay() {
        moneyText.innerText = money;

        // Pulse effect
        moneyText.parentElement.style.transform = 'scale(1.2)';
        setTimeout(() => {
            moneyText.parentElement.style.transform = 'scale(1)';
        }, 200);
    }

    function createParticles(plot, color) {
        const rect = plot.getBoundingClientRect();
        const farmRect = farmArea.getBoundingClientRect();

        const baseX = rect.left - farmRect.left + rect.width / 2;
        const baseY = rect.top - farmRect.top + rect.height / 2;

        for (let i = 0; i < 8; i++) {
            const p = document.createElement('div');
            p.style.position = 'absolute';
            p.style.width = '8px';
            p.style.height = '8px';
            p.style.backgroundColor = color;
            p.style.borderRadius = '50%';
            p.style.left = baseX + 'px';
            p.style.top = baseY + 'px';
            p.style.pointerEvents = 'none';
            p.style.zIndex = '30';

            const a = Math.random() * Math.PI * 2;
            const v = Math.random() * 50 + 20;
            const tx = Math.cos(a) * v;
            const ty = Math.sin(a) * v - 30; // slight upwards

            p.style.transition = 'transform 0.5s ease-out, opacity 0.5s';

            farmArea.appendChild(p);

            setTimeout(() => {
                p.style.transform = `translate(${tx}px, ${ty}px)`;
                p.style.opacity = '0';
            }, 10);

            setTimeout(() => p.remove(), 500);
        }
    }

    function createFloatingText(plot, text, color) {
        const rect = plot.getBoundingClientRect();
        const farmRect = farmArea.getBoundingClientRect();

        const floatEl = document.createElement('div');
        floatEl.innerText = text;
        floatEl.style.position = 'absolute';
        floatEl.style.left = (rect.left - farmRect.left + 20) + 'px';
        floatEl.style.top = (rect.top - farmRect.top) + 'px';
        floatEl.style.color = color;
        floatEl.style.fontSize = '24px';
        floatEl.style.fontWeight = 'bold';
        floatEl.style.textShadow = '0 2px 4px rgba(0,0,0,0.5)';
        floatEl.style.zIndex = '40';
        floatEl.style.pointerEvents = 'none';

        floatEl.style.transition = 'transform 1s ease-out, opacity 1s';

        farmArea.appendChild(floatEl);

        setTimeout(() => {
            floatEl.style.transform = 'translateY(-50px)';
            floatEl.style.opacity = '0';
        }, 10);

        setTimeout(() => floatEl.remove(), 1000);
    }

    function playAudio(snd) {
        if (snd) {
            snd.currentTime = 0;
            snd.volume = 0.5;
            snd.play().catch(e => console.log(e));
        }
    }

    // Auto show guide on first load
    setTimeout(() => {
        guideScreen.classList.remove('hidden');
    }, 500);

});
