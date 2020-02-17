"use strict";
var L08_FudgeCraft_Movement;
(function (L08_FudgeCraft_Movement) {
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
    L08_FudgeCraft_Movement.Grid = Grid;
})(L08_FudgeCraft_Movement || (L08_FudgeCraft_Movement = {}));
//# sourceMappingURL=Grid.js.map