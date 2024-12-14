class Dot {
  constructor(x, y, angle, speed, scl) {
    this.pos = createVector(x, y);
    this.center = createVector(width / 2, height / 2);
    this.dir = p5.Vector.sub(this.center, this.pos);
    this.maxMag = scl * this.dir.mag();
    this.angle = angle;
    this.speed = speed;
  }

  update() {
    this.oscillation = this.maxMag * sin(this.angle);
    this.oscillationDir = p5.Vector.setMag(this.dir, this.oscillation);
    this.newPos = p5.Vector.add(this.pos, this.oscillationDir);

    this.angle += this.speed;
  }

  display() {
    noStroke();
    fill(255);
    ellipse(this.newPos.x, this.newPos.y, 2, 2);
  }
}
