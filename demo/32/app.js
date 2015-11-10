var ClickBtn = React.createClass({
  getInitialState: function() {
    return {klass: 'btn'}
  },
  render: function () {
    return <div ref="btn" className={this.state.klass + ' ' + this.props.status} >Click Me</div>
  },
  getStatus: function () {
    return this.state.status
  }
})

var dom = window.document
var Popup = React.createClass({
  getInitialState: function() {
    var self = this
    dom.addEventListener('mousemove', function (e) {self.onMouseMove(e)})
    dom.addEventListener('mouseup', function (e) {self.onMouseUp(e)})
    return {left: 0, top: 0, startLeft: 0, startTop: 0, x: 0, y: 0, ready: false}
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
  onMouseUp: function () {
    if (!this.state.ready) {return}
    
    this.setState({ready: false})
  },
  render: function () {
    var style = {
      left: this.state.left,
      top: this.state.top,
      display: this.props.status
    }
    return (
      <div ref="popup" onMouseDown={this.onMouseDown} className="popup" style={style} >Drag Me</div>
    )
  }
})

var Component = React.createClass({
  getInitialState: function() {
    return {status: 'off'}
  },
  onClick: function (e) {
    this.setState({status: this.state.status === 'off' ? 'on' : 'off'})
  },
  render: function () {
    return (
      <div className="component">
        <div onClick={this.onClick} >
          <ClickBtn status={this.state.status} />
        </div>
        <Popup status={this.state.status === 'off' ? 'none' : 'block'} />
      </div>
    )
  },
  toggle: function () {
    this.setState({status: this.state.status === 'off' ? 'on' : 'off'})
  }
})

//ReactDOM.render(<ClickBtn />, document.getElementById('container'));
//ReactDOM.render(<Popup />, document.getElementById('box'));
window.component = ReactDOM.render(<Component />, document.getElementById('final'));