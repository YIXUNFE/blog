"use strict"
;(function () {
  var ctx = canvas.getContext('2d'),
      width = canvas.width,
      height = canvas.height
  
  /**
   * createMap 制作地图网格
   * @return {Object} 
   * @member {Funcion} render 显示地图网格
   */
  function createMap (count) {
    var voronoi = d3.geom.voronoi().clipExtent([[0, 0], [width, height]]),
      randomPoints = [],
      voronoiPaths = []
    
    /**
     * _createRandomPoints 生成随机点
     * @return {Array} [[x, y], [x, y], [x, y] ... ]
     */
    function _createRandomPoints () {
      //现成的 D3 方法用起来
      randomPoints = d3.range(count).map(function(d) {
        return [Math.random() * width, Math.random() * height]
			})
      return randomPoints
    }
    
    /**
     * _getVoronoiPaths 生成 voronoi 图图形数组
     * @return {Array} [[[x, y], [x, y], [x, y]], [...] ... ]
     */
    function _getVoronoiPaths (points) {
      voronoiPaths = voronoi(points || _createRandomPoints())
      return voronoiPaths
    }
    
    /**
     * _relax 对 voronoi 图进行松弛操作
     * 获取 paths 中的各个多边形的中心点作为一个集合，并作为下次生成 voronoi 图的点集合
     * @params {Array} paths 上一次 voronoi 图的 paths
     * @params {Number} times 执行松弛次数
     * @return {Array} [[[x, y], [x, y], [x, y]], [...] ... ]
     */
    function _relax (paths, times) {
      if (times === 0) {return paths}
      
      times = times || 1
      
      var centroidPoints = paths.map(function (points) {
        return _getPolygonCentroid(points)
      })
      
      randomPoints = centroidPoints
      
      paths = _getVoronoiPaths(centroidPoints)
      
      _relax(paths, times - 1)
    }
    
    /**
     * _getPolygonCentroid 获取多边形重心
     * @return {Array} [x, y]
     */
    function _getPolygonCentroid (points) {
      var temp = points.slice(0), area = 0, result = [0, 0], l = temp.length
      
      // get polygon area
      temp.map(function (current, i) {
        var next = temp[i + 1 >= l ? 0 : (i + 1)]
        area += (current[0] * next[1] - next[0] * current[1])
      })
      area = area / 2
      
      //get polygon centroid
      temp.map(function (current, i) {
        var next = temp[i + 1 >= l ? 0 : (i + 1)]
        result[0] += ((current[0] + next[0]) * (current[0] * next[1] - next[0] * current[1]))
        result[1] += ((current[1] + next[1]) * (current[0] * next[1] - next[0] * current[1]))
      })
      
      result[0] = result[0] / 6 / area
      result[1] = result[1] / 6 / area
      
      return result
    }
    
    /**
     * _render 渲染 voronoi 图
     */
    function _render () {
      var paths = _relax(_getVoronoiPaths(), 3)
      
      ctx.clearRect(0, 0, width, height)
      ctx.strokeStyle = '#ff0000'
      
      //画出随机点
      randomPoints.map(function (point, i) {
        ctx.beginPath()
        ctx.arc(point[0], point[1], 1, 0, Math.PI * 2, false)
        ctx.stroke()
        ctx.closePath()
      })
      
      //画出 voronoi 图形
      
      ctx.strokeStyle = '#000000'
      voronoiPaths.map(function (path, i) {
        ctx.beginPath()
        ctx.moveTo(path[0][0], path[0][1])
        path.map(function (point, j) {
          ctx.lineTo(point[0], point[1])
        })
        ctx.stroke()
        ctx.closePath()
      })
    }
    
    function _getPaths () {
      return voronoiPaths
    }
    
    function _getPoints () {
      return randomPoints
    }
    
    return {
      getPaths: _getPaths,
      getPoints: _getPoints,
      render: _render
    }
  }
  
  
  createMap(1000).render()
}());