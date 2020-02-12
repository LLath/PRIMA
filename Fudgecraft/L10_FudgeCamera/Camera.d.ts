declare namespace L10_FudgeCamera {
    import f = FudgeCore;
    class CameraOrbit extends f.Node {
        private rotatorX;
        private maxRotX;
        private minDistance;
        constructor(_maxRotx: number);
        readonly cmpCamera: f.ComponentCamera;
        rotateX(_delta: number): void;
        setRotationX(_angle: number): void;
        rotateY(_delta: number): void;
        setRotationY(_angle: number): void;
        setDistance(_dist: number): void;
        moveDistance(_delta: number): void;
    }
}
