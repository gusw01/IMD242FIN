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

let faceGraphics; // 얼굴 블러 처리를 위한 그래픽 레이어

function preload() {
  faceMesh = ml5.faceMesh(options);
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

  faceGraphics = createGraphics(width, height); // 블러 처리용 그래픽 레이어
  faceGraphics.pixelDensity(1);
}

// windowResized()에서 setup()에 준하는 구문을 실행해야할 경우를 대비해 init이라는 명칭의 함수를 만들어 둠.
function init() {}

function draw() {
  background('white');
  image(video, 0, 0, width, height);
  filter(GRAY);

  faceGraphics.clear(); // 이전 프레임의 얼굴 영역 지우기

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

    // 얼굴 움직임 속도 계산
    faceMoveSpeed = dist(centerX, centerY, lastCenterX, lastCenterY);
    lastCenterX = centerX;
    lastCenterY = centerY;

    // 얼굴 윤곽선을 기반으로 외곽선 확장
    let expandedOutline = getExpandedOutlinePoints(
      face.keypoints,
      centerX,
      centerY,
      10
    );

    // 얼굴 영역을 faceGraphics에 그리기
    faceGraphics.fill(0, 100);
    faceGraphics.noStroke();
    faceGraphics.beginShape();
    for (let point of expandedOutline) {
      faceGraphics.vertex(point.x, point.y);
    }
    faceGraphics.endShape(CLOSE);

    // 얼굴 영역에 블러 필터 적용
    faceGraphics.filter(BLUR, 15);

    // 얼굴 블러를 메인 캔버스에 그리기
    image(faceGraphics, 0, 0);

    let maxRadius = 400; // 얼굴 외곽까지 점 퍼짐 반경
    let numPoints = 10000; // 노이즈 점의 개수

    // 얼굴 윤곽선을 선으로 연결
    // for (let i = 0; i < face.keypoints.length - 1; i++) {
    //   let p1 = face.keypoints[i];
    //   let p2 = face.keypoints[(i + 1) % face.keypoints.length];
    //   stroke(255, 100);
    //   line(p1.x, p1.y, p2.x, p2.y);
    // }

    // 얼굴 윤곽 따라 노이즈 점 생성
    for (let j = 0; j < numPoints; j++) {
      let randomKeypoint = random(face.keypoints); // 랜덤 얼굴 점 선택
      let angle = random(TWO_PI); // 각도
      let radius = randomGaussian(0, maxRadius * 0.1); // 얼굴 외곽으로 갈수록 퍼짐
      let x = randomKeypoint.x + cos(angle) * radius;
      let y = randomKeypoint.y + sin(angle) * radius;

      // 노이즈 흑백 색상과 투명도 조정
      let noiseValue = noise(x * 200, y * 200);
      let colorValue = map(noiseValue, 0, 1, 0, 200); // 더 불규칙한 색상
      let alphaValue = map(abs(radius), 0, maxRadius, 255, 200); // 외곽으로 갈수록 투명도 감소

      fill(colorValue, alphaValue);
      noStroke();
      circle(x, y, random(1, 3)); // 점 크기 랜덤화
    }

    // 반짝이 효과 (얼굴 움직임에 따라 변화)
    for (let j = 0; j < 20; j++) {
      let randomKeypoint = random(face.keypoints); // 랜덤 얼굴 점
      let offsetAngle = random(TWO_PI);
      let offsetRadius = random(10, 50); // 얼굴 점 근처에 위치

      let x = randomKeypoint.x + cos(offsetAngle) * offsetRadius;
      let y = randomKeypoint.y + sin(offsetAngle) * offsetRadius;

      let flickerAlpha = 200 + 55 * sin(frameCount * 0.05 + j); // 반짝이는 효과

      // 움직임에 따라 반짝이 크기와 투명도 변화
      let sparkleSize = map(faceMoveSpeed, 5, 10, 1, 2); // 움직임 클수록 큰 반짝이
      let sparkleAlpha = map(faceMoveSpeed, 5, 10, 150, 255); // 움직임 클수록 더 밝음

      fill(255, 255, 255, flickerAlpha * (sparkleAlpha / 255));
      noStroke();
      circle(x, y, random(sparkleSize / 2, sparkleSize)); // 반짝이 크기
    }
  }
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
