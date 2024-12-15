// 종횡비를 고정하고 싶을 경우: 아래 두 변수를 0이 아닌 원하는 종, 횡 비율값으로 설정.
// 종횡비를 고정하고 싶지 않을 경우: 아래 두 변수 중 어느 하나라도 0으로 설정.
const aspectW = 4;
const aspectH = 3;
// html에서 클래스명이 container-canvas인 첫 엘리먼트: 컨테이너 가져오기.
const container = document.body.querySelector('.container-canvas');
// 필요에 따라 이하에 변수 생성.

let video;
let faceMesh;
let faces = [];
let options = { maxFaces: 1, refineLandmarks: false, flipHorizontal: false };

let lastCenterX = 0;
let lastCenterY = 0;
let faceMoveSpeed = 0;

let faceGraphics;

let boxX, boxY, boxWidth, boxHeight;

let michromaFont;

let frameSkip = 2;

function preload() {
  faceMesh = ml5.faceMesh(options);
  michromaFont = loadFont('assets/Michroma-Regular.ttf');
}

function setup() {
  // 컨테이너의 현재 위치, 크기 등의 정보 가져와서 객체구조분해할당을 통해 너비, 높이 정보를 변수로 추출.
  const { width: containerW, height: containerH } =
    container.getBoundingClientRect();
  // 종횡비가 설정되지 않은 경우:
  // 컨테이너의 크기와 일치하도록 캔버스를 생성하고, 컨테이너의 자녀로 설정.
  if (aspectW === 0 || aspectH === 0) {
    createCanvas(containerW, containerH).parent(container);
  }
  // 컨테이너의 가로 비율이 설정한 종횡비의 가로 비율보다 클 경우:
  // 컨테이너의 세로길이에 맞춰 종횡비대로 캔버스를 생성하고, 컨테이너의 자녀로 설정.
  else if (containerW / containerH > aspectW / aspectH) {
    createCanvas((containerH * aspectW) / aspectH, containerH).parent(
      container
    );
  }
  // 컨테이너의 가로 비율이 설정한 종횡비의 가로 비율보다 작거나 같을 경우:
  // 컨테이너의 가로길이에 맞춰 종횡비대로 캔버스를 생성하고, 컨테이너의 자녀로 설정.
  else {
    createCanvas(containerW, (containerW * aspectH) / aspectW).parent(
      container
    );
  }
  init();
  // createCanvas를 제외한 나머지 구문을 여기 혹은 init()에 작성.

  video = createCapture(VIDEO);
  video.size(width, height);
  video.parent(container);
  video.hide();

  faceMesh.detectStart(video, gotFaces);

  faceGraphics = createGraphics(width, height);
  faceGraphics.pixelDensity(1);

  boxWidth = 300;
  boxHeight = 300;
  boxX = (width - boxWidth) / 2;
  boxY = (height - boxHeight) / 2;

  textFont(michromaFont);
}

// windowResized()에서 setup()에 준하는 구문을 실행해야할 경우를 대비해 init이라는 명칭의 함수를 만들어 둠.
function init() {}

function draw() {
  background('white');
  image(video, 0, 0, width, height);
  filter(GRAY);
  tint(200, 200, 200);

  if (frameCount % frameSkip === 0) {
    faceMesh.detect(video, gotFaces);
  }

  for (let i = 0; i < faces.length; i++) {
    let face = faces[i];

    // 얼굴 중심 계산
    let centerX = 0;
    let centerY = 0;
    for (let j = 0; j < face.keypoints.length; j++) {
      centerX += face.keypoints[j].x;
      centerY += face.keypoints[j].y;
    }
    centerX /= face.keypoints.length;
    centerY /= face.keypoints.length;

    // 얼굴이 박스 안에 있는지 확인
    let isInsideBox =
      centerX > boxX &&
      centerX < boxX + boxWidth &&
      centerY > boxY &&
      centerY < boxY + boxHeight;

    // 얼굴 영역 복사
    let faceWidth = boxWidth;
    let faceHeight = boxHeight;
    faceGraphics.image(
      video,
      0,
      0,
      faceWidth,
      faceHeight,
      boxX,
      boxY,
      faceWidth,
      faceHeight
    );

    // 얼굴 윤곽선을 기반으로 외곽선 확장
    let expandedOutline = getExpandedOutlinePoints(
      face.keypoints,
      centerX,
      centerY,
      10
    );

    // 얼굴 영역 컬러 추출 및 흑백 필터 반영
    faceGraphics.clear();
    faceGraphics.beginShape();
    faceGraphics.noStroke();
    for (let point of expandedOutline) {
      // 얼굴 영역 좌표 변환
      let localX = point.x;
      let localY = point.y;

      // 카메라에서 컬러 추출
      let videoColor = video.get(localX, localY);

      // 흑백 필터 적용
      let grayValue = (videoColor[0] + videoColor[1] + videoColor[2]) / 3;

      // 그래픽에 흑백 컬러로 그리기
      faceGraphics.fill(grayValue, grayValue, grayValue, 200);
      faceGraphics.vertex(localX, localY);
    }
    faceGraphics.endShape(CLOSE);

    // 얼굴 블러 효과 적용
    faceGraphics.filter(BLUR, 20);

    // 메인 캔버스에 얼굴 블러 이미지를 오버레이
    image(faceGraphics, 0, 0, width, height);

    let maxRadius = 400; // 얼굴 외곽까지 점 퍼짐 반경
    let numPoints = 6000; // 노이즈 점의 개수

    // 얼굴 윤곽 따라 노이즈 점 생성
    for (let j = 0; j < numPoints; j++) {
      let randomKeypoint = random(face.keypoints);
      let angle = random(TWO_PI);
      let radius = randomGaussian(0, maxRadius * 0.1); // 얼굴 외곽으로 갈수록 퍼짐
      let x = randomKeypoint.x + cos(angle) * radius;
      let y = randomKeypoint.y + sin(angle) * radius;

      let noiseValue = noise(x * 200, y * 200);
      let colorValue = map(noiseValue, 0, 1, 0, 230); // 불규칙한 색상
      let alphaValue = map(abs(radius), 0, maxRadius, 255, 200); // 외곽으로 갈수록 투명도 감소

      fill(colorValue, alphaValue);
      noStroke();
      circle(x, y, random(1, 3));
    }

    // 얼굴 움직임 속도 계산
    faceMoveSpeed = dist(centerX, centerY, lastCenterX, lastCenterY);
    lastCenterX = centerX;
    lastCenterY = centerY;

    // 반짝이 효과 (얼굴 움직임에 따라 변화)
    push();
    for (let j = 0; j < 40; j++) {
      let randomKeypoint = random(face.keypoints);
      let offsetAngle = random(TWO_PI);
      let offsetRadius = random(10, 50);

      let x = randomKeypoint.x + cos(offsetAngle) * offsetRadius;
      let y = randomKeypoint.y + sin(offsetAngle) * offsetRadius;

      let flickerAlpha = 200 + 55 * sin(frameCount * 0.05 + j);

      let sparkleSize = random(1, 6);
      let sparkleAlpha = map(faceMoveSpeed, 5, 10, 50, 255); // 움직임 클수록 더 밝음

      fill(255, 255, 255, flickerAlpha * (sparkleAlpha / 255));
      noStroke();
      circle(x, y, random(sparkleSize / 2, sparkleSize));
    }
    pop();

    if (isInsideBox) {
      for (let i = 0; i < face.keypoints.length; i++) {
        let p1 = face.keypoints[i];
        let p2 = random(face.keypoints);
        stroke(0, 10);
        line(p1.x, p1.y, p2.x, p2.y);
      }
    }

    // 메시지 번갈아 출력
    let message = '';
    if (isInsideBox) {
      message = frameCount % 2 < 1 ? 'Data Residue' : 'Unknown';
      translate(random(-2, 2), random(-2, 2));
    }

    // 메시지 출력
    if (message !== '') {
      textSize(16);
      textWidth(0);
      textAlign(LEFT, CENTER);
      fill('white');
      noStroke();
      text(message, boxX, boxY - 20);
    }

    // 박스
    noFill();
    stroke('white');
    strokeWeight(1);
    rect(boxX, boxY, boxWidth, boxHeight);

    // 박스 크기 변경
    if (faces.length > 0) {
      let face = faces[0];

      // 얼굴 중심 계산
      let centerX = 0;
      let centerY = 0;
      for (let j = 0; j < face.keypoints.length; j++) {
        centerX += face.keypoints[j].x;
        centerY += face.keypoints[j].y;
      }
      centerX /= face.keypoints.length;
      centerY /= face.keypoints.length;

      // 박스 크기와 위치 변경
      boxWidth = constrain(abs(centerX - lastCenterX) * 10 + 100, 250, 300);
      boxHeight = constrain(abs(centerY - lastCenterY) * 10 + 100, 250, 300);
      boxX = centerX - boxWidth / 2;
      boxY = centerY - boxHeight / 2;

      lastCenterX = centerX;
      lastCenterY = centerY;
    }

    // 눈 크기 계산 (왼쪽 눈)
    const leftEyeWidth =
      dist(
        face.keypoints[362].x,
        face.keypoints[362].y,
        face.keypoints[263].x,
        face.keypoints[263].y
      ) || 0;

    const leftEyeHeight =
      dist(
        face.keypoints[386].x,
        face.keypoints[386].y,
        face.keypoints[374].x,
        face.keypoints[374].y
      ) || 0;

    // 입 크기 계산
    const mouthWidth =
      dist(
        face.keypoints[61].x,
        face.keypoints[61].y,
        face.keypoints[291].x,
        face.keypoints[291].y
      ) || 0;

    const mouthHeight =
      dist(
        face.keypoints[13].x,
        face.keypoints[13].y,
        face.keypoints[14].x,
        face.keypoints[14].y
      ) || 0;

    // 감정 상태 추정 (기본적인 조건)
    let emotion = 'Neutral';
    if (mouthHeight > leftEyeHeight * 2) {
      emotion = 'Surprised';
    } else if (mouthHeight < leftEyeHeight * 0.5) {
      emotion = 'Sad';
    } else if (mouthWidth > leftEyeWidth * 1.5) {
      emotion = 'Happy';
    }

    // 텍스트 출력
    textSize(10);
    textAlign(LEFT, TOP);
    fill('white');
    noStroke();
    // 정보 출력 시작 좌표를 네모 박스 오른쪽으로 이동
    const padding = 20; // 네모 박스와 텍스트 사이 간격
    const infoXStart = boxX + boxWidth + padding; // 텍스트 시작 X 좌표
    const infoYStart = boxY; // 텍스트 시작 Y 좌표 (박스의 Y 위치와 맞춤)
    const infoLineHeight = 30; // 줄 간격

    text(`Eye Width: ${leftEyeWidth.toFixed(2)}`, infoXStart, infoYStart);
    text(
      `Eye Height: ${leftEyeHeight.toFixed(2)}`,
      infoXStart,
      infoYStart + infoLineHeight
    );
    text(
      `Mouth Width: ${mouthWidth.toFixed(2)}`,
      infoXStart,
      infoYStart + infoLineHeight * 2
    );
    text(
      `Mouth Height: ${mouthHeight.toFixed(2)}`,
      infoXStart,
      infoYStart + infoLineHeight * 3
    );
    text(`Emotion: ${emotion}`, infoXStart, infoYStart + infoLineHeight * 4);
  }

  textAlign(CENTER, CENTER);
  textSize(30);
  fill(255);
  noStroke();
  text('UNKNOWN', width / 2, height - 50);
}

function gotFaces(results) {
  faces = results;
}

function getExpandedOutlinePoints(keypoints, centerX, centerY, expansion) {
  const outlineIndices = [
    10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379,
    378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127,
    162, 21, 54, 103, 67, 109,
  ];

  return outlineIndices.map((index) => {
    let point = keypoints[index];
    let dx = point.x - centerX;
    let dy = point.y - centerY;
    let distance = Math.sqrt(dx * dx + dy * dy);
    let scale = (distance + expansion) / distance;

    return {
      x: centerX + dx * scale,
      y: centerY + dy * scale,
    };
  });
}

function windowResized() {
  // 컨테이너의 현재 위치, 크기 등의 정보 가져와서 객체구조분해할당을 통해 너비, 높이 정보를 변수로 추출.
  const { width: containerW, height: containerH } =
    container.getBoundingClientRect();
  // 종횡비가 설정되지 않은 경우:
  // 컨테이너의 크기와 일치하도록 캔버스 크기를 조정.
  if (aspectW === 0 || aspectH === 0) {
    resizeCanvas(containerW, containerH);
  }
  // 컨테이너의 가로 비율이 설정한 종횡비의 가로 비율보다 클 경우:
  // 컨테이너의 세로길이에 맞춰 종횡비대로 캔버스 크기를 조정.
  else if (containerW / containerH > aspectW / aspectH) {
    resizeCanvas((containerH * aspectW) / aspectH, containerH);
  }
  // 컨테이너의 가로 비율이 설정한 종횡비의 가로 비율보다 작거나 같을 경우:
  // 컨테이너의 가로길이에 맞춰 종횡비대로 캔버스 크기를 조정.
  else {
    resizeCanvas(containerW, (containerW * aspectH) / aspectW);
  }
  // 위 과정을 통해 캔버스 크기가 조정된 경우, 다시 처음부터 그려야할 수도 있다.
  // 이런 경우 setup()의 일부 구문을 init()에 작성해서 여기서 실행하는게 편리하다.
  // init();
}
