declare namespace L08_FudgeCraft_Movement {
    class Grid {
        private grid;
        setFragment(_fragment: Fragment): void;
        setCube(_cube: Cube): void;
        getCube(_position: string): Cube;
        hasCube(_position: string): Boolean;
    }
}
