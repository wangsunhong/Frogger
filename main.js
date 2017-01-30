/**
 * Created by Sidney on 2017/1/22.
 */

//---------------------------------------------------------------------------
//定义命名空间,关键属性和方法,采用观察者设计模式,用于在游戏代码中实现各代码模块之间的通信
//---------------------------------------------------------------------------

var Frogger = (function() {
    var canvas = document.getElementById("canvas"),
        drawingSurface = canvas.getContext("2d"),
        backgroundCanvas = document.getElementById("background-canvas"),
        backgroundDrawingSurface = backgroundCanvas.getContext("2d"),
        drawingSurfaceWidth = canvas.width,
        drawingSurfaceHeight = canvas.height;

    return {
        //公开内容供其他代码模块使用
        canvas:canvas,
        drawingSurface:drawingSurface,
        drawingSurfaceWidth:drawingSurfaceWidth,
        drawingSurfaceHeight:drawingSurfaceHeight,
        backgroundDrawingSurface:backgroundDrawingSurface,

        //定义一个对象,包含游戏中各角色可以移动方向的引用
        direction:{
            UP:"up",
            DOWN:"down",
            LEFT:"left",
            RIGHT:"right"
        },

        //定义观察者设计模式方法subscribe()和publish(),来实现应用程序内通信,避免紧耦合模块的使用
        observer:(function(){
            var events = {};

            return {
                subscribe:function(eventName,callback){
                    if (!events.hasOwnProperty(eventName)){
                        events[eventName] = [];
                    }
                    events[eventName].push(callback);
                },

                publish:function(eventName){
                    var data = Array.prototype.slice.call(arguments,1),
                        index = 0,
                        length = 0;
                    if (events.hasOwnProperty(eventName)){
                        length = events[eventName].length;

                        for (;index < length;index++){
                            events[eventName][index].apply(this,data);
                        }
                    }
                }
            };
        }()),

        //判断在游戏面盘中的两个物体是否在水平方向发生相交
        intersects:function(position1,position2){
            var doesIntersect = false;

            if ((position1.left > position2.left && position1.left < position2.right)|| (position1.right > position2.left && position1.left < position2.right)){
                doesIntersect = true;
            }

            return doesIntersect;
        }
    };
}());

//---------------------------------------------------------------------------
//游戏的核心逻辑
//---------------------------------------------------------------------------

//为实现浏览器的requestAnimationFrame()方法,使用浏览器屏障代码polyfill实现流畅动画
window.requestAnimationFrame = (function(){
    return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || function(callback){
            window.setTimeout(callback,1000/60);
        };
})();

//游戏逻辑模块
//保持追踪游戏状态,玩家分数,剩余的生命条数,处理玩家角色和其他物体之间的碰撞
(function(Frogger){
    var _score = 0,
        _highScore = 1000,
        _lives = 5,
        _timeTotal = 60000,
        _timeRemaining = _timeTotal,
        _refreshRate = 33.333,
        _timesAtGoal = 0,
        _maxTimesAtGoal = 5,
        _isPlayerFrozen = false,
        //游戏主循环运行时间
        _lastTimeGameLoopRan = (new Date()).getTime();

    //倒计时
    function countDown(){
        if (_timeRemaining > 0){
            //根据_refreshRate变量值的频率进行调用
            _timeRemaining -= _refreshRate;
            Frogger.observer.publish("time-remaining-change",_timeRemaining / _timeTotal);
        }else {
            //时间到,生命值减1
            loseLife();
        }
    }

    //游戏结束
    function gameOver(){
        //暂停玩家移动
        freezePlayer();
        //通知其他代码模块,游戏结束
        Frogger.observer.publish("game-over");
    }

    //游戏胜利
    function gameWon(){
        //通知其他代码模块,游戏胜利
        Frogger.observer.publish("game-won");
    }

    //丢失生命
    function loseLife(){
        _lives--;
        freezePlayer();
        Frogger.observer.publish("player-lost-life");
        if (_lives === 0){
            gameOver();
        }else {
            setTimeout(reset,2000);
        }
    }

    //当游戏结束或玩家丢失一条生命时,暂停玩家移动
    function freezePlayer(){
        _isPlayerFrozen = true;
        Frogger.observer.publish("player-freeze");
    }

    //恢复可移动状态
    function unfreezePlayer(){
        _isPlayerFrozen = false;
        Frogger.observer.publish("player-unfreeze");
    }

    //增加分数
    function increaseScore(increaseBy){
        _score += increaseBy || 0;
        Frogger.observer.publish("score-change",_score);
        //判断是否最高分
        if (_score > _highScore){
            _highScore = _score;
            Frogger.observer.publish("high-score-change",_highScore);
        }
    }

    //玩家到达指定目标位置
    function playerAtGoal(){
        increaseScore(1000);
        _timesAtGoal++;
        freezePlayer();
        if (_timesAtGoal < _maxTimesAtGoal){
            setTimeout(reset,2000);
        }else {
            gameWon();
        }
    }

    //当玩家移动角色时,分数增加20分
    function playerMoved(){
        increaseScore(20);
    }

    //重置游戏状态
    function reset(){
        //保存当前剩余时间
        _timeRemaining = _timeTotal;
        unfreezePlayer();
        Frogger.observer.publish("reset");
    }

    //游戏主循环
    function gameLoop(){
        var currentTime = (new Date()).getTime(),
        timeDifference = currentTime - _lastTimeGameLoopRan;
        window.requestAnimationFrame(gameLoop);
        if (timeDifference >= _refreshRate){
            Frogger.drawingSurface.clearRect(0,0,Frogger.drawingSurfaceWidth,Frogger.drawingSurfaceHeight);
            if (!_isPlayerFrozen){
                countDown();
                //检测碰撞
                Frogger.observer.publish("check-collisions");
            }

            Frogger.observer.publish("render-base-layer");
            Frogger.observer.publish("render-character");
            _lastTimeGameLoopRan = currentTime;
        }
    }

    function start(){
        Frogger.observer.publish("high-score-change",_highScore);
        gameLoop();
    }

    //配置模块
    Frogger.observer.subscribe("game-load",start);
    Frogger.observer.subscribe("player-at-goal",playerAtGoal);
    Frogger.observer.subscribe("player-moved",playerMoved);
    Frogger.observer.subscribe("collision",loseLife);

}(Frogger));


//---------------------------------------------------------------------------
//建立各个图像及动画
//---------------------------------------------------------------------------

//截取图像
Frogger.ImageSprite = function(startPositionLeft, startPositionTop) {
    this.startLeft = startPositionLeft || 0;
    this.startTop = startPositionTop || 0;

    this.animations = {};

    this.reset();
};
//初始化一些属性和方法
//产生动画效果
Frogger.Animation = function (options){
    options = options || {};
    //动画序列中各个图像的切换频率,默认150ms
    this.rate = options.rate || 150;
    this.loop = options.loop || false;
    this.spriteLeft = options.spriteLeft || 0;
    //动画序列数组
    this.sequence = options.sequence || [];
};

Frogger.Animation.prototype = {
    //动画序列的帧数
    frame: 0,
    //判断该动画是否正在进行
    playing: false,
    //保存计时指示器
    timer: null,
    //启动动画
    play: function(){
        var that = this;

        if (!this.playing){
            this.reset();
            this.playing = true;
        }

        this.timer = setInterval(function(){
            that.incrementFrame();
        },this.rate);
    },

    reset: function(){
        this.frame = 0;
    },

    //增加动画序列的当前帧序号
    incrementFrame: function(){
        if (this.playing){
            this.frame++;
            if (this.frame === this.sequence.length - 1){
                if (!this.loop){
                    this.stop();
                }else {
                    this.reset();
                }
            }
        }
    },

    //从拼合图中截取相应的小图像
    getSequenceValue: function(){
        return this.sequence[this.frame];
    },

    //返回次动画第一帧的独立小图像的左边缘像素值
    getSpriteLeft: function(){
        return this.spriteLeft;
    },

    //停止计时器,使当前帧序号停止增加,让动画停止进行
    stop: function(){
        clearInterval(this.timer);
        this.playing = false;
    }

};

Frogger.ImageSprite.prototype = {
    top: 0,
    left: 0,

    startLeft: 0,
    startTop: 0,

    sprite: (function(){
        var img = document.createElement("img");
        img.src = "assets/spritemap.png";
        return img;
    }()),

    width: 80,
    height: 80,

    spriteTop: 0,
    spriteLeft: 0,

    animations:null,
    currentAnimation: "",

    isHidden: false,

    //把图像重设至其初始位置
    reset: function(){
        this.left = this.startLeft;
        this.top = this.startTop;

        this.resetAnimation();

        this.isHidden = false;
    },

    //关联动画
    registerAnimation: function(animations){
        var key,
            animation;

        //依次遍历所提供的对象直接量中的数据,设定注册的动画
        for(key in  animations){
            animation = animations[key];
            this.animations[key] = new Frogger.Animation(animation);
        }
    },

    //将正在进行的动画重设回初始状态
    resetAnimation: function(){
        if (this.animations[this.currentAnimation]){
            this.animations[this.currentAnimation].reset();
        }
        this.currentAnimation = "";
    },

    //根据名称播放指定的动画序列
    playAnimation: function(name){
        this.currentAnimation = name;
        if (this.animations[this.currentAnimation]){
            this.animations[this.currentAnimation].play();
        }
    },

    //根据参数制定的左部和上部位置将图像绘制于canvas上
    renderAt: function(left,top){
        var animation = this.animations[this.currentAnimation],
            sequenceValue = animation ? animation.getSequenceValue() : 0,
            animationSpriteLeft = animation ? animation.getSpriteLeft() : 0,
            spriteLeft = this.spriteLeft + animationSpriteLeft + (this.width * sequenceValue);

        if (!this.isHidden){
            Frogger.drawingSurface.drawImage(this.sprite,spriteLeft,this.spriteTop,this.width,this.height,left,top,this.width,this.height);
        }
    },

    //设置所保存的左部和上部偏移位置值
    moveTo: function(left,top){
        this.left = left || 0;
        if (typeof top !== "undefined"){
            this.top = top || 0;
        }
    },

    //取得从大拼合图片中所提取独立图片的宽度
    getWidth: function(){
        return this.width;
    },

    //取得图像的左部,右部位置
    getPosition: function(){
        return{
            left: this.left,
            right: this.left + this.width
        };
    },

    //将图像从游戏面板隐藏
    hide: function(){
        this.isHidden = true;
    }
};



//---------------------------------------------------------------------------
//游戏面板相关参数
//---------------------------------------------------------------------------

(function(Frogger){
    //网格
    var _grid = {
            width: 80,
            height: 80
        },
        //行数
        //从上往下
        //2行:显示分数
        //2行:玩家目的地
        //5行:水面
        //安全过渡带
        //5行:道路
        //1行:起始点
        //1行:显示剩余时间和剩余生命条数
        _numRows = 16,
        _numColumns = 11,
        //玩家移动范围
        _characterBounds = {
            left: 0,
            right: _numColumns * _grid.width,
            top: 2 * _grid.height,
            bottom: (_numRows - 2) * _grid.height
        },

        _rows = (function(){
            var output = [],
                index = 0,
                length = _numRows;
            for(;index < length;index++){
                output.push(index * _grid.width);
            }
            return output;
        }()),

        _columns = (function(){
            var output = [],
                index = 0,
                length = _numColumns;
            for(;index < length;index++){
                output.push(index * _grid.height);
            }
            return output;
        }());

    //监听game-load事件
    Frogger.observer.subscribe("game-load",function(){
        Frogger.observer.publish("game-board-initialize",{
            numRows: _numRows,
            numColumns: _numColumns,

            rows:_rows,
            columns:_columns,

            grid:{
                width: _grid.width,
                height: _grid.height
            },

            characterBounds: _characterBounds
        });
    });
}(Frogger));

//---------------------------------------------------------------------------
//在游戏面板添加文字
//---------------------------------------------------------------------------

(function(Frogger){
    var _font = "67px Arcade Classic",
        //定义一些变量来保存当前游戏状态,按局部变量访问,提高性能
        _score = 0,
        _highScore = 0,
        _gameWon = false,
        _gameOver = false,
        _gameBoard = {};

    //分数
    function renderScore(){
        Frogger.drawingSurface.font = _font;
        Frogger.drawingSurface.textAlign = "end";
        //"1-up"右对齐到第四列和距游戏面板上半边缘半行高的末端,颜色为白色
        Frogger.drawingSurface.fillStyle = "#FFF";
        Frogger.drawingSurface.fillText("1-UP",_gameBoard.columns[3],_gameBoard.grid.height / 2);
        //分数
        Frogger.drawingSurface.fillStyle = "#F00";
        Frogger.drawingSurface.fillText(_score,_gameBoard.columns[3],_gameBoard.grid.height);
        //最高分
        Frogger.drawingSurface.fillStyle = "#FFF";
        Frogger.drawingSurface.fillText("HI-SCORE",_gameBoard.columns[8],_gameBoard.grid.height / 2);
        Frogger.drawingSurface.fillStyle = "#F00";
        Frogger.drawingSurface.fillText(_highScore,_gameBoard.columns[8],_gameBoard.grid.height);
    }

    //GAME OVER
    function renderGameOver(){
        Frogger.drawingSurface.font = _font;
        Frogger.drawingSurface.textAlign = "center";
        Frogger.drawingSurface.fillStyle = "#FFF";
        Frogger.drawingSurface.fillText("GAME OVER",Frogger.drawingSurfaceWidth / 2,_gameBoard.rows[9]);
    }

    //YOU WIN
    function renderGameWon(){
        Frogger.drawingSurface.font = _font;
        Frogger.drawingSurface.textAlign = "center";
        Frogger.drawingSurface.fillStyle = "#FF0";
        Frogger.drawingSurface.fillText("YOU WIN!", Frogger.drawingSurfaceWidth / 2, _gameBoard.rows[9]);
    }

    //TIME
    function renderTimeLabel(){
        Frogger.drawingSurface.font = _font;
        Frogger.drawingSurface.textAlign = "end";
        Frogger.drawingSurface.fillStyle = "#FF0";
        Frogger.drawingSurface.fillText("TIME",Frogger.drawingSurfaceWidth,Frogger.drawingSurfaceHeight);
    }

    //将文字添加到canvas上
    function render(){
        renderScore();
        renderTimeLabel();
        if (_gameOver){
            renderGameOver();
        }
        if (_gameWon){
            renderGameWon();
        }
    }

    //观察者模式,监听其他模块发出的事件
    Frogger.observer.subscribe("game-won",function(){
        _gameWon = true;
    });

    Frogger.observer.subscribe("game-over",function(){
        _gameOver = true;
    });

    Frogger.observer.subscribe("reset",function(){
        _gameOver = false;
        _gameWon = false;
    });

    Frogger.observer.subscribe("score-change",function(newScore){
        _score = newScore;
    });

    Frogger.observer.subscribe("high-score-change",function(newHighScore){
        _highScore = newHighScore;
    });

    Frogger.observer.subscribe("game-board-initialize",function(gameBoard){
        _gameBoard = gameBoard;
        Frogger.observer.subscribe("render-base-layer",render);
    });

}(Frogger));


//---------------------------------------------------------------------------
//绘制游戏背景,剩余生命条数,剩余时间
//---------------------------------------------------------------------------

//背景图片
(function(Frogger){
    var _background = document.createElement("img");
    _background.addEventListener("load",function(){
        Frogger.backgroundDrawingSurface.drawImage(_background,0,0,Frogger.drawingSurfaceWidth,Frogger.drawingSurfaceHeight);
    },false);

    _background.src = "assets/gameboard.gif";
}(Frogger));

//剩余生命,时间
(function(Frogger){
    var _lives = [],
        _timeRemainingAsPercentage = 100,
        _gameBoard;
    //用小青蛙数表示生命数
    function Life(left,top){
        Frogger.ImageSprite.call(this,left,top);
    }

    Life.prototype = new Frogger.ImageSprite();
    Life.prototype.constructor = Life;

    Life.prototype.spriteLeft = 720;
    Life.prototype.spriteTop = 80;
    Life.prototype.width = 40;
    Life.prototype.height = 40;

    function initialize(gameBoard){
        var lifePositionTop;
        _gameBoard = gameBoard;
        //五条生命绘制到游戏面板左下角位置
        lifePositionTop = (_gameBoard.numRows - 1) * _gameBoard.grid.height;
        _lives = [
            new Life(0,lifePositionTop),
            new Life(1 * Life.prototype.width,lifePositionTop),
            new Life(2 * Life.prototype.width,lifePositionTop),
            new Life(3 * Life.prototype.width,lifePositionTop),
            new Life(4 * Life.prototype.width,lifePositionTop)
        ];
        Frogger.observer.subscribe("render-base-layer",render);

    }

    function renderLives(){
        var index = 0,
            length = _lives.length,
            life;
        for (;index < length;index++){
            life = _lives[index];
            life.renderAt(life.left,life.top);
        }
    }

    //时间条
    function renderTimeRemaining(){
        var rectangleWidth = _timeRemainingAsPercentage * _gameBoard.rows[10],
            rectangleHeight = _gameBoard.grid.height / 2,
            rectangleLeft = (1 - _timeRemainingAsPercentage) * _gameBoard.rows[10],
            rectangleTop = Frogger.drawingSurfaceHeight - rectangleHeight;
        Frogger.drawingSurface.fillStyle = "#0F0";
        Frogger.drawingSurface.fillRect(rectangleLeft,rectangleTop,rectangleWidth,rectangleHeight);
    }

    function render(){
        renderLives();
        renderTimeRemaining();
    }

    Frogger.observer.subscribe("player-lost-life",function(){
        _lives.pop();
    });

    Frogger.observer.subscribe("time-remaining-change",function(newTimeRemainingPercentage){
        _timeRemainingAsPercentage = newTimeRemainingPercentage;
    });

    Frogger.observer.subscribe("game-board-initialize",initialize);
}(Frogger));

//---------------------------------------------------------------------------
//显示游戏元素及动画
//---------------------------------------------------------------------------

Frogger.Image = (function(Frogger) {

    //赛车
    function RaceCar(left) {
        Frogger.ImageSprite.call(this, left);
    }

    RaceCar.prototype = new Frogger.ImageSprite();
    RaceCar.prototype.constructor = RaceCar;
    RaceCar.prototype.spriteLeft = 0;
    RaceCar.prototype.spriteTop = 80;

    //推土机
    function Bulldozer(left) {
        Frogger.ImageSprite.call(this, left);
    }

    Bulldozer.prototype = new Frogger.ImageSprite();
    Bulldozer.prototype.constructor = Bulldozer;
    Bulldozer.prototype.spriteLeft = 80;
    Bulldozer.prototype.spriteTop = 80;

    //涡轮赛车
    function TurboRaceCar(left) {
        Frogger.ImageSprite.call(this, left);
    }

    TurboRaceCar.prototype = new Frogger.ImageSprite();
    TurboRaceCar.prototype.constructor = TurboRaceCar;
    TurboRaceCar.prototype.spriteLeft = 160;
    TurboRaceCar.prototype.spriteTop = 80;

    //公路小汽车
    function RoadCar(left) {
        Frogger.ImageSprite.call(this, left);
    }

    RoadCar.prototype = new Frogger.ImageSprite();
    RoadCar.prototype.constructor = RoadCar;
    RoadCar.prototype.spriteLeft = 240;
    RoadCar.prototype.spriteTop = 80;

    //大货车
    function Truck(left) {
        Frogger.ImageSprite.call(this, left);
    }

    Truck.prototype = new Frogger.ImageSprite();
    Truck.prototype.constructor = Truck;
    Truck.prototype.spriteLeft = 320;
    Truck.prototype.spriteTop = 80;
    Truck.prototype.width = 122;

    //短圆木
    function ShortLog(left) {
        Frogger.ImageSprite.call(this, left);
    }

    ShortLog.prototype = new Frogger.ImageSprite();
    ShortLog.prototype.constructor = ShortLog;
    ShortLog.prototype.spriteLeft = 0;
    ShortLog.prototype.spriteTop = 160;
    ShortLog.prototype.width = 190;

    // Define a medium log obstacle
    function MediumLog(left) {
        Frogger.ImageSprite.call(this, left);
    }

    //中圆木
    MediumLog.prototype = new Frogger.ImageSprite();
    MediumLog.prototype.constructor = MediumLog;
    MediumLog.prototype.spriteLeft = 0;
    MediumLog.prototype.spriteTop = 240;
    MediumLog.prototype.width = 254;

    function LongLog(left) {
        Frogger.ImageSprite.call(this, left);
    }

    //长圆木
    LongLog.prototype = new Frogger.ImageSprite();
    LongLog.prototype.constructor = LongLog;
    LongLog.prototype.spriteLeft = 240;
    LongLog.prototype.spriteTop = 160;
    LongLog.prototype.width = 392;

    //乌龟
    function Turtle(left) {
        Frogger.ImageSprite.call(this, left);
    }

    Turtle.prototype = new Frogger.ImageSprite();
    Turtle.prototype.constructor = Turtle;

    //判断乌龟是否潜在水里
    Turtle.prototype.isUnderwater = function() {
        var isUnderwater = false,

        //获取动画引用
            animation = this.animations[this.currentAnimation];

        //当显示拼合图像乌龟动画序列的最后一张图片时,乌龟视作潜在水底状态
        if (animation.getSequenceValue() === Math.max.apply(Math, animation.sequence)) {
            isUnderwater = true;
        }

        return isUnderwater;
    };

    //两个乌龟组
    function TwoTurtles(left) {
        Turtle.call(this, left);
    }

    //继承乌龟基类
    TwoTurtles.prototype = new Turtle();
    TwoTurtles.prototype.constructor = TwoTurtles;

    TwoTurtles.prototype.spriteLeft = 320;
    TwoTurtles.prototype.spriteTop = 240;
    TwoTurtles.prototype.width = 130;

    //播放乌龟动画
    TwoTurtles.prototype.reset = function() {
        Turtle.prototype.reset.call(this);

        this.registerAnimation({
            "diveAndSurface": {
                //获取动画帧所用的独立图像的宽度偏移量的倍数
                sequence: [0, 1, 2, 3, 3, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                loop: true,
                rate: 200
            }
        });

        this.playAnimation("diveAndSurface");
    };

    //三个乌龟组
    function ThreeTurtles(left) {
        Turtle.call(this, left);
    }

    ThreeTurtles.prototype = new Turtle();
    ThreeTurtles.prototype.constructor = ThreeTurtles;

    ThreeTurtles.prototype.spriteLeft = 0;
    ThreeTurtles.prototype.spriteTop = 320;
    ThreeTurtles.prototype.width = 200;

    ThreeTurtles.prototype.reset = function() {
        Turtle.prototype.reset.call(this);

        this.registerAnimation({
            "diveAndSurface": {
                sequence: [0, 1, 2, 3, 3, 3, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                loop: true,
                rate: 300
            }
        });

        this.playAnimation("diveAndSurface");
    };

    //当玩家到达目标位置时显示青蛙的图像
    function GoalFrog(left) {
        Frogger.ImageSprite.call(this, left);
    }

    GoalFrog.prototype = new Frogger.ImageSprite();
    GoalFrog.prototype.constructor = GoalFrog;
    GoalFrog.prototype.spriteLeft = 640;
    GoalFrog.prototype.spriteTop = 80;

    //重载
    GoalFrog.prototype.moveTo = function() {};

    function Goal(left) {
        Frogger.ImageSprite.call(this, left);
    }

    Goal.prototype = new Frogger.ImageSprite();
    Goal.prototype.constructor = Goal;
    Goal.prototype.spriteLeft = 800;
    Goal.prototype.spriteTop = 320;

    Goal.prototype.moveTo = function() {};

    //判断是否到达目标位置
    Goal.prototype.isMet = false;

    //公开一些类
    return {
        RaceCar: RaceCar,
        Bulldozer: Bulldozer,
        RoadCar: RoadCar,
        TurboRaceCar: TurboRaceCar,
        Truck: Truck,
        ShortLog: ShortLog,
        MediumLog: MediumLog,
        LongLog: LongLog,
        TwoTurtles: TwoTurtles,
        ThreeTurtles: ThreeTurtles,
        GoalFrog: GoalFrog,
        Goal: Goal
    };
}(Frogger));

//---------------------------------------------------------------------------
//玩家角色
//---------------------------------------------------------------------------

Frogger.Character = (function(Frogger) {

        //保存玩家角色的图像
    var _character,
        _gameBoard = {},
        //玩家开始行
        _startRow = 14,
        //玩家开始列
        _startColumn = 6,
        //玩家已到达的当前行
        _currentRow = _startRow,
        _isFrozen = false;

    //玩家的青蛙角色
    function Character(left, top) {
        Frogger.ImageSprite.call(this, left, top);

        //注册动画,表示玩家的行为,失去一条生命及上下左右移动
        this.registerAnimation({

            //失去一条生命
            "lose-life": {
                spriteLeft: 640,
                sequence: [0, 1, 2],
                rate: 350
            },

            //上下左右移动
            "move-up": {
                spriteLeft: 0,
                sequence: [1, 0]
            },
            "move-right": {
                spriteLeft: 160,
                sequence: [1, 0]
            },
            "move-down": {
                spriteLeft: 320,
                sequence: [1, 0]
            },
            "move-left": {
                spriteLeft: 480,
                sequence: [1, 0]
            }
        });
    }

    Character.prototype = new Frogger.ImageSprite();
    Character.prototype.constructor = Character;

    //为玩家定义独立图像
    Character.prototype.spriteLeft = 0;
    Character.prototype.spriteTop = 0;

    //上移1行
    Character.prototype.moveUp = function() {

        this.top -= _gameBoard.grid.height;

        //限制移动范围
        if (this.top < _gameBoard.characterBounds.top) {
            this.top = _gameBoard.characterBounds.top;
        }

        //播放动画
        this.playAnimation("move-up");

        //更新所处行的记录
        _currentRow--;
    };

    //下移一行
    Character.prototype.moveDown = function() {

        //限制移动范围
        this.top += _gameBoard.grid.height;

        if (this.top > _gameBoard.characterBounds.bottom) {
            this.top = _gameBoard.characterBounds.bottom;
        }

        this.playAnimation("move-down");

        _currentRow++;
    };

    //左移1行
    Character.prototype.moveLeft = function() {

        this.left -= _gameBoard.grid.width;

        if (this.left < _gameBoard.characterBounds.left) {
            this.left = _gameBoard.characterBounds.left;
        }

        this.playAnimation("move-left");
    };

    //右移1行
    Character.prototype.moveRight = function() {

        this.left += _gameBoard.grid.width;

        if (this.left > _gameBoard.characterBounds.right) {
            this.left = _gameBoard.characterBounds.right;
        }

        this.playAnimation("move-right");
    };

    //计算玩家角色距离当前游戏面板顶部边界的像素距离
    function getTop() {
        return _gameBoard.rows[_currentRow];
    }

    //隐藏行为
    function hide() {
        _character.hide();
    }

    //移动行为
    function move(characterDirection) {

        if (!_isFrozen) {

            //调用方法
            if (characterDirection === Frogger.direction.LEFT) {
                _character.moveLeft();
            } else if (characterDirection === Frogger.direction.RIGHT) {
                _character.moveRight();
            } else if (characterDirection === Frogger.direction.UP) {
                _character.moveUp();
            } else if (characterDirection === Frogger.direction.DOWN) {
                _character.moveDown();
            }

            //发布事件
            Frogger.observer.publish("player-moved");
        }
    }

    function render() {
        _character.renderAt(_character.left, _character.top);
    }

    function loseLife() {
        _character.playAnimation("lose-life");
    }

    //当玩家站在乌龟背上时
    function setPosition(left) {

        if (left > _gameBoard.characterBounds.right) {
            left = _gameBoard.characterBounds.right;
        } else if (left < _gameBoard.characterBounds.left) {
            left = _gameBoard.characterBounds.left;
        }

        _character.moveTo(left);
    }

    //重置
    function reset() {
        _character.reset();
        _currentRow = _startRow;
    }

    function getPosition() {
        return _character.getPosition();
    }

    function freeze() {
        _isFrozen = true;
    }

    function unfreeze() {
        _isFrozen = false;
    }

    //初始化
    function initialize(gameBoard) {
        _gameBoard = gameBoard;
        _character = new Character(_gameBoard.columns[_startColumn], _gameBoard.rows[_startRow]);
        Frogger.observer.subscribe("render-character", render);
    }

    Frogger.observer.subscribe("player-lost-life", loseLife);

    Frogger.observer.subscribe("reset", reset);

    Frogger.observer.subscribe("player-at-goal", hide);

    Frogger.observer.subscribe("player-freeze", freeze);

    Frogger.observer.subscribe("player-unfreeze", unfreeze);

    Frogger.observer.subscribe("game-board-initialize", initialize);

    //键盘响应事件
    window.addEventListener("keydown", function(event) {

        var LEFT_ARROW = 37,
            UP_ARROW = 38,
            RIGHT_ARROW = 39,
            DOWN_ARROW = 40;

        if (event.keyCode === LEFT_ARROW) {
            move(Frogger.direction.LEFT);
        } else if (event.keyCode === RIGHT_ARROW) {
            move(Frogger.direction.RIGHT);
        } else if (event.keyCode === UP_ARROW) {
            move(Frogger.direction.UP);
        } else if (event.keyCode === DOWN_ARROW) {
            move(Frogger.direction.DOWN);
        }
    }, false);

    //触屏模式
    Frogger.canvas.addEventListener("touchstart", function(event) {

        var touchLeft = event.targetTouches[0].clientX,
            touchTop = event.targetTouches[0].clientY;

        if (touchLeft < (Frogger.drawingSurfaceWidth / 8)) {
            move(Frogger.direction.LEFT);
        } else if (touchLeft > (3 * Frogger.drawingSurfaceWidth / 8)) {
            move(Frogger.direction.RIGHT);
        } else if (touchTop < (Frogger.drawingSurfaceHeight / 8)) {
            move(Frogger.direction.UP);
        } else if (touchTop > (3 * Frogger.drawingSurfaceHeight / 8)) {
            move(Frogger.direction.DOWN);
        }
    }, false);

    //公开一些方法
    return {
        getTop: getTop,
        getPosition: getPosition,
        setPosition: setPosition
    };
}(Frogger));


//---------------------------------------------------------------------------
//定义"行"行为,使所有车辆,乌龟,木头等相似物体处在游戏同一行上移动
//---------------------------------------------------------------------------

Frogger.Row = (function() {

    function Row(options) {
        options = options || {};

        //默认向左移动
        this.direction = options.direction || Frogger.direction.LEFT;

        //一组物体
        this.obstacles = options.obstacles || [];

        this.top = options.top || 0;

        this.speed = options.speed || 1;
    }

    Row.prototype = {

        render: function() {
            var index = 0,
                length = this.obstacles.length,
                left,
                obstaclesItem;

            //依次遍历每个物体
            for (; index < length; index++) {
                obstaclesItem = this.obstacles[index];

                //基于这个物体的当前位置以及它的移动方向和速度,更新它的左部位置
                left = obstaclesItem.getPosition().left + ((this.direction === Frogger.direction.RIGHT ? 1 : -1) * this.speed);

                //当物体移出游戏面板的一条边界,它就会从另一条边界返回
                if (left < -obstaclesItem.getWidth()) {
                    left = Frogger.drawingSurfaceWidth;
                } else if (left >= Frogger.drawingSurfaceWidth) {
                    left = -obstaclesItem.getWidth();
                }

                obstaclesItem.moveTo(left);
                obstaclesItem.renderAt(left, this.top);
            }
        },

        getTop: function() {
            return this.top;
        },

        //检测碰撞
        isCollision: function(characterPosition) {
            var index = 0,
                length = this.obstacles.length,
                obstaclesItem,
                isCollision = false;

            for (; index < length; index++) {
                obstaclesItem = this.obstacles[index];

                if (Frogger.intersects(obstaclesItem.getPosition(), characterPosition)) {
                    isCollision = true;
                }
            }

            return isCollision;
        },

        //重置物体
        reset: function() {
            var index = 0,
                length = this.obstacles.length;

            for (; index < length; index++) {
                this.obstacles[index].reset();
            }
        }
    };

    //
    function Road(options) {
        Row.call(this, options);
    }

    Road.prototype = new Row();
    Road.prototype.constructor = Road;

    //圆木的行
    function Log(options) {
        Row.call(this, options);
    }

    Log.prototype = new Row();
    Log.prototype.constructor = Log;

    //重载isCollision()方法,如果玩家角色接触到圆木则安全,如果接触圆木下方的水而不是圆木的本身,则发生碰撞行为
    Log.prototype.isCollision = function(characterPosition) {
        return !Row.prototype.isCollision.call(this, characterPosition);
    };

    //重载render()方法,如果玩家停在圆木上时,则跟随圆木在水面上一起移动
    Log.prototype.render = function() {

        //根据玩家所落在的圆木的移动方向和速度更新位置
        if (Frogger.Character.getTop() === this.getTop()) {
            Frogger.Character.setPosition(Frogger.Character.getPosition().left + ((this.direction === Frogger.direction.RIGHT ? 1 : -1) * this.speed));
        }

        Row.prototype.render.call(this);

    };

    //水里游动的乌龟
    function Turtle(options) {
        Log.call(this, options);
    }

    Turtle.prototype = new Log();
    Turtle.prototype.constructor = Turtle;

    Turtle.prototype.isCollision = function(characterPosition) {
        var isCollision = Log.prototype.isCollision.call(this, characterPosition);
        return this.obstacles[0].isUnderwater() || isCollision;
    };

    //目标位置
    function Goal(options) {
        options.speed = 0;
        Row.call(this, options);
    }

    Goal.prototype = new Row();
    Goal.prototype.constructor = Goal;

    //检测玩家是否到达此行上某个空位置
    Goal.prototype.isCollision = function(characterPosition) {
        var index = 0,
            length = this.obstacles.length,
            obstaclesItem,
            isCollision = true;

        for (; index < length; index++) {
            obstaclesItem = this.obstacles[index];

            if (!obstaclesItem.isMet && Frogger.intersects(obstaclesItem.getPosition(), characterPosition)) {
                this.obstacles[index].isMet = true;
                Frogger.observer.publish("player-at-goal");
                isCollision = false;

                //添加图像标注
                this.obstacles.push(new Frogger.Image.GoalFrog(obstaclesItem.getPosition().left));
            }
        }

        return isCollision;
    };

    //公开一些类
    return {
        Road: Road,
        Log: Log,
        Turtle: Turtle,
        Goal: Goal
    };
}(Frogger));


//---------------------------------------------------------------------------
//将各行各物体绘制于画面上
//---------------------------------------------------------------------------

(function(Frogger) {

    var _rows = [],
        _gameBoard = {};

    //初始化
    function initialize(gameBoard) {
        _gameBoard = gameBoard;

        //添加11行物体到游戏面板上
        _rows = [

            //从0行开始,在第3行添加目标位置行
            new Frogger.Row.Goal({
                top: _gameBoard.rows[2],
                obstacles: [new Frogger.Image.Goal(33, 111), new Frogger.Image.Goal(237, 315), new Frogger.Image.Goal(441, 519), new Frogger.Image.Goal(645, 723), new Frogger.Image.Goal(849, 927)]
            }),

            //第四行添加圆木,移动速度每轮游戏主循环5px
            new Frogger.Row.Log({
                top: _gameBoard.rows[3],
                direction: Frogger.direction.RIGHT,
                speed: 5,

                //3条中长度圆木
                obstacles: [new Frogger.Image.MediumLog(_gameBoard.columns[1]), new Frogger.Image.MediumLog(_gameBoard.columns[6]), new Frogger.Image.MediumLog(_gameBoard.columns[10])]
            }),

            //第5行二乌龟组
            new Frogger.Row.Turtle({
                top: _gameBoard.rows[4],
                speed: 6,

                //4个二乌龟组
                obstacles: [new Frogger.Image.TwoTurtles(_gameBoard.columns[0]), new Frogger.Image.TwoTurtles(_gameBoard.columns[3]), new Frogger.Image.TwoTurtles(_gameBoard.columns[6]), new Frogger.Image.TwoTurtles(_gameBoard.columns[9])]
            }),

            //第6行长圆木
            new Frogger.Row.Log({
                top: _gameBoard.rows[5],
                direction: Frogger.direction.RIGHT,
                speed: 7,

                //两条长圆木
                obstacles: [new Frogger.Image.LongLog(_gameBoard.columns[1]), new Frogger.Image.LongLog(_gameBoard.columns[10])]
            }),

            //第7行短圆木
            new Frogger.Row.Log({
                top: _gameBoard.rows[6],
                direction: Frogger.direction.RIGHT,
                speed: 3,

                //3条短圆木
                obstacles: [new Frogger.Image.ShortLog(_gameBoard.columns[1]), new Frogger.Image.ShortLog(_gameBoard.columns[6]), new Frogger.Image.ShortLog(_gameBoard.columns[10])]
            }),

            //第8行三乌龟组
            new Frogger.Row.Turtle({
                top: _gameBoard.rows[7],
                speed: 5,
                obstacles: [new Frogger.Image.ThreeTurtles(_gameBoard.columns[0]), new Frogger.Image.ThreeTurtles(_gameBoard.columns[3]), new Frogger.Image.ThreeTurtles(_gameBoard.columns[7]), new Frogger.Image.ThreeTurtles(_gameBoard.columns[10])]
            }),

            //第10行货车
            new Frogger.Row.Road({
                top: _gameBoard.rows[9],
                speed: 3,
                obstacles: [new Frogger.Image.Truck(_gameBoard.columns[1]), new Frogger.Image.Truck(_gameBoard.columns[7])]
            }),

            //第11行涡轮赛车
            new Frogger.Row.Road({
                top: _gameBoard.rows[10],
                direction: Frogger.direction.RIGHT,
                speed: 12,
                obstacles: [new Frogger.Image.TurboRaceCar(_gameBoard.columns[1]), new Frogger.Image.TurboRaceCar(_gameBoard.columns[7])]
            }),

            //第12行公路小汽车
            new Frogger.Row.Road({
                top: _gameBoard.rows[11],
                speed: 4,
                obstacles: [new Frogger.Image.RoadCar(_gameBoard.columns[1]), new Frogger.Image.RoadCar(_gameBoard.columns[7])]
            }),

            //第13行推土机
            new Frogger.Row.Road({
                top: _gameBoard.rows[12],
                direction: Frogger.direction.RIGHT,
                speed: 3,
                obstacles: [new Frogger.Image.Bulldozer(_gameBoard.columns[1]), new Frogger.Image.Bulldozer(_gameBoard.columns[7])]
            }),

            //第14行赛车
            new Frogger.Row.Road({
                top: _gameBoard.rows[13],
                speed: 4,
                obstacles: [new Frogger.Image.RaceCar(_gameBoard.columns[2]), new Frogger.Image.RaceCar(_gameBoard.columns[6])]
            })
        ];

        Frogger.observer.subscribe("render-base-layer", render);
    }

    //绘制各物体
    function render() {
        var row,
            index = 0,
            length = _rows.length;

        for (; index < length; index++) {
            row = _rows[index];
            row.render();
        }
    }

    //检测碰撞
    function isCollision() {
        var collided = false,
            row,
            index = 0,
            length = _rows.length;

        for (; index < length; index++) {
            row = _rows[index];

            if (Frogger.Character.getTop() === row.getTop()) {
                collided = row.isCollision(Frogger.Character.getPosition());
                if (collided) {
                    break;
                }
            }
        }

        if (collided) {
            Frogger.observer.publish("collision");
        }

        return collided;
    }

    //重置
    function reset() {
        var row;

        for (var index = 0, length = _rows.length; index < length; index++) {
            row = _rows[index];
            row.reset();
        }
    }

    Frogger.observer.subscribe("reset", reset);

    Frogger.observer.subscribe("check-collisions", isCollision);

    Frogger.observer.subscribe("game-board-initialize", initialize);
}(Frogger));

Frogger.observer.publish("game-load");