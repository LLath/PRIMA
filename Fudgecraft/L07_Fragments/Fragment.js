"use strict";
var L08_FudgeCraft_Movement;
(function (L08_FudgeCraft_Movement) {
    var f = FudgeCore;
    class Fragment extends f.Node {
        constructor(_shape) {
            super("Fragment-Type" + _shape);
            let shape = Fragment.shapes[_shape];
            let type = Fragment.shapeToCubeType.get(_shape); // Fragment.getRandomEnum(CUBE_TYPE);
            this.addComponent(new f.ComponentTransform());
            for (let position of shape) {
                let vctPosition = f.Vector3.ZERO();
                vctPosition.set(position[0], position[1], position[2]);
                let cube = new L08_FudgeCraft_Movement.Cube(type, vctPosition);
                this.appendChild(cube);
            }
        }
        static getShapeArray() {
            return [
                // core
                [[0, 0, 0]],
                // I
                [
                    [0, -1, 0],
                    [0, 0, 0],
                    [0, 1, 0],
                    [0, 2, 0]
                ],
                // O
                [
                    [0, 0, 0],
                    [1, 0, 0],
                    [0, 1, 0],
                    [1, 1, 0]
                ],
                // T
                [
                    [0, 0, 0],
                    [0, 1, 0],
                    [-1, 0, 0],
                    [1, 0, 0]
                ],
                // S
                [
                    [0, 0, 0],
                    [0, 1, 0],
                    [1, 0, 0],
                    [1, -1, 0]
                ],
                // L
                [
                    [0, 0, 0],
                    [0, 1, 0],
                    [0, -1, 0],
                    [1, -1, 0]
                ],
                // corner
                [
                    [0, 0, 0],
                    [1, 0, 0],
                    [0, 1, 0],
                    [0, 0, 1]
                ],
                // thingy
                [
                    [0, 0, 0],
                    [1, 0, 0],
                    [0, 1, 0],
                    [1, 0, 1]
                ]
            ];
        }
        // private static getRandomEnum<T>(_enum: {[key: string]: T}): T {
        //     let randomKey: string = Object.keys(_enum)[Math.floor(Math.random() * Object.keys(_enum).length)];
        //     return _enum[randomKey];
        // }
        static getShapeToCubeType() {
            return new Map([
                [0, L08_FudgeCraft_Movement.CUBE_TYPE.GRAY],
                [1, L08_FudgeCraft_Movement.CUBE_TYPE.CYAN],
                [2, L08_FudgeCraft_Movement.CUBE_TYPE.YELLOW],
                [3, L08_FudgeCraft_Movement.CUBE_TYPE.MAGENTA],
                [4, L08_FudgeCraft_Movement.CUBE_TYPE.RED],
                [5, L08_FudgeCraft_Movement.CUBE_TYPE.BLUE],
                [6, L08_FudgeCraft_Movement.CUBE_TYPE.ORANGE],
                [7, L08_FudgeCraft_Movement.CUBE_TYPE.GREEN]
            ]);
        }
    }
    Fragment.shapes = Fragment.getShapeArray();
    Fragment.shapeToCubeType = Fragment.getShapeToCubeType();
    L08_FudgeCraft_Movement.Fragment = Fragment;
})(L08_FudgeCraft_Movement || (L08_FudgeCraft_Movement = {}));
//# sourceMappingURL=Fragment.js.map