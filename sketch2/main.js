// 종횡비를 고정하고 싶을 경우: 아래 두 변수를 0이 아닌 원하는 종, 횡 비율값으로 설정.
// 종횡비를 고정하고 싶지 않을 경우: 아래 두 변수 중 어느 하나라도 0으로 설정.
const aspectW = 4;
const aspectH = 3;
// html에서 클래스명이 container-canvas인 첫 엘리먼트: 컨테이너 가져오기.
const container = document.body.querySelector('.container-canvas');
// 필요에 따라 이하에 변수 생성.

let molds = [];
let num = 4000;
let d;

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

  angleMode(DEGREES);
  d = pixelDensity();

  for (let i = 0; i < num; i++) {
    molds[i] = new Mold();
  }
}

// windowResized()에서 setup()에 준하는 구문을 실행해야할 경우를 대비해 init이라는 명칭의 함수를 만들어 둠.
function init() {}

function draw() {
  // background('white');
  // circle(mouseX, mouseY, 50);

  background(0, 5);
  loadPixels();

  for (let i = 0; i < num; i++) {
    if (key == 's') {
      // If "s" key is pressed, molds stop moving
      molds[i].stop = true;
      updatePixels();
      noLoop();
    } else {
      molds[i].stop = false;
    }

    molds[i].update();
    molds[i].display();
  }
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
  loadPixels();

  for (let i = 0; i < num; i++) {
    if (key == 's') {
      // If "s" key is pressed, molds stop moving
      molds[i].stop = true;
      updatePixels();
      noLoop();
    } else {
      molds[i].stop = false;
    }

    molds[i].update();
    molds[i].display();
  }
}

class Mold {
  constructor() {
    // Mold variables
    this.x = random(width);
    this.y = random(height);
    // this.x = random(width/2 - 20, width/2 + 20);
    // this.y = random(height/2 - 20, height/2 + 20);
    this.r = 0.5;

    this.heading = random(360);
    this.vx = cos(this.heading);
    this.vy = sin(this.heading);
    this.rotAngle = 45;
    this.stop = false; // Boolean variable to stop molds from moving

    // Sensor variables
    this.rSensorPos = createVector(0, 0);
    this.lSensorPos = createVector(0, 0);
    this.fSensorPos = createVector(0, 0);
    this.sensorAngle = 45;
    this.sensorDist = 10;
  }

  update() {
    // Using this.stop to control when molds stop moving
    if (this.stop) {
      this.vx = 0;
      this.vy = 0;
    } else {
      this.vx = cos(this.heading);
      this.vy = sin(this.heading);
    }

    // Using % Modulo expression to wrap around the canvas
    this.x = (this.x + this.vx + width) % width;
    this.y = (this.y + this.vy + height) % height;

    // Get 3 sensor positions based on current position and heading
    this.getSensorPos(this.rSensorPos, this.heading + this.sensorAngle);
    this.getSensorPos(this.lSensorPos, this.heading - this.sensorAngle);
    this.getSensorPos(this.fSensorPos, this.heading);

    // Get indices of the 3 sensor positions and get the color values from those indices
    let index, l, r, f;
    index =
      4 * (d * floor(this.rSensorPos.y)) * (d * width) +
      4 * (d * floor(this.rSensorPos.x));
    r = pixels[index];

    index =
      4 * (d * floor(this.lSensorPos.y)) * (d * width) +
      4 * (d * floor(this.lSensorPos.x));
    l = pixels[index];

    index =
      4 * (d * floor(this.fSensorPos.y)) * (d * width) +
      4 * (d * floor(this.fSensorPos.x));
    f = pixels[index];

    // Compare values of f, l, and r to determine movement
    if (f > l && f > r) {
      this.heading += 0;
    } else if (f < l && f < r) {
      if (random(1) < 0.5) {
        this.heading += this.rotAngle;
      } else {
        this.heading -= this.rotAngle;
      }
    } else if (l > r) {
      this.heading += -this.rotAngle;
    } else if (r > l) {
      this.heading += this.rotAngle;
    }
  }

  display() {
    noStroke();
    fill(255);
    ellipse(this.x, this.y, this.r * 2, this.r * 2);

    // line(this.x, this.y, this.x + this.r*3*this.vx, this.y + this.r*3*this.vy);
    // fill(255, 0, 0);
    // ellipse(this.rSensorPos.x, this.rSensorPos.y, this.r*2, this.r*2);
    // ellipse(this.lSensorPos.x, this.lSensorPos.y, this.r*2, this.r*2);
    // ellipse(this.fSensorPos.x, this.fSensorPos.y, this.r*2, this.r*2);
  }

  getSensorPos(sensor, angle) {
    sensor.x = (this.x + this.sensorDist * cos(angle) + width) % width;
    sensor.y = (this.y + this.sensorDist * sin(angle) + height) % height;
  }
}
