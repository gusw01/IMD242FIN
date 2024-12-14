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

let faceGraphics;

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

  faceGraphics = createGraphics(width, height);
  faceGraphics.pixelDensity(1);
}

// windowResized()에서 setup()에 준하는 구문을 실행해야할 경우를 대비해 init이라는 명칭의 함수를 만들어 둠.
function init() {}

function draw() {
  background('white');
  image(video, 0, 0, width, height);
  filter(GRAY);

  for (let i = 0; i < faces.length; i++) {
    let face = faces[i];

    let centerX = 0;
    let centerY = 0;
    for (let j = 0; j < face.keypoints.length; j++) {
      centerX += face.keypoints[j].x;
      centerY += face.keypoints[j].y;
    }
    centerX /= face.keypoints.length;
    centerY /= face.keypoints.length;

    let outlinePoints = getExpandedOutlinePoints(
      face.keypoints,
      centerX,
      centerY,
      20
    );

    faceGraphics.clear();
    faceGraphics.fill(0, 200);
    faceGraphics.noStroke();
    faceGraphics.beginShape();
    for (let j = 0; j < outlinePoints.length; j++) {
      faceGraphics.vertex(outlinePoints[j].x, outlinePoints[j].y);
    }
    faceGraphics.endShape(CLOSE);

    faceGraphics.filter(BLUR, 10);

    image(faceGraphics, 0, 0);
    // filter(BLUR, 3);

    // fill(0, 0, 0, 100);
    // noStroke();
    // beginShape();
    // for (let j = 0; j < outlinePoints.length; j++) {
    //   vertex(outlinePoints[j].x, outlinePoints[j].y);
    // }
    // endShape(CLOSE);

    for (let j = 0; j < 100; j++) {
      let randomKeypoint = random(face.keypoints);
      let radius = random(1, 3);
      fill(255, 255, 255, random(200, 255));
      noStroke();
      circle(randomKeypoint.x, randomKeypoint.y, radius);
    }

    for (let j = 0; j < face.keypoints.length; j++) {
      let keypoint = face.keypoints[j];
      fill(255, 255, 255);
      noStroke();
      circle(keypoint.x, keypoint.y, 0);
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
