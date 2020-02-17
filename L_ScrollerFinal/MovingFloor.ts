namespace L_ScrollerFinal {
  export class MovingFloor extends Floor {
    public readonly moving: boolean = true;
    private speed: ƒ.Vector2;
    private moveableField: ƒ.Rectangle = ƒ.Rectangle.GET(0, 0, 10, 5);
    public constructor(_speed: ƒ.Vector2 = ƒ.Vector2.X(0.1)) {
      super();
      this.speed = _speed;
    }

    public get moveSpeed(): ƒ.Vector2 {
      return this.speed.copy;
    }

    public move(): void {
      if (
        this.moveableField.isInside(
          this.cmpTransform.local.translation.toVector2()
        )
      ) {
        if (
          this.moveableField.x < this.cmpTransform.local.translation.x &&
          this.moveableField.y > this.cmpTransform.local.translation.y
        ) {
          console.log("LEFT Corner");
          this.speed = this.moveSpeed;
        }
        if (
          this.moveableField.x + this.moveableField.width <
            this.cmpTransform.local.translation.x &&
          this.moveableField.y + this.moveableField.height >
            this.cmpTransform.local.translation.y
        ) {
          console.log("Right Corner");
          this.speed = new ƒ.Vector2(-this.moveSpeed.x, -this.moveSpeed.y);
        }
        this.cmpTransform.local.translate(this.moveSpeed.toVector3());
      }
    }

    public stop(): void {
      this.speed = ƒ.Vector2.ZERO();
    }
  }
}
