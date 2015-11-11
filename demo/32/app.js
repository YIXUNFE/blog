var ClickBtn = React.createClass({
  getInitialState: function() {
    return {klass: 'btn', status: 'off'}
  },
  onClick: function () {
    this.setState({status: this.state.status === 'off' ? 'on' : 'off'})
  },
  render: function () {
    return <div ref="btn" className={this.state.klass + ' ' + this.state.status} >Click Me</div>
  },
  getStatus: function () {
    return this.state.status
  },
  on: function () {
    this.setState({status: 'on'})
  },
  off: function () {
    this.setState({status: 'off'})
  }
})

var dom = window.document
var Popup = React.createClass({
  getInitialState: function() {
    var self = this
    dom.addEventListener('mousemove', function (e) {self.onMouseMove(e)})
    dom.addEventListener('mouseup', function (e) {self.onMouseUp(e)})
    return {status: 'none', left: 0, top: 0, startLeft: 0, startTop: 0, x: 0, y: 0, ready: false}
  },
  onMouseDown: function (e) {
    var x = e.clientX,
      y = e.clientY
    this.setState({ready: true, x: x, y: y, startLeft: this.state.left, startTop: this.state.top})
  },
  onMouseMove: function (e) {
    if (!this.state.ready) {return}
    
    var x = e.clientX,
      y = e.clientY
    this.setState(function (state) {
      return {
        left: state.startLeft + x - state.x,
        top: state.startTop + y - state.y
      }
    })
  },
  onMouseUp: function (e) {
    var state = {ready: false},
      isNotify = false
    if (this.refs.popup !== e.target) {
      state.status = 'none'
      isNotify = true
    }
    this.setState(state, function () {
      isNotify && this.props.change()
    })
  },
  render: function () {
    var style = {
      left: this.state.left,
      top: this.state.top,
      display: this.state.status
    }
    return (
      <div ref="popup" onMouseDown={this.onMouseDown} className="popup" style={style} >Drag Me</div>
    )
  },
  show: function () {
    this.setState({status: 'block'})
  },
  hide: function () {
    this.setState({status: 'none'})
  }
})

var Component = React.createClass({
  getInitialState: function() {
    return {status: 'off'}
  },
  onClick: function () {
    this.toggle()
  },
  change: function () {
    //接到popup关闭的通知后，改变按钮状态
    this.setState({status: 'off'}, function () {
      this.refs.btn.off()
    })
  },
  render: function () {
    return (
      <div className="component">
        <div onClick={this.onClick} >
          <ClickBtn ref="btn" />
        </div>
        <Popup ref="pop" change={this.change} />
      </div>
    )
  },
  toggle: function () {
    var refs = this.refs
    this.setState({status: this.state.status === 'off' ? 'on' : 'off'}, function () {
      if (this.state.status === 'on') {
        refs.btn.on()
        refs.pop.show()
      } else {
        refs.btn.off()
        refs.pop.hide()
      }
    })
  }
})

//ReactDOM.render(<ClickBtn />, document.getElementById('container'));
//ReactDOM.render(<Popup />, document.getElementById('box'));
window.component = ReactDOM.render(<Component />, document.getElementById('final'));