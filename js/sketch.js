const REZ = {
  width: 256,
  height: 256
}
const SRC = 'images/map.png'
const COLOR_CHANNELS = 4
const {
  cos,
  sin,
  PI
} = Math
const TWO_PI = PI * 2
const RADIANS = PI / 180
const STEP_SPEED = 10
const raf = window.requestAnimationFrame
const rad = d => d * RADIANS
const deg = r => r / RADIANS
const keys = new KeytarHero()
const {
  UP,
  DOWN,
  LEFT,
  RIGHT,
  W,
  A,
  S,
  D,
  COMMA,
  PERIOD,
  P,
  OPENBRACKET,
  CLOSEBRACKET
} = KeytarHero.Keys

var SCALING = 125.5
var ShearFactor = 2
var Origin = [2092, 264]

var OFFSET = [REZ.width * 0.5, REZ.height * 0.5]

var HORIZON = 3
var FOV = 167
var Degrees = 90
var SteeringMod = rad(-90)

let PROJECT = true
let frameCount = 0

const crayons = {
  black: pixelbutler.rgb(0, 0, 0),
  magenta: pixelbutler.rgb(255, 0, 255),
  indigo: pixelbutler.rgb(128, 128, 255),
  cyan: pixelbutler.rgb(0, 255, 255),
  yellow: pixelbutler.rgb(255, 255, 0)
}

class PixelData {
  // Handy ImageData Interface
  constructor(imageData, colorChannels = 4) {
    this._imageData = imageData
    this.colorChannels = colorChannels
  }
  get width() {
    return this._imageData.width
  }
  get height() {
    return this._imageData.height
  }
  at(x, y) {
    const idx = (x + y * this.width) * this.colorChannels
    const data = this._imageData.data
    return [data[idx], data[idx + 1], data[idx + 2], data[idx + 3]]
  }
  rgb(x, y) {
    const channels = this.at(x, y)
    return pixelbutler.rgb(channels[0], channels[1], channels[2])
  }
}

PixelData.fromURL = function(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    try {
      img.onload = function() {
        const cnvs = document.createElement('canvas')
        cnvs.width = img.width
        cnvs.height = img.height
        const cntxt = cnvs.getContext('2d')
        cntxt.drawImage(img, 0, 0)
        const pxls = cntxt.getImageData(0, 0, cnvs.width, cnvs.height)
        resolve(new PixelData(pxls))
      }
      img.crossOrigin = 'Anonymous'
      img.src = url
    } catch (e) {
      reject(e)
    }
  })
}

const transform = (points, transformer) => points.map(transformer)
const identityTransformer = ([x, y]) => [x, y]
const createScaleTransformer = (a, d = a) => ([x, y]) => [~~(a * x), ~~(d * y)]

const createShearTransformer = b => ([x, y]) => [~~(x + b * y), y]
// const createRotationTransformer = (theta) => {
//   const cost = cos(theta)
//   const sint = sin(theta)
//   return ([x,y]) => {
//     let tx = ~~(x*cost+y*-sint)
//     let ty = ~~(x*sint + y*cost)
//     return [tx >= 0 ? tx : 0, ty >= 0 ? ty : 0]
//   }
// }

const createRotationTransformer = (origin, theta) => {
  const cost = cos(theta)
  const sint = sin(theta)
  return ([x, y]) => {
    // translation
    const mods = [origin[0] + OFFSET[0], origin[1] + OFFSET[1]]
    const tx = x - mods[0]
    const ty = y - mods[1]

    //rotation
    const rx = tx * cost - ty * sint
    const ry = tx * sint + ty * cost

    //translate back
    const fx = ~~(rx + mods[0])
    const fy = ~~(ry + mods[1])

    return [fx, fy]
  }
}

const createProjection = (horizon, fov) => ([x, y]) => {
  const p = [x, fov, y + horizon]
  return [p[0] / p[2], p[1] / p[2]]
}

const createMoveTransformer = origin => ([x, y]) => [
  x + origin[0],
  y + origin[1]
]

const onepass = ([x,y]) => {
  const rads = rad(Degrees)
  const px = x;
  const py = FOV;
  const pz = y - HORIZON;

     //projection
  let sx = px / pz;
  let sy = py / pz;

  rx = sx * cos(rads) - sy * sin(rads);
  ry = sx * sin(rads) + sy * cos(rads);

  return [~~(rx * SCALING + Origin[0]), ~~(ry * SCALING + Origin[1])]
}

let ctx
let width
let height
let texture
let pixels
let projection
let scale
let rotate
let move
let ptimeout = null

let points = []
let transformed
const magenta = pixelbutler.rgb(255, 0, 255)

async function main() {
  const canvas = document.createElement('canvas')
  canvas.width = REZ.width
  canvas.height = REZ.height
  document.body.appendChild(canvas)
  ctx = new pixelbutler.Stage({
    width: REZ.width,
    height: REZ.height,
    canvas: canvas,
    center: true,
    scale: 'max'
  })
  width = ctx.width
  height = ctx.height
  pixels = await PixelData.fromURL(SRC)

  for (let y = 0; y < REZ.height; y++) {
    for (let x = 0; x < REZ.width; x++) {
      points.push([x, y])
    }
  }

  //transformed = transform(points, identityTransformer)

  project = createProjection(HORIZON, FOV)
  scale = createScaleTransformer(SCALING)
  rotate = createRotationTransformer(OFFSET, rad(Degrees))
  move = createMoveTransformer(Origin)
  //raf(loop)
  loop()
}

function draw() {
  //transformed = transform(points, createScaleTransformer(zoom))
  frameCount++
  //transformed = transform(points, createShearTransformer(sin(frameCount*0.1) * ShearFactor))
  ctx.clear(crayons.black)
  points.forEach((p, idx) => {
    // let tp
    // if(!!PROJECT) {
    //   tp = scale(move(rotate(project(p))))
    // } else {
    //   tp = scale(move(rotate(p)))
    // }
    // const [x, y] = tp
    const [x,y] = onepass(p)
    if (x < 0 || y < 0 || x > pixels.width || y > pixels.height ) {
      //console.log('x,y outta range:', x, y)
      ctx.setPixel(p[0], p[1], crayons.black)
    } else {
      const pixel = pixels.rgb(x, y)
      ctx.setPixel(p[0], p[1], pixels.rgb(x, y))
    }
  })
  const rads = rad(Degrees) - SteeringMod
  const halfCircle = rad(180)

  ctx.fillCircle(OFFSET[0], OFFSET[1], 16, crayons.black)
  ctx.drawCircle(OFFSET[0], OFFSET[1], 16, crayons.indigo)
  ctx.fillCircle(
    OFFSET[0] + sin(rads) * 12,
    OFFSET[1] + cos(rads) * 12,
    2,
    crayons.cyan
  )
  //ctx.text(OFFSET[0] - 4, OFFSET[1] - 2, deg(rads), crayons.magenta)

  ctx.render()
}

// function scale(sx) {
//   SCALING = sx
//   draw()
// }

function loop() {
  checkInput()
  draw()
  raf(loop)
}

function checkInput() {
  // wasd to move/strafe
  if (keys.isDown(W)) {
    const rads = rad(Degrees)
    Origin[0] += ~~((sin(rads + SteeringMod) - cos(rads + SteeringMod)) *
      STEP_SPEED)
    Origin[1] += ~~((sin(rads + SteeringMod) + cos(rads + SteeringMod)) *
      STEP_SPEED)

    move = null
    move = createMoveTransformer(Origin)
  } else if (keys.isDown(S)) {
    // Origin[0] -= ~~((sin(Degrees) - cos(Degrees)) * STEP_SPEED)
    // Origin[1] -= ~~((sin(Degrees) + cos(Degrees)) * STEP_SPEED)
    Origin[1] += STEP_SPEED
    move = null
    move = createMoveTransformer(Origin)
  }
  if (keys.isDown(A)) {
    Origin[0] -= STEP_SPEED; // ~~((sin(rad(Degrees)) - cos(rad(Degrees))) * STEP_SPEED)
    //Origin[0] -= ~~((cos(rad(Degrees)) + sin(rad(Degrees))) * STEP_SPEED)
    move = null
    move = createMoveTransformer(Origin)
  } else if (keys.isDown(D)) {
    // Origin[1] += ~~((sin(rad(Degrees)) - cos(rad(Degrees))) * STEP_SPEED)
    // Origin[0] += ~~((cos(rad(Degrees)) + sin(rad(Degrees))) * STEP_SPEED)
    Origin[0] += STEP_SPEED
    move = null
    move = createMoveTransformer(Origin)
  }

  // control rotation with left/right
  if (keys.isDown(RIGHT)) {
    Degrees--
    rotate = null
    rotate = createRotationTransformer(OFFSET, rad(Degrees))
  } else if (keys.isDown(LEFT)) {
    Degrees++
    rotate = null
    rotate = createRotationTransformer(OFFSET, rad(Degrees))
  }

  // Control HORIZON with up/down
  if (keys.isDown(UP)) {
    HORIZON--
    project = null
    project = createProjection(HORIZON, FOV)
    console.log('HORIZON:', HORIZON)
  } else if (keys.isDown(DOWN)) {
    HORIZON++
    project = null
    project = createProjection(HORIZON, FOV)
    console.log('HORIZON:', HORIZON)
  }


  if (keys.isDown(CLOSEBRACKET)) {
    FOV += 1
    project = null
    project = createProjection(HORIZON, FOV)
    console.log('FOV:', FOV)
  } else if (keys.isDown(OPENBRACKET)) {
    FOV -= 1
    project = null
    project = createProjection(HORIZON, FOV)
    console.log('FOV:', FOV)
  }

  if (keys.isDown(COMMA)) {
    SCALING -= 0.1
    if (SCALING <= 0) {
      SCALING = 0.1
    }
    console.log('SCALING:', SCALING)
    scale = null
    scale = createScaleTransformer(SCALING)
  } else if (keys.isDown(PERIOD)) {
    SCALING += 0.1
    console.log('SCALING:', SCALING)
    scale = null
    scale = createScaleTransformer(SCALING)
  }
  if (keys.isDown(P)) {
    const nv = !PROJECT
    if(ptimeout) {
      cancelTimeout(ptimeout)
    }
    setTimeout(() => {
      PROJECT = nv
      console.log('Use Projection:', PROJECT)
    }, 100)
  }

}

main()
