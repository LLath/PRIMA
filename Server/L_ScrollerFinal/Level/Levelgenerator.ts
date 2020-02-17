namespace Level {
  const scaleY: number = 0.2;
  let scaleX: number = 2;
  let translateY: number = Math.random() * (2 - 1) - 1;
  let translateX: number = Math.random() * (3 - 2) - 2;

  interface Platform {
    scaleY: number;
    scaleX: number;
    translateY: number;
    translateX: number;
  }

  export function generateLevel(): Array<Platform> {
    let platform: Platform = {
      scaleY,
      scaleX,
      translateY,
      translateX
    };
    const numberOfPlatforms: number = 10;

    let level: Array<Platform> = [];

    for (let i: number = 0; i < numberOfPlatforms; i++) {
      if (i == 0) {
        level.push(platform);
      }
      level.push(checkNearby());
      translateY = Object(checkNearby()).translateY;
      translateX = Object(checkNearby()).translateX;
    }
    return level;
  }

  function checkNearby(): Platform {
    const platform: Platform = {
      scaleY,
      scaleX,
      translateY: translateX + (Math.random() * (2 - 1) + 0),
      translateX: translateX + (Math.random() * (3 - 2) + 1)
    };
    return platform;
  }

  export function clear(): void {
    translateY = Math.random() * (2 - 1) - 1;
    translateX = Math.random() * (3 - 2) - 2;
  }

  function createLevel(_number: number): Array<Platform> {
    let platform: Platform = {
      scaleY,
      scaleX,
      translateY,
      translateX
    };

    return [platform];
  }
}
