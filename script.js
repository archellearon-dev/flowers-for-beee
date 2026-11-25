(() => {
  "use strict";

  const WIDTH = 900;
  const HEIGHT = 700;
  const FORM_DURATION = 10800;
  const DECODE_DURATION = 5900;
  const RETURN_DURATION = 4300;
  const ART_SCALE_X = 1.12;
  const ART_SCALE_Y = 1.1;
  const canvas = document.getElementById("bouquet");
  const context = canvas.getContext("2d", { alpha: true });
  const artwork = document.createElement("canvas");
  artwork.width = WIDTH;
  artwork.height = HEIGHT;
  const artContext = artwork.getContext("2d", { alpha: true, willReadFrequently: true });
  const decodeButton = document.getElementById("decode-button");
  const returnButton = document.getElementById("return-button");
  const experience = document.getElementById("experience");
  const stageNote = document.getElementById("stage-note");
  const announcement = document.getElementById("announcement");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const fontFamily = getComputedStyle(document.body).fontFamily;

  const palette = {
    lily: ["#ffd0e3", "#ff9fc6", "#f367a5", "#d93882", "#9e205f"],
    crimson: ["#ffacb7", "#f85f7c", "#e52d58", "#ac1744", "#650d34"],
    blush: ["#ffe0ed", "#ffb1d0", "#f27eaf", "#d94b8c", "#9e2d69"],
    orchid: ["#ffdafa", "#f3a9df", "#e276c3", "#bd4ba2", "#81347f"],
    center: ["#fff4a8", "#f5d761", "#d5ad42"],
    sage: ["#e0e9b5", "#b8d29a", "#8bb787", "#619472", "#3f6b5c"],
    breath: ["#fff8f1", "#ffe4ec", "#f3cddd", "#e7bad5"],
    ribbon: ["#d9b2c5", "#af829e", "#815b7a"]
  };
  const message = "i suppose this is what happens when i have too many things i want to tell you and not nearly enough words to hold them. so, i let them bloom instead";
  const babyBreathClusters = [
    [174, 402, 1.2], [224, 324, 1], [300, 385, 1.05], [351, 285, .82],
    [571, 371, 1.1], [652, 326, .95], [713, 392, 1.2], [760, 474, 1.05],
    [272, 466, .95], [623, 459, 1], [184, 276, .88], [746, 273, .9],
    [378, 430, 1.05], [540, 433, 1.08], [335, 475, .92], [585, 478, 1]
  ];
  const babyBreathOffsets = [[0, 0], [-16, -18], [12, -23], [-30, -37], [21, -42], [-3, -49]];
  const flowerSways = [
    { x: 292, y: 201, radius: 116, speed: .00145, phase: .4, amount: 21 },
    { x: 585, y: 184, radius: 104, speed: .00122, phase: 2.2, amount: 19 },
    { x: 465, y: 225, radius: 98, speed: .00114, phase: 1.3, amount: 19 },
    { x: 688, y: 282, radius: 87, speed: .00138, phase: 3.4, amount: 18 },
    { x: 340, y: 311, radius: 85, speed: .00152, phase: 5.2, amount: 17 },
    { x: 549, y: 320, radius: 78, speed: .00128, phase: 2.7, amount: 16 },
    { x: 230, y: 317, radius: 68, speed: .00146, phase: 4.7, amount: 15 },
    { x: 681, y: 367, radius: 64, speed: .00118, phase: 1.9, amount: 15 }
  ];
  const foliageSways = [
    { x: 220, y: 330, speed: .0008, phase: .4, amount: 9 },
    { x: 285, y: 465, speed: .00067, phase: 2.4, amount: 8 },
    { x: 430, y: 375, speed: .0009, phase: 4.1, amount: 7 },
    { x: 630, y: 365, speed: .00074, phase: 1.6, amount: 9 },
    { x: 695, y: 470, speed: .00084, phase: 3.2, amount: 8 }
  ];
  let particles = [];
  let scale = 1;
  let offsetX = 0;
  let offsetY = 0;
  let viewportWidth = 0;
  let viewportHeight = 0;
  let pixelRatio = 1;
  let lastFrame = 0;
  let experienceStarted = performance.now();
  let mode = "forming";
  let modeStarted = experienceStarted;
  let messagePoints = [];
  let decodedText = "";
  let encodedBinary = "";

  const color = (name, index = 0) => palette[name][Math.max(0, Math.min(index, palette[name].length - 1))];

  function linearGradient(ctx, x1, y1, x2, y2, colors) {
    const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
    colors.forEach((stop, index) => gradient.addColorStop(index / (colors.length - 1), stop));
    return gradient;
  }

  function drawBranch(ctx, points, stroke = color("sage", 3), lineWidth = 3) {
    ctx.beginPath();
    ctx.moveTo(points[0], points[1]);
    ctx.bezierCurveTo(points[2], points[3], points[4], points[5], points[6], points[7]);
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";
    ctx.stroke();
  }

  function drawLeaf(ctx, x, y, length, leafWidth, angle, shade = 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    const fill = linearGradient(ctx, -leafWidth / 2, 0, leafWidth / 2, -length, [
      color("sage", shade),
      color("sage", Math.min(shade + 1, 4)),
      color("sage", Math.max(shade - 1, 0))
    ]);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-leafWidth * .95, -length * .26, -leafWidth * .85, -length * .8, 0, -length);
    ctx.bezierCurveTo(leafWidth * .85, -length * .8, leafWidth * .95, -length * .26, 0, 0);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, -2);
    ctx.quadraticCurveTo(leafWidth * .1, -length * .48, 0, -length + 4);
    ctx.strokeStyle = "rgba(228, 230, 199, .52)";
    ctx.lineWidth = 1.1;
    ctx.stroke();
    ctx.restore();
  }

  function drawEucalyptus(ctx) {
    const branches = [
      [[426, 628, 354, 550, 274, 407, 173, 247], [[222, 332, -1.02, 31, 16], [197, 288, 1.02, 27, 21], [174, 250, -1.1, 27, 12], [283, 414, -1.02, 36, 27], [321, 473, 1.04, 32, 13], [365, 530, -.96, 29, 22]]],
      [[456, 625, 501, 532, 582, 403, 715, 246], [[555, 430, 1.03, 35, 18], [603, 363, -1.04, 31, 24], [644, 306, 1.06, 29, 14], [687, 268, -1.06, 27, 20], [510, 513, -1.02, 36, 23], [474, 570, 1.02, 30, 16]]],
      [[443, 632, 399, 520, 410, 371, 446, 252], [[415, 435, -1.15, 29, 18], [418, 380, 1.1, 26, 18], [432, 322, -1.1, 29, 16], [467, 388, 1.08, 32, 20]]],
      [[458, 636, 538, 566, 646, 485, 761, 405], [[617, 500, -1.08, 34, 20], [663, 455, 1.03, 31, 23], [710, 422, -1.06, 28, 17], [567, 546, 1.08, 31, 18]]],
      [[438, 638, 354, 580, 280, 504, 151, 450], [[319, 525, 1.05, 32, 18], [268, 495, -1.02, 29, 22], [210, 471, 1.03, 28, 16]]]
    ];

    branches.forEach(([curve, leaves], branchIndex) => {
      drawBranch(ctx, curve, color("sage", branchIndex % 2 ? 3 : 2), 3.2);
      leaves.forEach(([x, y, angle, length, leafWidth], index) => {
        drawLeaf(ctx, x, y, length, leafWidth, angle, (index + branchIndex) % 3);
      });
    });

    [[332, 557, 1.04, 26, 16], [382, 594, -1.06, 25, 16], [519, 583, 1.08, 27, 17], [476, 606, -1.03, 24, 15]]
      .forEach((leaf) => drawLeaf(ctx, ...leaf, 2));
  }

  function drawStem(ctx, x, y, endX, endY, bend = 0) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + bend, (y + endY) / 2, endX, endY);
    ctx.strokeStyle = color("sage", 3);
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.stroke();
  }

  function drawPetal(ctx, length, petalWidth, shade, paletteName, rotation = 0) {
    ctx.save();
    ctx.rotate(rotation);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-petalWidth * .82, -length * .2, -petalWidth * .58, -length * .84, 0, -length);
    ctx.bezierCurveTo(petalWidth * .58, -length * .84, petalWidth * .82, -length * .2, 0, 0);
    ctx.closePath();
    ctx.fillStyle = linearGradient(ctx, -petalWidth * .68, 0, petalWidth * .35, -length, [
      color(paletteName, Math.min(shade + 1, palette[paletteName].length - 1)),
      color(paletteName, shade),
      color(paletteName, Math.max(shade - 1, 0))
    ]);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, -5);
    ctx.bezierCurveTo(-petalWidth * .17, -length * .32, petalWidth * .08, -length * .72, 0, -length + 6);
    ctx.strokeStyle = "rgba(255, 222, 233, .38)";
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.restore();
  }

  function drawLily(ctx, x, y, size = 1, tone = "lily") {
    const petals = 8;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(size, size);
    for (let index = 0; index < petals; index += 1) {
      const angle = index * Math.PI * 2 / petals;
      ctx.save();
      ctx.rotate(angle);
      drawPetal(ctx, index % 2 ? 89 : 102, index % 2 ? 39 : 34, index % 3 ? 1 : 2, tone);
      if (index % 2 === 0) {
        for (let dot = 0; dot < 7; dot += 1) {
          const py = -24 - dot * 8;
          const px = (dot % 2 ? -1 : 1) * (5 + dot * 1.2);
          ctx.beginPath();
          ctx.ellipse(px, py, 1.7, 2.5, 0, 0, Math.PI * 2);
          ctx.fillStyle = color("crimson", dot % 3);
          ctx.fill();
        }
      }
      ctx.restore();
    }

    const centerGlow = ctx.createRadialGradient(0, 0, 2, 0, 0, 27);
    centerGlow.addColorStop(0, "#ffe8a0");
    centerGlow.addColorStop(.38, "#dcb66c");
    centerGlow.addColorStop(1, "rgba(182, 151, 94, 0)");
    ctx.fillStyle = centerGlow;
    ctx.beginPath();
    ctx.arc(0, 0, 27, 0, Math.PI * 2);
    ctx.fill();

    for (let index = 0; index < 6; index += 1) {
      const angle = index * Math.PI * 2 / 6;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(Math.cos(angle) * 13, Math.sin(angle) * 13, Math.cos(angle) * 45, Math.sin(angle) * 45);
      ctx.strokeStyle = color("center", index % 2);
      ctx.lineWidth = 1.8;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(Math.cos(angle) * 47, Math.sin(angle) * 47, 3.3, 0, Math.PI * 2);
      ctx.fillStyle = color("center", index % 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function heartPath(ctx, width, height) {
    ctx.beginPath();
    ctx.moveTo(0, height * .48);
    ctx.bezierCurveTo(-width * .14, height * .34, -width * .5, height * .03, -width * .48, -height * .22);
    ctx.bezierCurveTo(-width * .46, -height * .55, -width * .12, -height * .57, 0, -height * .29);
    ctx.bezierCurveTo(width * .12, -height * .57, width * .46, -height * .55, width * .48, -height * .22);
    ctx.bezierCurveTo(width * .5, height * .03, width * .14, height * .34, 0, height * .48);
    ctx.closePath();
  }

  function drawAnthurium(ctx, x, y, size = 1, tone = "crimson", rotation = 0) {
    const colorName = tone === "blush" ? "blush" : "crimson";
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.scale(size, size);

    heartPath(ctx, 153, 182);
    ctx.fillStyle = linearGradient(ctx, -70, -75, 65, 76, [
      color(colorName, 0),
      color(colorName, 2),
      color(colorName, 4)
    ]);
    ctx.fill();

    ctx.save();
    ctx.beginPath();
    heartPath(ctx, 153, 182);
    ctx.clip();
    const shine = ctx.createLinearGradient(-53, -85, 31, 20);
    shine.addColorStop(0, "rgba(255, 226, 234, .43)");
    shine.addColorStop(.32, "rgba(255, 215, 226, .12)");
    shine.addColorStop(1, "rgba(255, 215, 226, 0)");
    ctx.fillStyle = shine;
    ctx.beginPath();
    ctx.ellipse(-31, -51, 35, 66, -.52, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.beginPath();
    ctx.moveTo(0, 25);
    ctx.bezierCurveTo(-6, -6, 8, -39, 3, -79);
    ctx.strokeStyle = "rgba(255, 223, 160, .88)";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(3, -69, 5.4, 17, -.08, 0, Math.PI * 2);
    ctx.fillStyle = "#f3ce87";
    ctx.fill();
    for (let dot = 0; dot < 6; dot += 1) {
      ctx.beginPath();
      ctx.arc(2 + (dot % 2) * 2, -80 + dot * 4, 1.35, 0, Math.PI * 2);
      ctx.fillStyle = "#fff1bd";
      ctx.fill();
    }
    ctx.restore();
  }

  function drawOrchid(ctx, x, y, size = 1, rotation = 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.scale(size, size);

    drawPetal(ctx, 61, 38, 1, "orchid", 0);
    drawPetal(ctx, 54, 35, 2, "orchid", Math.PI * .74);
    drawPetal(ctx, 54, 35, 2, "orchid", -Math.PI * .74);
    drawPetal(ctx, 45, 37, 1, "orchid", Math.PI * .49);
    drawPetal(ctx, 45, 37, 1, "orchid", -Math.PI * .49);

    ctx.save();
    ctx.rotate(Math.PI);
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.bezierCurveTo(-17, -27, -34, -22, -32, -4);
    ctx.bezierCurveTo(-30, 13, -12, 21, 0, 31);
    ctx.bezierCurveTo(12, 21, 30, 13, 32, -4);
    ctx.bezierCurveTo(34, -22, 17, -27, 0, -8);
    ctx.closePath();
    ctx.fillStyle = linearGradient(ctx, -22, -18, 19, 30, ["#f3bed4", "#dc8eb7", "#ad648f"]);
    ctx.fill();
    ctx.restore();

    const center = ctx.createRadialGradient(0, 0, 1, 0, 0, 17);
    center.addColorStop(0, "#fff0bc");
    center.addColorStop(.35, "#e5bd84");
    center.addColorStop(1, "rgba(196, 118, 148, .35)");
    ctx.fillStyle = center;
    ctx.beginPath();
    ctx.ellipse(0, -1, 13, 17, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, 7, 6, 9, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#9c547e";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, -5, 3.3, 0, Math.PI * 2);
    ctx.fillStyle = "#fff0c5";
    ctx.fill();
    ctx.restore();
  }

  function drawBabyBreath(ctx) {
    babyBreathClusters.forEach(([x, y, size], clusterIndex) => {
      babyBreathOffsets.forEach(([dx, dy], pointIndex) => {
        const fx = x + dx * size;
        const fy = y + dy * size;
        drawBranch(ctx, [x, y + 22, fx - 2, fy + 22, fx + 3, fy + 10, fx, fy], color("sage", 4), 1.15);
        const flowerSize = (pointIndex === 0 ? 1.15 : .9) * size;
        for (let petal = 0; petal < 5; petal += 1) {
          const angle = petal * Math.PI * 2 / 5 + clusterIndex * .2;
          ctx.beginPath();
          ctx.arc(fx + Math.cos(angle) * 5.2 * flowerSize, fy + Math.sin(angle) * 5.2 * flowerSize, 4.4 * flowerSize, 0, Math.PI * 2);
          ctx.fillStyle = color("breath", (petal + clusterIndex) % 3);
          ctx.shadowColor = "rgba(255, 242, 249, .85)";
          ctx.shadowBlur = 4;
          ctx.fill();
        }
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(fx, fy, 3 * flowerSize, 0, Math.PI * 2);
        ctx.fillStyle = "#f5d894";
        ctx.fill();
      });
    });
  }

  function transformArtworkPoint(x, y) {
    return {
      x: WIDTH / 2 + (x - WIDTH / 2) * ART_SCALE_X,
      y: HEIGHT / 2 + (y - HEIGHT / 2) * ART_SCALE_Y
    };
  }

  function drawBouquet(ctx) {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    ctx.save();
    ctx.translate(WIDTH / 2, HEIGHT / 2);
    ctx.scale(ART_SCALE_X, ART_SCALE_Y);
    ctx.translate(-WIDTH / 2, -HEIGHT / 2);
    drawEucalyptus(ctx);

    [
      [292, 230, 420, 638, -34],
      [585, 216, 500, 638, 38],
      [465, 260, 465, 638, -9],
      [688, 316, 550, 638, 28],
      [340, 345, 385, 638, -22],
      [549, 354, 500, 638, 11],
      [230, 350, 325, 638, -27],
      [681, 400, 575, 638, 28]
    ].forEach(([x, y, endX, endY, bend]) => drawStem(ctx, x, y, endX, endY, bend));

    drawLily(ctx, 292, 201, .89, "lily");
    drawLily(ctx, 585, 184, .79, "lily");

    drawAnthurium(ctx, 465, 225, .86, "crimson", -.1);
    drawAnthurium(ctx, 688, 282, .69, "crimson", .19);
    drawAnthurium(ctx, 340, 311, .67, "blush", -.24);
    drawAnthurium(ctx, 549, 320, .61, "blush", .21);

    drawOrchid(ctx, 230, 317, .86, -.1);
    drawOrchid(ctx, 681, 367, .8, .14);

    drawEucalyptusForeground(ctx);
    drawRibbon(ctx);
    drawBabyBreath(ctx);
    ctx.restore();
  }

  function drawEucalyptusForeground(ctx) {
    drawBranch(ctx, [422, 615, 358, 558, 309, 510, 258, 475], color("sage", 2), 3);
    drawLeaf(ctx, 325, 544, 32, 19, -1.04, 1);
    drawLeaf(ctx, 292, 519, 31, 18, 1.04, 0);
    drawLeaf(ctx, 274, 490, 28, 17, -1.08, 2);

    drawBranch(ctx, [477, 615, 540, 562, 588, 518, 647, 472], color("sage", 2), 3);
    drawLeaf(ctx, 576, 535, 31, 18, 1.06, 1);
    drawLeaf(ctx, 614, 506, 30, 17, -1.05, 0);
    drawLeaf(ctx, 641, 482, 26, 16, 1.04, 2);
  }

  function drawRibbon(ctx) {
    ctx.save();
    ctx.translate(450, 603);
    const ribbon = linearGradient(ctx, -42, -14, 43, 16, ["#d8b7c8", "#a57a9b", "#d9b5c7"]);
    ctx.beginPath();
    ctx.moveTo(-8, -2);
    ctx.bezierCurveTo(-45, -35, -51, 4, -12, 8);
    ctx.bezierCurveTo(-28, 26, -20, 42, -4, 17);
    ctx.lineTo(0, 8);
    ctx.bezierCurveTo(20, 37, 36, 31, 17, 7);
    ctx.bezierCurveTo(59, -1, 40, -36, 4, -3);
    ctx.closePath();
    ctx.fillStyle = ribbon;
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, 2, 10, 8, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#edc9d8";
    ctx.fill();
    ctx.restore();
  }

  {
    const initialColors = [[239, 157, 202], [194, 118, 169], [244, 205, 221], [157, 78, 105], [155, 184, 145]];
    const messageFont = 'Georgia, "Times New Roman", serif';
    let currentFont = "";
    let messageFontSize = 34;
    let driftingBits = [];
    let lastDrift = 0;
    let artworkBounds = null;

    function fitArtwork() {
      if (!artworkBounds) {
        scale = Math.min(viewportWidth / WIDTH, viewportHeight * .9 / HEIGHT);
        offsetX = (viewportWidth - WIDTH * scale) / 2;
        offsetY = (viewportHeight - HEIGHT * scale) / 2;
        return;
      }

      const margin = viewportWidth < 600 ? 44 : 48;
      scale = Math.min(
        (viewportWidth - margin * 2) / artworkBounds.width,
        (viewportHeight - margin * 2) / artworkBounds.height
      );
      offsetX = (viewportWidth - artworkBounds.width * scale) / 2 - artworkBounds.left * scale;
      offsetY = (viewportHeight - artworkBounds.height * scale) / 2 - artworkBounds.top * scale;
    }

    function resizeCanvas() {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return false;
      viewportWidth = rect.width;
      viewportHeight = rect.height;
      pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      fitArtwork();
      const targetWidth = Math.round(viewportWidth * pixelRatio);
      const targetHeight = Math.round(viewportHeight * pixelRatio);
      if (canvas.width !== targetWidth) canvas.width = targetWidth;
      if (canvas.height !== targetHeight) canvas.height = targetHeight;
      currentFont = "";
      return true;
    }

    function randomScreenPoint() {
      return {
        x: (Math.random() * viewportWidth - offsetX) / scale,
        y: (Math.random() * viewportHeight - offsetY) / scale
      };
    }

    function nearestFlower(x, y) {
      let closest = -1;
      let minimum = Infinity;
      flowerSways.forEach((flower, index) => {
        const point = transformArtworkPoint(flower.x, flower.y);
        const distance = Math.hypot(x - point.x, y - point.y);
        if (distance < flower.radius * 1.12 && distance < minimum) {
          closest = index;
          minimum = distance;
        }
      });
      return closest;
    }

    function nearestFoliage(x, y) {
      let closest = 0;
      let minimum = Infinity;
      foliageSways.forEach((branch, index) => {
        const point = transformArtworkPoint(branch.x, branch.y);
        const distance = Math.hypot(x - point.x, y - point.y);
        if (distance < minimum) {
          closest = index;
          minimum = distance;
        }
      });
      return closest;
    }

    function isBabyBlossom(x, y) {
      let minimum = Infinity;
      babyBreathClusters.forEach(([clusterX, clusterY, size]) => {
        babyBreathOffsets.forEach(([dx, dy]) => {
          const point = transformArtworkPoint(clusterX + dx * size, clusterY + dy * size);
          minimum = Math.min(minimum, Math.hypot(x - point.x, y - point.y));
        });
      });
      return minimum < 13;
    }

    function buildParticleMap() {
      drawBouquet(artContext);
      const image = artContext.getImageData(0, 0, WIDTH, HEIGHT);
      let left = WIDTH;
      let top = HEIGHT;
      let right = -1;
      let bottom = -1;
      for (let y = 0; y < HEIGHT; y += 1) {
        for (let x = 0; x < WIDTH; x += 1) {
          if (image.data[(y * WIDTH + x) * 4 + 3] < 16) continue;
          left = Math.min(left, x);
          top = Math.min(top, y);
          right = Math.max(right, x);
          bottom = Math.max(bottom, y);
        }
      }
      if (right < left || bottom < top) throw new Error("Bouquet artwork has no visible pixels");
      artworkBounds = { left, top, width: right - left + 1, height: bottom - top + 1 };
      fitArtwork();

      const compactScreen = viewportWidth < 600;
      const cellWidth = (compactScreen ? 4.9 : 4.7) / scale;
      const cellHeight = (compactScreen ? 7.4 : 7.1) / scale;
      const columns = Math.ceil(WIDTH / cellWidth);
      const rows = Math.ceil(HEIGHT / cellHeight);
      const mappedParticles = [];

      for (let row = 0; row < rows; row += 1) {
        const y = Math.floor((row + .5) * cellHeight);
        for (let column = 0; column < columns; column += 1) {
          const x = Math.floor((column + .5) * cellWidth);
          const pixel = (y * WIDTH + x) * 4;
          if (image.data[pixel + 3] < 35) continue;

          let red = 0;
          let green = 0;
          let blue = 0;
          let coverage = 0;
          for (let sy = -1; sy <= 1; sy += 1) {
            for (let sx = -1; sx <= 1; sx += 1) {
              const sampleX = Math.max(0, Math.min(WIDTH - 1, x + Math.round(sx * cellWidth * .3)));
              const sampleY = Math.max(0, Math.min(HEIGHT - 1, y + Math.round(sy * cellHeight * .3)));
              const sample = (sampleY * WIDTH + sampleX) * 4;
              const alpha = image.data[sample + 3] / 255;
              red += image.data[sample] * alpha;
              green += image.data[sample + 1] * alpha;
              blue += image.data[sample + 2] * alpha;
              coverage += alpha;
            }
          }
          if (coverage < .55) continue;
          red = Math.round(image.data[pixel] * .68 + red / coverage * .32);
          green = Math.round(image.data[pixel + 1] * .68 + green / coverage * .32);
          blue = Math.round(image.data[pixel + 2] * .68 + blue / coverage * .32);

          const targetX = column * cellWidth + cellWidth / 2;
          const targetY = row * cellHeight + cellHeight / 2;
          const seed = ((column * 73856093) ^ (row * 19349663)) >>> 0;
          const variation = ((seed >>> 9) % 1000) / 1000;
          const foliage = green > red * 1.025 && green > blue * .98;
          const baby = !foliage && isBabyBlossom(x, y);
          const category = foliage ? "foliage" : baby ? "breath" : "flower";
          const flowerGroup = category === "flower" ? nearestFlower(x, y) : -1;
          const foliageGroup = category === "foliage" ? nearestFoliage(x, y) : -1;
          const screenPoint = randomScreenPoint();
          const startColor = initialColors[Math.floor(Math.random() * initialColors.length)];
          const outer = Math.max(0, Math.hypot(targetX - WIDTH * .5, targetY - HEIGHT * .9) / (WIDTH * .66));
          const flightDelay = compactScreen
            ? category === "flower"
              ? 250 + variation * 850 + outer * 140
              : category === "foliage"
                ? 1800 + variation * 650
                : 3600 + variation * 700
            : category === "flower"
              ? 650 + variation * 1900 + outer * 260
              : category === "foliage"
                ? 4300 + variation * 1500
                : 6200 + variation * 1100;

          mappedParticles.push({
            seed,
            sx: screenPoint.x,
            sy: screenPoint.y,
            tx: targetX,
            ty: targetY,
            red, green, blue,
            startColor,
            initialBit: Math.random() < .5 ? "0" : "1",
            bit: seed & 1 ? "1" : "0",
            phase: Math.random() * Math.PI * 2,
            size: compactScreen ? 5.5 + Math.random() * .8 : 6 + Math.random() * 1.1,
            category,
            flowerGroup,
            foliageGroup,
            coverage: Math.min(1, coverage / 3.1),
            flightDelay,
            flightDuration: compactScreen
              ? 1450 + variation * 500
              : 2200 + variation * 650,
            messageIndex: -1,
            bitIndex: -1,
            letterParticle: false
          });
        }
      }

      for (let index = mappedParticles.length - 1; index > 0; index -= 1) {
        const swap = Math.floor(Math.random() * (index + 1));
        [mappedParticles[index], mappedParticles[swap]] = [mappedParticles[swap], mappedParticles[index]];
      }
      particles = mappedParticles;
    }

    function makeMessagePoints(text) {
      const narrowScreen = viewportWidth < 600;
      messageFontSize = narrowScreen ? 22 : 34;
      artContext.font = `${messageFontSize / scale}px ${messageFont}`;
      const maxWidth = narrowScreen
        ? Math.min(WIDTH * .66, viewportWidth / scale * .62)
        : Math.min(WIDTH * .84, viewportWidth / scale * .9);
      const extraWordSpace = narrowScreen ? 28 : 8;
      const measureLine = (value) => artContext.measureText(value).width
        + (value.split(" ").length - 1) * extraWordSpace;
      const lines = [];
      let line = "";
      for (const word of text.split(" ")) {
        const candidate = line ? `${line} ${word}` : word;
        if (line && measureLine(candidate) > maxWidth) {
          lines.push(line);
          line = word;
        } else {
          line = candidate;
        }
      }
      if (line) lines.push(line);

      const lineHeight = messageFontSize * (narrowScreen ? 1.42 : 1.26) / scale;
      const centerX = (viewportWidth / 2 - offsetX) / scale;
      const centerY = (viewportHeight / 2 - offsetY) / scale;
      const points = lines.flatMap((lineText, lineIndex) => {
        const lineWidth = measureLine(lineText);
        let x = centerX - lineWidth / 2;
        const y = centerY + (lineIndex - (lines.length - 1) / 2) * lineHeight;
        return [...lineText].flatMap((character) => {
          const characterWidth = artContext.measureText(character).width;
          const point = character === " "
            ? []
            : [{ x: x + characterWidth / 2, y, character, byteIndex: -1 }];
          x += characterWidth + (character === " " ? extraWordSpace : 0);
          return point;
        });
      });

      let searchFrom = 0;
      points.forEach((point) => {
        point.byteIndex = text.indexOf(point.character, searchFrom);
        searchFrom = point.byteIndex + 1;
      });
      return points;
    }

    function refreshMessageLayout() {
      const nextPoints = makeMessagePoints(decodedText);
      if (mode === "decoded") {
        particles.forEach((particle) => {
          if (particle.letterParticle) {
            particle.messagePoint = nextPoints[particle.messageIndex];
            particle.decodeX = particle.messagePoint.x + (particle.bitIndex % 4 - 1.5) * 2.4;
            particle.decodeY = particle.messagePoint.y + (Math.floor(particle.bitIndex / 4) - .5) * 3.6;
          } else if (particle.messageIndex < 0 && particle.messagePoint) {
            particle.messagePoint = nextPoints[(particle.seed >>> 4) % nextPoints.length];
            particle.decodeX = particle.messagePoint.x + (((particle.seed >>> 8) % 33) - 16) * 2.2;
            particle.decodeY = particle.messagePoint.y + (((particle.seed >>> 13) % 17) - 8) * 2.2;
          }
        });
      }
      messagePoints = nextPoints;
    }

    function ease(value) {
      const progress = Math.max(0, Math.min(1, value));
      return progress * progress * (3 - 2 * progress);
    }

    function mix(start, end, amount) {
      return Math.round(start + (end - start) * amount);
    }

    function colorString(red, green, blue) {
      return `rgb(${red},${green},${blue})`;
    }

    function useFont(size, family = fontFamily) {
      const font = `${size / scale}px ${family}`;
      if (font !== currentFont) {
        context.font = font;
        currentFont = font;
      }
    }

    function botanicalOffset(particle, time) {
      let sway;
      let center;
      if (particle.flowerGroup >= 0) {
        sway = flowerSways[particle.flowerGroup];
        center = transformArtworkPoint(sway.x, sway.y);
      } else if (particle.foliageGroup >= 0) {
        sway = foliageSways[particle.foliageGroup];
        center = transformArtworkPoint(sway.x, sway.y);
      } else {
        return { x: 0, y: 0 };
      }

      const phase = time * sway.speed + sway.phase + particle.phase * .08;
      const strength = particle.category === "foliage" ? .055 : .12;
      const angle = Math.sin(phase) * strength;
      const breathing = 1 + Math.sin(phase * .68) * (particle.category === "foliage" ? .018 : .04);
      const relativeX = particle.tx - center.x;
      const relativeY = particle.ty - center.y;
      return {
        x: relativeX * (Math.cos(angle) * breathing - 1) - relativeY * Math.sin(angle)
          + Math.sin(phase) * sway.amount / scale,
        y: relativeX * Math.sin(angle) + relativeY * (Math.cos(angle) * breathing - 1)
          + Math.cos(phase) * sway.amount * .58 / scale
      };
    }

    function formationState(particle, time) {
      const elapsed = time - experienceStarted;
      const progress = reduceMotion.matches ? 1 : ease((elapsed - particle.flightDelay) / particle.flightDuration);
      const sway = botanicalOffset(particle, time);
      const curl = (1 - progress) * 21 / scale;
      return {
        progress,
        x: particle.sx + (particle.tx + sway.x - particle.sx) * progress
          + Math.sin(time * .0014 + particle.phase) * curl,
        y: particle.sy + (particle.ty + sway.y - particle.sy) * progress
          + Math.cos(time * .0011 + particle.phase) * curl * .55
      };
    }

    function drawGlyph(glyph, x, y, red, green, blue, alpha, size, shadow = 0, family = fontFamily) {
      if (alpha <= .005) return;
      context.globalAlpha = Math.min(1, alpha);
      context.fillStyle = colorString(red, green, blue);
      context.shadowBlur = shadow;
      context.shadowColor = shadow ? `rgba(${red},${green},${blue},.75)` : "transparent";
      useFont(size, family);
      context.fillText(glyph, x, y);
    }

    function drawFormedParticle(particle, time) {
      const sway = botanicalOffset(particle, time);
      const wave = reduceMotion.matches ? 0 : Math.sin(time * .00115 + particle.phase);
      const flicker = !reduceMotion.matches && Math.sin(time * .0017 + particle.seed % 127) > .955;
      const glyph = flicker ? (particle.bit === "1" ? "0" : "1") : particle.bit;
      const twinkle = particle.category === "breath" && !reduceMotion.matches
        ? .7 + (Math.sin(time * .0031 + particle.phase) + 1) * .15
        : 1;
      drawGlyph(
        glyph,
        particle.tx + sway.x,
        particle.ty + sway.y,
        particle.red,
        particle.green,
        particle.blue,
        particle.coverage * twinkle * (.87 + (wave + 1) * .12),
        particle.size,
        particle.category === "breath" && twinkle > .92 ? 2 : 0
      );
    }

    function drawFormingParticle(particle, time) {
      const state = formationState(particle, time);
      const colorProgress = ease((state.progress - .08) / .92);
      const red = mix(particle.startColor[0], particle.red, colorProgress);
      const green = mix(particle.startColor[1], particle.green, colorProgress);
      const blue = mix(particle.startColor[2], particle.blue, colorProgress);
      const glyph = state.progress > .78 ? particle.bit : particle.initialBit;
      drawGlyph(glyph, state.x, state.y, red, green, blue, .72 + state.progress * .27, particle.size);
    }

    function pointForByte(byteIndex) {
      let nearest = messagePoints[0];
      let distance = Infinity;
      messagePoints.forEach((point) => {
        const nextDistance = Math.abs(point.byteIndex - byteIndex);
        if (nextDistance < distance) {
          distance = nextDistance;
          nearest = point;
        }
      });
      return nearest;
    }

    function assignDecodeTargets(time) {
      const completeBitMap = particles.length >= encodedBinary.length;
      particles.forEach((particle, index) => {
        const state = formationState(particle, time);
        particle.decodeFromX = state.x;
        particle.decodeFromY = state.y;
        particle.decodeDuration = 2050 + (particle.seed % 550);

        if (completeBitMap && index < encodedBinary.length) {
          const byteIndex = Math.floor(index / 8);
          const bitIndex = index % 8;
          const point = pointForByte(byteIndex);
          particle.messageIndex = point.byteIndex === byteIndex && bitIndex === 0
            ? messagePoints.indexOf(point)
            : -1;
          particle.bitIndex = bitIndex;
          particle.letterParticle = particle.messageIndex >= 0;
          particle.messagePoint = point;
          particle.decodeBit = encodedBinary[index];
          particle.decodeDelay = byteIndex * 12 + bitIndex * 6;
          particle.decodeX = point.x + (bitIndex % 4 - 1.5) * 2.4;
          particle.decodeY = point.y + (Math.floor(bitIndex / 4) - .5) * 3.6;
        } else if (index < messagePoints.length) {
          const point = messagePoints[index];
          particle.messageIndex = index;
          particle.bitIndex = 0;
          particle.letterParticle = true;
          particle.messagePoint = point;
          particle.decodeBit = encodedBinary[point.byteIndex * 8];
          particle.decodeDelay = index * 12;
          particle.decodeX = point.x;
          particle.decodeY = point.y;
        } else {
          const point = messagePoints[(particle.seed >>> 4) % messagePoints.length];
          particle.messageIndex = -1;
          particle.bitIndex = -1;
          particle.letterParticle = false;
          particle.messagePoint = point;
          particle.decodeBit = particle.bit;
          particle.decodeDelay = particle.seed % 350;
          particle.decodeX = point.x + (((particle.seed >>> 8) % 33) - 16) * 2.2;
          particle.decodeY = point.y + (((particle.seed >>> 13) % 17) - 8) * 2.2;
        }
      });
    }

    function drawDecodingParticle(particle, time, elapsed) {
      const progress = ease((elapsed - particle.decodeDelay) / particle.decodeDuration);
      const drift = (1 - progress) * 24 / scale;
      const x = particle.decodeFromX + (particle.decodeX - particle.decodeFromX) * progress
        + Math.sin(time * .0012 + particle.phase) * drift;
      const y = particle.decodeFromY + (particle.decodeY - particle.decodeFromY) * progress
        + Math.cos(time * .001 + particle.phase) * drift * .55;

      if (particle.messageIndex >= 0) {
        const characterProgress = ease((elapsed - (particle.messageIndex * 12 + 1420)) / 760);
        const bitOpacity = particle.bitIndex === 0
          ? 1 - characterProgress
          : 1 - ease((progress - .64) / .34);
        drawGlyph(particle.decodeBit, x, y, 246, 165, 201, bitOpacity * particle.coverage, particle.size);
        if (particle.letterParticle && characterProgress > .005) {
          drawGlyph(
            particle.messagePoint.character,
            particle.messagePoint.x,
            particle.messagePoint.y,
            255,
            218,
            233,
            characterProgress,
            messageFontSize,
            characterProgress > .72 ? 8 : 3,
            messageFont
          );
        }
      } else {
        const opacity = 1 - ease((progress - .56) / .4);
        drawGlyph(particle.decodeBit, x, y, 225, 160, 197, opacity * particle.coverage, particle.size);
      }
    }

    function finishDecode() {
      mode = "decoded";
      experience.classList.remove("decoding");
      experience.classList.add("decoded");
      stageNote.textContent = "a message, made from 0s and 1s";
      returnButton.hidden = false;
      announcement.textContent = decodedText;
    }

    function beginDecode(time) {
      if (mode !== "formed") return;
      mode = "decoding";
      modeStarted = reduceMotion.matches ? time - DECODE_DURATION : time;
      experience.classList.remove("formed");
      experience.classList.add("decoding");
      decodeButton.hidden = true;
      returnButton.hidden = true;
      stageNote.textContent = "the little pieces are finding their words";
      assignDecodeTargets(time);
      if (reduceMotion.matches) finishDecode();
    }

    function finishReturn() {
      mode = "formed";
      modeStarted = performance.now();
      experience.classList.remove("returning");
      experience.classList.add("formed");
      decodeButton.hidden = false;
      returnButton.hidden = true;
      stageNote.textContent = "a little message is waiting in the flowers";
      announcement.textContent = "The bouquet has returned.";
    }

    function beginReturn(time) {
      if (mode !== "decoded") return;
      mode = "returning";
      modeStarted = reduceMotion.matches ? time - RETURN_DURATION : time;
      experience.classList.remove("decoded");
      experience.classList.add("returning");
      returnButton.hidden = true;
      stageNote.textContent = "watch the letters find their place again";

      particles.forEach((particle) => {
        if (particle.letterParticle) {
          particle.returnFromX = particle.messagePoint.x;
          particle.returnFromY = particle.messagePoint.y;
        } else {
          particle.returnFromX = particle.decodeX;
          particle.returnFromY = particle.decodeY;
        }
        particle.returnDelay = reduceMotion.matches ? 0 : particle.seed % 520;
        particle.returnDuration = 2500 + particle.seed % 850;
      });
      if (reduceMotion.matches) finishReturn();
    }

    function drawReturningParticle(particle, time, elapsed) {
      const progress = ease((elapsed - particle.returnDelay) / particle.returnDuration);
      const sway = botanicalOffset(particle, time);
      const destinationX = particle.tx + sway.x;
      const destinationY = particle.ty + sway.y;
      const curl = (1 - progress) * 26 / scale;
      const x = particle.returnFromX + (destinationX - particle.returnFromX) * progress
        + Math.sin(time * .0013 + particle.phase) * curl;
      const y = particle.returnFromY + (destinationY - particle.returnFromY) * progress
        + Math.cos(time * .0011 + particle.phase) * curl * .6;
      const bitProgress = ease((progress - .12) / .62);
      if (particle.letterParticle) {
        drawGlyph(
          particle.messagePoint.character,
          x,
          y,
          255,
          218,
          233,
          1 - bitProgress,
          messageFontSize - bitProgress * (messageFontSize - 27),
          0,
          messageFont
        );
      }
      drawGlyph(particle.letterParticle ? particle.decodeBit : particle.bit, x, y,
        particle.red, particle.green, particle.blue, particle.coverage * bitProgress, particle.size);
    }

    function updateMode(time) {
      const formationDuration = viewportWidth < 600 ? 6500 : FORM_DURATION;
      if (mode === "forming" && time - experienceStarted >= formationDuration) {
        mode = "formed";
        modeStarted = time;
        experience.classList.add("formed");
        decodeButton.hidden = false;
        stageNote.textContent = "a little message is waiting in the flowers";
        announcement.textContent = "The binary has formed a bouquet. Press decode to read the hidden message.";
      } else if (mode === "decoding" && time - modeStarted >= DECODE_DURATION) {
        finishDecode();
      } else if (mode === "returning" && time - modeStarted >= RETURN_DURATION) {
        finishReturn();
      }
    }

    function drawFrame(time) {
      if (!viewportWidth || !viewportHeight) return;
      updateMode(time);
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.setTransform(
        scale * pixelRatio,
        0,
        0,
        scale * pixelRatio,
        offsetX * pixelRatio,
        offsetY * pixelRatio
      );
      context.textAlign = "center";
      context.textBaseline = "middle";
      currentFont = "";

      const elapsed = time - modeStarted;
      if (mode === "forming") {
        particles.forEach((particle) => drawFormingParticle(particle, time));
      } else if (mode === "formed") {
        particles.forEach((particle) => drawFormedParticle(particle, time));
      } else if (mode === "decoding" || mode === "decoded") {
        particles.forEach((particle) => {
          if (mode === "decoded") {
            if (particle.letterParticle) {
              drawGlyph(particle.messagePoint.character, particle.messagePoint.x, particle.messagePoint.y,
                255, 218, 233, 1, messageFontSize, 5, messageFont);
            }
          } else {
            drawDecodingParticle(particle, time, elapsed);
          }
        });
      } else if (mode === "returning") {
        particles.forEach((particle) => drawReturningParticle(particle, time, elapsed));
      }
      if (!reduceMotion.matches && (mode === "formed" || mode === "returning")) {
        if (time - lastDrift > 760 && driftingBits.length < 12) {
          driftingBits.push({
            x: 150 + Math.random() * 600,
            y: 145 + Math.random() * 280,
            start: time,
            duration: 3600 + Math.random() * 1800,
            sway: 12 + Math.random() * 24,
            bit: Math.random() < .5 ? "0" : "1"
          });
          lastDrift = time;
        }
        driftingBits = driftingBits.filter((bit) => time - bit.start < bit.duration);
        driftingBits.forEach((bit) => {
          const progress = (time - bit.start) / bit.duration;
          drawGlyph(
            bit.bit,
            bit.x + Math.sin(progress * Math.PI * 2) * bit.sway,
            bit.y + progress * 185,
            245,
            178,
            207,
            Math.sin(progress * Math.PI) * .8,
            9,
            4
          );
        });
      }
      context.globalAlpha = 1;
      context.shadowBlur = 0;
    }

    function animate(time = performance.now()) {
      if (!reduceMotion.matches) requestAnimationFrame(animate);
      if (!reduceMotion.matches && time - lastFrame < 28) return;
      lastFrame = time;
      drawFrame(time);
    }

    function decodeMessage(bits) {
      const bytes = bits.match(/.{8}/g).map((byte) => Number.parseInt(byte, 2));
      return new TextDecoder().decode(new Uint8Array(bytes));
    }

    function encodeMessage(text) {
      return Array.from(new TextEncoder().encode(text), (byte) => byte.toString(2).padStart(8, "0")).join("");
    }

    decodeButton.addEventListener("click", () => beginDecode(performance.now()));
    returnButton.addEventListener("click", () => beginReturn(performance.now()));
    window.addEventListener("resize", () => {
      if (!resizeCanvas()) return;
      if (mode !== "decoding" && mode !== "returning") refreshMessageLayout();
      drawFrame(performance.now());
    });
    reduceMotion.addEventListener?.("change", () => {
      if (reduceMotion.matches) {
        if (mode === "forming") {
          mode = "formed";
          experience.classList.add("formed");
          decodeButton.hidden = false;
          stageNote.textContent = "a little message is waiting in the flowers";
        } else if (mode === "decoding") {
          finishDecode();
        } else if (mode === "returning") {
          finishReturn();
        }
        drawFrame(performance.now());
      } else if (!reduceMotion.matches) {
        lastFrame = 0;
        requestAnimationFrame(animate);
      }
    });

    encodedBinary = encodeMessage(message);
    decodedText = decodeMessage(encodedBinary);
    resizeCanvas();
    buildParticleMap();
    messagePoints = makeMessagePoints(decodedText);
    if (reduceMotion.matches) {
      mode = "formed";
      experience.classList.add("formed");
      decodeButton.hidden = false;
      stageNote.textContent = "a little message is waiting in the flowers";
    }
    requestAnimationFrame(animate);
  }

})();
