'use strict'

;(function () {
/**
 * _getSymmetryPoint 获取对称控制点
 * @param {Array} controlPoint 当前路径控制点
 * @param {Array} endPoint 当前路径终点
 * @return {Array} 对称点
 */
function _getSymmetryPoint (controlPoint, endPoint) {
  var x, y, x1 = controlPoint[0], y1 = controlPoint[1], x2 = endPoint[0], y2 = endPoint[1]
  x = 2 * x2 - x1
  y = 2 * y2 - y1
  return [x, y]
}
  
/**
 * _getNoisePath 将路径噪化处理
 * @param {Number} dist 路径长度
 * @param {Number} interval 噪化点之间的间隙
 * @param {Number} f 幅度
 * @return {Array} 噪化路径的点集合
 *
 * 处理前需要将画布原点移动到路径起始点位置且旋转画布使x轴与线段重合
 */
function _getNoisePath (dist, interval, f) {
  var i = 1, l = Math.floor(dist / interval), d, result = [[0, 0]]
  for (i; i < l; i++) {
    result.push([interval * i, f * Math.random() * (Math.random() > 0.5 ? -1 : 1)])
  }
  result.push([dist, 0])
  return result
}

var ctx = canvas.getContext('2d'),
  width = canvas.width,
  height = canvas.height

var path = _getNoisePath(Math.sqrt(90000 + 90000), 100, 40),
  prevCtrl = [(path[1][0] - path[0][0]) / 2, 40], arr = []
ctx.transform(1, 0, 0, 1, 0, 0)
ctx.beginPath()
ctx.translate(100, 100)
ctx.rotate(Math.atan(300/300))
ctx.moveTo(0, 0)
path.shift()
path.map(function (p, i) {
  arr.push(prevCtrl)
  ctx.quadraticCurveTo(prevCtrl[0], prevCtrl[1], p[0], p[1])
  prevCtrl = _getSymmetryPoint(prevCtrl, p)
})
ctx.stroke()
ctx.closePath()
  
  ctx.strokeStyle = '#ff0000'
  ctx.beginPath()
  path.map(function (p, i) {
    ctx.moveTo(p[0], p[1])
    ctx.arc(p[0], p[1], 3, 0, Math.PI * 2, false)
  })
  ctx.stroke()
  ctx.closePath()
  
  ctx.strokeStyle = '#000000'
  ctx.beginPath()
  arr.map(function (p, i) {
    ctx.moveTo(p[0], p[1])
    ctx.arc(p[0], p[1], 3, 0, Math.PI * 2, false)
    //ctx.fillText(i, p[0], p[1])
  })
  ctx.stroke()
  ctx.closePath()
}())