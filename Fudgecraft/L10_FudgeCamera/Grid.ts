namespace L10_FudgeCamera {
  // TODO: extends Map
  export class Grid {
    private grid: Map<string, Cube> = new Map<string, Cube>();

    public setFragment(_fragment: Fragment): void {
      for (let cube of _fragment.getChildren()) {
        this.setCube(<Cube>cube);
      }
    }

    public setCube(_cube: Cube): void {
      this.grid.set(_cube.toString(), _cube);
    }

    public getCube(_position: string): Cube {
      return this.grid.get(_position);
    }

    public hasCube(_position: string): Boolean {
      return this.grid.has(_position);
    }
  }
}
