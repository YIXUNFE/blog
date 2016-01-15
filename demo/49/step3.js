"use strict"
;(function () {
  var ctx = canvas.getContext('2d'),
      width = canvas.width,
      height = canvas.height,
      oceanElevation = 64,
      polygonNum = 2550
      
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
        
    /**
     * Corner 多边形角对象处理器
     * @member {Function} add 根据角顶点添加一个角对象
     * @member {Function} get 获取一个或全部角对象
     * @member {Function} map 角对象迭代器
     * @member {Function} destroy 销毁处理器
     */
    var Corner = (function () {
      var corners = {}
      
      function add (point) {
        var str = point[0] + '-' + point[1]
        if (!corners[str]) {
          corners[str] = {
            id: str,
            point: point,
            elevation: _getElevation(point),
            owner: [],
            neighbor: []
          }
        }
        return corners[str]
      }
      
      function get (point) {
        if (!point) {
          return corners
        } else if (typeof point === 'string') {
          return corners[point]
        } else {
          return corners[point[0] + '-' + point[1]]
        }
      }
      
      function destroy () {
        corners = null
        delete this.add
        delete this.get
        delete this.map
        delete this.addNeighbor
        delete this.relateTo
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
      
      function addNeighbor (corner1, corner2) {
        if (corner1.neighbor.indexOf(corner2) > -1) {return}
        corner1.neighbor.push(corner2)
        corner2.neighbor.push(corner1)
      }
      
      function relateTo (corner, polygon) {
        corner.owner.push(polygon)
        polygon.corners.push(corner)
      }
      
      return {
        add: add,
        get: get,
        map: map,
        addNeighbor: addNeighbor,
        relateTo: relateTo,
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
      
      function add (point) {
        var str = point[0] + '-' + point[1]
        if (!centers[str]) {
          centers[str] = {
            id: str,
            point: point,
            elevation: _getElevation(point),
            owner: []
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
        delete this.relateTo
        delete this.destroy
      }
      
      function relateTo (center, polygon) {
        center.owner.push(polygon)
        polygon.centers.push(center)
      }
      
      return {
        add: add,
        get: get,
        map: map,
        relateTo: relateTo,
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
        return [[p1[0], p2[0]].sort(), [p1[1], p2[1]].sort()].join('-')
      }
      
      function add (point1, point2) {
        var str = _getId(point1, point2),
          c1 = Corner.get(point1),
          c2 = Corner.get(point2)
        if (c1 && c2) {
          Corner.addNeighbor(c1, c2)
        }
        
        if (!edges[str]) {
          edges[str] = {
            id: str,
            points: [point1, point2],
            path: [point1, point2],
            owner: []
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
        delete this.relateTo
        delete this.destroy
      }
      
      function relateTo (edge, polygon) {
        var p = null
        polygon.edges.push(edge)
        if (edge.owner.length > 0) {
          p = edge.owner[0]
          polygon.neighbor.push(p)
          if (p.neighbor.indexOf(polygon) === -1) {
            p.neighbor.push(polygon)
          }
        }
        edge.owner.push(polygon)
      }
      
      return {
        add: add,
        get: get,
        map: map,
        relateTo: relateTo,
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
        var polygon = {}, c = null
        
        polygon.corners = []
        polygon.centers = []
        polygon.edges = []
        polygon.neighbor = []
        
        //拆分 path 路径，获得多边形的角与边数据
        path.map(function (point, i) {
          Corner.relateTo(Corner.add(point), polygon)
          Edge.relateTo(Edge.add(path[(i > 0 ? i : path.length) - 1], point), polygon)
        })
        
        c = Center.add(center)
        Center.relateTo(c, polygon)
        polygon.id = c.id
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
      x = Math.max(Math.floor(a * size), 0)
      y = Math.max(Math.floor(b * size), 0)
      
      return perlinNoiseData[Math.floor(x * 4 + y * width * size * 4)]
    }
    
    /**
     * initLandData 初始化地图网格数据，多边形、角、重心等
     */
    function initLandData () {
      perlinNoiseData = _getPerlinNoiseData(7)
      
      var map = createMap(polygonNum).init(),
        paths = map.getPaths(),
        centers = map.getPoints()
      
      paths.map(function (o, i) {
        Polygon.add(o, centers[i])
      })
    }
    
    initLandData()
    
    /**
     * _setLandInfo 设置区域地形信息
     * @param {Object} 多边形对象
     */
    function _setLandInfo (polygon) {
      var n = 0,
        arr = [],
        l = 0
      
      //多边形的海拔由全部顶点与重心海拔平均数获得
      arr.push(polygon.centers[0].elevation)
      polygon.corners.map(function (corner) {
        arr.push(corner.elevation / 2)
      })
      arr.map(function (o, i) {
        n += o
      })
      l = arr.length
      n = Math.floor(n / l)
      polygon.elevation = n
      
      if (n < oceanElevation) {//海洋
        n = 0
      } else {//陆地
        n = 1
      }
      polygon.land = n
      
      //设置区域边与角信息，重复赋值取最后一次的即可
      polygon.corners.map(function (corner) {
        var p = corner.point, isSide = 0
        isSide = (p[0] === 0 || p[0] === width || p[1] === 0 || p[1] === height) ? 1 : 0
        corner.land = n
        if (isSide) {
          corner.isSide = isSide
          polygon.isSide = isSide
        }
      })
      
      polygon.edges.map(function (dege) {
        dege.land = n
      })
    }
    
    /**
     * _setLakeInfo 设置区域湖泊信息
     * @param {Object} 多边形对象
     */
    function _setLakeInfo (polygon) {
      var arr = [], isOcean = 0
      
      if (polygon.land === 1 || polygon.isCheckedLake) {return}
      
      //筛选出海洋/湖泊区域
      function checkGroup (polygon) {
        if (polygon.land === 0 && !polygon.isCheckedLake) {
          arr.push(polygon)
          polygon.isCheckedLake = 1
          
          if (isOcean === 0) {
            isOcean = polygon.isSide === 1 ? 1 : 0
          }

          polygon.neighbor.map(function (p) {
            checkGroup(p)
          })
        }
      }
      
      checkGroup(polygon)
      
      if (isOcean === 0) {
        arr.map(function (p) {
          p.land = 2
        })
      }
    }
    
    /**
     * _setRiverInfo 设置区域河流信息
     * @param {Object} 多边形对象
     */
    function _setRiverInfo (polygon) {
      var temp = 0, c = null
      var checked = {}
      //选取海拔值最低的邻居顶点，获得河流路径（边对象）
      function _getRiverEdge (c, min) {
        var min = min || 0, d = null, temp = null, corner = null
        if (!c || c.land === 0 || c.land === 2 || c.isSide === 1) {return}
        checked[c.id] = 1
        c.neighbor.map(function (corner) {
          if ((min >= corner.elevation && !checked[corner.id]) || 0 === min) {
            min = corner.elevation
            d = corner
          }
          checked[corner.id] = 1
        })
        
        if (d) {
          temp = Edge.get(d.point, c.point)
          if (temp) {
            temp.isRiver = 1
            temp.owner.map(function (p) {
              p.hasRiverEdge = 1
            })
            _getRiverEdge(d, min)
          }
        } else {//河流终点设置为湖泊
          c.owner.map(function (polygon) {
            polygon.land = 2
          })
        }
      }
      
      //如果海拔高于一定高度，则可能产生河流，流至海洋
      if (polygon.elevation > 100 && Math.random() > 0.95) {
        //选取一个海拔值最高的角
        temp = polygon.corners[0].elevation
        c = polygon.corners[0]
        polygon.corners.map(function (corner) {
          if (temp > corner.elevation) {
            temp = corner.elevation
            c = corner
          }
        })
        
        _getRiverEdge(c)
      }
    }
    
    /**
     * _setMoistureInfo 设置区域湿度信息
     * @param {Object} 多边形对象
     */
    function _setMoistureInfo (polygon) {
      var checked = {}
      if (polygon.land !== 1) {return}
      
      if (polygon.hasRiverEdge) {
        polygon.moisture = 1
        return
      }
      
      //获取最近湖泊、河流距离
      function getDest (polygon, dest, neighborArray) {
        var next = [], result = false
        if (polygon.moisture) {return}
        dest++
        
        neighborArray.map(function (p) {
          if (checked[p.id]) {return}
          next = next.concat(p.neighbor)
          checked[p.id] = 1
          if (p.hasRiverEdge || p.land === 2) {result = true}
        })
        
        if (result) {
          polygon.moisture = dest
        } else {
          getDest(polygon, dest, next)
        }
      }
      
      getDest(polygon, 0, polygon.neighbor)
    }
    
    /**
     * _setBiomesInfo 设置区域生态信息
     * @param {Object} 多边形对象
     */
    function _setBiomesInfo (polygon) {
      var elevation = polygon.elevation,
        moisture = polygon.moisture
      if (polygon.land === 1) {
        polygon.biomes = _getBiomes(elevation, moisture)
      }
    }
    
    var biomesCategory = {
      '0': {name: '热带雨林', color: '#9cbba9'},
      '1': {name: '温带雨林', color: '#a4c4a8'},
      '2': {name: '泰加林', color: '#ccd4bb'},
      '3': {name: '雪山', color: '#ffffff'},
      '4': {name: '热带季风雨林', color: '#a9cca4'},
      '5': {name: '温带落叶林', color: '#b4c9a9'},
      '6': {name: '灌木林', color: '#c4ccbb'},
      '7': {name: '苔原', color: '#ddddbb'},
      '8': {name: '草原', color: '#c4d4aa'},
      '9': {name: '裸土', color: '#bbbbbb'},
      '10': {name: '焦土', color: '#999999'},
      '11': {name: '温带沙漠', color: '#e4e8ca'},
      '12': {name: '亚热带沙漠', color: '#e9ddc7'}
    }

    var biomes = [
      ['0', '1', '2', '3'],
      ['0', '5', '2', '3'],
      ['4', '5', '6', '3'],
      ['4', '8', '6', '7'],
      ['8', '8', '11', '9'],
      ['12', '11', '11', '10']
    ]

    /**
     * _getBiomes 获取生态信息
     * @param {Number} elevation 海拔值
     * @param {Number} moisture 湿度值
     * @return {String} 生态名称
     */
    function _getBiomes (elevation, moisture) {
      var lv = Math.floor((elevation - oceanElevation) / 20)
      lv = Math.min(3, lv)
      moisture = Math.min(5, Math.floor((moisture - 1) / Math.ceil(polygonNum / 1000)))
      return biomesCategory[biomes[moisture][lv]]
    }
    
    /**
     * _render 将 voronoi 图渲染地形
     */
    function _render () {
      ctx.clearRect(0, 0, width, height)
      ctx.strokeStyle = 'none'
      //根据多边形重心的海拔数据决定地形
      Polygon.map(function (polygon, i) {
        //划分海洋、陆地信息
        _setLandInfo(polygon)
      })
      
      Polygon.map(function (polygon, i) {
        //确定湖泊
        _setLakeInfo(polygon)
      }) 
      
      Polygon.map(function (polygon, i) {
        //确定河流路径
        _setRiverInfo(polygon)
      }) 
      
      Polygon.map(function (polygon, i) {
        //确定湿度值
        _setMoistureInfo(polygon)
      }) 
      
      Polygon.map(function (polygon, i) {
        //确定生态
        _setBiomesInfo(polygon)
      }) 
      
      
      //绘制区域地形（湖泊、海洋、陆地等）
      Polygon.map(function (polygon, i) {        
        var path = polygon.path, n = 0
        ctx.beginPath()
        ctx.moveTo(path[0][0], path[0][1])
        
        if (polygon.land === 0) {
          ctx.fillStyle = '#0000aa'
        } else if (polygon.land === 1) {
          //绘制海拔图
          //n = polygon.elevation
          //ctx.fillStyle = 'rgb(' + n + ',' + n + ',' + n + ')'
          //绘制湿度图
          //n = Math.floor(Math.pow(0.8, polygon.moisture) * 255)
          //ctx.fillStyle = 'rgb(0,' + n + ',0)'
          
          //绘制生态图
          if (!polygon.biomes) {
            console.log(polygon)
            return
          }
          ctx.fillStyle = polygon.biomes.color
        } else if (polygon.land === 2) {
          ctx.fillStyle = '#4444aa'
        }
        path.map(function (point, j) {
          ctx.lineTo(point[0], point[1])
        })
        ctx.closePath()
        ctx.fill()
      })
      
      //绘制线段地形（河流）
      Edge.map(function (edge) {
        var p1, p2
        if (edge.isRiver === 1) {
          ctx.strokeStyle = '#4444aa'
          ctx.lineWidth = 3
          p1 = edge.path[0], p2 = edge.path[1]
          ctx.beginPath()
          ctx.moveTo(p1[0], p1[1])
          ctx.lineTo(p2[0], p2[1])
          ctx.closePath()
          ctx.stroke()
        }
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