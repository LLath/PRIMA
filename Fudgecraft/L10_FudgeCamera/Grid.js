"use strict";
var L10_FudgeCamera;
(function (L10_FudgeCamera) {
    // TODO: extends Map
    class Grid {
        constructor() {
            this.grid = new Map();
        }
        setFragment(_fragment) {
            for (let cube of _fragment.getChildren()) {
                this.setCube(cube);
            }
        }
        setCube(_cube) {
            this.grid.set(_cube.toString(), _cube);
        }
        getCube(_position) {
            return this.grid.get(_position);
        }
        hasCube(_position) {
            return this.grid.has(_position);
        }
    }
    L10_FudgeCamera.Grid = Grid;
})(L10_FudgeCamera || (L10_FudgeCamera = {}));
//# sourceMappingURL=Grid.js.map