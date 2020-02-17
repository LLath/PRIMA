"use strict";
// First try to generate a random Level
// FIXME: If time
var Level;
// First try to generate a random Level
// FIXME: If time
(function (Level) {
    const scaleY = 0.2;
    let scaleX = 2;
    let translateY = Math.random() * (2 - 1) - 1;
    let translateX = Math.random() * (3 - 2) - 2;
    function generateLevel() {
        let platform = {
            scaleY,
            scaleX,
            translateY,
            translateX
        };
        const numberOfPlatforms = 10;
        let level = [];
        for (let i = 0; i < numberOfPlatforms; i++) {
            if (i == 0) {
                level.push(platform);
            }
            level.push(checkNearby());
            translateY = Object(checkNearby()).translateY;
            translateX = Object(checkNearby()).translateX;
        }
        return level;
    }
    Level.generateLevel = generateLevel;
    function checkNearby() {
        const platform = {
            scaleY,
            scaleX,
            translateY: translateX + (Math.random() * (2 - 1) + 0),
            translateX: translateX + (Math.random() * (3 - 2) + 1)
        };
        return platform;
    }
    function clear() {
        translateY = Math.random() * (2 - 1) - 1;
        translateX = Math.random() * (3 - 2) - 2;
    }
    Level.clear = clear;
})(Level || (Level = {}));
//# sourceMappingURL=Levelgenerator.js.map