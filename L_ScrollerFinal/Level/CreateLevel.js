"use strict";
var L_ScrollerFinal;
(function (L_ScrollerFinal) {
    function createLevel(_parent) {
        let level = new L_ScrollerFinal.ƒ.Node("Level");
        let floorHeight = 0.2;
        fetch("https://prima-no-sprites.herokuapp.com/level")
            .then((res) => res.json())
            .then((data) => {
            localStorage.setItem("Level", JSON.stringify(data));
            createObjects(data);
        })
            .then(() => {
            L_ScrollerFinal.hare = new L_ScrollerFinal.Hare("Hare");
            _parent.appendChild(L_ScrollerFinal.hare);
        });
        // getLevel().map(floors => {
        //   floor = new Floor();
        //   floor.cmpTransform.local.scaleY(floorHeight);
        //   floor.cmpTransform.local.scaleX(Object(floors).scaleX);
        //   floor.cmpTransform.local.translateY(Object(floors).translateY);
        //   floor.cmpTransform.local.translateX(Object(floors).translateX);
        //   level.appendChild(floor);
        // });
        // clearLevel();
        function transformFloor(_floor, _platform) {
            _floor.cmpTransform.local.scaleY(floorHeight);
            _floor.cmpTransform.local.scaleX(_platform.scaleX);
            _floor.cmpTransform.local.translateY(_platform.translateY);
            _floor.cmpTransform.local.translateX(_platform.translateX);
        }
        function createObjects(_data) {
            _data.map((platform) => {
                let _color;
                let floor = new L_ScrollerFinal.Floor();
                if (platform.color) {
                    _color = platform.color;
                }
                floor = new L_ScrollerFinal.Floor("Floor", _color);
                transformFloor(floor, platform);
                level.appendChild(floor);
                if (platform.powerUP) {
                    floor = new L_ScrollerFinal.Floor(platform.powerUP.name, platform.powerUP.color);
                    floor.cmpTransform.local.scaleY(0.2);
                    floor.cmpTransform.local.scaleX(0.2);
                    floor.cmpTransform.local.translateY(platform.translateY + 1.3);
                    floor.cmpTransform.local.translateX(platform.translateX);
                    level.appendChild(floor);
                }
            });
        }
        return level;
    }
    L_ScrollerFinal.createLevel = createLevel;
})(L_ScrollerFinal || (L_ScrollerFinal = {}));
//# sourceMappingURL=CreateLevel.js.map