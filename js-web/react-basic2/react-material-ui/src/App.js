import React, { Component } from 'react';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';

import RaisedButton from 'material-ui/RaisedButton';

import logo from './logo.svg';
import './App.css';

class App extends Component {
    constructor(props) {
        super(props);
        this.state = {clickCount: 0};
    }
    
    click() {
        this.setState({clickCount: this.state.clickCount+1});
    }
  
    render() {
        return (
            <MuiThemeProvider>
                <div className="App">
                    <header className="App-header">
                        <img src={logo} className="App-logo" alt="logo" />
                        <h1 className="App-title">Welcome to React with Material-UI widgets</h1>
                    </header>
                    <p className="App-intro">
                        To get started, edit <code>src/App.js</code> and save to reload.
                    </p>
                    <RaisedButton primary={true} onClick={()=>{this.click()}} label="click me" />
                    <span style={{marginLeft: 20, fontWeight: 'bold'}}>{this.state.clickCount}</span>
                </div>
            </MuiThemeProvider>
        );
    }
}

export default App;

