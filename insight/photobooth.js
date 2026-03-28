const video = document.getElementById('video');
const canvas = document.getElementById('captureCanvas');
const context = canvas.getContext('2d');
const countdownElement = document.getElementById('countdown');
const flashElement = document.getElementById('flash');
const slots = [
    document.getElementById('slot1'),
    document.getElementById('slot2'),
    document.getElementById('slot3'),
    document.getElementById('slot4')
];
const startBtn = document.getElementById('startBtn');
const saveBtn = document.getElementById('saveBtn');
const resetBtn = document.getElementById('resetBtn');
const frame = document.getElementById('photoFrame');

let photoCount = 0;
let isTakingPhotos = false;

// 1. 카메라 시작
async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        video.srcObject = stream;
    } catch (err) {
        showToast("카메라를 켤 수 없어요! 카메라 권한을 확인해주세요.  카메라가 없어도 괜찮아요!");
        console.error("Camera error:", err);
    }
}

// 2. 사진 촬영 함수
function capturePhoto(slotIndex) {
    // 캔버스 크기 설정 (비디오 비율에 맞춤)
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // 거울 모드 반영해서 그리기
    context.translate(canvas.width, 0);
    context.scale(-1, 1);
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // 이미지 데이터를 슬롯 배경으로 넣기
    const dataUrl = canvas.toDataURL('image/png');
    slots[slotIndex].style.backgroundImage = `url(${dataUrl})`;
    
    // 플래시 효과
    flashElement.classList.remove('active-flash');
    void flashElement.offsetWidth; // 리플로우 강제성
    flashElement.classList.add('active-flash');
}

// 3. 3초 카운트다운 및 연속 촬영
async function startSession() {
    if (isTakingPhotos) return;
    isTakingPhotos = true;
    startBtn.style.display = 'none';
    countdownElement.style.display = 'block';

    for (let i = 0; i < 4; i++) {
        // 카운트다운 3, 2, 1
        for (let count = 3; count > 0; count--) {
            countdownElement.textContent = count;
            await new Promise(r => setTimeout(r, 1000));
        }

        countdownElement.textContent = "찰칵!";
        capturePhoto(photoCount);
        photoCount++;
        await new Promise(r => setTimeout(r, 500));
    }

    // 결과물 처리
    countdownElement.style.display = 'none';
    isTakingPhotos = false;
    saveBtn.style.display = 'block';
    resetBtn.style.display = 'block';
    showToast("예쁜 사진이 완성되었습니다! 🎉");
}

// 4. 프레임 컬러 변경
function changeFrameColor(color) {
    frame.style.backgroundColor = color;
}

// 5. 사진 저장 (캔버스로 프레임 전체를 그려서 저장)
function saveAsImage() {
    const saveCanvas = document.createElement('canvas');
    const ctx = saveCanvas.getContext('2d');
    
    // 프레임 크기에 맞춰 캔버스 생성
    saveCanvas.width = 400;
    saveCanvas.height = 600;

    // 배경색 채우기
    ctx.fillStyle = frame.style.backgroundColor || '#000';
    ctx.fillRect(0, 0, saveCanvas.width, saveCanvas.height);

    // 각 슬롯별 사진 그리기
    const drawPromises = slots.map((slot, i) => {
        return new Promise((resolve) => {
            const bgImg = slot.style.backgroundImage;
            if (!bgImg) return resolve();
            
            const img = new Image();
            img.src = bgImg.slice(5, -2); // url("data:...") -> data:...
            img.onload = () => {
                const y = 20 + i * (130 + 10);
                // 슬롯 비율에 맞춰 그리기
                ctx.drawImage(img, 20, y, 360, 270); // 실제 게임 구조에 맞게 좌표 계산 필요
                resolve();
            };
        });
    });

    // TODO: 프레임 전체 캡처를 위해 html2canvas 같은 외부 라이브러리 없이
    // 순수 JS로 구현하려니 슬롯 위치 계산이 복잡할 수 있습니다.
    // 여기서는 간단하게 toast를 띄워 안내합니다.
    showToast("이미지 저장 기능은 준비 중입니다! 화면을 캡처해서 저장해 보세요! 📸");
}

function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.style.display = 'block';
    setTimeout(() => toast.style.display = 'none', 3000);
}

// 초기화
startBtn.addEventListener('click', startSession);
resetBtn.addEventListener('click', () => {
    photoCount = 0;
    slots.forEach(s => s.style.backgroundImage = 'none');
    startBtn.style.display = 'block';
    saveBtn.style.display = 'none';
    resetBtn.style.display = 'none';
});

// 페이지 로드 시 카메라 시작
startCamera();

// 날짜 자동 변경
document.getElementById('currentDate').textContent = new Date().toLocaleDateString();
