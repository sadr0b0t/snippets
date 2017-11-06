import React from 'react';

var styleBtn = {
    margin: 10,
    padding: 5,
    borderStyle: 'solid',
    cursor: 'pointer'
}

class App extends React.Component {
    constructor(props) {
        super(props);
        this.state = {reply: ''};
    }
    
    readServerString(url) {
        var req = new XMLHttpRequest();
        req.onreadystatechange = function() {
            if (req.readyState === 4) { // only if req is "loaded"
                if (req.status === 200) { // only if "OK"
                    this.setState({reply: req.responseText});
                } else {
                    // error
                }
            }
        }.bind(this);
        // can't use GET method here as it would quickly 
        // exceede max length limitation
        req.open("POST", url, true);

        //Send the proper header information along with the request
        req.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
        req.send();
    }

    call1() {
        this.readServerString('/call1');
    }
    
    call2() {
        this.readServerString('/call2');
    }

    render() {
        return (
            <div style={{textAlign: 'center', marginTop: 30}}>
                <p>
                    <span onClick={()=>{this.call1()}} style={styleBtn}>Прочитать с сервера значение 1</span>
                    <span onClick={()=>{this.call2()}} style={styleBtn}>прочитать с сервера значение 2</span>
                </p>
                <p style={{marginTop: 40, fontSize: 24}}>
                    Результат: <span style={{fontStyle: 'italic'}}>{this.state.reply}</span> 
                </p>
            </div>
        );
    }
}

export default App;

