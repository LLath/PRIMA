namespace L_ScrollerFinal {
  export class Camera extends ƒ.ComponentCamera {
    readonly levelBeginning: ƒ.Vector2 = new ƒ.Vector2(7, 4);
    readonly levelEnd: ƒ.Vector2 = new ƒ.Vector2(20, 6);
    constructor() {
      super();
      this.pivot.translateZ(15);
      this.pivot.lookAt(ƒ.Vector3.ZERO());
      this.pivot.translateX(7);
      this.pivot.translateY(4);
    }

    public translateBasedOn(_object: ƒ.Node): void {
      if (_object.mtxWorld.translation.x > this.levelBeginning.x) {
        this.pivot.translateX(
          _object.mtxWorld.translation.x - this.pivot.translation.x
        );
      }
      if (
        _object.mtxWorld.translation.y > this.levelBeginning.y &&
        _object.mtxWorld.translation.y < this.levelEnd.y
      ) {
        this.pivot.translateY(
          _object.mtxWorld.translation.y - this.pivot.translation.y
        );
      }
    }
  }
}
