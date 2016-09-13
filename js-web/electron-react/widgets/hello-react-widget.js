
// hello-react-widget.js
var React = require('react');
var ReactDOM = require('react-dom');

var HelloReactWidget = React.createClass({
    /** Действие по клику */
    doClickAction: function () {
       alert('clicked');
    },
    /** Отрисовка виджета */
    render: function() {
        return (
            <div className="hello-react-widget">
                <h1>Hello from React component widget: </h1>
                <div onClick={this.doClickAction}>Click me</div>
            </div>
        );
    }
});


ReactDOM.render(
    <HelloReactWidget/>,
    document.getElementById('hello-react-widget')
);

