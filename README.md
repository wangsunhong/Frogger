# Frogger
HTML Game 青蛙过河游戏

[在线试玩][1]

**游戏简介**

这是一款基于1981年的经典街机游戏青蛙过河游戏。

该游戏的目标是用引领一只青蛙从游戏界面底端移动到界面上端。首先要带领游戏角色穿过一条繁忙的马路，不要撞上任何行驶的车辆。然后在躲避来自于潜伏在水底的危险状况时，利用漂浮的圆木和偶尔浮出水面的乌龟的背部来越过河流。一共需要把5只青蛙送至界面上方5个目标点就成功。

**设计模式**


游戏主要采用观察者设计模式，定义subscribe()和publish()方法，来实现应用程序内的通信，避免紧耦合模块的使用。


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

        
![screenshot][2]
        


  [1]: https://wangsunhong.github.io/Frogger/
  [2]: https://github.com/wangsunhong/Frogger/blob/master/screenshot.png
