let canvas;
let ctx;

function main() {
  canvas = document.getElementById("example");
  ctx = canvas.getContext("2d");
  clearCanvas();
  let v1 = new Vector3([2.25, 2.25, 0]);
  drawVector(v1, "red");
}

function clearCanvas() {
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawVector(v, color) {
  let x = v.elements[0];
  let y = v.elements[1];

  ctx.beginPath();
  ctx.moveTo(200, 200);
  ctx.lineTo(200 + x * 20, 200 - y * 20);
  ctx.strokeStyle = color;
  ctx.stroke();
}

function handleDrawEvent() {
  clearCanvas();

  let x1 = parseFloat(document.getElementById("v1x").value);
  let y1 = parseFloat(document.getElementById("v1y").value);
  let x2 = parseFloat(document.getElementById("v2x").value);
  let y2 = parseFloat(document.getElementById("v2y").value);

  let v1 = new Vector3([x1, y1, 0]);
  let v2 = new Vector3([x2, y2, 0]);

  drawVector(v1, "red");
  drawVector(v2, "blue");
}

function handleDrawOperationEvent() {
  clearCanvas();

  let x1 = parseFloat(document.getElementById("v1x").value);
  let y1 = parseFloat(document.getElementById("v1y").value);
  let x2 = parseFloat(document.getElementById("v2x").value);
  let y2 = parseFloat(document.getElementById("v2y").value);
  let op = document.getElementById("operation").value;
  let s = parseFloat(document.getElementById("scalar").value);

  let v1 = new Vector3([x1, y1, 0]);
  let v2 = new Vector3([x2, y2, 0]);

  drawVector(v1, "red");
  drawVector(v2, "blue");

  if (op === "add") {
    let v3 = new Vector3([x1, y1, 0]);
    v3.add(v2);
    drawVector(v3, "green");
  } else if (op === "sub") {
    let v3 = new Vector3([x1, y1, 0]);
    v3.sub(v2);
    drawVector(v3, "green");
  } else if (op === "mul") {
    let v3 = new Vector3([x1, y1, 0]);
    let v4 = new Vector3([x2, y2, 0]);
    v3.mul(s);
    v4.mul(s);
    drawVector(v3, "green");
    drawVector(v4, "green");
  } else if (op === "div") {
    let v3 = new Vector3([x1, y1, 0]);
    let v4 = new Vector3([x2, y2, 0]);
    v3.div(s);
    v4.div(s);
    drawVector(v3, "green");
    drawVector(v4, "green");
  } else if (op === "magnitude") {
    console.log("Magnitude v1: " + v1.magnitude());
    console.log("Magnitude v2: " + v2.magnitude());
  } else if (op === "normalize") {
    let v3 = new Vector3([x1, y1, 0]);
    let v4 = new Vector3([x2, y2, 0]);
    v3.normalize();
    v4.normalize();
    drawVector(v3, "green");
    drawVector(v4, "green");
  } else if (op === "angle") {
    console.log("Angle: " + angleBetween(v1, v2));
  } else if (op === "area") {
    console.log("Area of the triangle: " + areaTriangle(v1, v2));
  }
}

function angleBetween(v1, v2) {
  let d = Vector3.dot(v1, v2);
  let m1 = v1.magnitude();
  let m2 = v2.magnitude();
  let a = d / (m1 * m2);

  if (a > 1) {
    a = 1;
  }
  if (a < -1) {
    a = -1;
  }

  let ang = Math.acos(a);
  return ang * 180 / Math.PI;
}

function areaTriangle(v1, v2) {
  let c = Vector3.cross(v1, v2);
  let area = c.magnitude() / 2;
  return area;
}