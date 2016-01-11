"use strict"
;(function () {
  var ctx = canvas.getContext('2d'),
      width = canvas.width,
      height = canvas.height
      
  /**
   * createMap 制作地图网格
   * @return {Object} 
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
      randomPoints = d3.range(count || 1000).map(function(d) {
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
     * @param {Array} paths 上一次 voronoi 图的 paths
     * @param {Number} times 执行松弛次数
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
      _init()
      
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
      
      return this
    }
    
    /**
     * _init 初始化 voronoi 图
     */
    function _init () {
      _relax(_getVoronoiPaths(), 5)
      return this
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
      render: _render,
      init: _init
    }
  }
    
  /**
   * createLand 绘制地图地貌
   */
  function createLand () {
    var perlinNoiseData = null,
      size = 1 / 2 //Perlin Noise 图与地图比例
    
    var skin = {
      
    }
    
    //定义地形区间
    var terrain = {
      snowMountain: 213,
      mountain: 171,
      plateau: 129,
      hills: 87
    }
    
    /**
     * Corner 多边形角对象处理器
     * @member {Function} add 根据角顶点添加一个角对象
     * @member {Function} get 获取一个或全部角对象
     * @member {Function} map 角对象迭代器
     * @member {Function} destroy 销毁处理器
     */
    var Corner = (function () {
      var corners = {}
      
      function _relateTo (polygon) {
        this.owner.push(polygon)
        polygon.corners.push(this)
      }
      
      function add (point) {
        var str = point[0] + '-' + point[1]
        if (!corners[str]) {
          corners[str] = {
            point: point,
            elevation: _getElevation(point),
            owner: [],
            relateTo: _relateTo
          }
        }
        return corners[str]
      }
      
      function get (point) {
        return point ? corners[point[0] + '-' + point[1]] : corners
      }
      
      function destroy () {
        corners = null
        delete this.add
        delete this.get
        delete this.map
        delete this.destroy
      }
      
      function map (fn) {
        var item, i = 0, arr = []
        for (item in corners) {
          arr.push(fn(corners[item], i))
          i++
        }
        return arr
      }
      
      return {
        add: add,
        get: get,
        map: map,
        destroy: destroy
      }
    }())
    
    /**
     * Center 多边形重心对象处理器
     * @member {Function} add 根据重心点添加一个重心对象
     * @member {Function} get 获取一个或全部重心对象
     * @member {Function} map 重心对象迭代器
     * @member {Function} destroy 销毁处理器
     */
    var Center = (function () {
      var centers = {}
      
      function _relateTo (polygon) {
        this.owner.push(polygon)
        polygon.centers.push(this)
      }
      
      function add (point) {
        var str = point[0] + '-' + point[1]
        if (!centers[str]) {
          centers[str] = {
            point: point,
            elevation: _getElevation(point),
            owner: [],
            relateTo: _relateTo
          }
        }
        return centers[str]
      }
      
      function get (point) {
        return point ? centers[point[0] + '-' + point[1]] : centers
      }
      
      function map (fn) {
        var item, i = 0, arr = []
        for (item in centers) {
          arr.push(fn(centers[item], i))
          i++
        }
        return arr
      }
      
      function destroy () {
        centers = null
        delete this.add
        delete this.get
        delete this.map
        delete this.destroy
      }
      
      return {
        add: add,
        get: get,
        map: map,
        destroy: destroy
      }
    }())
    
    /**
     * Edge 多边形边对象处理器
     * @member {Function} add 根据边的两点添加一个边对象
     * @member {Function} get 获取一个或全部边对象
     * @member {Function} map 边对象迭代器
     * @member {Function} destroy 销毁处理器
     */
    var Edge = (function () {
      var edges = {}
      
      function _getId (p1, p2) {
        var arr1 = [p1[0], p2[0]].sort(),
          arr2 = [p1[1], p2[1]].sort()
        return [arr1[0], arr1[1], arr2[0], arr2[1]].join('-')
      }
      
      function _relateTo (polygon) {
        this.owner.push(polygon)
        polygon.edges.push(this)
      }
      
      function add (point1, point2) {
        var str = _getId(point1, point2)
        if (!edges[str]) {
          edges[str] = {
            points: [point1, point2],
            path: [point1, point2],
            owner: [],
            relateTo: _relateTo
          }
        }
        return edges[str]
      }
      
      function get (point1, point2) {
        return point1 ? edges[_getId(point1, point2)] : edges
      }
      
      function map (fn) {
        var item, i = 0, arr = []
        for (item in edges) {
          arr.push(fn(edges[item], i))
          i++
        }
        return arr
      }
      
      function destroy () {
        edges = null
        delete this.add
        delete this.get
        delete this.map
        delete this.destroy
      }
      
      return {
        add: add,
        get: get,
        map: map,
        destroy: destroy
      }
    }())
    
    /**
     * Polygon 多边形对象处理器
     * @member {Function} add 根据多边形顶点集合添加一个多边形对象
     * @member {Function} get 获取全部多边形对象
     * @member {Function} map 多边形对象迭代器
     * @member {Function} destroy 销毁处理器
     */
    var Polygon = (function () {
      var polygons = []
            
      function add (path, center) {
        var polygon = {}
        
        polygon.corners = []
        polygon.centers = []
        polygon.edges = []
        
        //拆分 path 路径，获得多边形的角与边数据
        path.map(function (point, i) {
          Corner.add(point).relateTo(polygon)
          Edge.add(path[(i > 0 ? i : path.length) - 1], point).relateTo(polygon)
        })
        
        Center.add(center).relateTo(polygon)
        
        polygon.path = path
        polygon.center = center
        
        polygons.push(polygon)
      }
      
      function get () {
        return polygons
      }
      
      function map (fn) {
        var item, i = 0, arr = []
        for (item in polygons) {
          arr.push(fn(polygons[item], i))
          i++
        }
        return arr
      }
      
      function destroy () {
        polygons = null
        delete this.add
        delete this.get
        delete this.map
        delete this.destroy
      }
      
      return {
        add: add,
        get: get,
        map: map,
        destroy: destroy
      }
    }())
    
    /**
     * _getPerlinNoiseData 返回生成的 Perlin Noise 图像数据
     * @return {Object} 返回一个 imageDataObject
     */
    function _getPerlinNoiseData (seed, baseX, baseY) {
      var canvas = document.createElement('canvas'), result
      canvas.width = width * size
      canvas.height = height * size
      canvas.id = 'perlinNoiseCanvas'
      document.body.appendChild(canvas)
      
      perlinNoise(canvas, baseX || width * size / 2, baseY || height * size / 2, seed || (Math.random() * 10000 + 1))
      
      result = canvas.getContext('2d').getImageData(0, 0, width * size, height * size)
      //document.body.removeChild(canvas)
      
      return result.data
    }
    
    /**
     * _getElevation 从 Perlin Noise 数据中获取地图的海拔信息
     * @return {Number} 在 0-255 之间 
     */
    function _getElevation (point) {
      var a = point[0],
        b = point[1], x, y
      a = a < width ? a : (width - 1)
      b = b < height ? b : (height - 1)
      x = Math.floor(a * size)
      y = Math.floor(b * size)
      return perlinNoiseData[Math.floor(x * 4 + y * width * size * 4)]
    }
    
    /**
     * initLandData 初始化地图网格数据，多边形、角、重心等
     */
    function initLandData () {
      perlinNoiseData = _getPerlinNoiseData()
      
      var map = createMap(1000).init(),
        paths = map.getPaths(),
        centers = map.getPoints()
      
      paths.map(function (o, i) {
        Polygon.add(o, centers[i])
      })
    }
    
    initLandData()
    
    /**
     * _getLandDesc 通过海拔获取地形
     * @param {Array} 海拔值数组（重心、角的海拔）
     * @return {String} 地形颜色
     */
    function _getLandDesc (arr) {
      var n = 0,
        l = arr.length, result
      arr.map(function (o, i) {
        n += o
      })
      n = Math.floor(n / l)
      
      //海拔图
      //result = 'rgb(' + n + ',' + n + ',' + n + ')'
      
      //海陆区分图
      result = n < 64 ? '#4ebeba' : '#f0e68C'
      
      return result
    }
    
    /**
     * _render 将 voronoi 图渲染地形
     */
    function _render () {
      ctx.clearRect(0, 0, width, height)
      ctx.strokeStyle = 'none'
      //根据多边形重心的海拔数据决定地形
      Polygon.map(function (polygon, i) {
        var path = polygon.path, arr = []
        ctx.beginPath()
        ctx.moveTo(path[0][0], path[0][1])
        
        arr.push(polygon.centers[0].elevation)
        polygon.corners.map(function (corner) {
          arr.push(corner.elevation / 2)
        })
        
        ctx.fillStyle = _getLandDesc(arr)
        path.map(function (point, j) {
          ctx.lineTo(point[0], point[1])
        })
        ctx.closePath()
        ctx.fill()
      })
      
      return this
    }
    
    return {
      polygons: Polygon,
      edges: Edge,
      centers: Center,
      corners: Corner,
      render: _render
    }
  }
  
  window.land = createLand().render()
}());