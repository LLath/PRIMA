namespace Levels {
  const scaleY: number = 0.2;
  let scaleX: number = 2;
  let translateY: number = Math.random() * (2 - 1) - 1;
  let translateX: number = Math.random() * (3 - 2) - 2;

  export function generateLevel(): Array<Object> {
    let platform: Object = {
      scaleY,
      scaleX,
      translateY,
      translateX
    };
    const numberOfPlatforms: number = 10;

    let level: Array<Object> = [];

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

  function checkNearby(): Object {
    const platform: Object = {
      scaleY,
      scaleX,
      translateY: translateX + (Math.random() * (2 - 1) + 0),
      translateX: translateX + (Math.random() * (3 - 2) + 1)
    };
    return platform;
  }
}
