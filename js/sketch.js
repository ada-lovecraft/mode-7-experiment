const RES = {width: 256, height: 256}
const SRC = "images/grid.jpg"
const COLOR_CHANNELS = 4
const {cos,sin, PI} = Math
const TWO_PI = PI * 2
const RADIANS = PI / 180

var ZoomFactor = 1
var ShearFactor = 2

let frameCount = 0

const raf = window.requestAnimationFrame
const rad = (d) => d * RADIANS

class PixelData { // Handy ImageData Interface
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
    const idx = (x + (y * this.width)) * this.colorChannels
    const data = this._imageData.data
    return [
      data[idx],
      data[idx+1],
      data[idx+2],
      data[idx+3]
    ]
  }
  rgb(x, y) {
    const channels = this.at(x, y)
    return pixelbutler.rgb(
      channels[0],
      channels[1],
      channels[2]
    )
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
        const pxls = cntxt.getImageData(0,0,cnvs.width, cnvs.height)
        resolve(new PixelData(pxls))
      }
      img.crossOrigin = "Anonymous"
      img.src = url
    } catch(e) {
      reject(e)
    }
  })
}

const transform = (points, transformer) => points.map(transformer)
const identityTransformer = ([x,y]) => [x,y]
const createScaleTransformer = (a,d=a) => ([x,y]) => [~~(a*x),~~(d*y)]
const createShearTransformer = (b) => ([x,y]) => [~~(x+b*y), y]
const createRotationTransformer = (theta) => {
  const cost = cos(theta)
  const sint = sin(theta)
  return ([x,y]) => {
    let tx = ~~(x*cost+y*-sint)
    let ty = ~~(x*sint + y*cost)
    return [tx >= 0 ? tx : 0, ty >= 0 ? ty : 0]
  }
}

let ctx
let width
let height
let texture
let pixels

let points = []
let transformed
const magenta = pixelbutler.rgb(255,0,255)

async function main() {
  const canvas = document.createElement('canvas')
  canvas.width = RES.width
  canvas.height = RES.height
  document.body.appendChild(canvas)
  ctx = new pixelbutler.Stage({
    width: RES.width,
    height: RES.height,
    canvas: canvas,
    center: true
  })
  width = ctx.width
  height = ctx.height
  pixels = await PixelData.fromURL(SRC)

  for(let y = 0; y < 256; y++) {
    for(let x = 0; x < 256; x++) {
      points.push([x, y])
    }
  }

  //transformed = transform(points, identityTransformer)



  //raf(loop)
  draw()
}

function draw() {
  //transformed = transform(points, createScaleTransformer(zoom))
  frameCount++
  //transformed = transform(points, createShearTransformer(sin(frameCount*0.1) * ShearFactor))
  transformed = transform(points, createRotationTransformer(rad(frameCount)))
  ctx.clear()
  points.forEach((p,idx) => {
    const [x,y] = transformed[idx]
    const pixel = pixels.rgb(x,y)
    ctx.setPixel(p[0], p[1], pixels.rgb(x,y))
  })
  ctx.text(1,1,`ShearFactor: ${ShearFactor}`, magenta)
  ctx.render()
}

function scale(sx) {
  ZoomFactor = sx
  draw()
}

function loop() {
  draw()
  raf(loop)
}



main()
