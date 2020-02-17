namespace L_ScrollerFinal {
  interface PowerUp {
    name: string;
    color?: string;
  }
  interface Platform {
    scaleY: number;
    scaleX: number;
    translateY: number;
    translateX: number;
    powerUP?: PowerUp;
    color?: string;
  }
  export function createLevel(_parent: ƒ.Node): ƒ.Node {
    let level: ƒ.Node = new ƒ.Node("Level");
    let floorHeight: number = 0.2;

    fetch("https://prima-no-sprites.herokuapp.com/level")
      .then((res: Response) => res.json())
      .then((data: Array<Platform>) => {
        localStorage.setItem("Level", JSON.stringify(data));
        createObjects(data);
      })
      .then(() => {
        hare = new Hare("Hare");
        _parent.appendChild(hare);
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

    function transformFloor(_floor: Floor, _platform: Platform): void {
      _floor.cmpTransform.local.scaleY(floorHeight);
      _floor.cmpTransform.local.scaleX(_platform.scaleX);
      _floor.cmpTransform.local.translateY(_platform.translateY);
      _floor.cmpTransform.local.translateX(_platform.translateX);
    }

    function createObjects(_data: Array<Platform>): void {
      _data.map((platform: Platform) => {
        let _color: string;
        let floor: Floor = new Floor();
        if (platform.color) {
          _color = platform.color;
        }
        floor = new Floor("Floor", _color);
        transformFloor(floor, platform);
        level.appendChild(floor);

        if (platform.powerUP) {
          floor = new Floor(platform.powerUP.name, platform.powerUP.color);
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
}
