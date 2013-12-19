var io = require('socket.io').listen(9000);
io.set('log level', 2);


// Import external files
var fs = require('fs');
var vm = require('vm');
var includeInThisContext = function(path) {
    var code = fs.readFileSync(path);
    vm.runInThisContext(code, path);
}.bind(this);

includeInThisContext('./public/js/underscore.js');


var clients = [];
var paddles = [];
var score = [0,0];

var static = require('node-static');
var file = new static.Server('./public');
var ball = {x: 0.5,y:0.0,speedX:0.005, speedY:0.0005};

require('http').createServer(function (request, response) {
    request.addListener('end', function () {
        file.serve(request, response);
    }).resume();
}).listen(8081);

function randomColor(){
    return {
        r: Math.round((Math.random() * 255)),
        g: Math.round((Math.random() * 255)),
        b: Math.round((Math.random() * 255))
    }
}

function noOfPlayers(){
    return Object.keys(paddles).length;
}

    function reloadEverything(){
        var k = Object.keys(paddles);
        var temp = {};
        temp.p = [];
        for(var i = 0; i < k.length; i++){
            temp.p.push(paddles[k[i]]);
        }
        temp.score = score;
        for(var i= 0; i < clients.length; i++) {
            clients[i].emit('reload', temp); //reload everything?
        }

    }


io.sockets.on('connection', function (socket) {
    console.log("hello");
    clients.push(socket);

    
    reloadEverything();

    socket.on('user', function(){
        console.log('new user');

        var color = randomColor();
        socket.emit('color',color);
        var newPaddle = {u: new Date(), y:0.5, side: (noOfPlayers() % 2), color:color, lastMove: new Date()};
        paddles[socket.id] = newPaddle;

        for(var i= 0; i < clients.length; i++) {
            clients[i].emit('newUser', paddles[socket.id]);
        }
    });

    socket.on('moveUser', function(data){
        var y = data.y;
        
        var paddle = paddles[socket.id];
        paddle.y = y;
        paddle.lastMove = new Date();
        paddles[socket.id] = paddle;
        for(var i = 0; i < clients.length; i++) {
            clients[i].emit('moveUser', paddle);
        }
    });
    
    socket.on('disconnect', function(){
        console.log('byeeee');

        for(var i= 0; i < clients.length; i++) {
            if(clients[i].id == socket.id){
                clients.splice(i,1);
                break;                
            }
        }

        removePaddle(socket.id);
    
    });


});

function removePaddle(id){
        console.log('removing paddle', id);
        if(paddles[id]) delete paddles[id]; 

        for(var i = 0; i < clients.length; i++){
            if (clients[i].id == id){
                try {
                    clients[i].disconnect();
                    clients.splice(i,1);
                    break;
                } catch(e){}
            }
        }

        reloadEverything();
}

function collisionDetect(side){
   var keys = Object.keys(paddles);
   var paddle;
   

    if(side == 1 && noOfPlayers() == 1){
        return paddles[keys[0]].color;
    }

    for(var i = 0; i < keys.length; i++){
        paddle = paddles[keys[i]];

        if(ball.y >= (paddle.y - 0.1) &&
           ball.y <= (paddle.y + 0.1) &&
           paddle.side == side) {
           return paddle.color;
        }
    }
    return false;
}


function collisionDetect(side){
   var keys = Object.keys(paddles);
   var paddle;
   

    if(side == 1 && noOfPlayers() == 1){
        return paddles[keys[0]].color;
    }

    for(var i = 0; i < keys.length; i++){
        paddle = paddles[keys[i]];

        if(ball.y >= (paddle.y - 0.1) &&
           ball.y <= (paddle.y + 0.1) &&
           paddle.side == side) {
           return paddle.color;
        }
    }
    return false;
}

function resetBall(){


    ball.x = 0.5;
    ball.y = Math.random();
    ball.speedX = 0.005;
}

setInterval(function(){
   var keys = Object.keys(paddles);
   var paddle;
   var now = new Date();

    for(var i = 0; i < keys.length; i++){
        paddle = paddles[keys[i]];

        if((!paddle.lastMove) || ((paddle.lastMove.getTime() + 10000) < now.getTime())) {
            
            removePaddle(keys[i]);
        }
    }

},10000);

setInterval(function(){

    if(noOfPlayers() > 1) {
        ball.x = ball.x + ball.speedX;
        ball.y = ball.y + ball.speedY;

        if(ball.y < 0) {
            ball.speedY = -ball.speedY;


        }

        if(ball.y > 1){
            ball.speedY = -ball.speedY;
        }

        if(ball.x <= 0){
            var collision = collisionDetect(0);

            if(collision){
                ball.speedX = (-ball.speedX) + 0.001;
                ball.x = 0.001;
  
                
                for(var i= 0; i < clients.length; i++) {
                    clients[i].emit('c', collision);
                }  
            } else {
                score[1]++;             
                for(var i= 0; i < clients.length; i++) {
                    clients[i].emit('b', {x:ball.x, y:ball.y, score:score});
                }

                resetBall();
            }
            
        }
        
        if(ball.x >= 1) {

            var collision = collisionDetect(1);

            if(collision){
                ball.speedX = (-ball.speedX) + 0.001;
                ball.x = 1 - 0.005;

                for(var i= 0; i < clients.length; i++) {
                    clients[i].emit('c', collision);
                }  
            } else {
                score[0]++;           
                for(var i= 0; i < clients.length; i++) {
                    clients[i].emit('b', {x:ball.x, y:ball.y, score : score});
                }
                ball.speedX = -0.010;
                ball.x = 0.5;
                ball.y = Math.random();
            }

        }

        for(var i= 0; i < clients.length; i++) {
            clients[i].emit('ball', ball);
        }
    }
},10);
