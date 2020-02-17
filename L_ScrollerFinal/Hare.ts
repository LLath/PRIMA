namespace L_ScrollerFinal {
  import ƒ = FudgeCore;

  export enum ACTION {
    IDLE = "Idle",
    WALK = "Walk",
    JUMP = "Jump",
    LAND = "Land"
  }
  export enum DIRECTION {
    LEFT,
    RIGHT
  }

  export class Hare extends ƒ.Node {
    private static sprites: Sprite[];
    private static gravity: ƒ.Vector2 = ƒ.Vector2.Y(-6);
    public speed: ƒ.Vector3 = ƒ.Vector3.ZERO();
    public stats: Stats = {
      speed: 3 + statUpgrade.speed,
      jump: 4.5 + statUpgrade.jump
    };
    private lastFrameTime: number = 0;

    constructor(_name: string = "Hare") {
      super(_name);
      this.addComponent(new ƒ.ComponentTransform());

      for (let sprite of Hare.sprites) {
        let nodeSprite: NodeSprite = new NodeSprite(sprite.name, sprite);
        nodeSprite.activate(false);

        nodeSprite.addEventListener(
          "showNext",
          (_event: Event) => {
            (<NodeSprite>_event.currentTarget).showFrameNext();
          },
          true
        );

        this.appendChild(nodeSprite);
      }

      this.show(ACTION.IDLE);
      ƒ.Loop.addEventListener(ƒ.EVENT.LOOP_FRAME, this.update);
    }

    public static generateSprites(_txtImage: ƒ.TextureImage): void {
      Hare.sprites = [];
      let sprite: Sprite = new Sprite(ACTION.WALK);
      sprite.generateByGrid(
        _txtImage,
        ƒ.Rectangle.GET(2, 104, 68, 64),
        6,
        ƒ.Vector2.ZERO(),
        64,
        ƒ.ORIGIN2D.BOTTOMCENTER
      );
      Hare.sprites.push(sprite);

      sprite = new Sprite(ACTION.IDLE);
      sprite.generateByGrid(
        _txtImage,
        ƒ.Rectangle.GET(8, 20, 45, 72),
        4,
        ƒ.Vector2.ZERO(),
        64,
        ƒ.ORIGIN2D.BOTTOMCENTER
      );
      Hare.sprites.push(sprite);

      sprite = new Sprite(ACTION.JUMP);
      sprite.generateByGrid(
        _txtImage,
        ƒ.Rectangle.GET(180, 180, 73, 78),
        1,
        ƒ.Vector2.ZERO(),
        64,
        ƒ.ORIGIN2D.BOTTOMCENTER
      );
      Hare.sprites.push(sprite);

      sprite = new Sprite(ACTION.LAND);
      sprite.generateByGrid(
        _txtImage,
        ƒ.Rectangle.GET(250, 180, 50, 78),
        2,
        ƒ.Vector2.ZERO(),
        64,
        ƒ.ORIGIN2D.BOTTOMCENTER
      );
      Hare.sprites.push(sprite);
    }

    public show(_action: ACTION): void {
      for (let child of this.getChildren())
        child.activate(child.name == _action);
    }

    public act(_action: ACTION, _direction?: DIRECTION): void {
      switch (_action) {
        case ACTION.IDLE:
          this.speed.x = 0;
          if (this.speed.y === 0) {
            this.show(_action);
          }
          break;
        case ACTION.WALK:
          let direction: number = _direction == DIRECTION.RIGHT ? 1 : -1;
          this.speed.x = this.stats.speed;
          this.cmpTransform.local.rotation = ƒ.Vector3.Y(90 - 90 * direction);
          if (this.speed.y === 0) {
            this.show(_action);
          }
          break;
        case ACTION.JUMP:
          if (this.speed.y === 0) {
            this.speed.y = this.stats.jump;
          }
          this.show(_action);
          break;
      }
    }

    private update = (_event: ƒ.Eventƒ): void => {
      let timeFrame: number = ƒ.Loop.timeFrameGame / 1000;

      this.lastFrameTime += timeFrame;
      while (this.lastFrameTime > 0.2) {
        this.broadcastEvent(new CustomEvent("showNext"));

        this.lastFrameTime -= 0.2;
      }
      this.speed.y += Hare.gravity.y * timeFrame;
      let distance: ƒ.Vector3 = ƒ.Vector3.SCALE(this.speed, timeFrame);
      this.cmpTransform.local.translate(distance);

      this.checkCollision();
    };

    private checkCollision(): void {
      let translation: ƒ.Vector3 = this.cmpTransform.local.translation;

      let levelRects: Array<ƒ.Rectangle> = level
        .getChildren()
        .map(child => (<Floor>child).getRectWorld());

      let jumpRects: Array<ƒ.Rectangle> = level
        .getChildrenByName("jump")
        .map(child => (<Floor>child).getRectWorld());

      let speedRects: Array<ƒ.Rectangle> = level
        .getChildrenByName("speed")
        .map(child => (<Floor>child).getRectWorld());

      let rectPlayer: ƒ.Rectangle = new ƒ.Rectangle(
        translation.x,
        translation.y,
        1.1,
        1,
        ƒ.ORIGIN2D.CENTER
      );

      jumpRects.forEach((powerUp, index) => {
        if (rectPlayer.isInside(new ƒ.Vector2(powerUp.x, powerUp.y))) {
          this.stats["jump"] += 1;
          let powerUpNode: ƒ.Node = game
            .getChildrenByName("Level")[0]
            .getChildrenByName("jump")[index];
          game.getChildrenByName("Level")[0].removeChild(powerUpNode);
        }
      });

      speedRects.forEach((powerUp, index) => {
        if (rectPlayer.isInside(new ƒ.Vector2(powerUp.x, powerUp.y))) {
          this.stats["speed"] += 1;
          let powerUpNode: ƒ.Node = game
            .getChildrenByName("Level")[0]
            .getChildrenByName("speed")[index];
          game.getChildrenByName("Level")[0].removeChild(powerUpNode);
        }
      });

      for (let floor of levelRects) {
        let rect: ƒ.Rectangle = floor;

        let hit: boolean = rect.isInside(
          this.cmpTransform.local.translation.toVector2()
        );

        if (hit) {
          if (translation.y > rect.top) {
            translation.y = rect.y;
            this.speed.y = 0;
          }

          this.cmpTransform.local.translation = translation;
        }
      }
    }
  }
}
