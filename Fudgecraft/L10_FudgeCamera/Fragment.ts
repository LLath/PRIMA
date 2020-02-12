namespace L10_FudgeCamera {
  import f = FudgeCore;

  export class Fragment extends f.Node {
    private static shapes: number[][][] = Fragment.getShapeArray();
    private static shapeToCubeType: Map<
      Number,
      CUBE_TYPE
    > = Fragment.getShapeToCubeType();

    constructor(_shape: number) {
      super("Fragment-Type" + _shape);
      let shape: number[][] = Fragment.shapes[_shape];
      let type: CUBE_TYPE = Fragment.shapeToCubeType.get(_shape); // Fragment.getRandomEnum(CUBE_TYPE);
      this.addComponent(new f.ComponentTransform());
      for (let position of shape) {
        let vctPosition: f.Vector3 = f.Vector3.ZERO();
        vctPosition.set(position[0], position[1], position[2]);
        let cube: Cube = new Cube(type, vctPosition);
        this.appendChild(cube);
      }
    }

    private static getShapeArray(): number[][][] {
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

    private static getShapeToCubeType(): Map<Number, CUBE_TYPE> {
      return new Map<Number, CUBE_TYPE>([
        [0, CUBE_TYPE.GRAY],
        [1, CUBE_TYPE.CYAN],
        [2, CUBE_TYPE.YELLOW],
        [3, CUBE_TYPE.MAGENTA],
        [4, CUBE_TYPE.RED],
        [5, CUBE_TYPE.BLUE],
        [6, CUBE_TYPE.ORANGE],
        [7, CUBE_TYPE.GREEN]
      ]);
    }
  }
}
